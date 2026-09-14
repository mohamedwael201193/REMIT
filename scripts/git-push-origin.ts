/**
 * Push HEAD to origin using GITHUB_TOKEN. Redacts the token from git output.
 */
import { config as loadEnv } from "dotenv";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN missing");

function push(args: string[]) {
  return spawnSync("git", args, {
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
  });
}

const basic = Buffer.from(`x-access-token:${token}`, "utf8").toString("base64");
const url = `https://x-access-token:${token}@github.com/mohamedwael201193/REMIT.git`;

function redact(s: string) {
  return s.replaceAll(token, "[redacted]").replaceAll(basic, "[redacted]").replaceAll(url, "https://github.com/mohamedwael201193/REMIT.git");
}

const attempts: string[][] = [
  ["-c", "credential.helper=", "push", url, "HEAD:main"],
  ["-c", "credential.helper=", "-c", `http.extraHeader=Authorization: Basic ${basic}`, "push", "origin", "HEAD"],
];

let result = push(attempts[0]);
for (const next of attempts.slice(1)) {
  const text = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status === 0) break;
  if (!/invalid credentials|401|Authentication failed|could not read Username/i.test(text)) break;
  result = push(next);
}
process.stdout.write(redact(result.stdout ?? ""));
process.stderr.write(redact(result.stderr ?? ""));
if (result.status === 0) {
  const fetched = spawnSync("git", ["-c", "credential.helper=", "fetch", url, "+main:refs/remotes/origin/main"], {
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
  });
  process.stdout.write(redact(fetched.stdout ?? ""));
  process.stderr.write(redact(fetched.stderr ?? ""));
}
process.exit(result.status ?? 1);
