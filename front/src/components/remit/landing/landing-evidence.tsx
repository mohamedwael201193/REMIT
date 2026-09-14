"use client";

const ITEMS = [
  { k: "Network", v: "Midnight Preprod, ledger 8" },
  { k: "Pool", v: "01bebd52… MBBE K=3" },
  { k: "Circuits", v: "7 impure Compact circuits" },
  { k: "Tests", v: "46 files / 189 passed" },
  { k: "Fill", v: "5a1200f5… block 2549944" },
  { k: "Residual", v: "5f1203cf… block 2550168" },
  { k: "Withdraw", v: "999e2b5b… block 2550510" },
  { k: "Audit", v: "One-field verify, forged rejected" },
];

export function LandingEvidence() {
  return (
    <section className="relative bg-ink text-cream">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="font-display text-balance text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[1.05]">
          Private mandate. Private liquidity. Provable execution.
        </h2>
        <p className="mt-4 max-w-[62ch] text-[15.5px] leading-relaxed text-cream/65">
          REMIT is live on Preprod. Compact proves each fill against a mandate
          the public ledger never contains. The workspace reads indexer-backed
          evidence with no wallet required.
        </p>
        <dl className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[rgba(239,235,224,0.1)] bg-[rgba(239,235,224,0.08)] sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <div key={item.k} className="bg-[#101915] px-5 py-5">
              <dt className="text-[11px] uppercase tracking-[0.16em] text-gold/80">{item.k}</dt>
              <dd className="mt-2 font-data text-[13px] leading-snug text-cream/85">{item.v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-[13px] text-cream/45">
          Explorer links live in the README. Compact remains the settlement
          authority. Executor proving stays on operator-controlled infrastructure.
        </p>
      </div>
    </section>
  );
}
