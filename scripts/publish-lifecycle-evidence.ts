/**
 * POST gitignored lifecycle.json to the public API /evidence (tx/block only).
 * Prints HTTP status, never the admin token.
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { publishPublicEvidence, readLocalLifecycleEvidence } from "./lib/public-evidence.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: resolve(root, ".env.preprod.local") });

const apiUrl = (process.env.REMIT_API_PUBLIC_URL ?? process.env.RENDER_SERVICE_URL ?? "https://remit-api-node.onrender.com").replace(
  /\/health$/,
  "",
);
const admin = process.env.REMIT_API_ADMIN_TOKEN ?? "";
if (!admin) throw new Error("REMIT_API_ADMIN_TOKEN missing");
const body = readLocalLifecycleEvidence(root);
if (!body) throw new Error("deployments/lifecycle.json missing");
const status = await publishPublicEvidence(apiUrl.replace(/\/$/, ""), admin, body);
console.log("published public evidence", status, "steps", body.steps.length);
if (status < 200 || status >= 300) process.exit(1);
