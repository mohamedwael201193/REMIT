/**
 * Point the native Node Render service at keys:fetch + front:circuit, then
 * clear-cache redeploy both API services. Prints names/status only.
 */
import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const key = process.env.RENDER_API_KEY;
if (!key) throw new Error("RENDER_API_KEY missing");
const headers = {
  Authorization: `Bearer ${key}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const nodeId = JSON.parse(readFileSync(resolve(root, "deployments/render-node.json"), "utf8")).id as string;
const dockerId = JSON.parse(readFileSync(resolve(root, "deployments/render.json"), "utf8")).id as string;
const buildCommand = "npm install --include=dev && npm run keys:fetch && npm run front:circuit";

const patched = await fetch(`https://api.render.com/v1/services/${nodeId}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    serviceDetails: {
      envSpecificDetails: {
        buildCommand,
        startCommand: "npm run api",
      },
    },
  }),
});
console.log("patch node buildCommand", patched.status);
if (!patched.ok) {
  const text = await patched.text();
  console.log("patch body keys", text.slice(0, 300).replace(/[A-Za-z0-9_\-]{20,}/g, "[redacted]"));
  throw new Error(`patch HTTP ${patched.status}`);
}

for (const id of [nodeId, dockerId]) {
  const res = await fetch(`https://api.render.com/v1/services/${id}/deploys`, {
    method: "POST",
    headers,
    body: JSON.stringify({ clearCache: "clear" }),
  });
  console.log("redeploy-clear", id, res.status);
  if (!res.ok) throw new Error(`redeploy ${id} HTTP ${res.status}`);
}
