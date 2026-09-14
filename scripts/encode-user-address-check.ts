/**
 * Length-only check: Compact UserAddress encoding from the operator keystore.
 * Does not open a WalletFacade. Does not print keys or addresses.
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mnemonicToSeedSync } from "@scure/bip39";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { encodeUserAddress } from "@midnight-ntwrk/ledger-v8";
import { HDWallet, Roles, createKeystore } from "@midnightntwrk/wallet-sdk";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const mnemonic = process.env.REMIT_OPERATOR_MNEMONIC;
if (!mnemonic) throw new Error("missing operator mnemonic");
setNetworkId("preprod");
const seed = Buffer.from(mnemonicToSeedSync(mnemonic));
const hd = HDWallet.fromSeed(seed);
if (hd.type !== "seedOk") throw new Error("hd seed");
const derived = hd.hdWallet.selectAccount(0).selectRoles([Roles.NightExternal]).deriveKeysAt(0);
if (derived.type !== "keysDerived") throw new Error("derive");
hd.hdWallet.clear();
const ks = createKeystore(derived.keys[Roles.NightExternal], "preprod");
const addr = ks.getAddress();
const encoded = encodeUserAddress(addr);
const pk = ks.getPublicKey();
console.log(
  JSON.stringify({
    getAddressType: typeof addr,
    getAddressChars: typeof addr === "string" ? addr.length : -1,
    encodedBytes: encoded.length,
    getPublicKeyType: typeof pk,
    bech32Chars: ks.getBech32Address().asString().length,
  }),
);
