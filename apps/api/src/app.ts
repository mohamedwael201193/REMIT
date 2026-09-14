import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import staticPlugin from "@fastify/static";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  EXECUTOR_VISIBILITY,
  openJson,
  publicErrorMessage,
  rfqPublicFromSecret,
  verifyDisclosure,
  type DisclosurePackage,
  fetchBlock,
  assertLedger8,
  fetchContractAction,
  poolLedgerFromStateHex,
  publicExecutorKeyHex,
  indexerWsFromHttp,
  fromHex,
  toHex,
  sanitizePublicDetail,
  stripPublicLeaks,
  type InboxItem,
} from "@remit/core";
import { constructRankedFill, mandateOpeningFromInbox, planFillFromInbox, publicAgentRankView, publicAgentStatusView, agentHttpHasLeakKeys } from "@remit/agent";
import { createDurableInbox } from "./durable.js";

export type ApiConfig = {
  cors: string;
  admin: string;
  rfqSk: string;
  execSk: string;
  pool: string;
  quote: string;
  network: string;
  indexer: string;
  keysDir?: string;
  inboxFile?: string;
  databaseUrl?: string;
  auditPackageFile?: string;
  httpSubmit?: boolean;
  submitFill?: (pending: unknown, nowBound: bigint) => Promise<{ txHash: string; block: number }>;
};

type PublicEvidence = {
  present: boolean;
  network: string;
  pool?: { address: string; txHash?: string; block?: number };
  quote?: { address: string; txHash?: string; block?: number };
  steps: { name: string; ok: boolean; txHash?: string; block?: number; detail?: string }[];
  mpc: false;
  globalBest?: false;
  semantics?: string;
  k?: number;
};

