"use client";

/**
 * Root of the REMIT experience.
 *
 * One route, two worlds: the public protocol story (landing) and the
 * private workspace. Switching is a state transition — no navigation,
 * nothing private ever touches a URL.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useRemitStore } from "@/store/remit";
import { LandingPage } from "@/components/remit/landing/landing-page";
import { AppShell } from "@/components/remit/app/app-shell";

export function RemitExperience() {
  const mode = useRemitStore((s) => s.mode);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AnimatePresence mode="wait" initial={false}>
        {mode === "landing" ? (
          <motion.div
            key="landing"
            className="flex flex-col min-h-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32 }}
          >
            <LandingPage />
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            className="flex flex-col min-h-screen"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32 }}
          >
            <AppShell />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
