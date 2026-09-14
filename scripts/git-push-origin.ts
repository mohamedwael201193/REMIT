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

function push(header: string) {
  return spawnSync("git", ["-c", `http.extraHeader=${header}`, "push", "origin", "HEAD"], { encoding: "utf8" });
}

function redact(s: string) {
  return s.replaceAll(token, "[redacted]");
}

let result = push(`Authorization: token ${token}`);
const text = `${result.stdout ?? ""}${result.stderr ?? ""}`;
if (result.status !== 0 && /invalid credentials|401|Authentication failed|could not read Username/i.test(text)) {
  result = push(`Authorization: Bearer ${token}`);
}
process.stdout.write(redact(result.stdout ?? ""));
process.stderr.write(redact(result.stderr ?? ""));
process.exit(result.status ?? 1);