export async function buildApp(cfg: ApiConfig) {
  const durable =
    cfg.rfqSk && cfg.rfqSk.length === 64 && (cfg.databaseUrl || cfg.inboxFile)
      ? createDurableInbox({
          password: cfg.rfqSk,
          file: cfg.inboxFile,
          databaseUrl: cfg.databaseUrl,
        })
      : createDurableInbox({ password: cfg.rfqSk || "test-only-not-for-prod", memory: true });
  const snap = await durable.load();
  const offers: InboxItem[] = [...snap.offers];
  const mandates: InboxItem[] = [...snap.mandates];
  const receipts = new Map<string, string>(snap.receipts);
  const nonces = new Set<string>(snap.nonces);

  let persistChain = Promise.resolve();
  const persistInbox = () => {
    const write = () =>
      durable.save({
        v: 1,
        offers,
        mandates,
        nonces: [...nonces],
        receipts: [...receipts.entries()],
      });
    persistChain = persistChain.then(write, write);
    return persistChain;
  };
  const seedAuditPackage = () => {
    if (receipts.get("audit:published")) return;
    const candidates = [
      cfg.auditPackageFile,
      resolve(process.cwd(), "apps/api/audit-package.json"),
      resolve(process.cwd(), "audit-package.json"),
      resolve(process.cwd(), "../../apps/api/audit-package.json"),
    ].filter((p): p is string => typeof p === "string" && p.length > 0);
    for (const p of candidates) {
      if (!existsSync(p)) continue;
      try {
        const pkg = JSON.parse(readFileSync(p, "utf8")) as DisclosurePackage;
        if (Array.isArray(pkg?.openings) && pkg.openings.length === 1) {
          receipts.set("audit:published", JSON.stringify(pkg));
          persistInbox();
          return;
        }
      } catch {
        continue;
      }
    }
  };
  seedAuditPackage();
  let lastAgent: ReturnType<typeof publicAgentStatusView> | null = null;

  let publicEvidence: PublicEvidence | null = null;

  const evidenceFiles = [
    resolve(process.cwd(), "apps/api/preprod-evidence.json"),
    resolve(process.cwd(), "preprod-evidence.json"),
    resolve(process.cwd(), "../../apps/api/preprod-evidence.json"),
  ];
  for (const p of evidenceFiles) {
    if (!existsSync(p)) continue;
    try {
      const j = JSON.parse(readFileSync(p, "utf8")) as PublicEvidence;
      if (j?.present && Array.isArray(j.steps)) {
        publicEvidence = stripPublicLeaks({ ...j, mpc: false as const });
        break;
      }
    } catch {
      /* keep scanning */
    }
  }

  const fileDeploy = (): { pool?: string; quote?: string } => {
    const candidates = [
      resolve(process.cwd(), "deployments/preprod-mbbe.json"),
      resolve(process.cwd(), "../../deployments/preprod-mbbe.json"),
      resolve(process.cwd(), "apps/api/preprod-evidence.json"),
      resolve(process.cwd(), "preprod-evidence.json"),
      resolve(process.cwd(), "../../apps/api/preprod-evidence.json"),
      resolve(process.cwd(), "deployments/preprod.json"),
      resolve(process.cwd(), "../../deployments/preprod.json"),
    ];
    for (const p of candidates) {
      if (!existsSync(p)) continue;
      try {
        const j = JSON.parse(readFileSync(p, "utf8")) as {
          pool?: { address?: string };
          quote?: { address?: string };
        };
        if (j.pool?.address && j.quote?.address) return { pool: j.pool.address, quote: j.quote.address };
      } catch {
        continue;
      }
    }
    return {};
  };

  const liveAddresses = () => {
    const fromFile = fileDeploy();
    const pool = cfg.pool || fromFile.pool || "";
    const quote = cfg.quote || fromFile.quote || "";
    return { pool, quote, live: Boolean(pool && quote) };
  };

  const app = Fastify({ logger: false });
  await app.register(helmet, { global: true, contentSecurityPolicy: false });
  await app.register(cors, { origin: cfg.cors === "*" ? true : cfg.cors.split(",") });
  await app.register(rateLimit, { max: 60, timeWindow: "1 minute" });
  app.addHook("onSend", async (req, reply, payload) => {
    const path = (req.url.split("?")[0] ?? req.url);
    if (path.startsWith("/keys/") || path.startsWith("/zkir/") || path.startsWith("/browser/")) {
      reply.header("Access-Control-Allow-Origin", "*");
      reply.header("Cross-Origin-Resource-Policy", "cross-origin");
    }
    return payload;
  });

  const managedRoots = [
    resolve(process.cwd(), "CONTRACT/managed"),
    resolve(process.cwd(), "../../CONTRACT/managed"),
    resolve(process.cwd(), "../CONTRACT/managed"),
  ];
  const managedRoot = cfg.keysDir
    ? resolve(cfg.keysDir, "..")
    : managedRoots.find((p) => existsSync(p));
  const keyHeaders = (res: { setHeader: (k: string, v: string) => void }) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  };
  if (managedRoot) {
    const poolKeys = resolve(managedRoot, "remit_pool/keys");
    const quoteKeys = resolve(managedRoot, "remit_quote/keys");
    const poolZkir = resolve(managedRoot, "remit_pool/zkir");
    const quoteZkir = resolve(managedRoot, "remit_quote/zkir");
    if (existsSync(poolKeys)) {
      await app.register(staticPlugin, {
        root: poolKeys,
        prefix: "/keys/",
        decorateReply: false,
        setHeaders: keyHeaders,
      });
    }
    if (existsSync(quoteKeys)) {
      await app.register(staticPlugin, {
        root: quoteKeys,
        prefix: "/keys/quote/",
        decorateReply: false,
        setHeaders: keyHeaders,
      });
    }
    if (existsSync(poolZkir)) {
      await app.register(staticPlugin, {
        root: poolZkir,
        prefix: "/zkir/",
        decorateReply: false,
        setHeaders: keyHeaders,
      });
    }
    if (existsSync(quoteZkir)) {
      await app.register(staticPlugin, {
        root: quoteZkir,
        prefix: "/zkir/quote/",
        decorateReply: false,
        setHeaders: keyHeaders,
      });
    }
  }

  const browserRoots = [
    resolve(process.cwd(), "dist/browser"),
    resolve(process.cwd(), "../../dist/browser"),
    resolve(process.cwd(), "../dist/browser"),
  ];
  const browserRoot = browserRoots.find((p) => existsSync(p));
  if (browserRoot) {
    await app.register(staticPlugin, {
      root: browserRoot,
      prefix: "/browser/",
      decorateReply: false,
      setHeaders: (res: { setHeader: (k: string, v: string) => void }, filePath: string) => {
        keyHeaders(res);
        if (filePath.endsWith(".wasm")) res.setHeader("Content-Type", "application/wasm");
      },
    });
  }

  app.get("/health", async () => {
    let block: { height: number; protocolVersion: number } | null = null;
    try {
      const b = await fetchBlock(cfg.indexer);
      assertLedger8(b);
      block = { height: b.height, protocolVersion: b.protocolVersion };
    } catch {
      block = null;
    }
    const { pool, quote } = liveAddresses();
    return {
      ok: true,
      network: cfg.network,
      pool,
      quote,
      indexer: cfg.indexer,
      rfqPublic: cfg.rfqSk ? rfqPublicFromSecret(cfg.rfqSk) : null,
      inbox: { offers: offers.length, mandates: mandates.length },
      visibility: EXECUTOR_VISIBILITY.model,
      trust: EXECUTOR_VISIBILITY,
      mpc: false,
      dustGate: "availableCoins>=1",
      circuit: Boolean(browserRoot && existsSync(resolve(browserRoot, "remit-circuit.js"))),
      block,
      k: 3,
      globalBest: false,
      semantics: "mbbe-k3",
      agent: { rank: true, httpSubmit: Boolean(cfg.httpSubmit && cfg.submitFill) },
      persist: { backend: durable.backend, ok: await durable.ping() },
    };
  });

  app.get("/agent/status", async () => {
    return stripPublicLeaks({
      ok: true,
      rank: true,
      httpSubmit: Boolean(cfg.httpSubmit && cfg.submitFill),
      k: 3,
      globalBest: false,
      mpc: false,
      rule: "mbbe-eligible-only",
      inbox: { offers: offers.length, mandates: mandates.length },
      last: lastAgent,
    });
  });

  app.get("/inbox", async (req, reply) => {
    const token = String((req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""));
    if (!cfg.admin || token !== cfg.admin) return reply.code(401).send({ error: "unauthorized" });
    return {
      offers: offers.map((item) => ({ id: item.id, box: item.boxed })),
      mandates: mandates.map((item) => ({ id: item.id, box: item.boxed })),
    };
  });

  app.post("/inbox/restore", async (req, reply) => {
    const token = String((req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""));
    if (!cfg.admin || token !== cfg.admin) return reply.code(401).send({ error: "unauthorized" });
    const body = req.body as { offers?: { id?: string; box?: string }[]; mandates?: { id?: string; box?: string }[] };
    const idOk = (id: string) => /^[A-Za-z0-9._:-]{1,128}$/.test(id);
    const boxOk = (box: string) => typeof box === "string" && box.length >= 32 && box.length <= 16_384;
    const upsert = (list: InboxItem[], id: string, box: string) => {
      const i = list.findIndex((item) => item.id === id);
      const next: InboxItem = { id, boxed: box, receivedAt: Date.now() };
      if (i >= 0) list[i] = next;
      else list.push(next);
    };
    for (const row of body.offers ?? []) {
      const id = typeof row.id === "string" ? row.id : "";
      const box = typeof row.box === "string" ? row.box : "";
      if (!idOk(id) || !boxOk(box)) return reply.code(400).send({ error: "invalid offer restore" });
      upsert(offers, id, box);
    }
    for (const row of body.mandates ?? []) {
      const id = typeof row.id === "string" ? row.id : "";
      const box = typeof row.box === "string" ? row.box : "";
      if (!idOk(id) || !boxOk(box)) return reply.code(400).send({ error: "invalid mandate restore" });
      upsert(mandates, id, box);
    }
    await persistInbox();
    return { ok: true, offers: offers.length, mandates: mandates.length };
  });

  app.post("/agent/settled", async (req, reply) => {
    const token = String((req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""));
    if (!cfg.admin || token !== cfg.admin) return reply.code(401).send({ error: "unauthorized" });
    const body = req.body as { selectedId?: string; txHash?: string; block?: number };
    const selectedId = typeof body.selectedId === "string" ? body.selectedId : "";
    const txHash = typeof body.txHash === "string" ? body.txHash.toLowerCase() : "";
    const block = typeof body.block === "number" && Number.isFinite(body.block) ? body.block : NaN;
    if (!selectedId || selectedId.length > 128) return reply.code(400).send({ error: "invalid selectedId" });
    if (!/^[0-9a-f]{64}$/.test(txHash)) return reply.code(400).send({ error: "invalid txHash" });
    if (!Number.isInteger(block) || block <= 0) return reply.code(400).send({ error: "invalid block" });
    lastAgent = stripPublicLeaks({
      at: lastAgent?.at ?? Date.now(),
      candidateCount: lastAgent?.candidateCount ?? 1,
      eligibleCount: lastAgent?.eligibleCount ?? 1,
      rejectedCount: lastAgent?.rejectedCount ?? 0,
      selected: true,
      selectedId,
      rule: "mbbe-eligible-only" as const,
      globalBest: false as const,
      mpc: false as const,
      submitted: true,
      txHash,
      block,
    });
    return stripPublicLeaks({ ok: true, last: lastAgent });
  });

  app.get("/config", async () => {
    const { pool, quote, live } = liveAddresses();
    const executorKey = publicExecutorKeyHex(cfg.execSk);
    return {
      ok: true,
      live,
      network: cfg.network,
      pool,
      quote,
      indexer: cfg.indexer,
      indexerWs: indexerWsFromHttp(cfg.indexer),
      rfqPublic: cfg.rfqSk ? rfqPublicFromSecret(cfg.rfqSk) : null,
      executorKey: executorKey ?? null,
      mpc: false,
      dustGate: "availableCoins>=1",
      keysUrl: "/keys",
      zkirUrl: "/zkir",
      explorerTx: "https://preprod.midnightexplorer.com/tx/",
      visibility: EXECUTOR_VISIBILITY.model,
      trust: EXECUTOR_VISIBILITY,
    };
  });

  app.get("/audit/head", async () => {
    const { pool } = liveAddresses();
    if (!pool) return { ok: false, auditRoot: null, fills: "0" };
    try {
      const hit = await fetchContractAction(cfg.indexer, pool);
      if (!hit?.stateHex) return { ok: false, auditRoot: null, fills: "0" };
      const ld = poolLedgerFromStateHex(hit.stateHex);
      let auditRoot: string | null = null;
      for (const x of ld.auditRoots) {
        auditRoot = toHex(x);
        break;
      }
      return stripPublicLeaks({
        ok: Boolean(auditRoot),
        auditRoot,
        fills: ld.fills.toString(),
        openOffers: ld.openOffers.toString(),
        txHashIsNotAuditRoot: true,
      });
    } catch {
      return { ok: false, auditRoot: null, fills: "0" };
    }
  });

  app.post("/audit/verify", async (req, reply) => {
    const body = req.body as { package?: Parameters<typeof verifyDisclosure>[0]; rootHex?: string };
    if (!body?.package) return reply.code(400).send({ error: "invalid package" });
    let rootHex = typeof body.rootHex === "string" ? body.rootHex.replace(/^0x/i, "") : "";
    if (!rootHex) {
      const { pool } = liveAddresses();
      if (pool) {
        try {
          const hit = await fetchContractAction(cfg.indexer, pool);
          if (hit?.stateHex) {
            const ld = poolLedgerFromStateHex(hit.stateHex);
            for (const x of ld.auditRoots) {
              rootHex = toHex(x);
              break;
            }
          }
        } catch {
          /* caller must supply rootHex */
        }
      }
    }
    if (!rootHex || rootHex.length !== 64) return reply.code(400).send({ error: "auditRoot missing" });
    const root = fromHex(rootHex);
    const result = verifyDisclosure(body.package, root);
    return stripPublicLeaks({
      ok: result.ok,
      failed: result.failed,
      fields: Array.isArray(body.package.openings) ? body.package.openings.map((o) => o.field) : [],
      auditRoot: rootHex,
    });
  });

  app.post("/audit/publish", async (req, reply) => {
    const token = String((req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""));
    if (!cfg.admin || token !== cfg.admin) return reply.code(401).send({ error: "unauthorized" });
    const body = req.body as { package?: DisclosurePackage };
    if (!body?.package || !Array.isArray(body.package.openings) || body.package.openings.length !== 1) {
      return reply.code(400).send({ error: "one-field package required" });
    }
    receipts.set("audit:published", JSON.stringify(body.package));
    await persistInbox();
    return { ok: true, field: body.package.openings[0]?.field };
  });

  app.get("/audit/package", async (_req, reply) => {
    const raw = receipts.get("audit:published");
    if (!raw) return reply.code(404).send({ error: "no authorized package" });
    try {
      const pkg = JSON.parse(raw) as DisclosurePackage;
      if (!Array.isArray(pkg.openings) || pkg.openings.length !== 1) {
        return reply.code(404).send({ error: "no authorized package" });
      }
      return pkg;
    } catch {
      return reply.code(404).send({ error: "no authorized package" });
    }
  });

  app.get("/chain", async () => {
    const { pool, quote, live } = liveAddresses();
    let protocolVersion: number | undefined;
    try {
      const b = await fetchBlock(cfg.indexer);
      assertLedger8(b);
      protocolVersion = b.protocolVersion;
    } catch {
      protocolVersion = undefined;
    }
    const snapshot: {
      live: boolean;
      network: string;
      protocolVersion?: number;
      pool?: {
        address: string;
        txHash?: string;
        block?: number;
        fills: number;
        openOffers: number;
        activeMandates: number;
      };
      quote?: { address: string; txHash?: string; block?: number };
    } = { live, network: cfg.network, protocolVersion };
    if (pool) {
      try {
        const hit = await fetchContractAction(cfg.indexer, pool);
        let fills = 0;
        let openOffers = 0;
        let activeMandates = 0;
        if (hit?.stateHex) {
          try {
            const ld = poolLedgerFromStateHex(hit.stateHex);
            fills = Number(ld.fills);
            openOffers = Number(ld.openOffers);
            activeMandates = Number(ld.activeMandates);
          } catch {
            // public counters unavailable until state deserializes
          }
        }
        snapshot.pool = {
          address: pool,
          txHash: hit?.txHash,
          block: hit?.blockHeight,
          fills,
          openOffers,
          activeMandates,
        };
      } catch {
        snapshot.pool = { address: pool, fills: 0, openOffers: 0, activeMandates: 0 };
      }
    }
    if (quote) {
      try {
        const hit = await fetchContractAction(cfg.indexer, quote);
        snapshot.quote = { address: quote, txHash: hit?.txHash, block: hit?.blockHeight };
      } catch {
        snapshot.quote = { address: quote };
      }
    }
    return snapshot;
  });

  app.get("/evidence", async () => {
    const body = publicEvidence ?? { present: false, steps: [], network: cfg.network };
    return stripPublicLeaks({
      ...body,
      mpc: false as const,
      globalBest: false as const,
      semantics: "mbbe-k3",
      k: 3,
    });
  });

  app.post("/evidence", async (req, reply) => {
    const token = String((req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""));
    if (!cfg.admin || token !== cfg.admin) return reply.code(401).send({ error: "unauthorized" });
    const body = req.body as {
      network?: string;
      pool?: { address?: string; txHash?: string; block?: number };
      quote?: { address?: string; txHash?: string; block?: number };
      steps?: { name?: string; ok?: boolean; txHash?: string; block?: number; detail?: string }[];
    };
    publicEvidence = {
      present: true,
      network: body.network ?? cfg.network,
      pool: body.pool?.address
        ? { address: body.pool.address, txHash: body.pool.txHash, block: body.pool.block }
        : undefined,
      quote: body.quote?.address
        ? { address: body.quote.address, txHash: body.quote.txHash, block: body.quote.block }
        : undefined,
      steps: Array.isArray(body.steps)
        ? body.steps
            .filter((s) => typeof s?.name === "string")
            .map((s) => ({
              name: String(s.name),
              ok: Boolean(s.ok),
              txHash: s.txHash,
              block: s.block,
              detail: sanitizePublicDetail(typeof s.detail === "string" ? s.detail : undefined),
            }))
        : [],
      mpc: false as const,
      globalBest: false as const,
      semantics: "mbbe-k3",
      k: 3,
    };
    publicEvidence = stripPublicLeaks(publicEvidence);
    return { ok: true, steps: publicEvidence.steps.length };
  });

  app.get("/stats", async () => {
    const { pool } = liveAddresses();
    return {
      network: cfg.network,
      pool,
      offersQueued: offers.length,
      mandatesQueued: mandates.length,
    };
  });

  app.post("/rfq/offer", async (req, reply) => {
    const body = req.body as { box?: string };
    if (!body?.box || typeof body.box !== "string" || body.box.length > 16_384) {
      return reply.code(400).send({ error: "invalid box" });
    }
    if (cfg.rfqSk) {
      try {
        const opened = openJson<{ nonce?: string; expiresAt?: number; kind?: string }>(cfg.rfqSk, body.box);
        if (opened.kind && opened.kind !== "offer") return reply.code(400).send({ error: "not an offer" });
        if (opened.expiresAt && opened.expiresAt < Date.now()) return reply.code(400).send({ error: "expired" });
        if (opened.nonce) {
          if (nonces.has(opened.nonce)) return reply.code(409).send({ error: "replay" });
          nonces.add(opened.nonce);
        }
      } catch {
        return reply.code(400).send({ error: "unseal failed" });
      }
    }
    const id = `${Date.now()}-${offers.length}`;
    offers.push({ id, boxed: body.box, receivedAt: Date.now() });
    await persistInbox();
    return { id };
  });

  app.post("/mandate", async (req, reply) => {
    const body = req.body as { box?: string };
    if (!body?.box || typeof body.box !== "string" || body.box.length > 16_384) {
      return reply.code(400).send({ error: "invalid box" });
    }
    if (cfg.rfqSk) {
      try {
        const opened = openJson<{ nonce?: string; expiresAt?: number; kind?: string }>(cfg.rfqSk, body.box);
        if (opened.kind && opened.kind !== "mandate") return reply.code(400).send({ error: "not a mandate" });
        if (opened.expiresAt && opened.expiresAt < Date.now()) return reply.code(400).send({ error: "expired" });
        if (opened.nonce) {
          if (nonces.has(opened.nonce)) return reply.code(409).send({ error: "replay" });
          nonces.add(opened.nonce);
        }
      } catch {
        return reply.code(400).send({ error: "unseal failed" });
      }
    }
    const id = `m-${Date.now()}`;
    mandates.push({ id, boxed: body.box, receivedAt: Date.now() });
    await persistInbox();
    return { id };
  });

  app.get("/receipts/:key", async (req, reply) => {
    const key = (req.params as { key: string }).key;
    const boxed = receipts.get(key);
    if (!boxed) return reply.code(404).send({ error: "not found" });
    return { box: boxed };
  });

  app.post("/disclose", async (req, reply) => {
    const token = String((req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""));
    if (!cfg.admin || token !== cfg.admin) return reply.code(401).send({ error: "unauthorized" });
    const body = req.body as { package?: Parameters<typeof verifyDisclosure>[0]; rootHex?: string };
    if (!body?.package || !body.rootHex) return reply.code(400).send({ error: "invalid package" });
    const root = Uint8Array.from(Buffer.from(body.rootHex, "hex"));
    return verifyDisclosure(body.package, root);
  });

  app.post("/agent/rank", async (req, reply) => {
    const token = String((req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""));
    if (!cfg.admin || token !== cfg.admin) return reply.code(401).send({ error: "unauthorized" });
    if (!cfg.rfqSk || !cfg.execSk) return reply.code(503).send({ error: "executor not configured" });
    const body = req.body as {
      remaining?: string;
      nowBound?: string;
      mandate?: {
        principal: number[];
        executor: number[];
        side: string;
        maxFillBase: string;
        limitNum: string;
        limitDen: string;
        cpRoot: string;
        expiry: string;
        mandateId: number[];
      };
    };
    try {
      const esk = fromHex(cfg.execSk);
      const inboxOpening = mandateOpeningFromInbox(cfg.rfqSk, mandates);
      const mandate = inboxOpening
        ? inboxOpening.mandate
        : body?.mandate
          ? {
              principal: Uint8Array.from(body.mandate.principal),
              executor: Uint8Array.from(body.mandate.executor),
              side: BigInt(body.mandate.side),
              maxFillBase: BigInt(body.mandate.maxFillBase),
              limitNum: BigInt(body.mandate.limitNum),
              limitDen: BigInt(body.mandate.limitDen),
              cpRoot: BigInt(body.mandate.cpRoot),
              expiry: BigInt(body.mandate.expiry),
              mandateId: Uint8Array.from(body.mandate.mandateId),
            }
          : null;
      if (!mandate) return reply.code(400).send({ error: "mandate opening required" });
      const remaining = BigInt(body.remaining ?? inboxOpening?.remaining ?? "0");
      const nowBound = BigInt(body.nowBound ?? Math.floor(Date.now() / 1000) + 86_400);
      const planned = planFillFromInbox({
        rfqSk: cfg.rfqSk,
        offers,
        esk,
        mandate,
        remaining,
        nowBound,
        revoked: false,
      });
      lastAgent = publicAgentStatusView(planned.receipt);
      const view = publicAgentRankView(planned);
      if (planned.decision.action === "fill" && inboxOpening && cfg.pool) {
        try {
          const hit = await fetchContractAction(cfg.indexer, cfg.pool);
          if (hit?.stateHex) {
            const ld = poolLedgerFromStateHex(hit.stateHex);
            const built = constructRankedFill({
              ledger: ld,
              planned,
              esk,
              mandate,
              remaining,
              nowBound,
              mandateRand: inboxOpening.mandateRand,
              stateNonce: inboxOpening.stateNonce,
            });
            view.constructed = built.chosenMatches;
            if (cfg.httpSubmit && cfg.submitFill && built.chosenMatches) {
              view.proving = true;
              const settled = await cfg.submitFill(built.pending, nowBound);
              view.submitted = true;
              view.proving = false;
              view.txHash = settled.txHash;
              view.block = settled.block;
            }
          }
        } catch {
          view.constructed = false;
          view.submitted = false;
          view.proving = false;
        }
      }
      if (agentHttpHasLeakKeys(view).length > 0) return reply.code(500).send({ error: "refusing leaky rank body" });
      return stripPublicLeaks(view);
    } catch (err) {
      return reply.code(400).send({ error: publicErrorMessage(err) });
    }
  });

  app.setErrorHandler((err, _req, reply) => {
    reply.code(500).send({ error: publicErrorMessage(err) });
  });

  app.addHook("onClose", async () => {
    await persistInbox().catch(() => undefined);
    await durable.close();
  });

  return { app, offers, mandates, receipts, persist: durable.backend };
}
