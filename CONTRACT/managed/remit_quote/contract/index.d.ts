import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  callerSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  quoteColor(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  claim(context: __compactRuntime.CircuitContext<PS>,
        amount_0: bigint,
        dayBucket_0: bigint,
        to_0: { is_left: boolean,
                left: { bytes: Uint8Array },
                right: { bytes: Uint8Array }
              }): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  quoteColor(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  claim(context: __compactRuntime.CircuitContext<PS>,
        amount_0: bigint,
        dayBucket_0: bigint,
        to_0: { is_left: boolean,
                left: { bytes: Uint8Array },
                right: { bytes: Uint8Array }
              }): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  claimTag(sk_0: Uint8Array, dayBucket_0: bigint): Uint8Array;
}

export type Circuits<PS> = {
  claimTag(context: __compactRuntime.CircuitContext<PS>,
           sk_0: Uint8Array,
           dayBucket_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  quoteColor(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  claim(context: __compactRuntime.CircuitContext<PS>,
        amount_0: bigint,
        dayBucket_0: bigint,
        to_0: { is_left: boolean,
                left: { bytes: Uint8Array },
                right: { bytes: Uint8Array }
              }): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly minted: bigint;
  claims: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
