import { describe, expect, it } from "vitest";
import {
  classifyRestoreReplayError,
  flattenError,
  replayRestoredBatch,
  wrapApplyUpdateSkippingRewind,
} from "../../scripts/lib/restore-sync.ts";

const ZSWAP_REWIND = new Error(
  "values inserted non-linearly into zswap commitment tree; expected to insert index 21400, but received 21399.",
);
const DUST_PAST = new Error(
  "received an event with a timestamp prior to the time already synced to (synced to: Timestamp(1789364868), event time: Timestamp(1789364358))",
);
const ZSWAP_GAP = new Error(
  "values inserted non-linearly into zswap commitment tree; expected to insert index 21400, but received 21402.",
);

describe("restore/rewind after serializeState (21400→21399, DUST time going backwards)", () => {
  it("classifies inclusive-cursor zswap rewind as rewind, not a gap", () => {
    expect(classifyRestoreReplayError(ZSWAP_REWIND)).toBe("rewind");
    expect(classifyRestoreReplayError({ cause: ZSWAP_REWIND })).toBe("other");
    const wrapped = new Error("Error while applying sync update");
    (wrapped as Error & { cause: Error }).cause = ZSWAP_REWIND;
    expect(classifyRestoreReplayError(wrapped)).toBe("rewind");
    expect(flattenError(wrapped)).toContain("21400");
    expect(flattenError(wrapped)).toContain("21399");
  });

  it("classifies DUST EventForPastTime as rewind", () => {
    const wrapped = new Error("Error while applying sync update");
    (wrapped as Error & { cause: Error }).cause = DUST_PAST;
    expect(classifyRestoreReplayError(wrapped)).toBe("rewind");
  });

  it("does not skip a merkle gap (received > expected)", () => {
    expect(classifyRestoreReplayError(ZSWAP_GAP)).toBe("gap");
  });

  it("replays a restored batch: skip 21399, apply 21400+", () => {
    const events = [
      { id: 1518435, mt: 21399 },
      { id: 1518436, mt: 21400 },
      { id: 1518437, mt: 21401 },
    ];
    let firstFree = 21400;
    const result = replayRestoredBatch({
      events,
      initial: { applied: 1518434, firstFree },
      applyOne: (state, event) => {
        if (event.mt !== state.firstFree) {
          throw new Error(
            `values inserted non-linearly into zswap commitment tree; expected to insert index ${state.firstFree}, but received ${event.mt}.`,
          );
        }
        return { applied: event.id, firstFree: state.firstFree + 1 };
      },
      skipRewind: (state, event) => ({ ...state, applied: event.id }),
    });
    expect(result.skipped).toEqual([{ id: 1518435, mt: 21399 }]);
    expect(result.applied.map((e) => e.mt)).toEqual([21400, 21401]);
    expect(result.state.firstFree).toBe(21402);
    expect(result.state.applied).toBe(1518437);
  });

  it("wraps applyUpdate so a rewind event does not abort the rest of the batch", () => {
    type St = { applied: number };
    type Ev = { id: number; mt: number };
    type Up = { updates: Ev[]; secretKeys: "k" };
    const inner = {
      applyUpdate: (state: St, update: Up): [St, { changes: string[] }] => {
        if (update.updates.some((u) => u.mt === 21399)) throw ZSWAP_REWIND;
        const last = update.updates.at(-1)!;
        return [{ applied: last.id }, { changes: update.updates.map((u) => String(u.mt)) }];
      },
    };
    const wrapped = wrapApplyUpdateSkippingRewind<St, Up>({
      inner,
      eventsOf: (u) => u.updates,
      singleton: (u, event) => ({ ...u, updates: [event as Ev] }),
      skipRewind: (state, _u, event) => ({ applied: (event as Ev).id }),
    });
    const [next, changes] = wrapped.applyUpdate(
      { applied: 1518434 },
      {
        secretKeys: "k",
        updates: [
          { id: 1518435, mt: 21399 },
          { id: 1518436, mt: 21400 },
        ],
      },
    );
    expect(next.applied).toBe(1518436);
    expect((changes as { changes: string[] }).changes).toEqual(["21400"]);
  });

  it("still throws on a gap so isSynced is not forced", () => {
    expect(() =>
      replayRestoredBatch({
        events: [{ id: 1, mt: 21402 }],
        initial: { applied: 0, firstFree: 21400 },
        applyOne: () => {
          throw ZSWAP_GAP;
        },
        skipRewind: (s) => s,
      }),
    ).toThrow(/21402/);
  });
});
