/**
 * Create/deploy the supplied front/ on Vercel. Public NEXT_PUBLIC values only.
 * Does not print tokens.
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readLiveDeploy } from "./lib/live-deploy.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: resolve(root, ".env.preprod.local") });

const token = process.env.VERCEL_TOKEN;
if (!token) throw new Error("VERCEL_TOKEN missing");

const api = "https://api.vercel.com";
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

type VercelProject = { id: string; name: string; framework?: string | null };

async function vercel(path: string, init: RequestInit = {}) {
  const res = await fetch(`${api}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`vercel ${init.method ?? "GET"} ${path} HTTP ${res.status} ${text.slice(0, 300)}`);
  return text ? (JSON.parse(text) as unknown) : null;
}

function publicEnv(): { key: string; value: string; target: ("production" | "preview" | "development")[] }[] {
  const live = readLiveDeploy(root);
  const pool = live?.pool.address ?? "";
  const quote = live?.quote.address ?? "";
  const apiUrl = (process.env.REMIT_API_PUBLIC_URL ?? "https://remit-api-node.onrender.com").replace(/\/$/, "");
  const pairs: Record<string, string> = {
    NEXT_PUBLIC_MIDNIGHT_NETWORK: "preprod",
    NEXT_PUBLIC_MIDNIGHT_INDEXER_URL: "https://indexer.preprod.midnight.network/api/v4/graphql",
    NEXT_PUBLIC_MIDNIGHT_EXPLORER_TX: "https://preprod.midnightexplorer.com/tx/",
    NEXT_PUBLIC_REMIT_API_URL: apiUrl,
    NEXT_PUBLIC_REMIT_POOL_CONTRACT_ADDRESS: pool,
    NEXT_PUBLIC_REMIT_QUOTE_CONTRACT_ADDRESS: quote,
    NEXT_PUBLIC_REMIT_KEYS_URL: `${apiUrl}/keys`,
    NEXT_PUBLIC_REMIT_ZKIR_URL: `${apiUrl}/zkir`,
  };
  return Object.entries(pairs).map(([key, value]) => ({
    key,
    value,
    target: ["production", "preview", "development"],
  }));
}

const projects = (await vercel("/v9/projects?limit=50")) as { projects?: VercelProject[] };
const existing = (projects.projects ?? []).find((p) => p.name === "remit-front" || p.name === "remit");
let project = existing;
if (!project) {
  const created = (await vercel("/v10/projects", {
    method: "POST",
    body: JSON.stringify({
      name: "remit-front",
      framework: "nextjs",
      rootDirectory: "front",
      gitRepository: {
        type: "github",
        repo: "mohamedwael201193/REMIT",
      },
    }),
  })) as VercelProject;
  project = created;
  console.log("created vercel project", created.name, created.id);
} else {
  console.log("using vercel project", project.name, project.id);
  await vercel(`/v9/projects/${project.id}`, {
    method: "PATCH",
    body: JSON.stringify({ rootDirectory: "front", framework: "nextjs" }),
  });
}

const env = publicEnv();
for (const e of env) {
  const put = await fetch(`${api}/v10/projects/${project.id}/env?upsert=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      key: e.key,
      value: e.value,
      type: "plain",
      target: e.target,
    }),
  });
  console.log("env", e.key, put.status, e.value ? "set" : "empty");
}

const deploy = (await vercel(`/v13/deployments?forceNew=1`, {
  method: "POST",
  body: JSON.stringify({
    name: "remit-front",
    project: project.id,
    gitSource: {
      type: "github",
      repoId: 1368775605,
      ref: "main",
    },
    projectSettings: {
      framework: "nextjs",
      rootDirectory: "front",
      installCommand: "npm install",
      buildCommand: "npx next build",
    },
    target: "production",
  }),
})) as { id?: string; url?: string; readyState?: string };

console.log("deploy", deploy.id ?? "none", deploy.url ?? "", deploy.readyState ?? "");
