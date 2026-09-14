"use client";

/**
 * The public REMIT story — landing page composition.
 */

import { LandingNav } from "./landing-nav";
import { LandingHero } from "./landing-hero";
import { LandingFacts } from "./landing-facts";
import { LandingEvidence } from "./landing-evidence";
import { SectionLeak } from "./section-leak";
import { SectionInterlude } from "./section-interlude";
import { SectionComparison } from "./section-comparison";
import { SectionEnforcement } from "./section-enforcement";
import { SectionFlow } from "./section-flow";
import { SectionRoles } from "./section-roles";
import { SectionAudit } from "./section-audit";
import { SectionPrivacy } from "./section-privacy";
import { SectionFaq } from "./section-faq";
import { LandingCta, LandingFooter } from "./landing-cta";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNav />
      <main className="w-full max-w-full flex-1 overflow-x-hidden">
        <LandingHero />
        <LandingFacts />
        <LandingEvidence />
        <SectionLeak />
        <SectionInterlude />
        <SectionComparison />
        <SectionEnforcement />
        <SectionFlow />
        <SectionRoles />
        <SectionAudit />
        <SectionPrivacy />
        <SectionFaq />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
