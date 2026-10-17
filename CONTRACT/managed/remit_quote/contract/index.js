import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_1 = __compactRuntime.CompactTypeBoolean;

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_3 = new __compactRuntime.CompactTypeBytes(160);

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

const _descriptor_4 = new _ContractAddress_0();

const _descriptor_5 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_6 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

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

const _descriptor_7 = new _UserAddress_0();

class _Either_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_4.alignment().concat(_descriptor_7.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_1.fromValue(value_0),
      left: _descriptor_4.fromValue(value_0),
      right: _descriptor_7.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.is_left).concat(_descriptor_4.toValue(value_0.left).concat(_descriptor_7.toValue(value_0.right)));
  }
}

const _descriptor_8 = new _Either_0();

class _tuple_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return [
      _descriptor_0.fromValue(value_0),
      _descriptor_0.fromValue(value_0),
      _descriptor_0.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0[0]).concat(_descriptor_0.toValue(value_0[1]).concat(_descriptor_0.toValue(value_0[2])));
  }
}

const _descriptor_9 = new _tuple_0();

const _descriptor_10 = new __compactRuntime.CompactTypeVector(2, _descriptor_0);

class _tuple_1 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment()));
  }
  fromValue(value_0) {
    return [
      _descriptor_0.fromValue(value_0),
      _descriptor_0.fromValue(value_0),
      _descriptor_2.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0[0]).concat(_descriptor_0.toValue(value_0[1]).concat(_descriptor_2.toValue(value_0[2])));
  }
}

const _descriptor_11 = new _tuple_1();

const _descriptor_12 = new __compactRuntime.CompactTypeVector(6, _descriptor_0);

class _Either_1 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_1.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_13 = new _Either_1();

