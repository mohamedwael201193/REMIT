/**
 * Dump Render service JSON with secrets stripped. Prints structure only.
 */
import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const key = process.env.RENDER_API_KEY;
if (!key) throw new Error("RENDER_API_KEY missing");
const nodeId = JSON.parse(readFileSync(resolve(root, "deployments/render-node.json"), "utf8")).id as string;

const res = await fetch(`https://api.render.com/v1/services/${nodeId}`, {
  headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const body = await res.json();

function strip(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(strip);
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (/env|secret|token|key|password/i.test(k) && k !== "autoDeploy") continue;
      o[k] = strip(val);
    }
    return o;
  }
  return v;
}

console.log(JSON.stringify(strip(body), null, 2));
