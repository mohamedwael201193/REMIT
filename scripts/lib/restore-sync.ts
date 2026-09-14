/**
 * Restore/sync rewind: Wallet SDK 1.2.0 resumes the indexer at appliedIndex-1
 * (inclusive) so the boundary event is re-delivered. Replaying it re-inserts a
 * zswap/dust commitment already in serializeState (expected 21400, received 21399)
 * or applies a DUST event older than snapshot sync_time. applyUpdate throws,
 * RunningV1Variant retries the same batch, isSynced never becomes true.
 *
 * Official intent (filter id > appliedIndex) is not enough when the merkle
 * first_free and the event-id cursor are skewed. Skip only true rewinds
 * (received < expected, or event time < synced). Gaps still throw. Does not
 * force isSynced, genesis-replay, or rewrite the on-disk cache.
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
}): { applyUpdate: (state: S, update: U) => [S, unknown] } {
  return {
    applyUpdate: (state, update) => {
      try {
        return args.inner.applyUpdate(state, update) as [S, unknown];
      } catch (err) {
        if (classifyRestoreReplayError(err) !== "rewind") throw err;
        const events = args.eventsOf(update);
        let current = state;
        let last: unknown = { changes: [], protocolVersion: 0 };
        for (const event of events) {
          try {
            const [next, changes] = args.inner.applyUpdate(current, args.singleton(update, event));
            current = next;
            last = changes;
          } catch (innerErr) {
            if (classifyRestoreReplayError(innerErr) !== "rewind") throw innerErr;
            current = args.skipRewind(current, update, event);
          }
        }
        return [current, last];
      }
    },
  };
}
