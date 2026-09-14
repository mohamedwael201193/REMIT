import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_1 = __compactRuntime.CompactTypeField;

class _MerkleTreeDigest_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      field: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.field);
  }
}

const _descriptor_2 = new _MerkleTreeDigest_0();

const _descriptor_3 = __compactRuntime.CompactTypeBoolean;

const _descriptor_4 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_5 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_6 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

class _Offer_0 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_5.alignment().concat(_descriptor_5.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_5.alignment().concat(_descriptor_5.alignment()))))));
  }
  fromValue(value_0) {
    return {
      side: _descriptor_6.fromValue(value_0),
      baseAmount: _descriptor_5.fromValue(value_0),
      quoteAmount: _descriptor_5.fromValue(value_0),
      maker: _descriptor_0.fromValue(value_0),
      payNonce: _descriptor_0.fromValue(value_0),
      expiry: _descriptor_5.fromValue(value_0),
      minFillBase: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.side).concat(_descriptor_5.toValue(value_0.baseAmount).concat(_descriptor_5.toValue(value_0.quoteAmount).concat(_descriptor_0.toValue(value_0.maker).concat(_descriptor_0.toValue(value_0.payNonce).concat(_descriptor_5.toValue(value_0.expiry).concat(_descriptor_5.toValue(value_0.minFillBase)))))));
  }
}

const _descriptor_7 = new _Offer_0();

class _OfferSlot_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment()));
  }
  fromValue(value_0) {
    return {
      offer: _descriptor_7.fromValue(value_0),
      rand: _descriptor_0.fromValue(value_0),
      live: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.offer).concat(_descriptor_0.toValue(value_0.rand).concat(_descriptor_3.toValue(value_0.live)));
  }
}

const _descriptor_8 = new _OfferSlot_0();

class _MerkleTreePathEntry_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_3.alignment());
  }
  fromValue(value_0) {
    return {
      sibling: _descriptor_2.fromValue(value_0),
      goes_left: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.sibling).concat(_descriptor_3.toValue(value_0.goes_left));
  }
}

const _descriptor_9 = new _MerkleTreePathEntry_0();

const _descriptor_10 = new __compactRuntime.CompactTypeVector(16, _descriptor_9);

class _MerkleTreePath_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_10.alignment());
  }
  fromValue(value_0) {
    return {
      leaf: _descriptor_0.fromValue(value_0),
      path: _descriptor_10.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.leaf).concat(_descriptor_10.toValue(value_0.path));
  }
}

const _descriptor_11 = new _MerkleTreePath_0();

class _Mandate_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_6.alignment().concat(_descriptor_5.alignment().concat(_descriptor_5.alignment().concat(_descriptor_5.alignment().concat(_descriptor_1.alignment().concat(_descriptor_5.alignment().concat(_descriptor_0.alignment()))))))));
  }
  fromValue(value_0) {
    return {
      principal: _descriptor_0.fromValue(value_0),
      executor: _descriptor_0.fromValue(value_0),
      side: _descriptor_6.fromValue(value_0),
      maxFillBase: _descriptor_5.fromValue(value_0),
      limitNum: _descriptor_5.fromValue(value_0),
      limitDen: _descriptor_5.fromValue(value_0),
      cpRoot: _descriptor_1.fromValue(value_0),
      expiry: _descriptor_5.fromValue(value_0),
      mandateId: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.principal).concat(_descriptor_0.toValue(value_0.executor).concat(_descriptor_6.toValue(value_0.side).concat(_descriptor_5.toValue(value_0.maxFillBase).concat(_descriptor_5.toValue(value_0.limitNum).concat(_descriptor_5.toValue(value_0.limitDen).concat(_descriptor_1.toValue(value_0.cpRoot).concat(_descriptor_5.toValue(value_0.expiry).concat(_descriptor_0.toValue(value_0.mandateId)))))))));
  }
}

const _descriptor_12 = new _Mandate_0();

class _Note_0 {
  alignment() {
    return _descriptor_6.alignment().concat(_descriptor_5.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      asset: _descriptor_6.fromValue(value_0),
      amount: _descriptor_5.fromValue(value_0),
      owner: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_6.toValue(value_0.asset).concat(_descriptor_5.toValue(value_0.amount).concat(_descriptor_0.toValue(value_0.owner)));
  }
}

const _descriptor_13 = new _Note_0();

const _descriptor_14 = new __compactRuntime.CompactTypeVector(6, _descriptor_0);

class _MandateState_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_5.alignment());
  }
  fromValue(value_0) {
    return {
      mandateId: _descriptor_0.fromValue(value_0),
      remaining: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.mandateId).concat(_descriptor_5.toValue(value_0.remaining));
  }
}

const _descriptor_15 = new _MandateState_0();

const _descriptor_16 = new __compactRuntime.CompactTypeVector(3, _descriptor_11);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_17 = new _ContractAddress_0();

class _UserAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_18 = new _UserAddress_0();

class _Either_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_17.alignment().concat(_descriptor_18.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_3.fromValue(value_0),
      left: _descriptor_17.fromValue(value_0),
      right: _descriptor_18.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.is_left).concat(_descriptor_17.toValue(value_0.left).concat(_descriptor_18.toValue(value_0.right)));
  }
}

const _descriptor_19 = new _Either_0();

const _descriptor_20 = new __compactRuntime.CompactTypeVector(3, _descriptor_8);

const _descriptor_21 = new __compactRuntime.CompactTypeVector(8, _descriptor_9);

class _MerkleTreePath_1 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_21.alignment());
  }
  fromValue(value_0) {
    return {
      leaf: _descriptor_0.fromValue(value_0),
      path: _descriptor_21.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.leaf).concat(_descriptor_21.toValue(value_0.path));
  }
}

const _descriptor_22 = new _MerkleTreePath_1();

const _descriptor_23 = new __compactRuntime.CompactTypeVector(2, _descriptor_0);

const _descriptor_24 = new __compactRuntime.CompactTypeBytes(6);

class _LeafPreimage_0 {
  alignment() {
    return _descriptor_24.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      domain_sep: _descriptor_24.fromValue(value_0),
      data: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_24.toValue(value_0.domain_sep).concat(_descriptor_0.toValue(value_0.data));
  }
}

const _descriptor_25 = new _LeafPreimage_0();

class _tuple_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_6.alignment()));
  }
  fromValue(value_0) {
    return [
      _descriptor_0.fromValue(value_0),
      _descriptor_0.fromValue(value_0),
      _descriptor_6.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0[0]).concat(_descriptor_0.toValue(value_0[1]).concat(_descriptor_6.toValue(value_0[2])));
  }
}

const _descriptor_26 = new _tuple_0();

const _descriptor_27 = new __compactRuntime.CompactTypeVector(2, _descriptor_1);

const _descriptor_28 = new __compactRuntime.CompactTypeVector(3, _descriptor_0);

class _Either_1 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_3.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_29 = new _Either_1();

const _descriptor_30 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _Maybe_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_0.alignment());
  }
  fromValue(value_0) {
    return {
      is_some: _descriptor_3.fromValue(value_0),
      value: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.is_some).concat(_descriptor_0.toValue(value_0.value));
  }
}

