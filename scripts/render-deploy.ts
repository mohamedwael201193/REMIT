/**
 * Trigger Render deploys without replacing env vars.
 * Prints service ids and HTTP status only.
 */
import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const key = process.env.RENDER_API_KEY;
if (!key) throw new Error("RENDER_API_KEY missing");

const ids = [
  JSON.parse(readFileSync(resolve(root, "deployments/render.json"), "utf8")).id as string,
  JSON.parse(readFileSync(resolve(root, "deployments/render-node.json"), "utf8")).id as string,
];

for (const id of ids) {
  const res = await fetch(`https://api.render.com/v1/services/${id}/deploys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clearCache: process.env.REMIT_RENDER_CLEAR_CACHE === "1" ? "clear" : "do_not_clear",
    }),
  });
  console.log("redeploy", id, res.status);
  if (!res.ok) throw new Error(`redeploy ${id} HTTP ${res.status}`);
}
