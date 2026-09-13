"use client";

/**
 * The workspace shell — navigation, role switching and the views.
 */

import * as React from "react";
import {
  ArrowLeftRight,
  FileLock2,
  Inbox,
  LayoutDashboard,
  SearchCheck,
  Settings,
  Menu,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Wordmark } from "@/components/remit/brand";
import { ConnectWalletDialog, WalletButton } from "@/components/remit/wallet/wallet-button";
import { ErrorState } from "@/components/remit/primitives";
import { useRemitStore, type AppView } from "@/store/remit";
import type { Role } from "@/lib/remit/types";
import { ViewOverview } from "./view-overview";
import { ViewMandates } from "./view-mandates";
import { ViewOffers } from "./view-offers";
import { ViewExecutions } from "./view-executions";
import { ViewAudit } from "./view-audit";
import { ViewSettings } from "./view-settings";

const NAV: { view: AppView; label: string; icon: React.ElementType }[] = [
  { view: "overview", label: "Overview", icon: LayoutDashboard },
  { view: "mandates", label: "Mandates", icon: FileLock2 },
  { view: "offers", label: "Offers", icon: Inbox },
  { view: "executions", label: "Executions", icon: ArrowLeftRight },
  { view: "audit", label: "Audit", icon: SearchCheck },
  { view: "settings", label: "Settings", icon: Settings },
];

const ROLES: { role: Role; label: string }[] = [
  { role: "principal", label: "Principal" },
  { role: "executor", label: "Executor" },
  { role: "auditor", label: "Auditor" },
];

const VIEW_TITLES: Record<AppView, string> = {
  overview: "Overview",
  mandates: "Mandates",
  offers: "Offers",
  executions: "Executions",
  audit: "Audit",
  settings: "Settings",
};

function RoleSwitcher({ className }: { className?: string }) {
  const role = useRemitStore((s) => s.role);
  const setRole = useRemitStore((s) => s.setRole);
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[rgba(239,235,224,0.12)] bg-[#121c17] p-0.5",
        className,
      )}
      role="tablist"
      aria-label="Workspace role"
    >
      {ROLES.map((r) => (
        <button
          key={r.role}
          role="tab"
          aria-selected={role === r.role}
          onClick={() => setRole(r.role)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors",
            role === r.role
              ? "bg-gold text-[#1a1409]"
              : "text-cream/60 hover:text-cream",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const appView = useRemitStore((s) => s.appView);
  const setAppView = useRemitStore((s) => s.setAppView);
  const offers = useRemitStore((s) => s.offers);
  const openOffers = offers.filter(
    (o) => o.state === "compatible" || o.state === "new",
  ).length;

  return (
    <nav aria-label="Workspace" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = appView === item.view;
        return (
          <button
            key={item.view}
            onClick={() => {
              setAppView(item.view);
              onNavigate?.();
            }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
              active
                ? "bg-gold/12 text-gold"
                : "text-cream/60 hover:bg-[rgba(239,235,224,0.05)] hover:text-cream",
            )}
          >
            <item.icon
              className={cn(
                "h-[17px] w-[17px]",
                active ? "text-gold" : "text-cream/45 group-hover:text-cream/80",
              )}
              aria-hidden="true"
            />
            <span className="flex-1 text-left">{item.label}</span>
            {item.view === "offers" && openOffers > 0 ? (
              <span className="rounded-full bg-gold/15 px-2 py-0.5 font-data text-[10.5px] font-semibold text-gold">
                {openOffers}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

function ViewContent() {
  const appView = useRemitStore((s) => s.appView);
  const syncStatus = useRemitStore((s) => s.syncStatus);
  const syncWorkspace = useRemitStore((s) => s.syncWorkspace);

  if (syncStatus === "error") {
    return (
      <div className="py-10">
        <ErrorState onRetry={() => void syncWorkspace()} />
      </div>
    );
  }

  switch (appView) {
    case "overview":
      return <ViewOverview />;
    case "mandates":
      return <ViewMandates />;
    case "offers":
      return <ViewOffers />;
    case "executions":
      return <ViewExecutions />;
    case "audit":
      return <ViewAudit />;
    case "settings":
      return <ViewSettings />;
  }
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const returnToLanding = useRemitStore((s) => s.returnToLanding);
  const appView = useRemitStore((s) => s.appView);

  return (
    <div className="flex min-h-screen flex-col bg-ink text-cream">
      <ConnectWalletDialog />

      <div className="flex flex-1">
        {/* desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-[rgba(239,235,224,0.08)] bg-[#101915] lg:flex">
          <div className="px-5 pb-6 pt-6">
            <button
              onClick={returnToLanding}
              className="text-cream transition-opacity hover:opacity-80"
              aria-label="Back to REMIT home"
            >
              <Wordmark />
            </button>
          </div>
          <div className="flex-1 px-3">
            <NavList />
          </div>
          <div className="space-y-3 border-t border-[rgba(239,235,224,0.08)] p-4">
            <p className="px-1 text-[10.5px] uppercase tracking-[0.18em] text-cream/35">
              Signed in as principal
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={returnToLanding}
              className="w-full justify-start gap-2 text-[12.5px] text-cream/55 hover:bg-[rgba(239,235,224,0.05)] hover:text-cream"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to site
            </Button>
          </div>
        </aside>

        {/* main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* top bar */}
          <header className="sticky top-0 z-40 border-b border-[rgba(239,235,224,0.08)] bg-[#0d1512]/88 backdrop-blur-xl">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              {/* mobile menu */}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-cream lg:hidden"
                    aria-label="Open navigation"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[280px] border-[rgba(239,235,224,0.1)] bg-[#101915] p-0"
                >
                  <div className="px-5 pb-5 pt-6">
                    <SheetTitle className="text-cream">
                      <Wordmark />
                    </SheetTitle>
                  </div>
                  <div className="px-3">
                    <NavList onNavigate={() => setMenuOpen(false)} />
                  </div>
                  <div className="mt-6 border-t border-[rgba(239,235,224,0.08)] p-4">
                    <RoleSwitcher />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMenuOpen(false);
                        returnToLanding();
                      }}
                      className="mt-3 w-full justify-start gap-2 text-[12.5px] text-cream/55 hover:text-cream"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to site
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <h1 className="font-display truncate text-lg font-semibold sm:text-xl">
                {VIEW_TITLES[appView]}
              </h1>

              <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
                <RoleSwitcher className="hidden sm:inline-flex" />
                <WalletButton />
              </div>
            </div>
          </header>

          {/* view */}
          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">
              <ViewContent />
            </div>
          </main>

          {/* mobile bottom safe spacing for the tab-free layout */}
          <div className="h-6 lg:hidden" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
