import { Event } from "@midnight-ntwrk/ledger-v8";
import { CustomShieldedWallet } from "@midnightntwrk/wallet-sdk-shielded";
import { V1Builder as ShieldedV1Builder, Sync as ShieldedSync, CoreWallet as ShieldedCore } from "@midnightntwrk/wallet-sdk-shielded/v1";
import { CustomDustWallet } from "@midnightntwrk/wallet-sdk-dust-wallet";
import { V1Builder as DustV1Builder, SyncService as DustSync, CoreWallet as DustCore } from "@midnightntwrk/wallet-sdk-dust-wallet/v1";
import { wrapApplyUpdateSkippingRewind } from "./restore-sync.ts";

type ZswapEvent = { id: number; maxId?: number; protocolVersion?: number; event: Event };
type ZswapUpdate = {
  updates: ZswapEvent[];
  secretKeys: unknown;
};

type DustEvent = { id: number; maxId?: number; raw: Event };
type DustUpdate = {
  updates: DustEvent[];
  secretKey: unknown;
  timestamp: Date;
};

function cloneLedgerEvent(event: Event): Event {
  return Event.deserialize(event.serialize());
}

function zswapRestoreCapability() {
  const inner = ShieldedSync.makeEventsSyncCapability();
  return wrapApplyUpdateSkippingRewind({
    inner,
    eventsOf: (u: ZswapUpdate) => u.updates,
    clone: (event) => {
      const ev = event as ZswapEvent;
      return { ...ev, event: cloneLedgerEvent(ev.event) };
    },
    singleton: (u, event) => ({ ...u, updates: [event as ZswapEvent] }),
    skipRewind: (state, _u, event) => {
      const ev = event as { id: number; maxId?: number };
      return ShieldedCore.updateProgress(state, {
        appliedIndex: BigInt(ev.id),
        highestRelevantWalletIndex: BigInt(ev.maxId ?? ev.id),
        isConnected: true,
      });
    },
  });
}

function dustRestoreCapability() {
  const inner = DustSync.makeDefaultSyncCapability();
  return wrapApplyUpdateSkippingRewind({
    inner,
    eventsOf: (u: DustUpdate) => u.updates,
    clone: (event) => {
      const ev = event as DustEvent;
      return { ...ev, raw: cloneLedgerEvent(ev.raw) };
    },
    singleton: (u, event) => ({ ...u, updates: [event as DustEvent] }),
    skipRewind: (state, _u, event) => {
      const ev = event as { id: number; maxId?: number };
      return DustCore.updateProgress(state, {
        appliedIndex: BigInt(ev.id),
        highestRelevantWalletIndex: BigInt(ev.maxId ?? ev.id),
        isConnected: true,
      });
    },
  });
}

export function restoreSyncShieldedWallet(configuration: Parameters<typeof CustomShieldedWallet>[0]) {
  const builder = new ShieldedV1Builder().withDefaults().withSync(ShieldedSync.makeEventsSyncService, () =>
    zswapRestoreCapability(),
  );
  return CustomShieldedWallet(configuration, builder);
}

export function restoreSyncDustWallet(configuration: Parameters<typeof CustomDustWallet>[0]) {
  const builder = new DustV1Builder().withDefaults().withSync(DustSync.makeDefaultSyncService, () =>
    dustRestoreCapability(),
  );
  return CustomDustWallet(configuration, builder);
}
