import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const managed = join(root, "CONTRACT", "managed");

function keysOf(name) {
  const dir = join(managed, name, "keys");
  if (!existsSync(dir)) return { count: 0, verifiers: [], provers: [] };
  const files = readdirSync(dir);
  const verifiers = files.filter((f) => f.endsWith(".verifier")).map((f) => {
    const s = statSync(join(dir, f)).size;
    return { file: f, bytes: s };
  });
  const provers = files.filter((f) => f.endsWith(".prover")).map((f) => {
    const s = statSync(join(dir, f)).size;
    return { file: f, bytes: s };
  });
  return { count: verifiers.length, verifiers, provers };
}

const report = {
  pool: keysOf("remit_pool"),
  quote: keysOf("remit_quote"),
  compilerVersion: existsSync(join(managed, "remit_pool", "compiler", "contract-info.json"))
    ? JSON.parse(readFileSync(join(managed, "remit_pool", "compiler", "contract-info.json"), "utf8"))["compiler-version"]
    : null,
};
console.log(JSON.stringify(report, null, 2));
mkdirSync(join(root, "deployments"), { recursive: true });
writeFileSync(join(root, "deployments", "managed-keys.json"), JSON.stringify(report, null, 2));
if (report.pool.count && report.pool.count !== 7) {
  console.error("expected 7 pool verifier keys, got", report.pool.count);
  process.exit(1);
}
