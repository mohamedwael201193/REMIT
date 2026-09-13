"use client";

/**
 * Final call to action and the landing footer.
 */

import { ArrowRight, BookOpen, Github, Twitter } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LaceMark, OneAmMark, RemitMark, Wordmark } from "@/components/remit/brand";
import { Accent, Reveal } from "@/components/remit/primitives";
import { useRemitStore } from "@/store/remit";
import type { AppView } from "@/store/remit";

export function LandingCta() {
  const enterWorkspace = useRemitStore((s) => s.enterWorkspace);
  const reduced = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-ink py-28 text-cream md:py-36">
      {/* the seal — engraved emblem glowing behind the finale */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-20% 0px" }}
          transition={{ duration: 1.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative h-[620px] w-[620px] max-w-none opacity-[0.34] sm:h-[760px] sm:w-[760px]"
          style={{
            maskImage:
              "radial-gradient(closest-side, black 40%, rgba(0,0,0,0.6) 62%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(closest-side, black 40%, rgba(0,0,0,0.6) 62%, transparent 78%)",
          }}
        >
          { }
          <img
            src="/remit-art/cta-emblem.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className={reduced ? "h-full w-full select-none object-cover" : "h-full w-full select-none object-cover animate-[spin_140s_linear_infinite]"}
          />
        </motion.div>
      </div>
      <div className="glow-gold pointer-events-none absolute inset-x-0 bottom-0 h-[480px] rotate-180" aria-hidden="true" />
      <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
        <Reveal>
          <RemitMark className="mx-auto h-14 w-14 text-gold" animated />
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="font-display mt-8 text-balance text-[clamp(2.6rem,6.4vw,5.2rem)] font-semibold leading-[1.02]">
            Delegate the trade.
            <br />
            <Accent>Keep the trust.</Accent>
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-[15.5px] leading-relaxed text-cream/60">
            Open the workspace, seal your first mandate and watch a
            policy-bound engine execute inside your boundary — with Midnight
            proving every fill.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Button
              size="lg"
              className="h-13 bg-gold px-8 text-[15px] font-semibold text-[#1a1409] hover:bg-gold-2"
              onClick={enterWorkspace}
            >
              Explore REMIT
              <ArrowRight className="ml-2 h-4.5 w-4.5" />
            </Button>
          </div>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-10 flex items-center justify-center gap-4">
            <span className="text-[11px] uppercase tracking-[0.18em] text-sage">
              connects with
            </span>
            <OneAmMark className="h-9 w-9" />
            <LaceMark className="h-9 w-9" />
            <span className="font-data text-[10.5px] text-cream/40">on Midnight</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const enterWorkspace = useRemitStore((s) => s.enterWorkspace);
  const setAppView = useRemitStore((s) => s.setAppView);

  const go = (view: AppView) => () => {
    enterWorkspace();
    setAppView(view);
  };

  const columns: {
    title: string;
    links: { label: string; action?: () => void; href?: string }[];
  }[] = [
    {
      title: "Protocol",
      links: [
        { label: "How it works", href: "#how" },
        { label: "Enforcement", href: "#enforcement" },
        { label: "Selective audit", href: "#audit" },
        { label: "FAQ", href: "#faq" },
      ],
    },
    {
      title: "Workspace",
      links: [
        { label: "Overview", action: go("overview") },
        { label: "Mandates", action: go("mandates") },
        { label: "Offers", action: go("offers") },
        { label: "Executions", action: go("executions") },
        { label: "Audit", action: go("audit") },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Privacy model" },
        { label: "Terms of service" },
        { label: "Disclosure policy" },
      ],
    },
  ];

  return (
    <footer className="mt-auto border-t border-[rgba(239,235,224,0.09)] bg-[#0b120f] text-cream">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.3fr_repeat(3,0.7fr)]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-cream/50">
              A dark pool where the trader&apos;s rules are as private as the
              trade — and just as enforced.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden="true" />
              <span className="font-data text-[11px] uppercase tracking-[0.14em] text-cream/45">
                Midnight Preprod · Wave 1
              </span>
            </div>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="eyebrow text-cream/40">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.action ? (
                      <button
                        onClick={link.action}
                        className="text-[13.5px] text-cream/65 transition-colors hover:text-gold"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href ?? "#"}
                        className="text-[13.5px] text-cream/65 transition-colors hover:text-gold"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-5 border-t border-[rgba(239,235,224,0.08)] pt-7 sm:flex-row sm:items-center">
          <p className="text-[12px] text-cream/40">
            © {new Date().getFullYear()} REMIT. Delegate the trade. Keep the trust.
          </p>
          <div className="flex items-center gap-4 text-cream/45">
            <a href="#" aria-label="Documentation" className="transition-colors hover:text-gold">
              <BookOpen className="h-4 w-4" />
            </a>
            <a href="#" aria-label="GitHub" className="transition-colors hover:text-gold">
              <Github className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Twitter" className="transition-colors hover:text-gold">
              <Twitter className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
