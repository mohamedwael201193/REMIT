"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRemitStore } from "@/store/remit";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function LandingHero() {
  const root = useRef<HTMLElement>(null);
  const enterWorkspace = useRemitStore((s) => s.enterWorkspace);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([".hero-copy", ".hero-art", ".hero-ground"], {
          autoAlpha: 1,
          y: 0,
          scale: 1,
        });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(".hero-ground", { scale: 1.08, transformOrigin: "50% 82%" });

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.to(".hero-ground", { scale: 1, duration: 1.55 }, 0);
        tl.from(
          ".hero-copy",
          { autoAlpha: 0, y: 22, duration: 0.8, stagger: 0.09 },
          0.1,
        );
        tl.from(".hero-art", { autoAlpha: 0, y: 28, duration: 1.05 }, 0.35);

        gsap.to(".hero-ground", {
          y: 36,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
        gsap.to(".hero-art", {
          y: -16,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
      });
    },
    { scope: root },
  );

  const scrollToHow = () =>
    document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      ref={root}
      className="relative min-h-[100dvh] overflow-hidden bg-ink text-cream"
    >
      <div className="pointer-events-none absolute inset-0">
        <img
          src="/remit-art/hero-ground.webp"
          alt="Illustrated midnight valley with a keyhole moon over a private path to a single glowing doorway"
          width={1280}
          height={720}
          fetchPriority="high"
          decoding="async"
          className="hero-ground absolute inset-0 h-full w-full object-cover object-[center_16%] will-change-transform"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1512]/78 via-[#0d1512]/28 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0d1512] to-transparent" />
      </div>

      <div className="relative z-[2] mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col items-center px-4 pb-40 pt-24 text-center sm:px-8">
        <p className="hero-copy eyebrow text-gold">
          Private execution on Midnight
        </p>

        <h1 className="hero-copy font-display mt-5 max-w-6xl text-balance text-[clamp(3rem,5vw,5.5rem)] font-semibold leading-[1.05] tracking-[-0.015em]">
          Trade on your rules.
          <br />
          Without revealing{" "}
          <em className="pb-1 italic leading-[1.1] text-gold">the rules.</em>
        </h1>

        <p className="hero-copy mx-auto mt-6 max-w-xl text-pretty text-[1.05rem] leading-relaxed text-cream/72 sm:text-lg">
          Seal a mandate. Let an agent fill it. Midnight proves the fill before
          value moves.
        </p>

        <div className="hero-copy mt-8 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-13 bg-gold px-8 text-[15px] font-semibold text-[#1a1409] hover:bg-gold-2 active:scale-[0.98]"
            onClick={enterWorkspace}
          >
            Explore REMIT
            <ArrowRight className="ml-2 h-4.5 w-4.5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-13 border-[rgba(239,235,224,0.22)] bg-transparent px-7 text-[15px] text-cream/90 hover:bg-[rgba(239,235,224,0.06)] hover:text-cream active:scale-[0.98]"
            onClick={scrollToHow}
          >
            <Play className="mr-2 h-4 w-4 text-gold" />
            See how it works
          </Button>
        </div>
      </div>

      <img
        src="/remit-art/hero-courier.png"
        alt="Illustrated REMIT courier holding a sealed mandate"
        width={318}
        height={720}
        decoding="async"
        className="hero-art pointer-events-none absolute bottom-[4%] right-[2%] z-[3] hidden w-[min(240px,26vw)] drop-shadow-[0_18px_32px_rgb(0_0_0_/_0.55)] lg:block"
      />
    </section>
  );
}
