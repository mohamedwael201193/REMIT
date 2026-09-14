/**
 * Print latest remit-front deployments. Never prints the token.
 */
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const token = process.env.VERCEL_TOKEN;
if (!token) throw new Error("VERCEL_TOKEN missing");

const projectsRes = await fetch("https://api.vercel.com/v9/projects?limit=50", {
  headers: { Authorization: `Bearer ${token}` },
});
if (!projectsRes.ok) throw new Error(`projects HTTP ${projectsRes.status}`);
const projects = (await projectsRes.json()) as {
  projects?: { id: string; name: string }[];
};
const project = (projects.projects ?? []).find((p) => p.name === "remit-front" || p.name === "remit");
if (!project) throw new Error("remit-front project not found");

const depRes = await fetch(`https://api.vercel.com/v6/deployments?projectId=${project.id}&limit=8`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!depRes.ok) throw new Error(`deployments HTTP ${depRes.status}`);
const body = (await depRes.json()) as {
  deployments?: {
    uid?: string;
    readyState?: string;
    created?: number;
    url?: string;
    meta?: { githubCommitSha?: string; githubCommitMessage?: string };
  }[];
};

console.log(
  JSON.stringify(
    {
      project: project.name,
      deployments: (body.deployments ?? []).map((d) => ({
        uid: d.uid,
        readyState: d.readyState,
        created: d.created,
        sha: d.meta?.githubCommitSha?.slice(0, 7),
        message: d.meta?.githubCommitMessage,
        url: d.url,
      })),
    },
    null,
    2,
  ),
);
