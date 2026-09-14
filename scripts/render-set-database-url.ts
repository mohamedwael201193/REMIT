/**
 * Merge DATABASE_URL onto existing Render env vars. Never PUT a singleton list.
 * Prints service ids and HTTP status only.
 */
import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const key = process.env.RENDER_API_KEY;
const databaseUrl = process.env.DATABASE_URL;
if (!key) throw new Error("RENDER_API_KEY missing");
if (!databaseUrl) throw new Error("DATABASE_URL missing");

const ids = [
  JSON.parse(readFileSync(resolve(root, "deployments/render.json"), "utf8")).id as string,
  JSON.parse(readFileSync(resolve(root, "deployments/render-node.json"), "utf8")).id as string,
];

const headers = {
  Authorization: `Bearer ${key}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

for (const id of ids) {
  const get = await fetch(`https://api.render.com/v1/services/${id}/env-vars`, { headers });
  if (!get.ok) throw new Error(`get env ${id} HTTP ${get.status}`);
  const existing = (await get.json()) as { envVar?: { key?: string; value?: string } }[];
  const merged = existing
    .map((row) => ({ key: row.envVar?.key ?? "", value: row.envVar?.value ?? "" }))
    .filter((row) => row.key && row.key !== "DATABASE_URL");
  merged.push({ key: "DATABASE_URL", value: databaseUrl });
  const res = await fetch(`https://api.render.com/v1/services/${id}/env-vars`, {
    method: "PUT",
    headers,
    body: JSON.stringify(merged),
  });
  console.log("env merge DATABASE_URL", id, "vars", merged.length, "http", res.status);
  if (!res.ok) throw new Error(`env ${id} HTTP ${res.status}`);
}
