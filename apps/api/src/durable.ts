import dns from "node:dns";
import postgres from "postgres";
import {
  decryptInbox,
  encryptInbox,
  loadInbox,
  saveInbox,
  type InboxSnapshot,
} from "@remit/core";

dns.setDefaultResultOrder("ipv4first");

/** Health probes reuse this so Render checks do not open Postgres on every request. */
export const PERSIST_PING_CACHE_MS = 60_000;

export type PersistStats = {
  queries: number;
  pings: number;
  lastPingAt: number | null;
};

/** Strip Prisma/supabase-js query flags and pass discrete fields so `@` in passwords cannot split the host. */
function pgClient(databaseUrl: string, applicationName = "remit-api") {
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
    connect_timeout: 15,
    idle_timeout: 30,
    max_lifetime: 60 * 10,
    connection: { application_name: applicationName },
    onnotice: () => undefined,
  });
}

export type PersistBackend = "supabase" | "file" | "memory";

export type DurableInbox = {
  backend: PersistBackend;
  load: () => Promise<InboxSnapshot>;
  save: (snap: InboxSnapshot) => Promise<void>;
  ping: () => Promise<boolean>;
  close: () => Promise<void>;
  stats: () => PersistStats;
};

const SNAPSHOT_KIND = "snapshot";
const SNAPSHOT_NONCE = "inbox-v1";
const EMPTY: InboxSnapshot = { v: 1, offers: [], mandates: [], nonces: [], receipts: [] };

export function remitEnvelopeSchema(): string {
  return `
CREATE TABLE IF NOT EXISTS remit_envelopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  owner_binding text,
  nonce text,
  ciphertext text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  UNIQUE (kind, nonce)
);
CREATE INDEX IF NOT EXISTS remit_envelopes_kind_owner ON remit_envelopes (kind, owner_binding);
ALTER TABLE remit_envelopes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE remit_envelopes FROM PUBLIC;
DO $$ BEGIN
  REVOKE ALL ON TABLE remit_envelopes FROM anon;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE ALL ON TABLE remit_envelopes FROM authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY remit_envelopes_deny_anon ON remit_envelopes FOR ALL TO anon USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY remit_envelopes_deny_authenticated ON remit_envelopes FOR ALL TO authenticated USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
`.trim();
}

export async function ensureRemitSchema(databaseUrl: string): Promise<void> {
  const sql = pgClient(databaseUrl, "remit-migrate");
  try {
    await sql.unsafe(remitEnvelopeSchema());
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export function createDurableInbox(opts: {
  password: string;
  file?: string;
  databaseUrl?: string;
  memory?: boolean;
  /** Override only in tests. Production API always uses inbox-v1. */
  snapshotNonce?: string;
  now?: () => number;
}): DurableInbox {
  const emptyStats = (): PersistStats => ({ queries: 0, pings: 0, lastPingAt: null });
  if (opts.memory) {
    let snap: InboxSnapshot = { ...EMPTY, offers: [], mandates: [], nonces: [], receipts: [] };
    return {
      backend: "memory",
      load: async () => structuredClone(snap),
      save: async (next) => {
        snap = structuredClone(next);
      },
      ping: async () => true,
      close: async () => undefined,
      stats: emptyStats,
    };
  }
  if (opts.databaseUrl) {
    const sql = pgClient(opts.databaseUrl);
    const snapshotNonce = opts.snapshotNonce || SNAPSHOT_NONCE;
    const now = opts.now ?? Date.now;
    const stats: PersistStats = { queries: 0, pings: 0, lastPingAt: null };
    let cachedPing: { ok: boolean; at: number } | null = null;
    return {
      backend: "supabase",
      stats: () => ({ ...stats }),
      ping: async () => {
        const t = now();
        if (cachedPing && t - cachedPing.at < PERSIST_PING_CACHE_MS) return cachedPing.ok;
        stats.pings += 1;
        stats.queries += 1;
        try {
          await sql`select 1 as ok`;
          cachedPing = { ok: true, at: t };
        } catch {
          cachedPing = { ok: false, at: t };
        }
        stats.lastPingAt = t;
        return cachedPing.ok;
      },
      load: async () => {
        stats.queries += 1;
        const rows = await sql<{ ciphertext: string }[]>`
          select ciphertext from remit_envelopes
          where kind = ${SNAPSHOT_KIND} and nonce = ${snapshotNonce}
          limit 1
        `;
        const ct = rows[0]?.ciphertext;
        if (!ct) return { ...EMPTY, offers: [], mandates: [], nonces: [], receipts: [] };
        return decryptInbox(Buffer.from(ct, "base64"), opts.password);
      },
      save: async (snap) => {
        const ciphertext = encryptInbox(snap, opts.password).toString("base64");
        stats.queries += 1;
        await sql`
          insert into remit_envelopes (kind, owner_binding, nonce, ciphertext, meta)
          values (${SNAPSHOT_KIND}, ${"operator"}, ${snapshotNonce}, ${ciphertext}, ${sql.json({ v: 1 })})
          on conflict (kind, nonce) do update set
            ciphertext = excluded.ciphertext,
            updated_at = now(),
            version = remit_envelopes.version + 1
        `;
        for (const item of snap.offers) {
          stats.queries += 1;
          await sql`
            insert into remit_envelopes (kind, owner_binding, nonce, ciphertext, meta)
            values (${"rfq"}, ${"executor"}, ${item.id}, ${item.boxed}, ${sql.json({ receivedAt: item.receivedAt })})
            on conflict (kind, nonce) do update set
              ciphertext = excluded.ciphertext,
              updated_at = now(),
              version = remit_envelopes.version + 1
          `;
        }
        for (const item of snap.mandates) {
          stats.queries += 1;
          await sql`
            insert into remit_envelopes (kind, owner_binding, nonce, ciphertext, meta)
            values (${"mandate"}, ${"executor"}, ${item.id}, ${item.boxed}, ${sql.json({ receivedAt: item.receivedAt })})
            on conflict (kind, nonce) do update set
              ciphertext = excluded.ciphertext,
              updated_at = now(),
              version = remit_envelopes.version + 1
          `;
        }
      },
      close: async () => {
        await sql.end({ timeout: 5 });
      },
    };
  }
  const file = opts.file;
  if (!file) {
    throw new Error("durable inbox requires DATABASE_URL or inboxFile");
  }
  return {
    backend: "file",
    ping: async () => true,
    load: async () => loadInbox(file, opts.password),
    save: async (snap) => saveInbox(file, opts.password, snap),
    close: async () => undefined,
    stats: emptyStats,
  };
}
