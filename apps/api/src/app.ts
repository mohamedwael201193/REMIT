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
  fetchBlock,
  assertLedger8,
  fetchContractAction,
  poolLedgerFromStateHex,
  publicExecutorKeyHex,
  indexerWsFromHttp,
  loadInbox,
  saveInbox,
  withOfferDefaults,
  fromHex,
  type InboxItem,
} from "@remit/core";
import { pickBest, rankOffers } from "@remit/agent";

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
};

export async function buildApp(cfg: ApiConfig) {
  const snap =
    cfg.inboxFile && cfg.rfqSk && cfg.rfqSk.length === 64
      ? loadInbox(cfg.inboxFile, cfg.rfqSk)
      : { v: 1 as const, offers: [] as InboxItem[], mandates: [] as InboxItem[], nonces: [] as string[], receipts: [] as [string, string][] };
  const offers: InboxItem[] = [...snap.offers];
  const mandates: InboxItem[] = [...snap.mandates];
  const receipts = new Map<string, string>(snap.receipts);
  const nonces = new Set<string>(snap.nonces);

  const persistInbox = () => {
    if (!cfg.inboxFile || !cfg.rfqSk) return;
    saveInbox(cfg.inboxFile, cfg.rfqSk, {
      v: 1,
      offers,
      mandates,
      nonces: [...nonces],
      receipts: [...receipts.entries()],
    });
  };
  let publicEvidence: {
    present: boolean;
    network: string;
    pool?: { address: string; txHash?: string; block?: number };
    quote?: { address: string; txHash?: string; block?: number };
    steps: { name: string; ok: boolean; txHash?: string; block?: number; detail?: string }[];
    mpc: false;
  } | null = null;

  const evidenceFiles = [
    resolve(process.cwd(), "apps/api/preprod-evidence.json"),
    resolve(process.cwd(), "preprod-evidence.json"),
    resolve(process.cwd(), "../../apps/api/preprod-evidence.json"),
  ];
  for (const p of evidenceFiles) {
    if (!existsSync(p)) continue;
    try {
      const j = JSON.parse(readFileSync(p, "utf8")) as NonNullable<typeof publicEvidence>;
      if (j?.present && Array.isArray(j.steps)) {
        publicEvidence = { ...j, mpc: false };
        break;
      }
    } catch {
      /* keep scanning */
    }
  }

  const fileDeploy = (): { pool?: string; quote?: string } => {
    const candidates = [
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
        return { pool: j.pool?.address, quote: j.quote?.address };
      } catch {
        return {};
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
      mpc: false,
      dustGate: "availableCoins>=1",
      circuit: Boolean(browserRoot && existsSync(resolve(browserRoot, "remit-circuit.js"))),
      block,
    };
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
    };
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
    if (publicEvidence) return publicEvidence;
    return { present: false, steps: [], mpc: false as const, network: cfg.network };
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
              detail: typeof s.detail === "string" ? s.detail.slice(0, 240) : undefined,
            }))
        : [],
      mpc: false,
    };
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
    persistInbox();
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
    persistInbox();
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
    if (!body?.mandate) return reply.code(400).send({ error: "mandate opening required" });
    const esk = fromHex(cfg.execSk);
    const mandate = {
      principal: Uint8Array.from(body.mandate.principal),
      executor: Uint8Array.from(body.mandate.executor),
      side: BigInt(body.mandate.side),
      maxFillBase: BigInt(body.mandate.maxFillBase),
      limitNum: BigInt(body.mandate.limitNum),
      limitDen: BigInt(body.mandate.limitDen),
      cpRoot: BigInt(body.mandate.cpRoot),
      expiry: BigInt(body.mandate.expiry),
      mandateId: Uint8Array.from(body.mandate.mandateId),
    };
    const remaining = BigInt(body.remaining ?? "0");
    const nowBound = BigInt(body.nowBound ?? Math.floor(Date.now() / 1000) + 86_400);
    const candidates = offers.flatMap((item) => {
      try {
        const opened = openJson<{
          kind?: string;
          offer?: {
            side: string;
            baseAmount: string;
            quoteAmount: string;
            maker: number[];
            payNonce: number[];
            expiry?: string;
            minFillBase?: string;
          };
          offerRand?: number[];
        }>(cfg.rfqSk, item.boxed);
        if (opened.kind && opened.kind !== "offer") return [];
        if (!opened.offer) return [];
        const offer = withOfferDefaults({
          side: BigInt(opened.offer.side),
          baseAmount: BigInt(opened.offer.baseAmount),
          quoteAmount: BigInt(opened.offer.quoteAmount),
          maker: Uint8Array.from(opened.offer.maker),
          payNonce: Uint8Array.from(opened.offer.payNonce),
          expiry: opened.offer.expiry ? BigInt(opened.offer.expiry) : undefined,
          minFillBase: opened.offer.minFillBase ? BigInt(opened.offer.minFillBase) : undefined,
        });
        return [
          {
            id: item.id,
            offer,
            remaining,
            receivedAt: item.receivedAt,
            rand: opened.offerRand ? Uint8Array.from(opened.offerRand) : undefined,
          },
        ];
      } catch {
        return [];
      }
    });
    const live = candidates.filter((c) => c.offer.baseAmount > 0n);
    const rankArgs = {
      esk,
      mandate,
      remaining,
      nowBound,
      revoked: false,
      candidates: live,
      allowCounterparty: () => true,
    };
    const ranked = rankOffers(rankArgs);
    const selectedId = pickBest(ranked, rankArgs) ?? null;
    return {
      ranked: ranked.map((r) => (r.ok ? { id: r.id, ok: true as const } : { id: r.id, ok: false as const, reason: r.reason })),
      eligibleCount: ranked.filter((r) => r.ok).length,
      rejected: ranked.filter((r) => !r.ok).map((r) => ({ id: r.id, reason: r.ok ? undefined : r.reason })),
      selectedId,
      candidateCount: live.length,
      rule: "mbbe-eligible-only",
      mpc: false,
      globalBest: false,
    };
  });

  app.setErrorHandler((err, _req, reply) => {
    reply.code(500).send({ error: publicErrorMessage(err) });
  });

  return { app, offers, mandates, receipts };
}
