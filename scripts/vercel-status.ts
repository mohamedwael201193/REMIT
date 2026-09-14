import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const token = process.env.VERCEL_TOKEN;
if (!token) throw new Error("VERCEL_TOKEN missing");
const id = process.argv[2];
if (!id) throw new Error("usage: vercel-status.ts <deploymentId>");
const res = await fetch(`https://api.vercel.com/v13/deployments/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const j = (await res.json()) as {
  readyState?: string;
  readySubstate?: string;
  url?: string;
  alias?: string[];
  errorMessage?: string;
};
console.log(JSON.stringify({
  http: res.status,
  readyState: j.readyState,
  readySubstate: j.readySubstate,
  url: j.url,
  alias: j.alias,
  errorMessage: j.errorMessage,
}));
