/**
 * Identity proof only: derive unshielded / shielded / DUST addresses from the
 * operator mnemonic and compare them to REMIT_OPERATOR_* in env.
 * Does NOT open a WalletFacade (no second DUST sync).
 * Never prints the mnemonic.
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mnemonicToSeedSync } from "@scure/bip39";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { DustSecretKey } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { HDWallet, Roles, createKeystore, DustAddress } from "@midnightntwrk/wallet-sdk";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });

const SCREENSHOT_UNSHIELDED =
  "mn_addr_preprod1km3m0xdxcvurflvwv0vq6v9f647rae9r4sllzdd6ddk47khhw6wqkkfddp";
const SCREENSHOT_SHIELDED =
  "mn_shield_addr_preprod17vj5xzfluwj4n0q4rjekp98jy7khmqt080rukfv7q0xa98hw0m69ekqutq2gftej7z0lwpk6ntp84937x3elfqhghkjnc8wlgkuqysqceny9l";
const SCREENSHOT_DUST =
  "mn_dust_preprod1wdmsssf9kpgerd33vfhv7mzn9fwyzrnr02wqs9wexj3k60dxlahyzmptlgj";

const mnemonic = process.env.REMIT_OPERATOR_MNEMONIC;
const expectUnshielded = process.env.REMIT_OPERATOR_UNSHIELDED_ADDR;
const expectShielded = process.env.REMIT_OPERATOR_SHIELDED_ADDR;
const expectDust = process.env.REMIT_OPERATOR_DUST_ADDR;
if (!mnemonic) throw new Error("missing operator mnemonic");

function normShieldedHrp(addr: string) {
  return addr.replace(/^mn_shield-addr_/, "mn_shield_addr_");
}

setNetworkId("preprod");
const seed = Buffer.from(mnemonicToSeedSync(mnemonic));
const hd = HDWallet.fromSeed(seed);
if (hd.type !== "seedOk") throw new Error("hd seed");
const derived = hd.hdWallet.selectAccount(0).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust]).deriveKeysAt(0);
if (derived.type !== "keysDerived") throw new Error("derive");
hd.hdWallet.clear();

const unshielded = createKeystore(derived.keys[Roles.NightExternal], "preprod").getBech32Address().asString();
const dustSk = DustSecretKey.fromSeed(derived.keys[Roles.Dust]);
let dustAddr = "";
try {
  dustAddr = String(DustAddress.encodePublicKey("preprod", dustSk.publicKey));
} catch {
  dustAddr = "(encode failed)";
}

const unshieldedMatch = unshielded === SCREENSHOT_UNSHIELDED && unshielded === expectUnshielded;
const dustMatch = Boolean(expectDust) && dustAddr === expectDust && expectDust.startsWith(SCREENSHOT_DUST.slice(0, 40));
const envShieldedNorm = expectShielded ? normShieldedHrp(expectShielded) : "";
const shotShieldedNorm = normShieldedHrp(SCREENSHOT_SHIELDED);

const out = {
  derivedUnshielded: unshielded,
  envUnshielded: expectUnshielded ?? "(missing)",
  screenshotUnshielded: SCREENSHOT_UNSHIELDED,
  matchEnv: unshielded === expectUnshielded,
  matchScreenshot: unshielded === SCREENSHOT_UNSHIELDED,
  envShieldedSet: Boolean(expectShielded),
  shieldedHrpVariant: expectShielded?.startsWith("mn_shield-addr_")
    ? "env-hyphen-hrp"
    : expectShielded?.startsWith("mn_shield_addr_")
      ? "env-underscore-hrp"
      : "unknown",
  screenshotShieldedHrp: "underscore-hrp",
  shieldedPayloadHeadMatch: envShieldedNorm.slice(0, 40) === shotShieldedNorm.slice(0, 40),
  derivedDust: dustAddr,
  envDust: expectDust ?? "(missing)",
  envDustExact: expectDust === dustAddr,
  screenshotDustPrefixMatch: Boolean(expectDust?.startsWith(SCREENSHOT_DUST.slice(0, 40))),
  identity: unshieldedMatch && dustMatch ? "SAME" : "DIFFERENT",
};
console.log(JSON.stringify(out, null, 2));
