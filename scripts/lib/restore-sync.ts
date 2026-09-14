/**
 * Restore/sync rewind: Wallet SDK 1.2.0 resumes the indexer at appliedIndex-1
 * (inclusive) so the boundary event is re-delivered. serializeState stores
 * offset = progress.appliedIndex (event-id cursor). Merkle first_free is a
 * different namespace. When those are skewed, an event with id > appliedIndex
 * still inserts merkle 21399 into a tree that expects 21400, or a DUST event
 * whose block_time is before snapshot sync_time.
 *
 * Official applyUpdate filters id > appliedIndex then replays the rest as one
 * WASM batch. Event is passed by value (Event.__unwrap): a rewind throw
 * invalidates every Event in that batch. Retrying with the same objects yields
 * "array contains a value of the wrong type" and RunningV1Variant never sets
 * isConnected, so restore stays isSynced=false.
 *
 * Apply one cloned event at a time. Skip only true rewinds (received < expected,
 * or event time < synced). Gaps still throw. Does not force isSynced, genesis-
 * replay, or rewrite the on-disk cache.
 */

export function flattenError(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 8 && cur; i++) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = cur.cause;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  return parts.join(" ");
}

export type RestoreReplayKind = "rewind" | "gap" | "other";

const NONLINEAR =
  /values inserted non-linearly into .+ tree; expected to insert index (\d+), but received (\d+)/i;
const PAST_TIME = /timestamp prior to the time already synced/i;

export function classifyRestoreReplayError(err: unknown): RestoreReplayKind {
  const text = flattenError(err);
  const hit = text.match(NONLINEAR);
  if (hit) {
    const expected = BigInt(hit[1]!);
    const received = BigInt(hit[2]!);
    return received < expected ? "rewind" : "gap";
  }
  if (PAST_TIME.test(text)) return "rewind";
  return "other";
}

export function replayRestoredBatch<E, S>(args: {
  events: E[];
  initial: S;
  applyOne: (state: S, event: E) => S;
  skipRewind: (state: S, event: E) => S;
}): { state: S; applied: E[]; skipped: E[] } {
  let state = args.initial;
  const applied: E[] = [];
  const skipped: E[] = [];
  for (const event of args.events) {
    try {
      state = args.applyOne(state, event);
      applied.push(event);
    } catch (err) {
      const kind = classifyRestoreReplayError(err);
      if (kind !== "rewind") throw err;
      state = args.skipRewind(state, event);
      skipped.push(event);
    }
  }
  return { state, applied, skipped };
}

export function wrapApplyUpdateSkippingRewind<S, U>(args: {
  inner: { applyUpdate: (state: S, update: U) => [S, unknown] };
  eventsOf: (update: U) => unknown[];
  singleton: (update: U, event: unknown) => U;
  skipRewind: (state: S, update: U, event: unknown) => S;
  clone?: (event: unknown) => unknown;
}): { applyUpdate: (state: S, update: U) => [S, unknown] } {
  const clone = args.clone ?? ((event: unknown) => event);
  return {
    applyUpdate: (state, update) => {
      const events = args.eventsOf(update);
      if (events.length === 0) {
        return args.inner.applyUpdate(state, update) as [S, unknown];
      }
      // Never replay the whole batch first: ledger Event is moved into WASM, so a
      // rewind throw poisons every remaining object ("array contains a value of
      // the wrong type") and catch-up cannot reach isSynced.
      let current = state;
      let last: unknown = { changes: [], protocolVersion: 0 };
      let skipped = 0;
      for (const event of events) {
        try {
          const [next, changes] = args.inner.applyUpdate(current, args.singleton(update, clone(event)));
          current = next;
          last = changes;
        } catch (innerErr) {
          if (classifyRestoreReplayError(innerErr) !== "rewind") throw innerErr;
          current = args.skipRewind(current, update, event);
          skipped += 1;
          if (skipped <= 8) {
            console.log("restore-sync: skipped rewind", flattenError(innerErr));
          }
        }
      }
      if (skipped > 8) console.log("restore-sync: skipped rewind count", skipped);
      return [current, last];
    },
  };
}
