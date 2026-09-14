"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/remit/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, ArrowRight } from "lucide-react";
import { useRemitStore } from "@/store/remit";

const LINKS = [
  { href: "#protocol", label: "Protocol" },
  { href: "#how", label: "How it works" },
  { href: "#enforcement", label: "Enforcement" },
  { href: "#audit", label: "Audit" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const enterWorkspace = useRemitStore((s) => s.enterWorkspace);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-[rgba(239,235,224,0.08)] bg-[#0d1512]/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav
        className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-5 sm:px-8"
        aria-label="Main"
      >
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="text-cream transition-opacity hover:opacity-80"
          aria-label="Back to top"
        >
          <Wordmark />
        </button>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium tracking-wide text-cream/70 transition-colors hover:text-gold"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="ghost"
            className="h-10 border border-[rgba(239,235,224,0.16)] text-cream/85 hover:bg-[rgba(239,235,224,0.06)] hover:text-cream"
            onClick={enterWorkspace}
          >
            Open workspace
          </Button>
          <Button
            className="h-10 bg-gold font-semibold text-[#1a1409] hover:bg-gold-2"
            onClick={enterWorkspace}
          >
            Explore REMIT
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        {/* mobile */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
            className="h-11 w-11 min-h-11 min-w-11 text-cream md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[300px] border-[rgba(239,235,224,0.1)] bg-[#101915]"
          >
            <SheetTitle className="px-1 text-cream">
              <Wordmark />
            </SheetTitle>
            <div className="mt-8 flex flex-col gap-1">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 font-display text-lg font-medium text-cream/85 transition-colors hover:bg-[rgba(239,235,224,0.06)] hover:text-gold"
                >
                  {l.label}
                </a>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 border-t border-[rgba(239,235,224,0.1)] pt-6">
              <Button
                className="h-11 bg-gold font-semibold text-[#1a1409] hover:bg-gold-2"
                onClick={() => {
                  setOpen(false);
                  enterWorkspace();
                }}
              >
                Explore REMIT
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-11 border-[rgba(239,235,224,0.16)] text-cream/85"
                onClick={() => {
                  setOpen(false);
                  enterWorkspace();
                }}
              >
                Open workspace
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
