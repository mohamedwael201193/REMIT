"use client";

const FACTS = [
  { title: "Discover", label: "Private liquidity, no public tape" },
  { title: "Policy", label: "A sealed mandate is the boundary" },
  { title: "Prove", label: "Compact checks the fill first" },
  { title: "Settle", label: "Value moves only after the proof" },
  { title: "Audit", label: "One authorized fact, not the book" },
];

export function LandingFacts() {
  return (
    <section className="relative border-t border-[rgba(239,235,224,0.1)] bg-ink text-cream">
      <div className="mx-auto grid max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {FACTS.map((s) => (
          <div
            key={s.title}
            className="flex flex-col gap-1.5 px-6 py-7 text-center sm:py-8 lg:border-r lg:border-[rgba(239,235,224,0.08)] lg:[&:nth-child(5n)]:border-r-0"
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
