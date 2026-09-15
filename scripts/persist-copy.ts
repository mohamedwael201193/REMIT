/**
 * Copy production remit_envelopes rows from OLD_DATABASE_URL to DATABASE_URL.
 * Skips test-* nonces. Never prints URLs, passwords, or ciphertext.
 */
import dns from "node:dns";
import { createHash } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { ensureRemitSchema } from "../apps/api/src/durable.ts";

dns.setDefaultResultOrder("ipv4first");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: resolve(root, ".env.old-supabase.local") });
const oldUrl = process.env.OLD_DATABASE_URL || process.env.DATABASE_URL;
loadEnv({ path: resolve(root, ".env.preprod.local"), override: true });
const destUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const destRuntime = process.env.DATABASE_URL;

function describe(raw: string | undefined) {
  if (!raw) return null;
  const u = new URL(raw);
  const user = decodeURIComponent(u.username);
  return {
    ref: user.includes(".") ? user.split(".")[1] : "unknown",
    port: u.port || "5432",
  };
}

function pg(databaseUrl: string, name: string) {
  const u = new URL(databaseUrl);
  u.searchParams.delete("pgbouncer");
  return postgres({
    host: u.hostname,
    port: Number(u.port || 5432),
    database: decodeURIComponent((u.pathname || "/postgres").replace(/^\//, "") || "postgres"),
    username: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    ssl: "require",
    prepare: false,
    max: 1,
    connect_timeout: 20,
    connection: { application_name: name },
    onnotice: () => undefined,
  });
}

function sha(ct: string) {
  return createHash("sha256").update(ct, "utf8").digest("hex");
}

const srcMeta = describe(oldUrl);
const dstMeta = describe(destUrl);
console.log("copy", { from: srcMeta, to: dstMeta, destRuntime: describe(destRuntime) });
if (!oldUrl || !destUrl) {
  console.error("missing OLD_DATABASE_URL / DATABASE_URL");
  process.exit(1);
}
if (srcMeta?.ref && dstMeta?.ref && srcMeta.ref === dstMeta.ref) {
  console.error("refusing to copy a project onto itself");
  process.exit(1);
}

await ensureRemitSchema(destUrl);
const src = pg(oldUrl, "remit-copy-src");
const dst = pg(destUrl, "remit-copy-dst");
type Row = {
  id: string;
  kind: string;
  owner_binding: string | null;
  nonce: string | null;
  ciphertext: string;
  meta: unknown;
  created_at: Date;
  updated_at: Date;
  version: number;
};
try {
  const rows = await src<Row[]>`
    select id, kind, owner_binding, nonce, ciphertext, meta, created_at, updated_at, version
    from remit_envelopes
    where nonce is null or nonce not like 'test-%'
    order by created_at
  `;
  console.log("src_prod_rows", rows.length);
  for (const row of rows) {
    await dst`
      insert into remit_envelopes (id, kind, owner_binding, nonce, ciphertext, meta, created_at, updated_at, version)
      values (
        ${row.id}, ${row.kind}, ${row.owner_binding}, ${row.nonce}, ${row.ciphertext},
        ${dst.json(row.meta as Parameters<typeof dst.json>[0])}, ${row.created_at}, ${row.updated_at}, ${row.version}
      )
      on conflict (kind, nonce) do update set
        ciphertext = excluded.ciphertext,
        owner_binding = excluded.owner_binding,
        meta = excluded.meta,
        updated_at = excluded.updated_at,
        version = excluded.version
    `;
  }
  const destRows = await dst<{ kind: string; nonce: string | null; owner_binding: string | null; ciphertext: string }[]>`
    select kind, nonce, owner_binding, ciphertext from remit_envelopes
    where nonce is null or nonce not like 'test-%'
  `;
  const srcMap = new Map(rows.map((r) => [`${r.kind}|${r.nonce}`, r]));
  let mismatch = 0;
  for (const d of destRows) {
    const s = srcMap.get(`${d.kind}|${d.nonce}`);
    if (!s) {
      mismatch += 1;
      continue;
    }
    if (s.ciphertext !== d.ciphertext || s.owner_binding !== d.owner_binding) mismatch += 1;
  }
  console.log("copied", {
    src: rows.length,
    dest: destRows.length,
    mismatch,
    checksums: rows.map((r) => ({
      kind: r.kind,
      nonce: r.nonce && r.nonce.length > 20 ? `${r.nonce.slice(0, 12)}…` : r.nonce,
      owner: r.owner_binding,
      sha: sha(r.ciphertext).slice(0, 16),
      clen: r.ciphertext.length,
    })),
  });
  if (mismatch) process.exit(1);
} finally {
  await src.end({ timeout: 5 });
  await dst.end({ timeout: 5 });
}
