/**
 * Redacted Postgres inspect. Never prints URLs, passwords, or ciphertext.
 */
import dns from "node:dns";
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

dns.setDefaultResultOrder("ipv4first");
loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env.preprod.local") });

function describeUrl(raw: string | undefined) {
  if (!raw) return null;
  const u = new URL(raw);
  const user = decodeURIComponent(u.username);
  const ref = user.includes(".") ? user.split(".")[1] ?? "unknown" : "unknown";
  return {
    ref,
    host: u.hostname,
    port: u.port || "5432",
    db: decodeURIComponent((u.pathname || "/postgres").replace(/^\//, "") || "postgres"),
    userPrefix: user.split(".")[0] ?? "unknown",
  };
}

function pgClient(databaseUrl: string) {
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
    idle_timeout: 10,
    connection: { application_name: "remit-inspect" },
    onnotice: () => undefined,
  });
}

const target = process.argv.includes("--direct")
  ? process.env.DIRECT_URL || process.env.DATABASE_URL
  : process.env.DATABASE_URL || process.env.DIRECT_URL;

const meta = describeUrl(target);
console.log("target", meta ?? "missing");
if (!target || !meta) process.exit(1);

const sql = pgClient(target);
try {
  const ping = await sql`select current_database() as db, current_user as usr, inet_server_addr()::text as addr`;
  const usr = String(ping[0]?.usr ?? "");
  console.log("connected", {
    db: ping[0]?.db,
    userPrefix: usr.split(".")[0] ?? usr.slice(0, 8),
    server: ping[0]?.addr ? "yes" : "no",
  });

  const tables = await sql<{ nsp: string; rel: string; bytes: string; live: string }[]>`
    select n.nspname as nsp, c.relname as rel,
      pg_total_relation_size(c.oid)::text as bytes,
      c.reltuples::bigint::text as live
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname not in ('pg_catalog','information_schema','pg_toast')
      and c.relkind in ('r','m')
    order by pg_total_relation_size(c.oid) desc
    limit 40
  `;
  console.log("tables", tables.map((t) => ({ ...t, bytes: Number(t.bytes) })));

  const exists = tables.some((t) => t.nsp === "public" && t.rel === "remit_envelopes");
  if (exists) {
    const kinds = await sql<{ kind: string; n: string; owners: string; bytes: string }[]>`
      select kind, count(*)::text as n,
        count(distinct owner_binding)::text as owners,
        coalesce(sum(octet_length(ciphertext)),0)::text as bytes
      from remit_envelopes
      group by kind
      order by kind
    `;
    console.log("envelopes_by_kind", kinds);
    const sample = await sql<{ kind: string; owner: string | null; nonce: string | null; clen: number; meta_keys: string }[]>`
      select kind, owner_binding as owner, nonce, octet_length(ciphertext) as clen,
        (select coalesce(string_agg(k, ','), '') from jsonb_object_keys(meta) as k) as meta_keys
      from remit_envelopes
      order by updated_at desc
      limit 20
    `;
    console.log(
      "envelope_heads",
      sample.map((r) => ({
        kind: r.kind,
        owner: r.owner,
        nonce: r.nonce && r.nonce.startsWith("test-") ? "test-*" : r.nonce ? `${r.nonce.slice(0, 12)}…` : null,
        clen: r.clen,
        meta_keys: r.meta_keys,
      })),
    );
  } else {
    console.log("envelopes_by_kind", "missing");
  }

  const policies = await sql<{ tablename: string; policyname: string; roles: string; cmd: string; qual: string | null; with_check: string | null }[]>`
    select tablename, policyname, roles::text as roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  `;
  console.log("policies", policies);

  const rls = await sql<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`
    select c.relname, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  `;
  console.log("rls", rls);

  const grants = await sql<{ grantee: string; privilege_type: string }[]>`
    select grantee, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'remit_envelopes'
    order by grantee, privilege_type
  `;
  console.log("grants", grants);

  const indexes = await sql<{ indexname: string; indexdef: string }[]>`
    select indexname, indexdef from pg_indexes
    where schemaname = 'public' and tablename = 'remit_envelopes'
    order by indexname
  `;
  console.log("indexes", indexes);

  const db = await sql<{
    numbackends: number;
    xact_commit: string;
    xact_rollback: string;
    blks_read: string;
    blks_hit: string;
    tup_returned: string;
    tup_fetched: string;
    tup_inserted: string;
    tup_updated: string;
    tup_deleted: string;
    stats_reset: string | null;
  }[]>`
    select numbackends,
      xact_commit::text, xact_rollback::text,
      blks_read::text, blks_hit::text,
      tup_returned::text, tup_fetched::text,
      tup_inserted::text, tup_updated::text, tup_deleted::text,
      stats_reset::text
    from pg_stat_database
    where datname = current_database()
  `;
  console.log("pg_stat_database", db[0]);

  const activity = await sql<{ application_name: string; state: string | null; n: string }[]>`
    select coalesce(nullif(application_name, ''), '(none)') as application_name,
      coalesce(state, 'idle') as state,
      count(*)::text as n
    from pg_stat_activity
    where datname = current_database()
    group by 1, 2
    order by 1, 2
  `;
  console.log("activity", activity);

  try {
    const stmts = await sql<{ query: string; calls: string; total_exec_time: string; mean_exec_time: string; rows: string }[]>`
      select query, calls::text, round(total_exec_time::numeric, 1)::text as total_exec_time,
        round(mean_exec_time::numeric, 2)::text as mean_exec_time, rows::text
      from pg_stat_statements
      order by total_exec_time desc
      limit 15
    `;
    console.log(
      "pg_stat_statements",
      stmts
        .filter((s) => !/password|scram-sha|alter role/i.test(s.query))
        .map((s) => ({
          ...s,
          query: s.query
            .replace(/password\s+'[^']+'/gi, "password '[redacted]'")
            .replace(/SCRAM-SHA-\S+/gi, "[redacted-scram]")
            .replace(/postgres:\/\/\S+/gi, "[redacted-db]")
            .replace(/[A-Za-z0-9+/=]{80,}/g, "[blob]")
            .slice(0, 180),
        })),
    );
  } catch (err) {
    console.log("pg_stat_statements", err instanceof Error ? err.message.slice(0, 80) : "unavailable");
  }

  const extensions = await sql<{ extname: string }[]>`select extname from pg_extension order by 1`;
  console.log("extensions", extensions.map((e) => e.extname));
} finally {
  await sql.end({ timeout: 5 });
}
