import type { Witnesses } from "@remit/contracts/quote";
import { RemitError } from "./errors.js";
import { fromArray } from "./bytes.js";

export type QuotePrivateState = {
  version: 1;
  callerSk?: number[];
};

export const quoteWitnesses: Witnesses<QuotePrivateState> = {
  callerSecret: ({ privateState }) => {
    if (!privateState.callerSk) throw new RemitError("WITNESS_MISSING", "quote caller secret not staged");
    return [privateState, fromArray(privateState.callerSk)];
  },
};
