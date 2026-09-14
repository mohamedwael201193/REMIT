import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const BUNDLE = resolve("dist/browser/remit-circuit.js");
const MAP = resolve("dist/browser/remit-circuit.js.map");
const API = (process.env.REMIT_API_PUBLIC_URL ?? "https://remit-api-node.onrender.com").replace(/\/$/, "");

const SECRET_KEY = /(MNEMONIC|SECRET|PASSWORD|TOKEN|API_KEY|_HEX)$/;

function envSecretValues(): string[] {
  const p = resolve(ROOT, ".env.preprod.local");
  if (!existsSync(p)) return [];
  const out: string[] = [];
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (!SECRET_KEY.test(key) || val.length < 12) continue;
    out.push(val);
  }
  return out;
}

function bundleHasEnvSecret(text: string): boolean {
  return envSecretValues().some((v) => text.includes(v));
}

function walkJs(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkJs(p, acc);
    else if (st.isFile() && (name.endsWith(".js") || name.endsWith(".map") || name.endsWith(".ts"))) acc.push(p);
  }
  return acc;
}

describe("circuit bundle / source-map secret scan", () => {
  it("build script disables sourcemaps and local artifacts omit env secrets", () => {
    const build = readFileSync(resolve("scripts/build-browser-circuit.mjs"), "utf8");
    expect(build).toMatch(/sourcemap:\s*false/);
    expect(build).not.toMatch(/sourcemap:\s*true/);
    expect(build).toMatch(/Do not include mnemonics or executor secrets/);

    const circuits = readFileSync(resolve("packages/sdk/src/browser-circuits.ts"), "utf8");
    expect(circuits).toMatch(/sealTabPrivateState/);
    expect(circuits).not.toMatch(/JSON\.stringify\(\s*ps\s*\)/);
    expect(circuits).not.toMatch(/localStorage/);

    if (!existsSync(BUNDLE)) return;
    expect(existsSync(MAP)).toBe(false);
    const text = readFileSync(BUNDLE, "utf8");
    expect(text.includes("sourceMappingURL"), "circuit bundle embeds a source map").toBe(false);
    expect(bundleHasEnvSecret(text), "circuit bundle contains an env secret value").toBe(false);
    expect(text.includes("REMIT_OPERATOR_MNEMONIC")).toBe(false);
    expect(text).not.toMatch(/sessionStorage\.setItem\([^)]*JSON\.stringify/);
    expect(circuits).not.toMatch(/JSON\.stringify\(\s*ps\s*\)/);
    for (const p of walkJs(resolve("dist/browser"))) {
      expect(p.endsWith(".map"), `source map artifact ${p}`).toBe(false);
    }
  });

  it("hosted /browser/remit-circuit.js omits sourcemaps and env secrets when published", async () => {
    const healthRes = await fetch(`${API}/health`);
    if (!healthRes.ok) return;
    const health = (await healthRes.json()) as { circuit?: boolean };
    if (!health.circuit) return;
    const res = await fetch(`${API}/browser/remit-circuit.js?v=ps1`);
    if (res.status === 404) return;
    expect(res.ok).toBe(true);
    const len = Number(res.headers.get("content-length") ?? "0");
    const text = await res.text();
    const sample = len > 20_000_000 || text.length > 20_000_000 ? text.slice(0, 65_536) : text;
    expect(sample.includes("sourceMappingURL"), "hosted circuit bundle embeds a source map").toBe(false);
    expect(bundleHasEnvSecret(sample), "hosted circuit bundle contains an env secret value").toBe(false);
    expect(sample.includes("REMIT_OPERATOR_MNEMONIC")).toBe(false);
  }, 90_000);
});
