/**
 * Render verification: live /health must be Preprod, mpc false, no secrets.
 * Contract addresses stay empty until Preprod deploy evidence exists.
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const URLS = [
  process.env.REMIT_RENDER_DOCKER_URL ?? "https://remit-api-la96.onrender.com/health",
  process.env.REMIT_RENDER_NODE_URL ?? "https://remit-api-node.onrender.com/health",
];

const forbidden = [
  process.env.REMIT_API_ADMIN_TOKEN,
  process.env.REMIT_AGENT_RFQ_BOX_SECRET_HEX,
  process.env.REMIT_OPERATOR_MNEMONIC,
  process.env.GITHUB_TOKEN,
  process.env.RENDER_API_KEY,
].filter((x): x is string => Boolean(x) && x.length >= 8);

async function smoke(url: string) {
  const res = await fetch(url);
  const text = await res.text();
  if (res.status !== 200) throw new Error(`${url} HTTP ${res.status}`);
  const body = JSON.parse(text) as {
    ok?: boolean;
    network?: string;
    mpc?: boolean;
    visibility?: string;
    rfqPublic?: string | null;
    pool?: string;
    quote?: string;
  };
  if (body.ok !== true) throw new Error(`${url} ok !== true`);
  if (body.network !== "preprod") throw new Error(`${url} network is not preprod`);
  if (body.mpc !== false) throw new Error(`${url} claimed MPC`);
  if (body.visibility !== "constrained-broker") throw new Error(`${url} visibility mismatch`);
  const persist = (body as { persist?: { backend?: string; ok?: boolean } }).persist;
  if (!persist || persist.backend !== "supabase" || persist.ok !== true) {
    throw new Error(`${url} persist is not supabase`);
  }
  if ((body as { agent?: { httpSubmit?: boolean } }).agent?.httpSubmit) {
    throw new Error(`${url} claimed httpSubmit`);
  }
  for (const secret of forbidden) {
    if (text.includes(secret)) throw new Error(`${url} leaked a secret`);
  }
  return { url, rfqPublic: Boolean(body.rfqPublic), pool: body.pool || "", quote: body.quote || "" };
}

async function main() {
  const results = [];
  for (const url of URLS) results.push(await smoke(url));
  const preprod = existsSync(resolve(root, "deployments", "preprod.json"))
    ? JSON.parse(readFileSync(resolve(root, "deployments", "preprod.json"), "utf8"))
    : null;
  mkdirSync(resolve(root, "deployments"), { recursive: true });
  writeFileSync(
    resolve(root, "deployments", "render-smoke.json"),
    JSON.stringify({ at: new Date().toISOString(), results, preprodBound: Boolean(preprod) }, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error("render-smoke failed:", e instanceof Error ? e.message : "error");
  process.exit(1);
});
