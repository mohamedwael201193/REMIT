"use client";

const FACTS = [
  { title: "Private mandate", label: "Rules the market never reads" },
  { title: "Private liquidity", label: "Offers stay sealed" },
  { title: "Constrained executor", label: "The agent can choose, not exceed" },
  { title: "ZK policy check", label: "Compact proves the fill first" },
  { title: "Settlement", label: "Value moves only after the proof" },
  { title: "Selective audit", label: "One authorized fact, not the book" },
];

export function LandingFacts() {
  return (
    <section className="relative border-t border-[rgba(239,235,224,0.1)] bg-ink text-cream">
      <div className="mx-auto grid max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {FACTS.map((s) => (
          <div
            key={s.title}
            className="flex flex-col gap-1.5 px-6 py-7 text-center sm:py-8 lg:border-r lg:border-[rgba(239,235,224,0.08)] lg:[&:nth-child(3n)]:border-r-0"
          >
            <span className="text-[1.12rem] font-medium tracking-tight text-cream sm:text-[1.2rem]">
              {s.title}
            </span>
            <span className="text-[12px] leading-snug text-sage">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
