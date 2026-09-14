/**
 * Apply remit_envelopes schema via DIRECT_URL (session pooler) or DATABASE_URL.
 * Prints backend status only — never the connection string.
 */
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureRemitSchema } from "../apps/api/src/durable.ts";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("missing DIRECT_URL / DATABASE_URL");
  process.exit(1);
}

await ensureRemitSchema(url);
console.log("remit_envelopes schema ready");