const _descriptor_14 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _tuple_2 {
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

const _descriptor_15 = new _tuple_2();

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
    if (typeof(witnesses_0.callerSecret) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named callerSecret');
    }
    if (typeof(witnesses_0.disclosureSeed) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named disclosureSeed');
    }
    if (typeof(witnesses_0.disclosureSide) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named disclosureSide');
    }
    if (typeof(witnesses_0.disclosureBaseAmount) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named disclosureBaseAmount');
    }
    if (typeof(witnesses_0.disclosureQuoteAmount) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named disclosureQuoteAmount');
    }
    if (typeof(witnesses_0.disclosurePrincipal) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named disclosurePrincipal');
    }
    if (typeof(witnesses_0.disclosureCounterparty) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named disclosureCounterparty');
    }
    if (typeof(witnesses_0.disclosureMandateId) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named disclosureMandateId');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      claimTag(context, ...args_1) {
        return { result: pureCircuits.claimTag(...args_1), context };
      },
      quoteColor: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`quoteColor: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('quoteColor',
                                     'argument 1 (as invoked from Typescript)',
                                     'remit_quote.compact line 42 char 1',
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
        const result_0 = this._quoteColor_0(context, partialProofData);
        partialProofData.output = { value: _descriptor_0.toValue(result_0), alignment: _descriptor_0.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      claim: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`claim: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amount_0 = args_1[1];
        const dayBucket_0 = args_1[2];
        const to_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('claim',
                                     'argument 1 (as invoked from Typescript)',
                                     'remit_quote.compact line 46 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('claim',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'remit_quote.compact line 46 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amount_0)
        }
        if (!(typeof(dayBucket_0) === 'bigint' && dayBucket_0 >= 0n && dayBucket_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('claim',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'remit_quote.compact line 46 char 1',
                                     'Uint<0..18446744073709551616>',
                                     dayBucket_0)
        }
        if (!(typeof(to_0) === 'object' && typeof(to_0.is_left) === 'boolean' && typeof(to_0.left) === 'object' && to_0.left.bytes.buffer instanceof ArrayBuffer && to_0.left.bytes.BYTES_PER_ELEMENT === 1 && to_0.left.bytes.length === 32 && typeof(to_0.right) === 'object' && to_0.right.bytes.buffer instanceof ArrayBuffer && to_0.right.bytes.BYTES_PER_ELEMENT === 1 && to_0.right.bytes.length === 32)) {
          __compactRuntime.typeError('claim',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'remit_quote.compact line 46 char 1',
                                     'struct Either<is_left: Boolean, left: struct ContractAddress<bytes: Bytes<32>>, right: struct UserAddress<bytes: Bytes<32>>>',
                                     to_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_6.toValue(amount_0).concat(_descriptor_6.toValue(dayBucket_0).concat(_descriptor_8.toValue(to_0))),
            alignment: _descriptor_6.alignment().concat(_descriptor_6.alignment().concat(_descriptor_8.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._claim_0(context,
                                       partialProofData,
                                       amount_0,
                                       dayBucket_0,
                                       to_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      discloseField: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`discloseField: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const fieldSelector_0 = args_1[1];
        const auditorKey_0 = args_1[2];
        const sealedBox_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('discloseField',
                                     'argument 1 (as invoked from Typescript)',
                                     'remit_quote.compact line 144 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(fieldSelector_0) === 'bigint' && fieldSelector_0 >= 0n && fieldSelector_0 <= 255n)) {
          __compactRuntime.typeError('discloseField',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'remit_quote.compact line 144 char 1',
                                     'Uint<0..256>',
                                     fieldSelector_0)
        }
        if (!(auditorKey_0.buffer instanceof ArrayBuffer && auditorKey_0.BYTES_PER_ELEMENT === 1 && auditorKey_0.length === 32)) {
          __compactRuntime.typeError('discloseField',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'remit_quote.compact line 144 char 1',
                                     'Bytes<32>',
                                     auditorKey_0)
        }
        if (!(sealedBox_0.buffer instanceof ArrayBuffer && sealedBox_0.BYTES_PER_ELEMENT === 1 && sealedBox_0.length === 160)) {
          __compactRuntime.typeError('discloseField',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'remit_quote.compact line 144 char 1',
                                     'Bytes<160>',
                                     sealedBox_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(fieldSelector_0).concat(_descriptor_0.toValue(auditorKey_0).concat(_descriptor_3.toValue(sealedBox_0))),
            alignment: _descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._discloseField_0(context,
                                               partialProofData,
                                               fieldSelector_0,
                                               auditorKey_0,
                                               sealedBox_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      quoteColor: this.circuits.quoteColor,
      claim: this.circuits.claim,
      discloseField: this.circuits.discloseField
    };
    this.provableCircuits = {
      quoteColor: this.circuits.quoteColor,
      claim: this.circuits.claim,
      discloseField: this.circuits.discloseField
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
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
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('quoteColor', new __compactRuntime.ContractOperation());
    state_0.setOperation('claim', new __compactRuntime.ContractOperation());
    state_0.setOperation('discloseField', new __compactRuntime.ContractOperation());
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
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(1n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(2n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
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
  _tokenType_0(domain_sep_0, contractAddress_0) {
    return this._persistentCommit_0([domain_sep_0, contractAddress_0.bytes],
                                    new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 100, 101, 114, 105, 118, 101, 95, 116, 111, 107, 101, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  }
  _mintUnshieldedToken_0(context,
                         partialProofData,
                         domainSep_0,
                         amount_0,
                         recipient_0)
  {
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(5n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(domainSep_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(amount_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
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
    const color_0 = this._tokenType_0(domainSep_0,
                                      _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                partialProofData,
                                                                                                [
                                                                                                 { dup: { n: 2 } },
                                                                                                 { idx: { cached: true,
                                                                                                          pushPath: false,
                                                                                                          path: [
                                                                                                                 { tag: 'value',
                                                                                                                   value: { value: _descriptor_2.toValue(0n),
                                                                                                                            alignment: _descriptor_2.alignment() } }] } },
                                                                                                 { popeq: { cached: true,
                                                                                                            result: undefined } }]).value));
    const tmp_0 = this._left_0(color_0);
    const tmp_1 = amount_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(8n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell(__compactRuntime.alignedConcat(
                                                                                              { value: _descriptor_13.toValue(tmp_0),
                                                                                                alignment: _descriptor_13.alignment() },
                                                                                              { value: _descriptor_8.toValue(recipient_0),
                                                                                                alignment: _descriptor_8.alignment() }
                                                                                            )).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_14.toValue(tmp_1),
                                                                                              alignment: _descriptor_14.alignment() }).encode() } },
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
                      _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 2 } },
                                                                                 { idx: { cached: true,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_2.toValue(0n),
                                                                                                            alignment: _descriptor_2.alignment() } }] } },
                                                                                 { popeq: { cached: true,
                                                                                            result: undefined } }]).value).bytes))
    {
      const tmp_2 = this._left_0(color_0);
      const tmp_3 = amount_0;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_2.toValue(6n),
                                                                    alignment: _descriptor_2.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(tmp_2),
                                                                                                alignment: _descriptor_13.alignment() }).encode() } },
                                         { dup: { n: 1 } },
                                         { dup: { n: 1 } },
                                         'member',
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_14.toValue(tmp_3),
                                                                                                alignment: _descriptor_14.alignment() }).encode() } },
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
    return color_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_15, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_11, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_12, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_9, value_0);
    return result_0;
  }
  _persistentCommit_0(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_10,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _persistentCommit_1(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_2,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _persistentCommit_2(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_6,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _persistentCommit_3(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_0,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _callerSecret_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.callerSecret(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('callerSecret',
                                 'return value',
                                 'remit_quote.compact line 25 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _disclosureSeed_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.disclosureSeed(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('disclosureSeed',
                                 'return value',
                                 'remit_quote.compact line 30 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _disclosureSide_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.disclosureSide(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 255n)) {
      __compactRuntime.typeError('disclosureSide',
                                 'return value',
                                 'remit_quote.compact line 31 char 1',
                                 'Uint<0..256>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_2.toValue(result_0),
      alignment: _descriptor_2.alignment()
    });
    return result_0;
  }
  _disclosureBaseAmount_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.disclosureBaseAmount(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('disclosureBaseAmount',
                                 'return value',
                                 'remit_quote.compact line 32 char 1',
                                 'Uint<0..18446744073709551616>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_6.toValue(result_0),
      alignment: _descriptor_6.alignment()
    });
    return result_0;
  }
  _disclosureQuoteAmount_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.disclosureQuoteAmount(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('disclosureQuoteAmount',
                                 'return value',
                                 'remit_quote.compact line 33 char 1',
                                 'Uint<0..18446744073709551616>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_6.toValue(result_0),
      alignment: _descriptor_6.alignment()
    });
    return result_0;
  }
  _disclosurePrincipal_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.disclosurePrincipal(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('disclosurePrincipal',
                                 'return value',
                                 'remit_quote.compact line 34 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _disclosureCounterparty_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.disclosureCounterparty(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('disclosureCounterparty',
                                 'return value',
                                 'remit_quote.compact line 35 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _disclosureMandateId_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.disclosureMandateId(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('disclosureMandateId',
                                 'return value',
                                 'remit_quote.compact line 36 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _claimTag_0(sk_0, dayBucket_0) {
    return this._persistentHash_0([new Uint8Array([114, 101, 109, 105, 116, 58, 102, 97, 117, 99, 101, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   sk_0,
                                   dayBucket_0]);
  }
  _quoteColor_0(context, partialProofData) {
    return this._tokenType_0(new Uint8Array([114, 101, 109, 105, 116, 58, 113, 117, 111, 116, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                             _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 2 } },
                                                                                        { idx: { cached: true,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(0n),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value));
  }
  _claim_0(context, partialProofData, amount_0, dayBucket_0, to_0) {
    __compactRuntime.assert(amount_0 > 0n, 'zero amount');
    __compactRuntime.assert(amount_0 <= 1000000000n,
                            'max 1000 REMIT-Q per claim');
    const tag_0 = this._claimTag_0(this._callerSecret_0(context,
                                                        partialProofData),
                                   dayBucket_0);
    __compactRuntime.assert(!_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(1n),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tag_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'already claimed this bucket');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(1n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tag_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    this._mintUnshieldedToken_0(context,
                                partialProofData,
                                new Uint8Array([114, 101, 109, 105, 116, 58, 113, 117, 111, 116, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                amount_0,
                                to_0);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(0n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_5.toValue(tmp_0),
                                                                alignment: _descriptor_5.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _discloseField_0(context,
                   partialProofData,
                   fieldSelector_0,
                   auditorKey_0,
                   sealedBox_0)
  {
    __compactRuntime.assert(fieldSelector_0 < 6n, 'bad field selector');
    const seed_0 = this._disclosureSeed_0(context, partialProofData);
    const s0_0 = this._persistentHash_1([new Uint8Array([114, 101, 109, 105, 116, 58, 115, 97, 108, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                         seed_0,
                                         0n]);
    const s1_0 = this._persistentHash_1([new Uint8Array([114, 101, 109, 105, 116, 58, 115, 97, 108, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                         seed_0,
                                         1n]);
    const s2_0 = this._persistentHash_1([new Uint8Array([114, 101, 109, 105, 116, 58, 115, 97, 108, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                         seed_0,
                                         2n]);
    const s3_0 = this._persistentHash_1([new Uint8Array([114, 101, 109, 105, 116, 58, 115, 97, 108, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                         seed_0,
                                         3n]);
    const s4_0 = this._persistentHash_1([new Uint8Array([114, 101, 109, 105, 116, 58, 115, 97, 108, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                         seed_0,
                                         4n]);
    const s5_0 = this._persistentHash_1([new Uint8Array([114, 101, 109, 105, 116, 58, 115, 97, 108, 116, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                         seed_0,
                                         5n]);
    const c0_0 = this._persistentCommit_1(this._disclosureSide_0(context,
                                                                 partialProofData),
                                          s0_0);
    const c1_0 = this._persistentCommit_2(this._disclosureBaseAmount_0(context,
                                                                       partialProofData),
                                          s1_0);
    const c2_0 = this._persistentCommit_2(this._disclosureQuoteAmount_0(context,
                                                                        partialProofData),
                                          s2_0);
    const c3_0 = this._persistentCommit_3(this._disclosurePrincipal_0(context,
                                                                      partialProofData),
                                          s3_0);
    const c4_0 = this._persistentCommit_3(this._disclosureCounterparty_0(context,
                                                                         partialProofData),
                                          s4_0);
    const c5_0 = this._persistentCommit_3(this._disclosureMandateId_0(context,
                                                                      partialProofData),
                                          s5_0);
    const cs_0 = [c0_0, c1_0, c2_0, c3_0, c4_0, c5_0];
    const root_0 = this._persistentHash_2(cs_0);
    const commitment_0 = this._equal_1(fieldSelector_0, 0n) ?
                         c0_0 :
                         this._equal_2(fieldSelector_0, 1n) ?
                         c1_0 :
                         this._equal_3(fieldSelector_0, 2n) ?
                         c2_0 :
                         this._equal_4(fieldSelector_0, 3n) ?
                         c3_0 :
                         this._equal_5(fieldSelector_0, 4n) ? c4_0 : c5_0;
    const openRoot_0 = root_0;
    const openCommitment_0 = commitment_0;
    const openSelector_0 = fieldSelector_0;
    const openAuditorKey_0 = auditorKey_0;
    const openBox_0 = sealedBox_0;
    const nul_0 = this._persistentHash_3([new Uint8Array([114, 101, 109, 105, 116, 58, 100, 110, 117, 108, 108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                          commitment_0,
                                          auditorKey_0]);
    const openNul_0 = nul_0;
    __compactRuntime.assert(!_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_2.toValue(2n),
                                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(openNul_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'disclosure already recorded');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_2.toValue(2n),
                                                                  alignment: _descriptor_2.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(openNul_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
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
    get minted() {
      return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_2.toValue(0n),
                                                                                                   alignment: _descriptor_2.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    claims: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(1n),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(1n),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
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
                                     'remit_quote.compact line 19 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(1n),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
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
        const self_0 = state.asArray()[1];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    disclosureNullifiers: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(2n),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(0n),
                                                                                                                                 alignment: _descriptor_6.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(2n),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
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
                                     'remit_quote.compact line 23 char 1',
                                     'Bytes<32>',
                                     elem_0)
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(2n),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
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
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  callerSecret: (...args) => undefined,
  disclosureSeed: (...args) => undefined,
  disclosureSide: (...args) => undefined,
  disclosureBaseAmount: (...args) => undefined,
  disclosureQuoteAmount: (...args) => undefined,
  disclosurePrincipal: (...args) => undefined,
  disclosureCounterparty: (...args) => undefined,
  disclosureMandateId: (...args) => undefined
});
export const pureCircuits = {
  claimTag: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`claimTag: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const sk_0 = args_0[0];
    const dayBucket_0 = args_0[1];
    if (!(sk_0.buffer instanceof ArrayBuffer && sk_0.BYTES_PER_ELEMENT === 1 && sk_0.length === 32)) {
      __compactRuntime.typeError('claimTag',
                                 'argument 1',
                                 'remit_quote.compact line 38 char 1',
                                 'Bytes<32>',
                                 sk_0)
    }
    if (!(typeof(dayBucket_0) === 'bigint' && dayBucket_0 >= 0n && dayBucket_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('claimTag',
                                 'argument 2',
                                 'remit_quote.compact line 38 char 1',
                                 'Uint<0..18446744073709551616>',
                                 dayBucket_0)
    }
    return _dummyContract._claimTag_0(sk_0, dayBucket_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
