import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Note = { asset: bigint; amount: bigint; owner: Uint8Array };

export type Offer = { side: bigint;
                      baseAmount: bigint;
                      quoteAmount: bigint;
                      maker: Uint8Array;
                      payNonce: Uint8Array
                    };

export type Mandate = { principal: Uint8Array;
                        executor: Uint8Array;
                        side: bigint;
                        maxFillBase: bigint;
                        limitNum: bigint;
                        limitDen: bigint;
                        cpRoot: bigint;
                        expiry: bigint;
                        mandateId: Uint8Array
                      };

export type MandateState = { mandateId: Uint8Array; remaining: bigint };

export type AuditFields = { side: bigint;
                            baseAmount: bigint;
                            quoteAmount: bigint;
                            principal: Uint8Array;
                            counterparty: Uint8Array;
                            mandateId: Uint8Array
                          };

export type Witnesses<PS> = {
  ownerSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  executorSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  freshNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  freshNonce2(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  spendNote(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Note];
  spendNoteNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  spendNotePath(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { leaf: Uint8Array,
                                                                              path: { sibling: { field: bigint
                                                                                               },
                                                                                      goes_left: boolean
                                                                                    }[]
                                                                            }];
  offerData(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Offer];
  offerRand(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  offerPath(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { leaf: Uint8Array,
                                                                          path: { sibling: { field: bigint
                                                                                           },
                                                                                  goes_left: boolean
                                                                                }[]
                                                                        }];
  mandateData(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Mandate];
  mandateRand(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  mandatePath(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { leaf: Uint8Array,
                                                                            path: { sibling: { field: bigint
                                                                                             },
                                                                                    goes_left: boolean
                                                                                  }[]
                                                                          }];
  mandateStateData(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, MandateState];
  mandateStateNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  mandateStatePath(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { leaf: Uint8Array,
                                                                                 path: { sibling: { field: bigint
                                                                                                  },
                                                                                         goes_left: boolean
                                                                                       }[]
                                                                               }];
  counterpartyPath(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { leaf: Uint8Array,
                                                                                 path: { sibling: { field: bigint
                                                                                                  },
                                                                                         goes_left: boolean
                                                                                       }[]
                                                                               }];
  auditSeed(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  withdrawTo(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { is_left: boolean,
                                                                           left: { bytes: Uint8Array
                                                                                 },
                                                                           right: { bytes: Uint8Array
                                                                                  }
                                                                         }];
}

export type ImpureCircuits<PS> = {
  deposit(context: __compactRuntime.CircuitContext<PS>,
          asset_0: bigint,
          amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>,
           asset_0: bigint,
           amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  placeOffer(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  cancelOffer(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  createMandate(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revokeMandate(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  fill(context: __compactRuntime.CircuitContext<PS>, nowBound_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  deposit(context: __compactRuntime.CircuitContext<PS>,
          asset_0: bigint,
          amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>,
           asset_0: bigint,
           amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  placeOffer(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  cancelOffer(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  createMandate(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revokeMandate(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  fill(context: __compactRuntime.CircuitContext<PS>, nowBound_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  ownerKey(sk_0: Uint8Array): Uint8Array;
  executorKey(esk_0: Uint8Array): Uint8Array;
  escrowKey(mandateId_0: Uint8Array): Uint8Array;
  noteCommitment(note_0: Note, nonce_0: Uint8Array): Uint8Array;
  noteNullifier(sk_0: Uint8Array, nonce_0: Uint8Array): Uint8Array;
  offerCommitment(o_0: Offer, rand_0: Uint8Array): Uint8Array;
  offerNullifier(commit_0: Uint8Array): Uint8Array;
  mandateCommitment(m_0: Mandate, rand_0: Uint8Array): Uint8Array;
  mandateRevocationTag(mandateId_0: Uint8Array): Uint8Array;
  mandateStateCommitment(s_0: MandateState, nonce_0: Uint8Array): Uint8Array;
  mandateStateNullifier(mandateId_0: Uint8Array, nonce_0: Uint8Array): Uint8Array;
  fieldSalt(seed_0: Uint8Array, idx_0: bigint): Uint8Array;
  auditRootOf(cs_0: Uint8Array[]): Uint8Array;
  priceAtLeast(base_0: bigint, quote_0: bigint, num_0: bigint, den_0: bigint): boolean;
  priceAtMost(base_0: bigint, quote_0: bigint, num_0: bigint, den_0: bigint): boolean;
}

export type Circuits<PS> = {
  ownerKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  executorKey(context: __compactRuntime.CircuitContext<PS>, esk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  escrowKey(context: __compactRuntime.CircuitContext<PS>,
            mandateId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  noteCommitment(context: __compactRuntime.CircuitContext<PS>,
                 note_0: Note,
                 nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  noteNullifier(context: __compactRuntime.CircuitContext<PS>,
                sk_0: Uint8Array,
                nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  offerCommitment(context: __compactRuntime.CircuitContext<PS>,
                  o_0: Offer,
                  rand_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  offerNullifier(context: __compactRuntime.CircuitContext<PS>,
                 commit_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  mandateCommitment(context: __compactRuntime.CircuitContext<PS>,
                    m_0: Mandate,
                    rand_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  mandateRevocationTag(context: __compactRuntime.CircuitContext<PS>,
                       mandateId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  mandateStateCommitment(context: __compactRuntime.CircuitContext<PS>,
                         s_0: MandateState,
                         nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  mandateStateNullifier(context: __compactRuntime.CircuitContext<PS>,
                        mandateId_0: Uint8Array,
                        nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  fieldSalt(context: __compactRuntime.CircuitContext<PS>,
            seed_0: Uint8Array,
            idx_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  auditRootOf(context: __compactRuntime.CircuitContext<PS>, cs_0: Uint8Array[]): __compactRuntime.CircuitResults<PS, Uint8Array>;
  priceAtLeast(context: __compactRuntime.CircuitContext<PS>,
               base_0: bigint,
               quote_0: bigint,
               num_0: bigint,
               den_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  priceAtMost(context: __compactRuntime.CircuitContext<PS>,
              base_0: bigint,
              quote_0: bigint,
              num_0: bigint,
              den_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  deposit(context: __compactRuntime.CircuitContext<PS>,
          asset_0: bigint,
          amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>,
           asset_0: bigint,
           amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  placeOffer(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  cancelOffer(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  createMandate(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revokeMandate(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  fill(context: __compactRuntime.CircuitContext<PS>, nowBound_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly quoteColor: Uint8Array;
  notes: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  noteNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  offers: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  offerNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  mandates: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  mandateRevoked: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  mandateStates: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  mandateStateNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  auditRoots: {
    isEmpty(): boolean;
    length(): bigint;
    head(): { is_some: boolean, value: Uint8Array };
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly openOffers: bigint;
  readonly activeMandates: bigint;
  readonly fills: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               quote_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
