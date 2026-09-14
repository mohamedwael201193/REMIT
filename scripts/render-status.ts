/**
 * Print Render deploy status only (no env values).
 */
import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const key = process.env.RENDER_API_KEY;
if (!key) throw new Error("RENDER_API_KEY missing");

const services = [
  { name: "render", id: JSON.parse(readFileSync(resolve(root, "deployments/render.json"), "utf8")).id as string },
  { name: "render-node", id: JSON.parse(readFileSync(resolve(root, "deployments/render-node.json"), "utf8")).id as string },
];

for (const svc of services) {
  const info = await fetch(`https://api.render.com/v1/services/${svc.id}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!info.ok) throw new Error(`service ${svc.name} HTTP ${info.status}`);
  const body = (await info.json()) as Record<string, unknown>;
  const walk = (obj: unknown, depth = 0) => {
    if (!obj || typeof obj !== "object" || depth > 5) return;
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (["envVars", "secretFiles", "env", "environment"].includes(k)) continue;
      if (
        ["name", "type", "runtime", "buildCommand", "startCommand", "dockerfilePath", "dockerCommand", "autoDeploy", "branch", "rootDir", "plan"].includes(k)
      ) {
        console.log(`  ${k}=${typeof v === "string" || typeof v === "boolean" ? v : JSON.stringify(v)}`);
      } else {
        walk(v, depth + 1);
      }
    }
  };
  console.log("service", svc.name);
  walk(body);

  const res = await fetch(`https://api.render.com/v1/services/${svc.id}/deploys?limit=3`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`deploys ${svc.name} HTTP ${res.status}`);
  const rows = (await res.json()) as {
    deploy?: { id?: string; status?: string; commit?: { id?: string; message?: string }; createdAt?: string; finishedAt?: string };
  }[];
  for (const row of rows) {
    const d = row.deploy ?? {};
    console.log(svc.name, d.status, d.commit?.id?.slice(0, 7) ?? "", (d.commit?.message ?? "").split("\n")[0], d.createdAt);
  }
}
