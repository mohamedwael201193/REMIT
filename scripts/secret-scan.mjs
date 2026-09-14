import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, sep } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKIP = new Set(["node_modules", ".git", "managed", "dist", "out", "out-faucet", "keys", "zkir"]);
const DENY = [
  /GITHUB_TOKEN=ghp_/,
  /RENDER_API_KEY=rnd_/,
  /VERCEL_TOKEN=vcp_/,
];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, acc);
    else if (st.isFile() && st.size < 2_000_000) acc.push(p);
  }
  return acc;
}

const SECRET_KEY = /(MNEMONIC|SECRET|PASSWORD|TOKEN|API_KEY|_HEX|DATABASE_URL|DIRECT_URL|SERVICE_ROLE_KEY)$/;

const secretFile = join(ROOT, ".env.preprod.local");
if (existsSync(secretFile)) {
  const env = readFileSync(secretFile, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (!SECRET_KEY.test(key) || val.length < 12) continue;
    DENY.push(new RegExp(val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
}

const files = walk(ROOT).filter(
  (f) =>
    !f.includes(".env.preprod.local") &&
    !f.endsWith(".local") &&
    !f.endsWith("secret-scan.mjs") &&
    !f.includes(`${sep}node_modules${sep}`),
);
let hits = 0;
for (const f of files) {
  const t = readFileSync(f, "utf8");
  for (const re of DENY) {
    if (re.test(t)) {
      console.error("secret-scan hit", f);
      hits++;
    }
  }
}
if (hits) process.exit(1);
console.log(`secret-scan ok (${files.length} files)`);