const _descriptor_31 = new _Maybe_0();

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.ownerSecret) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named ownerSecret');
    }
    if (typeof(witnesses_0.executorSecret) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named executorSecret');
    }
    if (typeof(witnesses_0.freshNonce) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named freshNonce');
    }
    if (typeof(witnesses_0.freshNonce2) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named freshNonce2');
    }
    if (typeof(witnesses_0.spendNote) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named spendNote');
    }
    if (typeof(witnesses_0.spendNoteNonce) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named spendNoteNonce');
    }
    if (typeof(witnesses_0.spendNotePath) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named spendNotePath');
    }
    if (typeof(witnesses_0.offerData) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named offerData');
    }
    if (typeof(witnesses_0.offerRand) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named offerRand');
    }
    if (typeof(witnesses_0.offerPath) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named offerPath');
    }
    if (typeof(witnesses_0.mandateData) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named mandateData');
    }
    if (typeof(witnesses_0.mandateRand) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named mandateRand');
    }
    if (typeof(witnesses_0.mandatePath) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named mandatePath');
    }
    if (typeof(witnesses_0.mandateStateData) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named mandateStateData');
    }
    if (typeof(witnesses_0.mandateStateNonce) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named mandateStateNonce');
    }
    if (typeof(witnesses_0.mandateStatePath) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named mandateStatePath');
    }
    if (typeof(witnesses_0.counterpartyPath) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named counterpartyPath');
    }
    if (typeof(witnesses_0.auditSeed) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named auditSeed');
    }
    if (typeof(witnesses_0.withdrawTo) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named withdrawTo');
    }
    if (typeof(witnesses_0.book) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named book');
    }
    if (typeof(witnesses_0.bookPaths) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named bookPaths');
    }
    if (typeof(witnesses_0.chosenIndex) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named chosenIndex');
    }
    if (typeof(witnesses_0.fillBase) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named fillBase');
    }
    if (typeof(witnesses_0.fillQuote) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named fillQuote');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      ownerKey(context, ...args_1) {
        return { result: pureCircuits.ownerKey(...args_1), context };
      },
      executorKey(context, ...args_1) {
        return { result: pureCircuits.executorKey(...args_1), context };
      },
      escrowKey(context, ...args_1) {
        return { result: pureCircuits.escrowKey(...args_1), context };
      },
      noteCommitment(context, ...args_1) {
        return { result: pureCircuits.noteCommitment(...args_1), context };
      },
      noteNullifier(context, ...args_1) {
        return { result: pureCircuits.noteNullifier(...args_1), context };
      },
      offerCommitment(context, ...args_1) {
        return { result: pureCircuits.offerCommitment(...args_1), context };
      },
      offerNullifier(context, ...args_1) {
        return { result: pureCircuits.offerNullifier(...args_1), context };
      },
      mandateCommitment(context, ...args_1) {
        return { result: pureCircuits.mandateCommitment(...args_1), context };
      },
      mandateRevocationTag(context, ...args_1) {
        return { result: pureCircuits.mandateRevocationTag(...args_1), context };
      },
      mandateStateCommitment(context, ...args_1) {
        return { result: pureCircuits.mandateStateCommitment(...args_1), context };
      },
      mandateStateNullifier(context, ...args_1) {
        return { result: pureCircuits.mandateStateNullifier(...args_1), context };
      },
      fieldSalt(context, ...args_1) {
        return { result: pureCircuits.fieldSalt(...args_1), context };
      },
      auditRootOf(context, ...args_1) {
        return { result: pureCircuits.auditRootOf(...args_1), context };
      },
      priceAtLeast(context, ...args_1) {
        return { result: pureCircuits.priceAtLeast(...args_1), context };
      },
      priceAtMost(context, ...args_1) {
        return { result: pureCircuits.priceAtMost(...args_1), context };
      },
      residualPayNonceOf(context, ...args_1) {
        return { result: pureCircuits.residualPayNonceOf(...args_1), context };
      },
      residualRandOf(context, ...args_1) {
        return { result: pureCircuits.residualRandOf(...args_1), context };
      },
      minU64(context, ...args_1) {
        return { result: pureCircuits.minU64(...args_1), context };
      },
      bytesLt(context, ...args_1) {
        return { result: pureCircuits.bytesLt(...args_1), context };
      },
      fillableBaseOf(context, ...args_1) {
        return { result: pureCircuits.fillableBaseOf(...args_1), context };
      },
      betterPrice(context, ...args_1) {
        return { result: pureCircuits.betterPrice(...args_1), context };
      },
      samePrice(context, ...args_1) {
        return { result: pureCircuits.samePrice(...args_1), context };
      },
      deposit: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`deposit: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const asset_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('deposit',
                                     'argument 1 (as invoked from Typescript)',
                                     'remit_pool.compact line 288 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(asset_0) === 'bigint' && asset_0 >= 0n && asset_0 <= 255n)) {
          __compactRuntime.typeError('deposit',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'remit_pool.compact line 288 char 1',
                                     'Uint<0..256>',
                                     asset_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('deposit',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'remit_pool.compact line 288 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_6.toValue(asset_0).concat(_descriptor_5.toValue(amount_0)),
            alignment: _descriptor_6.alignment().concat(_descriptor_5.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._deposit_0(context,
                                         partialProofData,
                                         asset_0,
                                         amount_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      withdraw: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`withdraw: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const asset_0 = args_1[1];
        const amount_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('withdraw',
                                     'argument 1 (as invoked from Typescript)',
                                     'remit_pool.compact line 296 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(asset_0) === 'bigint' && asset_0 >= 0n && asset_0 <= 255n)) {
          __compactRuntime.typeError('withdraw',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'remit_pool.compact line 296 char 1',
                                     'Uint<0..256>',
                                     asset_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('withdraw',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'remit_pool.compact line 296 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amount_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_6.toValue(asset_0).concat(_descriptor_5.toValue(amount_0)),
            alignment: _descriptor_6.alignment().concat(_descriptor_5.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._withdraw_0(context,
                                          partialProofData,
                                          asset_0,
                                          amount_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      placeOffer: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`placeOffer: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('placeOffer',
                                     'argument 1 (as invoked from Typescript)',
                                     'remit_pool.compact line 306 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._placeOffer_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      cancelOffer: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`cancelOffer: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('cancelOffer',
                                     'argument 1 (as invoked from Typescript)',
                                     'remit_pool.compact line 326 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._cancelOffer_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      createMandate: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`createMandate: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('createMandate',
                                     'argument 1 (as invoked from Typescript)',
                                     'remit_pool.compact line 344 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._createMandate_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      revokeMandate: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`revokeMandate: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('revokeMandate',
                                     'argument 1 (as invoked from Typescript)',
                                     'remit_pool.compact line 362 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._revokeMandate_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      fill: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`fill: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const nowBound_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('fill',
                                     'argument 1 (as invoked from Typescript)',
                                     'remit_pool.compact line 390 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(nowBound_0) === 'bigint' && nowBound_0 >= 0n && nowBound_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('fill',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'remit_pool.compact line 390 char 1',
                                     'Uint<0..18446744073709551616>',
                                     nowBound_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_5.toValue(nowBound_0),
            alignment: _descriptor_5.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._fill_0(context, partialProofData, nowBound_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      deposit: this.circuits.deposit,
      withdraw: this.circuits.withdraw,
      placeOffer: this.circuits.placeOffer,
      cancelOffer: this.circuits.cancelOffer,
      createMandate: this.circuits.createMandate,
      revokeMandate: this.circuits.revokeMandate,
      fill: this.circuits.fill
    };
    this.provableCircuits = {
      deposit: this.circuits.deposit,
      withdraw: this.circuits.withdraw,
      placeOffer: this.circuits.placeOffer,
      cancelOffer: this.circuits.cancelOffer,
      createMandate: this.circuits.createMandate,
      revokeMandate: this.circuits.revokeMandate,
      fill: this.circuits.fill
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const quote_0 = args_0[1];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!(quote_0.buffer instanceof ArrayBuffer && quote_0.BYTES_PER_ELEMENT === 1 && quote_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'remit_pool.compact line 85 char 1',
                                 'Bytes<32>',
                                 quote_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('deposit', new __compactRuntime.ContractOperation());
    state_0.setOperation('withdraw', new __compactRuntime.ContractOperation());
    state_0.setOperation('placeOffer', new __compactRuntime.ContractOperation());
    state_0.setOperation('cancelOffer', new __compactRuntime.ContractOperation());
    state_0.setOperation('createMandate', new __compactRuntime.ContractOperation());
    state_0.setOperation('revokeMandate', new __compactRuntime.ContractOperation());
    state_0.setOperation('fill', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(1n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newBoundedMerkleTree(
                                                                       new __compactRuntime.StateBoundedMerkleTree(16)
                                                                     )).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                                                        alignment: _descriptor_5.alignment() })).arrayPush(__compactRuntime.StateValue.newMap(
                                                                                                                                                                             new __compactRuntime.StateMap()
                                                                                                                                                                           ))
                                                          .encode() } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(2n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(2n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(3n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newBoundedMerkleTree(
                                                                       new __compactRuntime.StateBoundedMerkleTree(16)
                                                                     )).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                                                        alignment: _descriptor_5.alignment() })).arrayPush(__compactRuntime.StateValue.newMap(
                                                                                                                                                                             new __compactRuntime.StateMap()
                                                                                                                                                                           ))
                                                          .encode() } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(2n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(4n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(5n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newBoundedMerkleTree(
                                                                       new __compactRuntime.StateBoundedMerkleTree(16)
                                                                     )).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                                                        alignment: _descriptor_5.alignment() })).arrayPush(__compactRuntime.StateValue.newMap(
                                                                                                                                                                             new __compactRuntime.StateMap()
                                                                                                                                                                           ))
                                                          .encode() } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(2n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(6n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(7n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newBoundedMerkleTree(
                                                                       new __compactRuntime.StateBoundedMerkleTree(16)
                                                                     )).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                                                        alignment: _descriptor_5.alignment() })).arrayPush(__compactRuntime.StateValue.newMap(
                                                                                                                                                                             new __compactRuntime.StateMap()
                                                                                                                                                                           ))
                                                          .encode() } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(2n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(8n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(9n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newNull()).arrayPush(__compactRuntime.StateValue.newNull()).arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                                                                                                                                             alignment: _descriptor_5.alignment() }))
                                                          .encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(10n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(11n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(12n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                              alignment: _descriptor_5.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(quote_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _left_0(value_0) {
    return { is_left: true, left: value_0, right: new Uint8Array(32) };
  }
  _merkleTreePathRoot_0(path_0) {
    return { field:
               this._folder_0((...args_0) =>
                                this._merkleTreePathEntryRoot_0(...args_0),
                              this._degradeToTransient_0(this._persistentHash_4({ domain_sep:
                                                                                    new Uint8Array([109, 100, 110, 58, 108, 104]),
                                                                                  data:
                                                                                    path_0.leaf })),
                              path_0.path) };
  }
  _merkleTreePathRoot_1(path_0) {
    return { field:
               this._folder_1((...args_0) =>
                                this._merkleTreePathEntryRoot_0(...args_0),
                              this._degradeToTransient_0(this._persistentHash_4({ domain_sep:
                                                                                    new Uint8Array([109, 100, 110, 58, 108, 104]),
                                                                                  data:
                                                                                    path_0.leaf })),
                              path_0.path) };
  }
  _merkleTreePathEntryRoot_0(recursiveDigest_0, entry_0) {
    const left_0 = entry_0.goes_left ? recursiveDigest_0 : entry_0.sibling.field;
    const right_0 = entry_0.goes_left ?
                    entry_0.sibling.field :
                    recursiveDigest_0;
    return this._transientHash_0([left_0, right_0]);
  }
  _nativeToken_0() {
    return new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  }
  _blockTimeLt_0(context, partialProofData, time_0) {
    return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 2 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_6.toValue(2n),
                                                                                                 alignment: _descriptor_6.alignment() } }] } },
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(time_0),
                                                                                                                             alignment: _descriptor_5.alignment() }).encode() } },
                                                                      'lt',
                                                                      { popeq: { cached: true,
                                                                                 result: undefined } }]).value);
  }
  _sendUnshielded_0(context, partialProofData, color_0, amount_0, recipient_0) {
    const tmp_0 = this._left_0(color_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(7n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_29.toValue(tmp_0),
                                                                                              alignment: _descriptor_29.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_30.toValue(amount_0),
                                                                                              alignment: _descriptor_30.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    const tmp_1 = this._left_0(color_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(8n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.alignedConcat(
                                                                                              { value: _descriptor_29.toValue(tmp_1),
                                                                                                alignment: _descriptor_29.alignment() },
                                                                                              { value: _descriptor_19.toValue(recipient_0),
                                                                                                alignment: _descriptor_19.alignment() }
                                                                                            )).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_30.toValue(amount_0),
                                                                                              alignment: _descriptor_30.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    if (recipient_0.is_left
        &&
        this._equal_0(recipient_0.left.bytes,
                      _descriptor_17.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 2 } },
                                                                                  { idx: { cached: true,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_6.toValue(0n),
                                                                                                             alignment: _descriptor_6.alignment() } }] } },
                                                                                  { popeq: { cached: true,
                                                                                             result: undefined } }]).value).bytes))
    {
      const tmp_2 = this._left_0(color_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_6.toValue(6n),
                                                                    alignment: _descriptor_6.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_29.toValue(tmp_2),
                                                                                                alignment: _descriptor_29.alignment() }).encode() } },
                                         { dup: { n: 1 } },
                                         { dup: { n: 1 } },
                                         'member',
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_30.toValue(amount_0),
                                                                                                alignment: _descriptor_30.alignment() }).encode() } },
                                         { swap: { n: 0 } },
                                         'neg',
                                         { branch: { skip: 4 } },
                                         { dup: { n: 2 } },
                                         { dup: { n: 2 } },
                                         { idx: { cached: true,
                                                  pushPath: false,
                                                  path: [ { tag: 'stack' }] } },
                                         'add',
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
    }
    return [];
  }
  _receiveUnshielded_0(context, partialProofData, color_0, amount_0) {
    const tmp_0 = this._left_0(color_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(6n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_29.toValue(tmp_0),
                                                                                              alignment: _descriptor_29.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_30.toValue(amount_0),
                                                                                              alignment: _descriptor_30.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    return [];
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_27, value_0);
    return result_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_28, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_26, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_14, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_23, value_0);
    return result_0;
  }
  _persistentHash_4(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_25, value_0);
    return result_0;
  }
  _persistentCommit_0(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_13,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _persistentCommit_1(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_7,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _persistentCommit_2(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_12,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _persistentCommit_3(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_15,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _persistentCommit_4(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_0,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _persistentCommit_5(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_5,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _persistentCommit_6(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_6,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _degradeToTransient_0(x_0) {
    const result_0 = __compactRuntime.degradeToTransient(x_0);
    return result_0;
  }
  _ownerSecret_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.ownerSecret(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('ownerSecret',
                                 'return value',
                                 'remit_pool.compact line 89 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _executorSecret_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.executorSecret(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('executorSecret',
                                 'return value',
                                 'remit_pool.compact line 90 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _freshNonce_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.freshNonce(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('freshNonce',
                                 'return value',
                                 'remit_pool.compact line 91 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _freshNonce2_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.freshNonce2(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('freshNonce2',
                                 'return value',
                                 'remit_pool.compact line 92 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _spendNote_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.spendNote(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && typeof(result_0.asset) === 'bigint' && result_0.asset >= 0n && result_0.asset <= 255n && typeof(result_0.amount) === 'bigint' && result_0.amount >= 0n && result_0.amount <= 18446744073709551615n && result_0.owner.buffer instanceof ArrayBuffer && result_0.owner.BYTES_PER_ELEMENT === 1 && result_0.owner.length === 32)) {
      __compactRuntime.typeError('spendNote',
                                 'return value',
                                 'remit_pool.compact line 93 char 1',
                                 'struct Note<asset: Uint<0..256>, amount: Uint<0..18446744073709551616>, owner: Bytes<32>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_13.toValue(result_0),
      alignment: _descriptor_13.alignment()
    });
    return result_0;
  }
  _spendNoteNonce_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.spendNoteNonce(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('spendNoteNonce',
                                 'return value',
                                 'remit_pool.compact line 94 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _spendNotePath_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.spendNotePath(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && result_0.leaf.buffer instanceof ArrayBuffer && result_0.leaf.BYTES_PER_ELEMENT === 1 && result_0.leaf.length === 32 && Array.isArray(result_0.path) && result_0.path.length === 16 && result_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
      __compactRuntime.typeError('spendNotePath',
                                 'return value',
                                 'remit_pool.compact line 95 char 1',
                                 'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<16, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_11.toValue(result_0),
      alignment: _descriptor_11.alignment()
    });
    return result_0;
  }
  _offerData_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.offerData(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && typeof(result_0.side) === 'bigint' && result_0.side >= 0n && result_0.side <= 255n && typeof(result_0.baseAmount) === 'bigint' && result_0.baseAmount >= 0n && result_0.baseAmount <= 18446744073709551615n && typeof(result_0.quoteAmount) === 'bigint' && result_0.quoteAmount >= 0n && result_0.quoteAmount <= 18446744073709551615n && result_0.maker.buffer instanceof ArrayBuffer && result_0.maker.BYTES_PER_ELEMENT === 1 && result_0.maker.length === 32 && result_0.payNonce.buffer instanceof ArrayBuffer && result_0.payNonce.BYTES_PER_ELEMENT === 1 && result_0.payNonce.length === 32 && typeof(result_0.expiry) === 'bigint' && result_0.expiry >= 0n && result_0.expiry <= 18446744073709551615n && typeof(result_0.minFillBase) === 'bigint' && result_0.minFillBase >= 0n && result_0.minFillBase <= 18446744073709551615n)) {
      __compactRuntime.typeError('offerData',
                                 'return value',
                                 'remit_pool.compact line 96 char 1',
                                 'struct Offer<side: Uint<0..256>, baseAmount: Uint<0..18446744073709551616>, quoteAmount: Uint<0..18446744073709551616>, maker: Bytes<32>, payNonce: Bytes<32>, expiry: Uint<0..18446744073709551616>, minFillBase: Uint<0..18446744073709551616>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_7.toValue(result_0),
      alignment: _descriptor_7.alignment()
    });
    return result_0;
  }
  _offerRand_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.offerRand(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('offerRand',
                                 'return value',
                                 'remit_pool.compact line 97 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _offerPath_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.offerPath(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && result_0.leaf.buffer instanceof ArrayBuffer && result_0.leaf.BYTES_PER_ELEMENT === 1 && result_0.leaf.length === 32 && Array.isArray(result_0.path) && result_0.path.length === 16 && result_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
      __compactRuntime.typeError('offerPath',
                                 'return value',
                                 'remit_pool.compact line 98 char 1',
                                 'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<16, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_11.toValue(result_0),
      alignment: _descriptor_11.alignment()
    });
    return result_0;
  }
  _mandateData_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.mandateData(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && result_0.principal.buffer instanceof ArrayBuffer && result_0.principal.BYTES_PER_ELEMENT === 1 && result_0.principal.length === 32 && result_0.executor.buffer instanceof ArrayBuffer && result_0.executor.BYTES_PER_ELEMENT === 1 && result_0.executor.length === 32 && typeof(result_0.side) === 'bigint' && result_0.side >= 0n && result_0.side <= 255n && typeof(result_0.maxFillBase) === 'bigint' && result_0.maxFillBase >= 0n && result_0.maxFillBase <= 18446744073709551615n && typeof(result_0.limitNum) === 'bigint' && result_0.limitNum >= 0n && result_0.limitNum <= 18446744073709551615n && typeof(result_0.limitDen) === 'bigint' && result_0.limitDen >= 0n && result_0.limitDen <= 18446744073709551615n && typeof(result_0.cpRoot) === 'bigint' && result_0.cpRoot >= 0 && result_0.cpRoot <= __compactRuntime.MAX_FIELD && typeof(result_0.expiry) === 'bigint' && result_0.expiry >= 0n && result_0.expiry <= 18446744073709551615n && result_0.mandateId.buffer instanceof ArrayBuffer && result_0.mandateId.BYTES_PER_ELEMENT === 1 && result_0.mandateId.length === 32)) {
      __compactRuntime.typeError('mandateData',
                                 'return value',
                                 'remit_pool.compact line 99 char 1',
                                 'struct Mandate<principal: Bytes<32>, executor: Bytes<32>, side: Uint<0..256>, maxFillBase: Uint<0..18446744073709551616>, limitNum: Uint<0..18446744073709551616>, limitDen: Uint<0..18446744073709551616>, cpRoot: Field, expiry: Uint<0..18446744073709551616>, mandateId: Bytes<32>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_12.toValue(result_0),
      alignment: _descriptor_12.alignment()
    });
    return result_0;
  }
  _mandateRand_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.mandateRand(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('mandateRand',
                                 'return value',
                                 'remit_pool.compact line 100 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _mandatePath_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.mandatePath(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && result_0.leaf.buffer instanceof ArrayBuffer && result_0.leaf.BYTES_PER_ELEMENT === 1 && result_0.leaf.length === 32 && Array.isArray(result_0.path) && result_0.path.length === 16 && result_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
      __compactRuntime.typeError('mandatePath',
                                 'return value',
                                 'remit_pool.compact line 101 char 1',
                                 'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<16, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_11.toValue(result_0),
      alignment: _descriptor_11.alignment()
    });
    return result_0;
  }
  _mandateStateData_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.mandateStateData(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && result_0.mandateId.buffer instanceof ArrayBuffer && result_0.mandateId.BYTES_PER_ELEMENT === 1 && result_0.mandateId.length === 32 && typeof(result_0.remaining) === 'bigint' && result_0.remaining >= 0n && result_0.remaining <= 18446744073709551615n)) {
      __compactRuntime.typeError('mandateStateData',
                                 'return value',
                                 'remit_pool.compact line 102 char 1',
                                 'struct MandateState<mandateId: Bytes<32>, remaining: Uint<0..18446744073709551616>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_15.toValue(result_0),
      alignment: _descriptor_15.alignment()
    });
    return result_0;
  }
  _mandateStateNonce_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.mandateStateNonce(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('mandateStateNonce',
                                 'return value',
                                 'remit_pool.compact line 103 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _mandateStatePath_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.mandateStatePath(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && result_0.leaf.buffer instanceof ArrayBuffer && result_0.leaf.BYTES_PER_ELEMENT === 1 && result_0.leaf.length === 32 && Array.isArray(result_0.path) && result_0.path.length === 16 && result_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
      __compactRuntime.typeError('mandateStatePath',
                                 'return value',
                                 'remit_pool.compact line 104 char 1',
                                 'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<16, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_11.toValue(result_0),
      alignment: _descriptor_11.alignment()
    });
    return result_0;
  }
  _counterpartyPath_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.counterpartyPath(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && result_0.leaf.buffer instanceof ArrayBuffer && result_0.leaf.BYTES_PER_ELEMENT === 1 && result_0.leaf.length === 32 && Array.isArray(result_0.path) && result_0.path.length === 8 && result_0.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean'))) {
      __compactRuntime.typeError('counterpartyPath',
                                 'return value',
                                 'remit_pool.compact line 105 char 1',
                                 'struct MerkleTreePath<leaf: Bytes<32>, path: Vector<8, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_22.toValue(result_0),
      alignment: _descriptor_22.alignment()
    });
    return result_0;
  }
  _auditSeed_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.auditSeed(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('auditSeed',
                                 'return value',
                                 'remit_pool.compact line 106 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _withdrawTo_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.withdrawTo(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && typeof(result_0.is_left) === 'boolean' && typeof(result_0.left) === 'object' && result_0.left.bytes.buffer instanceof ArrayBuffer && result_0.left.bytes.BYTES_PER_ELEMENT === 1 && result_0.left.bytes.length === 32 && typeof(result_0.right) === 'object' && result_0.right.bytes.buffer instanceof ArrayBuffer && result_0.right.bytes.BYTES_PER_ELEMENT === 1 && result_0.right.bytes.length === 32)) {
      __compactRuntime.typeError('withdrawTo',
                                 'return value',
                                 'remit_pool.compact line 107 char 1',
                                 'struct Either<is_left: Boolean, left: struct ContractAddress<bytes: Bytes<32>>, right: struct UserAddress<bytes: Bytes<32>>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_19.toValue(result_0),
      alignment: _descriptor_19.alignment()
    });
    return result_0;
  }
  _book_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.book(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 3 && result_0.every((t) => typeof(t) === 'object' && typeof(t.offer) === 'object' && typeof(t.offer.side) === 'bigint' && t.offer.side >= 0n && t.offer.side <= 255n && typeof(t.offer.baseAmount) === 'bigint' && t.offer.baseAmount >= 0n && t.offer.baseAmount <= 18446744073709551615n && typeof(t.offer.quoteAmount) === 'bigint' && t.offer.quoteAmount >= 0n && t.offer.quoteAmount <= 18446744073709551615n && t.offer.maker.buffer instanceof ArrayBuffer && t.offer.maker.BYTES_PER_ELEMENT === 1 && t.offer.maker.length === 32 && t.offer.payNonce.buffer instanceof ArrayBuffer && t.offer.payNonce.BYTES_PER_ELEMENT === 1 && t.offer.payNonce.length === 32 && typeof(t.offer.expiry) === 'bigint' && t.offer.expiry >= 0n && t.offer.expiry <= 18446744073709551615n && typeof(t.offer.minFillBase) === 'bigint' && t.offer.minFillBase >= 0n && t.offer.minFillBase <= 18446744073709551615n && t.rand.buffer instanceof ArrayBuffer && t.rand.BYTES_PER_ELEMENT === 1 && t.rand.length === 32 && typeof(t.live) === 'boolean'))) {
      __compactRuntime.typeError('book',
                                 'return value',
                                 'remit_pool.compact line 108 char 1',
                                 'Vector<3, struct OfferSlot<offer: struct Offer<side: Uint<0..256>, baseAmount: Uint<0..18446744073709551616>, quoteAmount: Uint<0..18446744073709551616>, maker: Bytes<32>, payNonce: Bytes<32>, expiry: Uint<0..18446744073709551616>, minFillBase: Uint<0..18446744073709551616>>, rand: Bytes<32>, live: Boolean>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_20.toValue(result_0),
      alignment: _descriptor_20.alignment()
    });
    return result_0;
  }
  _bookPaths_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.bookPaths(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 3 && result_0.every((t) => typeof(t) === 'object' && t.leaf.buffer instanceof ArrayBuffer && t.leaf.BYTES_PER_ELEMENT === 1 && t.leaf.length === 32 && Array.isArray(t.path) && t.path.length === 16 && t.path.every((t) => typeof(t) === 'object' && typeof(t.sibling) === 'object' && typeof(t.sibling.field) === 'bigint' && t.sibling.field >= 0 && t.sibling.field <= __compactRuntime.MAX_FIELD && typeof(t.goes_left) === 'boolean')))) {
      __compactRuntime.typeError('bookPaths',
                                 'return value',
                                 'remit_pool.compact line 109 char 1',
                                 'Vector<3, struct MerkleTreePath<leaf: Bytes<32>, path: Vector<16, struct MerkleTreePathEntry<sibling: struct MerkleTreeDigest<field: Field>, goes_left: Boolean>>>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_16.toValue(result_0),
      alignment: _descriptor_16.alignment()
    });
    return result_0;
  }
  _chosenIndex_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.chosenIndex(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 255n)) {
      __compactRuntime.typeError('chosenIndex',
                                 'return value',
                                 'remit_pool.compact line 110 char 1',
                                 'Uint<0..256>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_6.toValue(result_0),
      alignment: _descriptor_6.alignment()
    });
    return result_0;
  }
  _fillBase_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.fillBase(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('fillBase',
                                 'return value',
                                 'remit_pool.compact line 111 char 1',
                                 'Uint<0..18446744073709551616>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_5.toValue(result_0),
      alignment: _descriptor_5.alignment()
    });
    return result_0;
  }
  _fillQuote_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.fillQuote(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('fillQuote',
                                 'return value',
                                 'remit_pool.compact line 112 char 1',
                                 'Uint<0..18446744073709551616>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_5.toValue(result_0),
      alignment: _descriptor_5.alignment()
    });
    return result_0;
  }
  _ownerKey_0(sk_0) {
    return this._persistentHash_3([new Uint8Array([114, 101, 109, 105, 116, 58, 112, 107, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   sk_0]);
  }
  _executorKey_0(esk_0) {
    return this._persistentHash_3([new Uint8Array([114, 101, 109, 105, 116, 58, 101, 107, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   esk_0]);
  }
  _escrowKey_0(mandateId_0) {
    return this._persistentHash_3([new Uint8Array([114, 101, 109, 105, 116, 58, 109, 107, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   mandateId_0]);
  }
  _noteCommitment_0(note_0, nonce_0) {
    return this._persistentCommit_0(note_0, nonce_0);
  }
  _noteNullifier_0(sk_0, nonce_0) {
    return this._persistentHash_0([new Uint8Array([114, 101, 109, 105, 116, 58, 110, 117, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   sk_0,
                                   nonce_0]);
  }
  _offerCommitment_0(o_0, rand_0) {
    return this._persistentCommit_1(o_0, rand_0);
  }
  _offerNullifier_0(commit_0) {
    return this._persistentHash_3([new Uint8Array([114, 101, 109, 105, 116, 58, 111, 110, 117, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   commit_0]);
  }
  _mandateCommitment_0(m_0, rand_0) {
    return this._persistentCommit_2(m_0, rand_0);
  }
  _mandateRevocationTag_0(mandateId_0) {
    return this._persistentHash_3([new Uint8Array([114, 101, 109, 105, 116, 58, 109, 114, 101, 118, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   mandateId_0]);
  }
  _mandateStateCommitment_0(s_0, nonce_0) {
    return this._persistentCommit_3(s_0, nonce_0);
  }
  _mandateStateNullifier_0(mandateId_0, nonce_0) {
    return this._persistentHash_0([new Uint8Array([114, 101, 109, 105, 116, 58, 109, 115, 110, 117, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   mandateId_0,
                                   nonce_0]);
  }
  _fieldSalt_0(seed_0, idx_0) {
    return this._persistentHash_1([new Uint8Array([114, 101, 109, 105, 116, 58, 115, 97, 108, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   seed_0,
                                   idx_0]);
  }
  _auditRootOf_0(cs_0) { return this._persistentHash_2(cs_0); }
  _priceAtLeast_0(base_0, quote_0, num_0, den_0) {
    const t_0 = quote_0 * den_0; return t_0 >= base_0 * num_0;
  }
  _priceAtMost_0(base_0, quote_0, num_0, den_0) {
    const t_0 = quote_0 * den_0; return t_0 <= base_0 * num_0;
  }
  _residualPayNonceOf_0(n_0) {
    return this._persistentHash_3([new Uint8Array([114, 101, 109, 105, 116, 58, 114, 101, 115, 105, 100, 117, 97, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   n_0]);
  }
  _residualRandOf_0(rand_0) {
    return this._persistentHash_3([new Uint8Array([114, 101, 109, 105, 116, 58, 114, 114, 97, 110, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   rand_0]);
  }
  _minU64_0(a_0, b_0) { if (a_0 < b_0) { return a_0; } else { return b_0; } }
  _bytesLt_0(a_0, b_0) {
    if (!this._equal_1(BigInt(a_0[0n]), BigInt(b_0[0n]))) {
      const t_0 = BigInt(a_0[0n]); return t_0 < BigInt(b_0[0n]);
    } else {
      if (!this._equal_2(BigInt(a_0[1n]), BigInt(b_0[1n]))) {
        const t_1 = BigInt(a_0[1n]); return t_1 < BigInt(b_0[1n]);
      } else {
        if (!this._equal_3(BigInt(a_0[2n]), BigInt(b_0[2n]))) {
          const t_2 = BigInt(a_0[2n]); return t_2 < BigInt(b_0[2n]);
        } else {
          if (!this._equal_4(BigInt(a_0[3n]), BigInt(b_0[3n]))) {
            const t_3 = BigInt(a_0[3n]); return t_3 < BigInt(b_0[3n]);
          } else {
            if (!this._equal_5(BigInt(a_0[4n]), BigInt(b_0[4n]))) {
              const t_4 = BigInt(a_0[4n]); return t_4 < BigInt(b_0[4n]);
            } else {
              if (!this._equal_6(BigInt(a_0[5n]), BigInt(b_0[5n]))) {
                const t_5 = BigInt(a_0[5n]); return t_5 < BigInt(b_0[5n]);
              } else {
                if (!this._equal_7(BigInt(a_0[6n]), BigInt(b_0[6n]))) {
                  const t_6 = BigInt(a_0[6n]); return t_6 < BigInt(b_0[6n]);
                } else {
                  if (!this._equal_8(BigInt(a_0[7n]), BigInt(b_0[7n]))) {
                    const t_7 = BigInt(a_0[7n]); return t_7 < BigInt(b_0[7n]);
                  } else {
                    if (!this._equal_9(BigInt(a_0[8n]), BigInt(b_0[8n]))) {
                      const t_8 = BigInt(a_0[8n]); return t_8 < BigInt(b_0[8n]);
                    } else {
                      if (!this._equal_10(BigInt(a_0[9n]), BigInt(b_0[9n]))) {
                        const t_9 = BigInt(a_0[9n]);
                        return t_9 < BigInt(b_0[9n]);
                      } else {
                        if (!this._equal_11(BigInt(a_0[10n]), BigInt(b_0[10n])))
                        {
                          const t_10 = BigInt(a_0[10n]);
                          return t_10 < BigInt(b_0[10n]);
                        } else {
                          if (!this._equal_12(BigInt(a_0[11n]), BigInt(b_0[11n])))
                          {
                            const t_11 = BigInt(a_0[11n]);
                            return t_11 < BigInt(b_0[11n]);
                          } else {
                            if (!this._equal_13(BigInt(a_0[12n]),
                                                BigInt(b_0[12n])))
                            {
                              const t_12 = BigInt(a_0[12n]);
                              return t_12 < BigInt(b_0[12n]);
                            } else {
                              if (!this._equal_14(BigInt(a_0[13n]),
                                                  BigInt(b_0[13n])))
                              {
                                const t_13 = BigInt(a_0[13n]);
                                return t_13 < BigInt(b_0[13n]);
                              } else {
                                if (!this._equal_15(BigInt(a_0[14n]),
                                                    BigInt(b_0[14n])))
                                {
                                  const t_14 = BigInt(a_0[14n]);
                                  return t_14 < BigInt(b_0[14n]);
                                } else {
                                  if (!this._equal_16(BigInt(a_0[15n]),
                                                      BigInt(b_0[15n])))
                                  {
                                    const t_15 = BigInt(a_0[15n]);
                                    return t_15 < BigInt(b_0[15n]);
                                  } else {
                                    if (!this._equal_17(BigInt(a_0[16n]),
                                                        BigInt(b_0[16n])))
                                    {
                                      const t_16 = BigInt(a_0[16n]);
                                      return t_16 < BigInt(b_0[16n]);
                                    } else {
                                      if (!this._equal_18(BigInt(a_0[17n]),
                                                          BigInt(b_0[17n])))
                                      {
                                        const t_17 = BigInt(a_0[17n]);
                                        return t_17 < BigInt(b_0[17n]);
                                      } else {
                                        if (!this._equal_19(BigInt(a_0[18n]),
                                                            BigInt(b_0[18n])))
                                        {
                                          const t_18 = BigInt(a_0[18n]);
                                          return t_18 < BigInt(b_0[18n]);
                                        } else {
                                          if (!this._equal_20(BigInt(a_0[19n]),
                                                              BigInt(b_0[19n])))
                                          {
                                            const t_19 = BigInt(a_0[19n]);
                                            return t_19 < BigInt(b_0[19n]);
                                          } else {
                                            if (!this._equal_21(BigInt(a_0[20n]),
                                                                BigInt(b_0[20n])))
                                            {
                                              const t_20 = BigInt(a_0[20n]);
                                              return t_20 < BigInt(b_0[20n]);
                                            } else {
                                              if (!this._equal_22(BigInt(a_0[21n]),
                                                                  BigInt(b_0[21n])))
                                              {
                                                const t_21 = BigInt(a_0[21n]);
                                                return t_21 < BigInt(b_0[21n]);
                                              } else {
                                                if (!this._equal_23(BigInt(a_0[22n]),
                                                                    BigInt(b_0[22n])))
                                                {
                                                  const t_22 = BigInt(a_0[22n]);
                                                  return t_22 < BigInt(b_0[22n]);
                                                } else {
                                                  if (!this._equal_24(BigInt(a_0[23n]),
                                                                      BigInt(b_0[23n])))
                                                  {
                                                    const t_23 = BigInt(a_0[23n]);
                                                    return t_23
                                                           <
                                                           BigInt(b_0[23n]);
                                                  } else {
                                                    if (!this._equal_25(BigInt(a_0[24n]),
                                                                        BigInt(b_0[24n])))
                                                    {
                                                      const t_24 = BigInt(a_0[24n]);
                                                      return t_24
                                                             <
                                                             BigInt(b_0[24n]);
                                                    } else {
                                                      if (!this._equal_26(BigInt(a_0[25n]),
                                                                          BigInt(b_0[25n])))
                                                      {
                                                        const t_25 = BigInt(a_0[25n]);
                                                        return t_25
                                                               <
                                                               BigInt(b_0[25n]);
                                                      } else {
                                                        if (!this._equal_27(BigInt(a_0[26n]),
                                                                            BigInt(b_0[26n])))
                                                        {
                                                          const t_26 = BigInt(a_0[26n]);
                                                          return t_26
                                                                 <
                                                                 BigInt(b_0[26n]);
                                                        } else {
                                                          if (!this._equal_28(BigInt(a_0[27n]),
                                                                              BigInt(b_0[27n])))
                                                          {
                                                            const t_27 = BigInt(a_0[27n]);
                                                            return t_27
                                                                   <
                                                                   BigInt(b_0[27n]);
                                                          } else {
                                                            if (!this._equal_29(BigInt(a_0[28n]),
                                                                                BigInt(b_0[28n])))
                                                            {
                                                              const t_28 = BigInt(a_0[28n]);
                                                              return t_28
                                                                     <
                                                                     BigInt(b_0[28n]);
                                                            } else {
                                                              if (!this._equal_30(BigInt(a_0[29n]),
                                                                                  BigInt(b_0[29n])))
                                                              {
                                                                const t_29 = BigInt(a_0[29n]);
                                                                return t_29
                                                                       <
                                                                       BigInt(b_0[29n]);
                                                              } else {
                                                                if (!this._equal_31(BigInt(a_0[30n]),
                                                                                    BigInt(b_0[30n])))
                                                                {
                                                                  const t_30 = BigInt(a_0[30n]);
                                                                  return t_30
                                                                         <
                                                                         BigInt(b_0[30n]);
                                                                } else {
                                                                  if (!this._equal_32(BigInt(a_0[31n]),
                                                                                      BigInt(b_0[31n])))
                                                                  {
                                                                    const t_31 = BigInt(a_0[31n]);
                                                                    return t_31
                                                                           <
                                                                           BigInt(b_0[31n]);
                                                                  } else {
                                                                    return false;
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  _fillableBaseOf_0(o_0, maxFillBase_0, remaining_0, side_0) {
    const cap_0 = this._minU64_0(o_0.baseAmount, maxFillBase_0);
    if (this._equal_33(side_0, 0n)) {
      return this._minU64_0(cap_0, remaining_0);
    } else {
      return cap_0;
    }
  }
  _betterPrice_0(a_0, b_0, side_0) {
    if (this._equal_34(side_0, 0n)) {
      const t_0 = a_0.quoteAmount * b_0.baseAmount;
      return t_0 > b_0.quoteAmount * a_0.baseAmount;
    } else {
      const t_1 = a_0.quoteAmount * b_0.baseAmount;
      return t_1 < b_0.quoteAmount * a_0.baseAmount;
    }
  }
  _samePrice_0(a_0, b_0) {
    return this._equal_35(a_0.quoteAmount * b_0.baseAmount,
                          b_0.quoteAmount * a_0.baseAmount);
  }
  _colorOf_0(context, partialProofData, asset_0) {
    if (this._equal_36(asset_0, 0n)) {
      return this._nativeToken_0();
    } else {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_6.toValue(0n),
                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  }
  _consumeNote_0(context, partialProofData, sk_0) {
    const note_0 = this._spendNote_0(context, partialProofData);
    const nonce_0 = this._spendNoteNonce_0(context, partialProofData);
    const path_0 = this._spendNotePath_0(context, partialProofData);
    __compactRuntime.assert(this._equal_37(note_0.owner, this._ownerKey_0(sk_0)),
                            'not your note');
    __compactRuntime.assert(this._equal_38(path_0.leaf,
                                           this._noteCommitment_0(note_0,
                                                                  nonce_0)),
                            'path/note mismatch');
    let tmp_0;
    __compactRuntime.assert((tmp_0 = this._merkleTreePathRoot_1(path_0),
                             _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(1n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(2n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_0),
                                                                                                                                               alignment: _descriptor_2.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'unknown note');
    const nul_0 = this._noteNullifier_0(sk_0, nonce_0);
    __compactRuntime.assert(!_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(2n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nul_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'note already spent');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(2n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nul_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return note_0;
  }
  _mintNote_0(context, partialProofData, asset_0, amount_0, owner_0, nonce_0) {
    const tmp_0 = this._noteCommitment_0({ asset: asset_0,
                                           amount: amount_0,
                                           owner: owner_0 },
                                         nonce_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(1n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(1n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.leafHash(
                                                                                              { value: _descriptor_0.toValue(tmp_0),
                                                                                                alignment: _descriptor_0.alignment() }
                                                                                            )).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(1n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { addi: { immediate: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(2n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    return [];
  }
  _slotEligible_0(s_0, m_0, nowBound_0, remaining_0) {
    const o_0 = s_0.offer;
    const priceOk_0 = this._equal_39(m_0.side, 0n) ?
                      this._priceAtLeast_0(o_0.baseAmount,
                                           o_0.quoteAmount,
                                           m_0.limitNum,
                                           m_0.limitDen)
                      :
                      this._priceAtMost_0(o_0.baseAmount,
                                          o_0.quoteAmount,
                                          m_0.limitNum,
                                          m_0.limitDen);
    const cap_0 = this._minU64_0(o_0.baseAmount, m_0.maxFillBase);
    let t_0, t_1;
    const fullBudget_0 = this._equal_40(m_0.side, 0n) ?
                         (t_0 = o_0.baseAmount, t_0 <= remaining_0) :
                         (t_1 = o_0.quoteAmount, t_1 <= remaining_0);
    const fullOk_0 = this._equal_41(cap_0, o_0.baseAmount) && fullBudget_0;
    const minSlice_0 = o_0.minFillBase;
    let t_2;
    const sliceBudget_0 = this._equal_42(m_0.side, 0n) ?
                          minSlice_0 <= remaining_0 :
                          (t_2 = minSlice_0 * o_0.quoteAmount,
                           t_2 <= remaining_0 * o_0.baseAmount);
    const sliceOk_0 = minSlice_0 > 0n && minSlice_0 <= cap_0 && sliceBudget_0;
    let t_3, t_4;
    return s_0.live && (t_4 = o_0.baseAmount, t_4 > 0n)
           &&
           (t_3 = o_0.quoteAmount, t_3 > 0n)
           &&
           !this._equal_43(o_0.side, m_0.side)
           &&
           nowBound_0 <= o_0.expiry
           &&
           priceOk_0
           &&
           (fullOk_0 || sliceOk_0);
  }
  _strictlyBetter_0(a_0, b_0, m_0, remaining_0) {
    const oa_0 = a_0.offer;
    const ob_0 = b_0.offer;
    const fa_0 = this._fillableBaseOf_0(oa_0,
                                        m_0.maxFillBase,
                                        remaining_0,
                                        m_0.side);
    const fb_0 = this._fillableBaseOf_0(ob_0,
                                        m_0.maxFillBase,
                                        remaining_0,
                                        m_0.side);
    const ca_0 = this._offerCommitment_0(oa_0, a_0.rand);
    const cb_0 = this._offerCommitment_0(ob_0, b_0.rand);
    return this._betterPrice_0(oa_0, ob_0, m_0.side)
           ||
           this._samePrice_0(oa_0, ob_0) && fa_0 > fb_0
           ||
           this._samePrice_0(oa_0, ob_0) && this._equal_44(fa_0, fb_0)
           &&
           this._bytesLt_0(ca_0, cb_0);
  }
  _notDominated_0(challenger_0, winner_0, chEl_0, m_0, remaining_0) {
    return !chEl_0
           ||
           !this._strictlyBetter_0(challenger_0, winner_0, m_0, remaining_0);
  }
  _bindSlot_0(context, partialProofData, s_0, p_0) {
    __compactRuntime.assert(this._equal_45(p_0.leaf,
                                           this._offerCommitment_0(s_0.offer,
                                                                   s_0.rand)),
                            'offer path mismatch');
    let tmp_0;
    __compactRuntime.assert((tmp_0 = this._merkleTreePathRoot_1(p_0),
                             _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(3n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(2n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_0),
                                                                                                                                               alignment: _descriptor_2.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'unknown offer');
    return [];
  }
  _deposit_0(context, partialProofData, asset_0, amount_0) {
    __compactRuntime.assert(asset_0 <= 1n, 'bad asset');
    __compactRuntime.assert(amount_0 > 0n, 'zero amount');
    const a_0 = asset_0;
    this._receiveUnshielded_0(context,
                              partialProofData,
                              this._colorOf_0(context, partialProofData, a_0),
                              amount_0);
    this._mintNote_0(context,
                     partialProofData,
                     a_0,
                     amount_0,
                     this._ownerKey_0(this._ownerSecret_0(context,
                                                          partialProofData)),
                     this._freshNonce_0(context, partialProofData));
    return [];
  }
  _withdraw_0(context, partialProofData, asset_0, amount_0) {
    const sk_0 = this._ownerSecret_0(context, partialProofData);
    const note_0 = this._consumeNote_0(context, partialProofData, sk_0);
    const a_0 = asset_0;
    __compactRuntime.assert(this._equal_46(note_0.asset, a_0), 'wrong asset');
    let t_0;
    __compactRuntime.assert((t_0 = note_0.amount, t_0 >= amount_0),
                            'insufficient note');
    this._sendUnshielded_0(context,
                           partialProofData,
                           this._colorOf_0(context, partialProofData, a_0),
                           amount_0,
                           this._withdrawTo_0(context, partialProofData));
    let t_1;
    this._mintNote_0(context,
                     partialProofData,
                     a_0,
                     (t_1 = note_0.amount,
                      (__compactRuntime.assert(t_1 >= amount_0,
                                               'result of subtraction would be negative'),
                       t_1 - amount_0)),
                     note_0.owner,
                     this._freshNonce_0(context, partialProofData));
    return [];
  }
  _placeOffer_0(context, partialProofData) {
    const sk_0 = this._ownerSecret_0(context, partialProofData);
    const o_0 = this._offerData_0(context, partialProofData);
    const rand_0 = this._offerRand_0(context, partialProofData);
    const note_0 = this._consumeNote_0(context, partialProofData, sk_0);
    __compactRuntime.assert(this._equal_47(o_0.maker, this._ownerKey_0(sk_0)),
                            'offer maker must be caller');
    let t_0; __compactRuntime.assert((t_0 = o_0.side, t_0 <= 1n), 'bad side');
    let t_1, t_2;
    __compactRuntime.assert((t_2 = o_0.baseAmount, t_2 > 0n)
                            &&
                            (t_1 = o_0.quoteAmount, t_1 > 0n),
                            'zero amounts');
    let t_3;
    __compactRuntime.assert((t_3 = o_0.expiry, t_3 > 0n),
                            'offer expiry required');
    let t_4;
    __compactRuntime.assert((t_4 = o_0.minFillBase, t_4 > 0n),
                            'minFill required');
    let t_5;
    __compactRuntime.assert((t_5 = o_0.minFillBase, t_5 <= o_0.baseAmount),
                            'minFill exceeds size');
    const escrowAsset_0 = this._equal_48(o_0.side, 0n) ? 0n : 1n;
    const escrowAmount_0 = this._equal_49(o_0.side, 0n) ?
                           o_0.baseAmount :
                           o_0.quoteAmount;
    __compactRuntime.assert(this._equal_50(note_0.asset, escrowAsset_0),
                            'escrow wrong asset');
    let t_6;
    __compactRuntime.assert((t_6 = note_0.amount, t_6 >= escrowAmount_0),
                            'escrow too small');
    let t_7;
    this._mintNote_0(context,
                     partialProofData,
                     note_0.asset,
                     (t_7 = note_0.amount,
                      (__compactRuntime.assert(t_7 >= escrowAmount_0,
                                               'result of subtraction would be negative'),
                       t_7 - escrowAmount_0)),
                     note_0.owner,
                     this._freshNonce_0(context, partialProofData));
    const tmp_0 = this._offerCommitment_0(o_0, rand_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(3n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(1n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.leafHash(
                                                                                              { value: _descriptor_0.toValue(tmp_0),
                                                                                                alignment: _descriptor_0.alignment() }
                                                                                            )).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(1n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { addi: { immediate: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(2n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_1 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(10n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_4.toValue(tmp_1),
                                                                alignment: _descriptor_4.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _cancelOffer_0(context, partialProofData) {
    const sk_0 = this._ownerSecret_0(context, partialProofData);
    const o_0 = this._offerData_0(context, partialProofData);
    const rand_0 = this._offerRand_0(context, partialProofData);
    const p_0 = this._offerPath_0(context, partialProofData);
    __compactRuntime.assert(this._equal_51(o_0.maker, this._ownerKey_0(sk_0)),
                            'not your offer');
    const c_0 = this._offerCommitment_0(o_0, rand_0);
    __compactRuntime.assert(this._equal_52(p_0.leaf, c_0), 'offer path mismatch');
    let tmp_0;
    __compactRuntime.assert((tmp_0 = this._merkleTreePathRoot_1(p_0),
                             _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(3n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(2n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_0),
                                                                                                                                               alignment: _descriptor_2.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'unknown offer');
    const nul_0 = this._offerNullifier_0(c_0);
    __compactRuntime.assert(!_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(4n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nul_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'offer already used');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(4n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(nul_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const escrowAsset_0 = this._equal_53(o_0.side, 0n) ? 0n : 1n;
    const escrowAmount_0 = this._equal_54(o_0.side, 0n) ?
                           o_0.baseAmount :
                           o_0.quoteAmount;
    this._mintNote_0(context,
                     partialProofData,
                     escrowAsset_0,
                     escrowAmount_0,
                     o_0.maker,
                     this._freshNonce_0(context, partialProofData));
    const tmp_1 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(10n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { subi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_4.toValue(tmp_1),
                                                                alignment: _descriptor_4.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _createMandate_0(context, partialProofData) {
    const sk_0 = this._ownerSecret_0(context, partialProofData);
    const m_0 = this._mandateData_0(context, partialProofData);
    const rand_0 = this._mandateRand_0(context, partialProofData);
    const note_0 = this._consumeNote_0(context, partialProofData, sk_0);
    __compactRuntime.assert(this._equal_55(m_0.principal, this._ownerKey_0(sk_0)),
                            'mandate principal must be caller');
    let t_0; __compactRuntime.assert((t_0 = m_0.side, t_0 <= 1n), 'bad side');
    let t_1;
    __compactRuntime.assert((t_1 = m_0.maxFillBase, t_1 > 0n), 'zero max fill');
    let t_2;
    __compactRuntime.assert((t_2 = m_0.limitDen, t_2 > 0n),
                            'zero limit denominator');
    const escrowAsset_0 = this._equal_56(m_0.side, 0n) ? 0n : 1n;
    __compactRuntime.assert(this._equal_57(note_0.asset, escrowAsset_0),
                            'escrow wrong asset');
    let t_3;
    __compactRuntime.assert((t_3 = note_0.amount, t_3 > 0n), 'empty escrow');
    const tmp_0 = this._mandateCommitment_0(m_0, rand_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(5n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(1n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.leafHash(
                                                                                              { value: _descriptor_0.toValue(tmp_0),
                                                                                                alignment: _descriptor_0.alignment() }
                                                                                            )).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(1n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { addi: { immediate: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(2n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_1 = this._mandateStateCommitment_0({ mandateId: m_0.mandateId,
                                                   remaining: note_0.amount },
                                                 this._freshNonce_0(context,
                                                                    partialProofData));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(7n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(1n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.leafHash(
                                                                                              { value: _descriptor_0.toValue(tmp_1),
                                                                                                alignment: _descriptor_0.alignment() }
                                                                                            )).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(1n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { addi: { immediate: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(2n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_2 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(11n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_4.toValue(tmp_2),
                                                                alignment: _descriptor_4.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _revokeMandate_0(context, partialProofData) {
    const sk_0 = this._ownerSecret_0(context, partialProofData);
    const m_0 = this._mandateData_0(context, partialProofData);
    const rand_0 = this._mandateRand_0(context, partialProofData);
    const mp_0 = this._mandatePath_0(context, partialProofData);
    __compactRuntime.assert(this._equal_58(m_0.principal, this._ownerKey_0(sk_0)),
                            'not your mandate');
    const mc_0 = this._mandateCommitment_0(m_0, rand_0);
    __compactRuntime.assert(this._equal_59(mp_0.leaf, mc_0),
                            'mandate path mismatch');
    let tmp_0;
    __compactRuntime.assert((tmp_0 = this._merkleTreePathRoot_1(mp_0),
                             _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(5n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(2n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_0),
                                                                                                                                               alignment: _descriptor_2.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'unknown mandate');
    const rev_0 = this._mandateRevocationTag_0(m_0.mandateId);
    __compactRuntime.assert(!_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(6n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(rev_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'already revoked');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(6n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(rev_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const s_0 = this._mandateStateData_0(context, partialProofData);
    const sn_0 = this._mandateStateNonce_0(context, partialProofData);
    const sp_0 = this._mandateStatePath_0(context, partialProofData);
    __compactRuntime.assert(this._equal_60(s_0.mandateId, m_0.mandateId),
                            'state/mandate mismatch');
    __compactRuntime.assert(this._equal_61(sp_0.leaf,
                                           this._mandateStateCommitment_0(s_0,
                                                                          sn_0)),
                            'state path mismatch');
    let tmp_1;
    __compactRuntime.assert((tmp_1 = this._merkleTreePathRoot_1(sp_0),
                             _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(7n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(2n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_1),
                                                                                                                                               alignment: _descriptor_2.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'unknown state');
    const snul_0 = this._mandateStateNullifier_0(s_0.mandateId, sn_0);
    __compactRuntime.assert(!_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(8n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(snul_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'state already consumed');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(8n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(snul_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const escrowAsset_0 = this._equal_62(m_0.side, 0n) ? 0n : 1n;
    this._mintNote_0(context,
                     partialProofData,
                     escrowAsset_0,
                     s_0.remaining,
                     m_0.principal,
                     this._freshNonce_0(context, partialProofData));
    const tmp_2 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(11n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { subi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_4.toValue(tmp_2),
                                                                alignment: _descriptor_4.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _fill_0(context, partialProofData, nowBound_0) {
    __compactRuntime.assert(nowBound_0 > 0n, 'nowBound required');
    const esk_0 = this._executorSecret_0(context, partialProofData);
    const m_0 = this._mandateData_0(context, partialProofData);
    const mrand_0 = this._mandateRand_0(context, partialProofData);
    const mp_0 = this._mandatePath_0(context, partialProofData);
    __compactRuntime.assert(this._equal_63(m_0.executor,
                                           this._executorKey_0(esk_0)),
                            'not the mandated executor');
    const mc_0 = this._mandateCommitment_0(m_0, mrand_0);
    __compactRuntime.assert(this._equal_64(mp_0.leaf, mc_0),
                            'mandate path mismatch');
    let tmp_0;
    __compactRuntime.assert((tmp_0 = this._merkleTreePathRoot_1(mp_0),
                             _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(5n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(2n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_0),
                                                                                                                                               alignment: _descriptor_2.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'unknown mandate');
    let tmp_1;
    __compactRuntime.assert(!(tmp_1 = this._mandateRevocationTag_0(m_0.mandateId),
                              _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                        partialProofData,
                                                                                        [
                                                                                         { dup: { n: 0 } },
                                                                                         { idx: { cached: false,
                                                                                                  pushPath: false,
                                                                                                  path: [
                                                                                                         { tag: 'value',
                                                                                                           value: { value: _descriptor_6.toValue(6n),
                                                                                                                    alignment: _descriptor_6.alignment() } }] } },
                                                                                         { push: { storage: false,
                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                                                         'member',
                                                                                         { popeq: { cached: true,
                                                                                                    result: undefined } }]).value)),
                            'mandate revoked');
    __compactRuntime.assert(this._blockTimeLt_0(context,
                                                partialProofData,
                                                nowBound_0),
                            'nowBound must be in the future');
    __compactRuntime.assert(nowBound_0 <= m_0.expiry, 'mandate expired');
    const s_0 = this._mandateStateData_0(context, partialProofData);
    const sn_0 = this._mandateStateNonce_0(context, partialProofData);
    const sp_0 = this._mandateStatePath_0(context, partialProofData);
    __compactRuntime.assert(this._equal_65(s_0.mandateId, m_0.mandateId),
                            'state/mandate mismatch');
    __compactRuntime.assert(this._equal_66(sp_0.leaf,
                                           this._mandateStateCommitment_0(s_0,
                                                                          sn_0)),
                            'state path mismatch');
    let tmp_2;
    __compactRuntime.assert((tmp_2 = this._merkleTreePathRoot_1(sp_0),
                             _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(7n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(2n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_2),
                                                                                                                                               alignment: _descriptor_2.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value)),
                            'unknown state');
    const snul_0 = this._mandateStateNullifier_0(s_0.mandateId, sn_0);
    __compactRuntime.assert(!_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(8n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(snul_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'state already consumed');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(8n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(snul_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const slots_0 = this._book_0(context, partialProofData);
    const paths_0 = this._bookPaths_0(context, partialProofData);
    this._bindSlot_0(context, partialProofData, slots_0[0], paths_0[0]);
    this._bindSlot_0(context, partialProofData, slots_0[1], paths_0[1]);
    this._bindSlot_0(context, partialProofData, slots_0[2], paths_0[2]);
    const idx_0 = this._chosenIndex_0(context, partialProofData);
    __compactRuntime.assert(idx_0 < 3n, 'chosen index out of range');
    const q_0 = this._equal_67(idx_0, 0n) ?
                slots_0[0] :
                this._equal_68(idx_0, 1n) ? slots_0[1] : slots_0[2];
    const el0_0 = this._slotEligible_0(slots_0[0],
                                       m_0,
                                       nowBound_0,
                                       s_0.remaining);
    const el1_0 = this._slotEligible_0(slots_0[1],
                                       m_0,
                                       nowBound_0,
                                       s_0.remaining);
    const el2_0 = this._slotEligible_0(slots_0[2],
                                       m_0,
                                       nowBound_0,
                                       s_0.remaining);
    const elSel_0 = this._equal_69(idx_0, 0n) ?
                    el0_0 :
                    this._equal_70(idx_0, 1n) ? el1_0 : el2_0;
    __compactRuntime.assert(q_0.live, 'chosen slot is empty');
    const o_0 = q_0.offer;
    const orand_0 = q_0.rand;
    let t_0, t_1;
    __compactRuntime.assert((t_1 = o_0.baseAmount, t_1 > 0n)
                            &&
                            (t_0 = o_0.quoteAmount, t_0 > 0n),
                            'zero amounts');
    __compactRuntime.assert(!this._equal_71(o_0.side, m_0.side),
                            'offer must be on the opposite side');
    __compactRuntime.assert(nowBound_0 <= o_0.expiry, 'offer expired');
    const priceOk_0 = this._equal_72(m_0.side, 0n) ?
                      this._priceAtLeast_0(o_0.baseAmount,
                                           o_0.quoteAmount,
                                           m_0.limitNum,
                                           m_0.limitDen)
                      :
                      this._priceAtMost_0(o_0.baseAmount,
                                          o_0.quoteAmount,
                                          m_0.limitNum,
                                          m_0.limitDen);
    __compactRuntime.assert(priceOk_0, 'price outside mandate limit');
    __compactRuntime.assert(elSel_0, 'selected slot is not eligible');
    __compactRuntime.assert(this._notDominated_0(slots_0[0],
                                                 q_0,
                                                 el0_0,
                                                 m_0,
                                                 s_0.remaining),
                            'slot 0 is strictly better');
    __compactRuntime.assert(this._notDominated_0(slots_0[1],
                                                 q_0,
                                                 el1_0,
                                                 m_0,
                                                 s_0.remaining),
                            'slot 1 is strictly better');
    __compactRuntime.assert(this._notDominated_0(slots_0[2],
                                                 q_0,
                                                 el2_0,
                                                 m_0,
                                                 s_0.remaining),
                            'slot 2 is strictly better');
    const oc_0 = this._offerCommitment_0(o_0, orand_0);
    const onul_0 = this._offerNullifier_0(oc_0);
    __compactRuntime.assert(!_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_6.toValue(4n),
                                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(onul_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'offer already used');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(4n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(onul_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const fb_0 = this._fillBase_0(context, partialProofData);
    const fq_0 = this._fillQuote_0(context, partialProofData);
    __compactRuntime.assert(fb_0 > 0n, 'zero fill base');
    __compactRuntime.assert(fb_0 <= o_0.baseAmount, 'fill exceeds offer base');
    __compactRuntime.assert(fb_0 <= m_0.maxFillBase, 'fill exceeds per-fill cap');
    __compactRuntime.assert(this._equal_73(fb_0, o_0.baseAmount)
                            ||
                            fb_0 >= o_0.minFillBase,
                            'below minFill');
    __compactRuntime.assert(this._equal_74(fq_0 * o_0.baseAmount,
                                           fb_0 * o_0.quoteAmount),
                            'fill ratio mismatch');
    const principalPays_0 = this._equal_75(m_0.side, 0n) ? fb_0 : fq_0;
    const principalGets_0 = this._equal_76(m_0.side, 0n) ? fq_0 : fb_0;
    __compactRuntime.assert(principalPays_0 <= s_0.remaining,
                            'fill exceeds remaining budget');
    const anyCp_0 = m_0.cpRoot === 0n;
    const cpp_0 = this._counterpartyPath_0(context, partialProofData);
    const cpOk_0 = anyCp_0
                   ||
                   this._equal_77(cpp_0.leaf, o_0.maker)
                   &&
                   this._merkleTreePathRoot_0(cpp_0).field === m_0.cpRoot;
    __compactRuntime.assert(cpOk_0, 'counterparty not allowed');
    let t_2, t_3;
    const residual_0 = { side: o_0.side,
                         baseAmount:
                           (t_2 = o_0.baseAmount,
                            (__compactRuntime.assert(t_2 >= fb_0,
                                                     'result of subtraction would be negative'),
                             t_2 - fb_0)),
                         quoteAmount:
                           (t_3 = o_0.quoteAmount,
                            (__compactRuntime.assert(t_3 >= fq_0,
                                                     'result of subtraction would be negative'),
                             t_3 - fq_0)),
                         maker: o_0.maker,
                         payNonce: this._residualPayNonceOf_0(o_0.payNonce),
                         expiry: o_0.expiry,
                         minFillBase: o_0.minFillBase };
    const tmp_3 = this._offerCommitment_0(residual_0,
                                          this._residualRandOf_0(orand_0));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(3n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(1n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.leafHash(
                                                                                              { value: _descriptor_0.toValue(tmp_3),
                                                                                                alignment: _descriptor_0.alignment() }
                                                                                            )).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(1n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { addi: { immediate: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(2n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const payAsset_0 = this._equal_78(m_0.side, 0n) ? 0n : 1n;
    const getAsset_0 = this._equal_79(m_0.side, 0n) ? 1n : 0n;
    this._mintNote_0(context,
                     partialProofData,
                     payAsset_0,
                     principalPays_0,
                     o_0.maker,
                     o_0.payNonce);
    this._mintNote_0(context,
                     partialProofData,
                     getAsset_0,
                     principalGets_0,
                     m_0.principal,
                     this._freshNonce_0(context, partialProofData));
    let t_4;
    const tmp_4 = this._mandateStateCommitment_0({ mandateId: m_0.mandateId,
                                                   remaining:
                                                     (t_4 = s_0.remaining,
                                                      (__compactRuntime.assert(t_4
                                                                               >=
                                                                               principalPays_0,
                                                                               'result of subtraction would be negative'),
                                                       t_4 - principalPays_0)) },
                                                 this._freshNonce2_0(context,
                                                                     partialProofData));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(7n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(1n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.leafHash(
                                                                                              { value: _descriptor_0.toValue(tmp_4),
                                                                                                alignment: _descriptor_0.alignment() }
                                                                                            )).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(1n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { addi: { immediate: 1 } },
                                       { ins: { cached: true, n: 1 } },
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(2n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(0n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       'root',
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 2 } }]);
    const seed_0 = this._auditSeed_0(context, partialProofData);
    const cs_0 = [this._persistentCommit_6(o_0.side,
                                           this._fieldSalt_0(seed_0, 0n)),
                  this._persistentCommit_5(fb_0, this._fieldSalt_0(seed_0, 1n)),
                  this._persistentCommit_5(fq_0, this._fieldSalt_0(seed_0, 2n)),
                  this._persistentCommit_4(m_0.principal,
                                           this._fieldSalt_0(seed_0, 3n)),
                  this._persistentCommit_4(o_0.maker,
                                           this._fieldSalt_0(seed_0, 4n)),
                  this._persistentCommit_4(m_0.mandateId,
                                           this._fieldSalt_0(seed_0, 5n))];
    const tmp_5 = this._auditRootOf_0(cs_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(9n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { dup: { n: 0 } },
                                       { idx: { cached: false,
                                                pushPath: false,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(2n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { addi: { immediate: 1 } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newArray()
                                                          .arrayPush(__compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_5),
                                                                                                           alignment: _descriptor_0.alignment() })).arrayPush(__compactRuntime.StateValue.newNull()).arrayPush(__compactRuntime.StateValue.newNull())
                                                          .encode() } },
                                       { swap: { n: 0 } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(2n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       { ins: { cached: true, n: 1 } },
                                       { swap: { n: 0 } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(1n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       { ins: { cached: true, n: 2 } }]);
    const tmp_6 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_6.toValue(12n),
                                                                  alignment: _descriptor_6.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_4.toValue(tmp_6),
                                                                alignment: _descriptor_4.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _folder_0(f, x, a0) {
    for (let i = 0; i < 8; i++) { x = f(x, a0[i]); }
    return x;
  }
  _folder_1(f, x, a0) {
    for (let i = 0; i < 16; i++) { x = f(x, a0[i]); }
    return x;
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_5(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_6(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_7(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_8(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_9(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_10(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_11(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_12(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_13(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_14(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_15(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_16(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_17(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_18(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_19(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_20(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_21(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_22(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_23(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_24(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_25(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_26(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_27(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_28(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_29(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_30(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_31(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_32(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_33(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_34(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_35(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_36(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_37(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_38(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_39(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_40(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_41(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_42(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_43(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_44(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_45(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_46(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_47(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_48(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_49(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_50(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_51(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_52(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_53(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_54(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_55(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_56(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_57(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_58(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_59(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_60(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_61(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_62(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_63(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_64(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_65(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_66(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_67(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_68(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_69(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_70(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_71(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_72(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_73(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_74(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_75(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_76(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_77(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_78(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_79(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get quoteColor() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_6.toValue(0n),
                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    notes: {
      isFull(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isFull: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(1n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(1n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(65536n),
                                                                                                                                 alignment: _descriptor_5.alignment() }).encode() } },
                                                                          'lt',
                                                                          'neg',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      checkRoot(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`checkRoot: expected 1 argument, received ${args_0.length}`);
        }
        const rt_0 = args_0[0];
        if (!(typeof(rt_0) === 'object' && typeof(rt_0.field) === 'bigint' && rt_0.field >= 0 && rt_0.field <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('checkRoot',
                                     'argument 1',
                                     'remit_pool.compact line 72 char 1',
                                     'struct MerkleTreeDigest<field: Field>',
                                     rt_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(1n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(2n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(rt_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      root(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`root: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1];
        return ((result) => result             ? __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(result)             : undefined)(self_0.asArray()[0].asBoundedMerkleTree().rehash().root()?.value);
      },
      firstFree(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`first_free: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1];
        return __compactRuntime.CompactTypeField.fromValue(self_0.asArray()[1].asCell().value);
      },
      pathForLeaf(...args_0) {
        if (args_0.length !== 2) {
          throw new __compactRuntime.CompactError(`path_for_leaf: expected 2 arguments, received ${args_0.length}`);
        }
        const index_0 = args_0[0];
        const leaf_0 = args_0[1];
        if (!(typeof(index_0) === 'bigint' && index_0 >= 0 && index_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 1',
                                     'remit_pool.compact line 72 char 1',
                                     'Field',
                                     index_0)
        }
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 2',
                                     'remit_pool.compact line 72 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[1];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().pathForLeaf(    index_0,    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      findPathForLeaf(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`find_path_for_leaf: expected 1 argument, received ${args_0.length}`);
        }
        const leaf_0 = args_0[0];
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('find_path_for_leaf',
                                     'argument 1',
                                     'remit_pool.compact line 72 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[1];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().findPathForLeaf(    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      history(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`history: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[1];
        return self_0.asArray()[2].asMap().keys().map(  (elem) => __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    noteNullifiers: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(2n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                                                                 alignment: _descriptor_5.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(2n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'remit_pool.compact line 73 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(2n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[2];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    offers: {
      isFull(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isFull: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(3n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(1n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(65536n),
                                                                                                                                 alignment: _descriptor_5.alignment() }).encode() } },
                                                                          'lt',
                                                                          'neg',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      checkRoot(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`checkRoot: expected 1 argument, received ${args_0.length}`);
        }
        const rt_0 = args_0[0];
        if (!(typeof(rt_0) === 'object' && typeof(rt_0.field) === 'bigint' && rt_0.field >= 0 && rt_0.field <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('checkRoot',
                                     'argument 1',
                                     'remit_pool.compact line 74 char 1',
                                     'struct MerkleTreeDigest<field: Field>',
                                     rt_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(3n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(2n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(rt_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      root(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`root: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[3];
        return ((result) => result             ? __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(result)             : undefined)(self_0.asArray()[0].asBoundedMerkleTree().rehash().root()?.value);
      },
      firstFree(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`first_free: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[3];
        return __compactRuntime.CompactTypeField.fromValue(self_0.asArray()[1].asCell().value);
      },
      pathForLeaf(...args_0) {
        if (args_0.length !== 2) {
          throw new __compactRuntime.CompactError(`path_for_leaf: expected 2 arguments, received ${args_0.length}`);
        }
        const index_0 = args_0[0];
        const leaf_0 = args_0[1];
        if (!(typeof(index_0) === 'bigint' && index_0 >= 0 && index_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 1',
                                     'remit_pool.compact line 74 char 1',
                                     'Field',
                                     index_0)
        }
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 2',
                                     'remit_pool.compact line 74 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[3];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().pathForLeaf(    index_0,    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      findPathForLeaf(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`find_path_for_leaf: expected 1 argument, received ${args_0.length}`);
        }
        const leaf_0 = args_0[0];
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('find_path_for_leaf',
                                     'argument 1',
                                     'remit_pool.compact line 74 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[3];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().findPathForLeaf(    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      history(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`history: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[3];
        return self_0.asArray()[2].asMap().keys().map(  (elem) => __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    offerNullifiers: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(4n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                                                                 alignment: _descriptor_5.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(4n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'remit_pool.compact line 75 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(4n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[4];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    mandates: {
      isFull(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isFull: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(5n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(1n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(65536n),
                                                                                                                                 alignment: _descriptor_5.alignment() }).encode() } },
                                                                          'lt',
                                                                          'neg',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      checkRoot(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`checkRoot: expected 1 argument, received ${args_0.length}`);
        }
        const rt_0 = args_0[0];
        if (!(typeof(rt_0) === 'object' && typeof(rt_0.field) === 'bigint' && rt_0.field >= 0 && rt_0.field <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('checkRoot',
                                     'argument 1',
                                     'remit_pool.compact line 76 char 1',
                                     'struct MerkleTreeDigest<field: Field>',
                                     rt_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(5n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(2n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(rt_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      root(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`root: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[5];
        return ((result) => result             ? __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(result)             : undefined)(self_0.asArray()[0].asBoundedMerkleTree().rehash().root()?.value);
      },
      firstFree(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`first_free: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[5];
        return __compactRuntime.CompactTypeField.fromValue(self_0.asArray()[1].asCell().value);
      },
      pathForLeaf(...args_0) {
        if (args_0.length !== 2) {
          throw new __compactRuntime.CompactError(`path_for_leaf: expected 2 arguments, received ${args_0.length}`);
        }
        const index_0 = args_0[0];
        const leaf_0 = args_0[1];
        if (!(typeof(index_0) === 'bigint' && index_0 >= 0 && index_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 1',
                                     'remit_pool.compact line 76 char 1',
                                     'Field',
                                     index_0)
        }
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 2',
                                     'remit_pool.compact line 76 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[5];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().pathForLeaf(    index_0,    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      findPathForLeaf(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`find_path_for_leaf: expected 1 argument, received ${args_0.length}`);
        }
        const leaf_0 = args_0[0];
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('find_path_for_leaf',
                                     'argument 1',
                                     'remit_pool.compact line 76 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[5];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().findPathForLeaf(    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      history(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`history: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[5];
        return self_0.asArray()[2].asMap().keys().map(  (elem) => __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    mandateRevoked: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(6n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                                                                 alignment: _descriptor_5.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(6n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'remit_pool.compact line 77 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(6n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[6];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    mandateStates: {
      isFull(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isFull: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(7n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(1n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(65536n),
                                                                                                                                 alignment: _descriptor_5.alignment() }).encode() } },
                                                                          'lt',
                                                                          'neg',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      checkRoot(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`checkRoot: expected 1 argument, received ${args_0.length}`);
        }
        const rt_0 = args_0[0];
        if (!(typeof(rt_0) === 'object' && typeof(rt_0.field) === 'bigint' && rt_0.field >= 0 && rt_0.field <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('checkRoot',
                                     'argument 1',
                                     'remit_pool.compact line 78 char 1',
                                     'struct MerkleTreeDigest<field: Field>',
                                     rt_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(7n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(2n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(rt_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      root(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`root: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[7];
        return ((result) => result             ? __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(result)             : undefined)(self_0.asArray()[0].asBoundedMerkleTree().rehash().root()?.value);
      },
      firstFree(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`first_free: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[7];
        return __compactRuntime.CompactTypeField.fromValue(self_0.asArray()[1].asCell().value);
      },
      pathForLeaf(...args_0) {
        if (args_0.length !== 2) {
          throw new __compactRuntime.CompactError(`path_for_leaf: expected 2 arguments, received ${args_0.length}`);
        }
        const index_0 = args_0[0];
        const leaf_0 = args_0[1];
        if (!(typeof(index_0) === 'bigint' && index_0 >= 0 && index_0 <= __compactRuntime.MAX_FIELD)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 1',
                                     'remit_pool.compact line 78 char 1',
                                     'Field',
                                     index_0)
        }
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('path_for_leaf',
                                     'argument 2',
                                     'remit_pool.compact line 78 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[7];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().pathForLeaf(    index_0,    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      findPathForLeaf(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`find_path_for_leaf: expected 1 argument, received ${args_0.length}`);
        }
        const leaf_0 = args_0[0];
        if (!(leaf_0.buffer instanceof ArrayBuffer && leaf_0.BYTES_PER_ELEMENT === 1 && leaf_0.length === 32)) {
          __compactRuntime.typeError('find_path_for_leaf',
                                     'argument 1',
                                     'remit_pool.compact line 78 char 1',
                                     'Bytes<32>',
                                     leaf_0)
        }
        const self_0 = state.asArray()[7];
        return ((result) => result             ? new __compactRuntime.CompactTypeMerkleTreePath(16, _descriptor_0).fromValue(result)             : undefined)(  self_0.asArray()[0].asBoundedMerkleTree().rehash().findPathForLeaf(    {      value: _descriptor_0.toValue(leaf_0),      alignment: _descriptor_0.alignment()    }  )?.value);
      },
      history(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`history: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[7];
        return self_0.asArray()[2].asMap().keys().map(  (elem) => __compactRuntime.CompactTypeMerkleTreeDigest.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    mandateStateNullifiers: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(8n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                                                                 alignment: _descriptor_5.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(8n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'remit_pool.compact line 79 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(8n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[8];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    auditRoots: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(9n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(1n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          'type',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(1n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      length(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`length: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(9n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_6.toValue(2n),
                                                                                                     alignment: _descriptor_6.alignment() } }] } },
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      head(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`head: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_31.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_6.toValue(9n),
                                                                                                      alignment: _descriptor_6.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_6.toValue(0n),
                                                                                                      alignment: _descriptor_6.alignment() } }] } },
                                                                           { dup: { n: 0 } },
                                                                           'type',
                                                                           { push: { storage: false,
                                                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(1n),
                                                                                                                                  alignment: _descriptor_6.alignment() }).encode() } },
                                                                           'eq',
                                                                           { branch: { skip: 4 } },
                                                                           { push: { storage: false,
                                                                                     value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(1n),
                                                                                                                                  alignment: _descriptor_6.alignment() }).encode() } },
                                                                           { swap: { n: 0 } },
                                                                           { concat: { cached: false,
                                                                                       n: (2+Number(__compactRuntime.maxAlignedSize(
                                                                                               _descriptor_0
                                                                                               .alignment()
                                                                                             ))) } },
                                                                           { jmp: { skip: 2 } },
                                                                           'pop',
                                                                           { push: { storage: false,
                                                                                     value: __compactRuntime.StateValue.newCell(__compactRuntime.alignedConcat(
                                                                                                                                  { value: _descriptor_6.toValue(0n),
                                                                                                                                    alignment: _descriptor_6.alignment() },
                                                                                                                                  { value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                                                                    alignment: _descriptor_0.alignment() }
                                                                                                                                )).encode() } },
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[9];
        return (() => {  var iter = { curr: self_0 };  iter.next = () => {    const arr = iter.curr.asArray();    const head = arr[0];    if(head.type() == "null") {      return { done: true };    } else {      iter.curr = arr[1];      return { value: _descriptor_0.fromValue(head.asCell().value), done: false };    }  };  return iter;})();
      }
    },
    get openOffers() {
      return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_6.toValue(10n),
                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    get activeMandates() {
      return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_6.toValue(11n),
                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    get fills() {
      return _descriptor_5.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_6.toValue(12n),
                                                                                                   alignment: _descriptor_6.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  ownerSecret: (...args) => undefined,
  executorSecret: (...args) => undefined,
  freshNonce: (...args) => undefined,
  freshNonce2: (...args) => undefined,
  spendNote: (...args) => undefined,
  spendNoteNonce: (...args) => undefined,
  spendNotePath: (...args) => undefined,
  offerData: (...args) => undefined,
  offerRand: (...args) => undefined,
  offerPath: (...args) => undefined,
  mandateData: (...args) => undefined,
  mandateRand: (...args) => undefined,
  mandatePath: (...args) => undefined,
  mandateStateData: (...args) => undefined,
  mandateStateNonce: (...args) => undefined,
  mandateStatePath: (...args) => undefined,
  counterpartyPath: (...args) => undefined,
  auditSeed: (...args) => undefined,
  withdrawTo: (...args) => undefined,
  book: (...args) => undefined,
  bookPaths: (...args) => undefined,
  chosenIndex: (...args) => undefined,
  fillBase: (...args) => undefined,
  fillQuote: (...args) => undefined
});
export const pureCircuits = {
  ownerKey: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`ownerKey: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const sk_0 = args_0[0];
    if (!(sk_0.buffer instanceof ArrayBuffer && sk_0.BYTES_PER_ELEMENT === 1 && sk_0.length === 32)) {
      __compactRuntime.typeError('ownerKey',
                                 'argument 1',
                                 'remit_pool.compact line 114 char 1',
                                 'Bytes<32>',
                                 sk_0)
    }
    return _dummyContract._ownerKey_0(sk_0);
  },
  executorKey: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`executorKey: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const esk_0 = args_0[0];
    if (!(esk_0.buffer instanceof ArrayBuffer && esk_0.BYTES_PER_ELEMENT === 1 && esk_0.length === 32)) {
      __compactRuntime.typeError('executorKey',
                                 'argument 1',
                                 'remit_pool.compact line 117 char 1',
                                 'Bytes<32>',
                                 esk_0)
    }
    return _dummyContract._executorKey_0(esk_0);
  },
  escrowKey: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`escrowKey: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const mandateId_0 = args_0[0];
    if (!(mandateId_0.buffer instanceof ArrayBuffer && mandateId_0.BYTES_PER_ELEMENT === 1 && mandateId_0.length === 32)) {
      __compactRuntime.typeError('escrowKey',
                                 'argument 1',
                                 'remit_pool.compact line 120 char 1',
                                 'Bytes<32>',
                                 mandateId_0)
    }
    return _dummyContract._escrowKey_0(mandateId_0);
  },
  noteCommitment: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`noteCommitment: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const note_0 = args_0[0];
    const nonce_0 = args_0[1];
    if (!(typeof(note_0) === 'object' && typeof(note_0.asset) === 'bigint' && note_0.asset >= 0n && note_0.asset <= 255n && typeof(note_0.amount) === 'bigint' && note_0.amount >= 0n && note_0.amount <= 18446744073709551615n && note_0.owner.buffer instanceof ArrayBuffer && note_0.owner.BYTES_PER_ELEMENT === 1 && note_0.owner.length === 32)) {
      __compactRuntime.typeError('noteCommitment',
                                 'argument 1',
                                 'remit_pool.compact line 123 char 1',
                                 'struct Note<asset: Uint<0..256>, amount: Uint<0..18446744073709551616>, owner: Bytes<32>>',
                                 note_0)
    }
    if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
      __compactRuntime.typeError('noteCommitment',
                                 'argument 2',
                                 'remit_pool.compact line 123 char 1',
                                 'Bytes<32>',
                                 nonce_0)
    }
    return _dummyContract._noteCommitment_0(note_0, nonce_0);
  },
  noteNullifier: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`noteNullifier: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const sk_0 = args_0[0];
    const nonce_0 = args_0[1];
    if (!(sk_0.buffer instanceof ArrayBuffer && sk_0.BYTES_PER_ELEMENT === 1 && sk_0.length === 32)) {
      __compactRuntime.typeError('noteNullifier',
                                 'argument 1',
                                 'remit_pool.compact line 126 char 1',
                                 'Bytes<32>',
                                 sk_0)
    }
    if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
      __compactRuntime.typeError('noteNullifier',
                                 'argument 2',
                                 'remit_pool.compact line 126 char 1',
                                 'Bytes<32>',
                                 nonce_0)
    }
    return _dummyContract._noteNullifier_0(sk_0, nonce_0);
  },
  offerCommitment: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`offerCommitment: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const o_0 = args_0[0];
    const rand_0 = args_0[1];
    if (!(typeof(o_0) === 'object' && typeof(o_0.side) === 'bigint' && o_0.side >= 0n && o_0.side <= 255n && typeof(o_0.baseAmount) === 'bigint' && o_0.baseAmount >= 0n && o_0.baseAmount <= 18446744073709551615n && typeof(o_0.quoteAmount) === 'bigint' && o_0.quoteAmount >= 0n && o_0.quoteAmount <= 18446744073709551615n && o_0.maker.buffer instanceof ArrayBuffer && o_0.maker.BYTES_PER_ELEMENT === 1 && o_0.maker.length === 32 && o_0.payNonce.buffer instanceof ArrayBuffer && o_0.payNonce.BYTES_PER_ELEMENT === 1 && o_0.payNonce.length === 32 && typeof(o_0.expiry) === 'bigint' && o_0.expiry >= 0n && o_0.expiry <= 18446744073709551615n && typeof(o_0.minFillBase) === 'bigint' && o_0.minFillBase >= 0n && o_0.minFillBase <= 18446744073709551615n)) {
      __compactRuntime.typeError('offerCommitment',
                                 'argument 1',
                                 'remit_pool.compact line 129 char 1',
                                 'struct Offer<side: Uint<0..256>, baseAmount: Uint<0..18446744073709551616>, quoteAmount: Uint<0..18446744073709551616>, maker: Bytes<32>, payNonce: Bytes<32>, expiry: Uint<0..18446744073709551616>, minFillBase: Uint<0..18446744073709551616>>',
                                 o_0)
    }
    if (!(rand_0.buffer instanceof ArrayBuffer && rand_0.BYTES_PER_ELEMENT === 1 && rand_0.length === 32)) {
      __compactRuntime.typeError('offerCommitment',
                                 'argument 2',
                                 'remit_pool.compact line 129 char 1',
                                 'Bytes<32>',
                                 rand_0)
    }
    return _dummyContract._offerCommitment_0(o_0, rand_0);
  },
  offerNullifier: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`offerNullifier: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const commit_0 = args_0[0];
    if (!(commit_0.buffer instanceof ArrayBuffer && commit_0.BYTES_PER_ELEMENT === 1 && commit_0.length === 32)) {
      __compactRuntime.typeError('offerNullifier',
                                 'argument 1',
                                 'remit_pool.compact line 132 char 1',
                                 'Bytes<32>',
                                 commit_0)
    }
    return _dummyContract._offerNullifier_0(commit_0);
  },
  mandateCommitment: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`mandateCommitment: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const m_0 = args_0[0];
    const rand_0 = args_0[1];
    if (!(typeof(m_0) === 'object' && m_0.principal.buffer instanceof ArrayBuffer && m_0.principal.BYTES_PER_ELEMENT === 1 && m_0.principal.length === 32 && m_0.executor.buffer instanceof ArrayBuffer && m_0.executor.BYTES_PER_ELEMENT === 1 && m_0.executor.length === 32 && typeof(m_0.side) === 'bigint' && m_0.side >= 0n && m_0.side <= 255n && typeof(m_0.maxFillBase) === 'bigint' && m_0.maxFillBase >= 0n && m_0.maxFillBase <= 18446744073709551615n && typeof(m_0.limitNum) === 'bigint' && m_0.limitNum >= 0n && m_0.limitNum <= 18446744073709551615n && typeof(m_0.limitDen) === 'bigint' && m_0.limitDen >= 0n && m_0.limitDen <= 18446744073709551615n && typeof(m_0.cpRoot) === 'bigint' && m_0.cpRoot >= 0 && m_0.cpRoot <= __compactRuntime.MAX_FIELD && typeof(m_0.expiry) === 'bigint' && m_0.expiry >= 0n && m_0.expiry <= 18446744073709551615n && m_0.mandateId.buffer instanceof ArrayBuffer && m_0.mandateId.BYTES_PER_ELEMENT === 1 && m_0.mandateId.length === 32)) {
      __compactRuntime.typeError('mandateCommitment',
                                 'argument 1',
                                 'remit_pool.compact line 135 char 1',
                                 'struct Mandate<principal: Bytes<32>, executor: Bytes<32>, side: Uint<0..256>, maxFillBase: Uint<0..18446744073709551616>, limitNum: Uint<0..18446744073709551616>, limitDen: Uint<0..18446744073709551616>, cpRoot: Field, expiry: Uint<0..18446744073709551616>, mandateId: Bytes<32>>',
                                 m_0)
    }
    if (!(rand_0.buffer instanceof ArrayBuffer && rand_0.BYTES_PER_ELEMENT === 1 && rand_0.length === 32)) {
      __compactRuntime.typeError('mandateCommitment',
                                 'argument 2',
                                 'remit_pool.compact line 135 char 1',
                                 'Bytes<32>',
                                 rand_0)
    }
    return _dummyContract._mandateCommitment_0(m_0, rand_0);
  },
  mandateRevocationTag: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`mandateRevocationTag: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const mandateId_0 = args_0[0];
    if (!(mandateId_0.buffer instanceof ArrayBuffer && mandateId_0.BYTES_PER_ELEMENT === 1 && mandateId_0.length === 32)) {
      __compactRuntime.typeError('mandateRevocationTag',
                                 'argument 1',
                                 'remit_pool.compact line 138 char 1',
                                 'Bytes<32>',
                                 mandateId_0)
    }
    return _dummyContract._mandateRevocationTag_0(mandateId_0);
  },
  mandateStateCommitment: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`mandateStateCommitment: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const s_0 = args_0[0];
    const nonce_0 = args_0[1];
    if (!(typeof(s_0) === 'object' && s_0.mandateId.buffer instanceof ArrayBuffer && s_0.mandateId.BYTES_PER_ELEMENT === 1 && s_0.mandateId.length === 32 && typeof(s_0.remaining) === 'bigint' && s_0.remaining >= 0n && s_0.remaining <= 18446744073709551615n)) {
      __compactRuntime.typeError('mandateStateCommitment',
                                 'argument 1',
                                 'remit_pool.compact line 141 char 1',
                                 'struct MandateState<mandateId: Bytes<32>, remaining: Uint<0..18446744073709551616>>',
                                 s_0)
    }
    if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
      __compactRuntime.typeError('mandateStateCommitment',
                                 'argument 2',
                                 'remit_pool.compact line 141 char 1',
                                 'Bytes<32>',
                                 nonce_0)
    }
    return _dummyContract._mandateStateCommitment_0(s_0, nonce_0);
  },
  mandateStateNullifier: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`mandateStateNullifier: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const mandateId_0 = args_0[0];
    const nonce_0 = args_0[1];
    if (!(mandateId_0.buffer instanceof ArrayBuffer && mandateId_0.BYTES_PER_ELEMENT === 1 && mandateId_0.length === 32)) {
      __compactRuntime.typeError('mandateStateNullifier',
                                 'argument 1',
                                 'remit_pool.compact line 144 char 1',
                                 'Bytes<32>',
                                 mandateId_0)
    }
    if (!(nonce_0.buffer instanceof ArrayBuffer && nonce_0.BYTES_PER_ELEMENT === 1 && nonce_0.length === 32)) {
      __compactRuntime.typeError('mandateStateNullifier',
                                 'argument 2',
                                 'remit_pool.compact line 144 char 1',
                                 'Bytes<32>',
                                 nonce_0)
    }
    return _dummyContract._mandateStateNullifier_0(mandateId_0, nonce_0);
  },
  fieldSalt: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`fieldSalt: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const seed_0 = args_0[0];
    const idx_0 = args_0[1];
    if (!(seed_0.buffer instanceof ArrayBuffer && seed_0.BYTES_PER_ELEMENT === 1 && seed_0.length === 32)) {
      __compactRuntime.typeError('fieldSalt',
                                 'argument 1',
                                 'remit_pool.compact line 147 char 1',
                                 'Bytes<32>',
                                 seed_0)
    }
    if (!(typeof(idx_0) === 'bigint' && idx_0 >= 0n && idx_0 <= 255n)) {
      __compactRuntime.typeError('fieldSalt',
                                 'argument 2',
                                 'remit_pool.compact line 147 char 1',
                                 'Uint<0..256>',
                                 idx_0)
    }
    return _dummyContract._fieldSalt_0(seed_0, idx_0);
  },
  auditRootOf: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`auditRootOf: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const cs_0 = args_0[0];
    if (!(Array.isArray(cs_0) && cs_0.length === 6 && cs_0.every((t) => t.buffer instanceof ArrayBuffer && t.BYTES_PER_ELEMENT === 1 && t.length === 32))) {
      __compactRuntime.typeError('auditRootOf',
                                 'argument 1',
                                 'remit_pool.compact line 150 char 1',
                                 'Vector<6, Bytes<32>>',
                                 cs_0)
    }
    return _dummyContract._auditRootOf_0(cs_0);
  },
  priceAtLeast: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`priceAtLeast: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const base_0 = args_0[0];
    const quote_0 = args_0[1];
    const num_0 = args_0[2];
    const den_0 = args_0[3];
    if (!(typeof(base_0) === 'bigint' && base_0 >= 0n && base_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('priceAtLeast',
                                 'argument 1',
                                 'remit_pool.compact line 153 char 1',
                                 'Uint<0..18446744073709551616>',
                                 base_0)
    }
    if (!(typeof(quote_0) === 'bigint' && quote_0 >= 0n && quote_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('priceAtLeast',
                                 'argument 2',
                                 'remit_pool.compact line 153 char 1',
                                 'Uint<0..18446744073709551616>',
                                 quote_0)
    }
    if (!(typeof(num_0) === 'bigint' && num_0 >= 0n && num_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('priceAtLeast',
                                 'argument 3',
                                 'remit_pool.compact line 153 char 1',
                                 'Uint<0..18446744073709551616>',
                                 num_0)
    }
    if (!(typeof(den_0) === 'bigint' && den_0 >= 0n && den_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('priceAtLeast',
                                 'argument 4',
                                 'remit_pool.compact line 153 char 1',
                                 'Uint<0..18446744073709551616>',
                                 den_0)
    }
    return _dummyContract._priceAtLeast_0(base_0, quote_0, num_0, den_0);
  },
  priceAtMost: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`priceAtMost: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const base_0 = args_0[0];
    const quote_0 = args_0[1];
    const num_0 = args_0[2];
    const den_0 = args_0[3];
    if (!(typeof(base_0) === 'bigint' && base_0 >= 0n && base_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('priceAtMost',
                                 'argument 1',
                                 'remit_pool.compact line 156 char 1',
                                 'Uint<0..18446744073709551616>',
                                 base_0)
    }
    if (!(typeof(quote_0) === 'bigint' && quote_0 >= 0n && quote_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('priceAtMost',
                                 'argument 2',
                                 'remit_pool.compact line 156 char 1',
                                 'Uint<0..18446744073709551616>',
                                 quote_0)
    }
    if (!(typeof(num_0) === 'bigint' && num_0 >= 0n && num_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('priceAtMost',
                                 'argument 3',
                                 'remit_pool.compact line 156 char 1',
                                 'Uint<0..18446744073709551616>',
                                 num_0)
    }
    if (!(typeof(den_0) === 'bigint' && den_0 >= 0n && den_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('priceAtMost',
                                 'argument 4',
                                 'remit_pool.compact line 156 char 1',
                                 'Uint<0..18446744073709551616>',
                                 den_0)
    }
    return _dummyContract._priceAtMost_0(base_0, quote_0, num_0, den_0);
  },
  residualPayNonceOf: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`residualPayNonceOf: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const n_0 = args_0[0];
    if (!(n_0.buffer instanceof ArrayBuffer && n_0.BYTES_PER_ELEMENT === 1 && n_0.length === 32)) {
      __compactRuntime.typeError('residualPayNonceOf',
                                 'argument 1',
                                 'remit_pool.compact line 159 char 1',
                                 'Bytes<32>',
                                 n_0)
    }
    return _dummyContract._residualPayNonceOf_0(n_0);
  },
  residualRandOf: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`residualRandOf: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const rand_0 = args_0[0];
    if (!(rand_0.buffer instanceof ArrayBuffer && rand_0.BYTES_PER_ELEMENT === 1 && rand_0.length === 32)) {
      __compactRuntime.typeError('residualRandOf',
                                 'argument 1',
                                 'remit_pool.compact line 162 char 1',
                                 'Bytes<32>',
                                 rand_0)
    }
    return _dummyContract._residualRandOf_0(rand_0);
  },
  minU64: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`minU64: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const a_0 = args_0[0];
    const b_0 = args_0[1];
    if (!(typeof(a_0) === 'bigint' && a_0 >= 0n && a_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('minU64',
                                 'argument 1',
                                 'remit_pool.compact line 165 char 1',
                                 'Uint<0..18446744073709551616>',
                                 a_0)
    }
    if (!(typeof(b_0) === 'bigint' && b_0 >= 0n && b_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('minU64',
                                 'argument 2',
                                 'remit_pool.compact line 165 char 1',
                                 'Uint<0..18446744073709551616>',
                                 b_0)
    }
    return _dummyContract._minU64_0(a_0, b_0);
  },
  bytesLt: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`bytesLt: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const a_0 = args_0[0];
    const b_0 = args_0[1];
    if (!(a_0.buffer instanceof ArrayBuffer && a_0.BYTES_PER_ELEMENT === 1 && a_0.length === 32)) {
      __compactRuntime.typeError('bytesLt',
                                 'argument 1',
                                 'remit_pool.compact line 168 char 1',
                                 'Bytes<32>',
                                 a_0)
    }
    if (!(b_0.buffer instanceof ArrayBuffer && b_0.BYTES_PER_ELEMENT === 1 && b_0.length === 32)) {
      __compactRuntime.typeError('bytesLt',
                                 'argument 2',
                                 'remit_pool.compact line 168 char 1',
                                 'Bytes<32>',
                                 b_0)
    }
    return _dummyContract._bytesLt_0(a_0, b_0);
  },
  fillableBaseOf: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`fillableBaseOf: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const o_0 = args_0[0];
    const maxFillBase_0 = args_0[1];
    const remaining_0 = args_0[2];
    const side_0 = args_0[3];
    if (!(typeof(o_0) === 'object' && typeof(o_0.side) === 'bigint' && o_0.side >= 0n && o_0.side <= 255n && typeof(o_0.baseAmount) === 'bigint' && o_0.baseAmount >= 0n && o_0.baseAmount <= 18446744073709551615n && typeof(o_0.quoteAmount) === 'bigint' && o_0.quoteAmount >= 0n && o_0.quoteAmount <= 18446744073709551615n && o_0.maker.buffer instanceof ArrayBuffer && o_0.maker.BYTES_PER_ELEMENT === 1 && o_0.maker.length === 32 && o_0.payNonce.buffer instanceof ArrayBuffer && o_0.payNonce.BYTES_PER_ELEMENT === 1 && o_0.payNonce.length === 32 && typeof(o_0.expiry) === 'bigint' && o_0.expiry >= 0n && o_0.expiry <= 18446744073709551615n && typeof(o_0.minFillBase) === 'bigint' && o_0.minFillBase >= 0n && o_0.minFillBase <= 18446744073709551615n)) {
      __compactRuntime.typeError('fillableBaseOf',
                                 'argument 1',
                                 'remit_pool.compact line 203 char 1',
                                 'struct Offer<side: Uint<0..256>, baseAmount: Uint<0..18446744073709551616>, quoteAmount: Uint<0..18446744073709551616>, maker: Bytes<32>, payNonce: Bytes<32>, expiry: Uint<0..18446744073709551616>, minFillBase: Uint<0..18446744073709551616>>',
                                 o_0)
    }
    if (!(typeof(maxFillBase_0) === 'bigint' && maxFillBase_0 >= 0n && maxFillBase_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('fillableBaseOf',
                                 'argument 2',
                                 'remit_pool.compact line 203 char 1',
                                 'Uint<0..18446744073709551616>',
                                 maxFillBase_0)
    }
    if (!(typeof(remaining_0) === 'bigint' && remaining_0 >= 0n && remaining_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('fillableBaseOf',
                                 'argument 3',
                                 'remit_pool.compact line 203 char 1',
                                 'Uint<0..18446744073709551616>',
                                 remaining_0)
    }
    if (!(typeof(side_0) === 'bigint' && side_0 >= 0n && side_0 <= 255n)) {
      __compactRuntime.typeError('fillableBaseOf',
                                 'argument 4',
                                 'remit_pool.compact line 203 char 1',
                                 'Uint<0..256>',
                                 side_0)
    }
    return _dummyContract._fillableBaseOf_0(o_0,
                                            maxFillBase_0,
                                            remaining_0,
                                            side_0);
  },
  betterPrice: (...args_0) => {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`betterPrice: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const a_0 = args_0[0];
    const b_0 = args_0[1];
    const side_0 = args_0[2];
    if (!(typeof(a_0) === 'object' && typeof(a_0.side) === 'bigint' && a_0.side >= 0n && a_0.side <= 255n && typeof(a_0.baseAmount) === 'bigint' && a_0.baseAmount >= 0n && a_0.baseAmount <= 18446744073709551615n && typeof(a_0.quoteAmount) === 'bigint' && a_0.quoteAmount >= 0n && a_0.quoteAmount <= 18446744073709551615n && a_0.maker.buffer instanceof ArrayBuffer && a_0.maker.BYTES_PER_ELEMENT === 1 && a_0.maker.length === 32 && a_0.payNonce.buffer instanceof ArrayBuffer && a_0.payNonce.BYTES_PER_ELEMENT === 1 && a_0.payNonce.length === 32 && typeof(a_0.expiry) === 'bigint' && a_0.expiry >= 0n && a_0.expiry <= 18446744073709551615n && typeof(a_0.minFillBase) === 'bigint' && a_0.minFillBase >= 0n && a_0.minFillBase <= 18446744073709551615n)) {
      __compactRuntime.typeError('betterPrice',
                                 'argument 1',
                                 'remit_pool.compact line 207 char 1',
                                 'struct Offer<side: Uint<0..256>, baseAmount: Uint<0..18446744073709551616>, quoteAmount: Uint<0..18446744073709551616>, maker: Bytes<32>, payNonce: Bytes<32>, expiry: Uint<0..18446744073709551616>, minFillBase: Uint<0..18446744073709551616>>',
                                 a_0)
    }
    if (!(typeof(b_0) === 'object' && typeof(b_0.side) === 'bigint' && b_0.side >= 0n && b_0.side <= 255n && typeof(b_0.baseAmount) === 'bigint' && b_0.baseAmount >= 0n && b_0.baseAmount <= 18446744073709551615n && typeof(b_0.quoteAmount) === 'bigint' && b_0.quoteAmount >= 0n && b_0.quoteAmount <= 18446744073709551615n && b_0.maker.buffer instanceof ArrayBuffer && b_0.maker.BYTES_PER_ELEMENT === 1 && b_0.maker.length === 32 && b_0.payNonce.buffer instanceof ArrayBuffer && b_0.payNonce.BYTES_PER_ELEMENT === 1 && b_0.payNonce.length === 32 && typeof(b_0.expiry) === 'bigint' && b_0.expiry >= 0n && b_0.expiry <= 18446744073709551615n && typeof(b_0.minFillBase) === 'bigint' && b_0.minFillBase >= 0n && b_0.minFillBase <= 18446744073709551615n)) {
      __compactRuntime.typeError('betterPrice',
                                 'argument 2',
                                 'remit_pool.compact line 207 char 1',
                                 'struct Offer<side: Uint<0..256>, baseAmount: Uint<0..18446744073709551616>, quoteAmount: Uint<0..18446744073709551616>, maker: Bytes<32>, payNonce: Bytes<32>, expiry: Uint<0..18446744073709551616>, minFillBase: Uint<0..18446744073709551616>>',
                                 b_0)
    }
    if (!(typeof(side_0) === 'bigint' && side_0 >= 0n && side_0 <= 255n)) {
      __compactRuntime.typeError('betterPrice',
                                 'argument 3',
                                 'remit_pool.compact line 207 char 1',
                                 'Uint<0..256>',
                                 side_0)
    }
    return _dummyContract._betterPrice_0(a_0, b_0, side_0);
  },
  samePrice: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`samePrice: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const a_0 = args_0[0];
    const b_0 = args_0[1];
    if (!(typeof(a_0) === 'object' && typeof(a_0.side) === 'bigint' && a_0.side >= 0n && a_0.side <= 255n && typeof(a_0.baseAmount) === 'bigint' && a_0.baseAmount >= 0n && a_0.baseAmount <= 18446744073709551615n && typeof(a_0.quoteAmount) === 'bigint' && a_0.quoteAmount >= 0n && a_0.quoteAmount <= 18446744073709551615n && a_0.maker.buffer instanceof ArrayBuffer && a_0.maker.BYTES_PER_ELEMENT === 1 && a_0.maker.length === 32 && a_0.payNonce.buffer instanceof ArrayBuffer && a_0.payNonce.BYTES_PER_ELEMENT === 1 && a_0.payNonce.length === 32 && typeof(a_0.expiry) === 'bigint' && a_0.expiry >= 0n && a_0.expiry <= 18446744073709551615n && typeof(a_0.minFillBase) === 'bigint' && a_0.minFillBase >= 0n && a_0.minFillBase <= 18446744073709551615n)) {
      __compactRuntime.typeError('samePrice',
                                 'argument 1',
                                 'remit_pool.compact line 212 char 1',
                                 'struct Offer<side: Uint<0..256>, baseAmount: Uint<0..18446744073709551616>, quoteAmount: Uint<0..18446744073709551616>, maker: Bytes<32>, payNonce: Bytes<32>, expiry: Uint<0..18446744073709551616>, minFillBase: Uint<0..18446744073709551616>>',
                                 a_0)
    }
    if (!(typeof(b_0) === 'object' && typeof(b_0.side) === 'bigint' && b_0.side >= 0n && b_0.side <= 255n && typeof(b_0.baseAmount) === 'bigint' && b_0.baseAmount >= 0n && b_0.baseAmount <= 18446744073709551615n && typeof(b_0.quoteAmount) === 'bigint' && b_0.quoteAmount >= 0n && b_0.quoteAmount <= 18446744073709551615n && b_0.maker.buffer instanceof ArrayBuffer && b_0.maker.BYTES_PER_ELEMENT === 1 && b_0.maker.length === 32 && b_0.payNonce.buffer instanceof ArrayBuffer && b_0.payNonce.BYTES_PER_ELEMENT === 1 && b_0.payNonce.length === 32 && typeof(b_0.expiry) === 'bigint' && b_0.expiry >= 0n && b_0.expiry <= 18446744073709551615n && typeof(b_0.minFillBase) === 'bigint' && b_0.minFillBase >= 0n && b_0.minFillBase <= 18446744073709551615n)) {
      __compactRuntime.typeError('samePrice',
                                 'argument 2',
                                 'remit_pool.compact line 212 char 1',
                                 'struct Offer<side: Uint<0..256>, baseAmount: Uint<0..18446744073709551616>, quoteAmount: Uint<0..18446744073709551616>, maker: Bytes<32>, payNonce: Bytes<32>, expiry: Uint<0..18446744073709551616>, minFillBase: Uint<0..18446744073709551616>>',
                                 b_0)
    }
    return _dummyContract._samePrice_0(a_0, b_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
