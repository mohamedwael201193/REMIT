import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const token = process.env.VERCEL_TOKEN;
if (!token) throw new Error("VERCEL_TOKEN missing");
const id = process.argv[2];
if (!id) throw new Error("usage: vercel-wait.ts dpl_...");

for (let i = 0; i < 24; i++) {
  const res = await fetch(`https://api.vercel.com/v13/deployments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { readyState?: string; url?: string };
  console.log(body.readyState, body.url ?? "");
  if (body.readyState === "READY" || body.readyState === "ERROR" || body.readyState === "CANCELED") {
    process.exit(body.readyState === "READY" ? 0 : 1);
  }
  await new Promise((r) => setTimeout(r, 15000));
}
process.exit(1);
