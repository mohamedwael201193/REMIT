/**
 * Policy evaluation for mandate-bounded execution.
 *
 * Pure functions — the same envelope logic the landing experience
 * demonstrates and the local provider enforces before any value moves.
 */

import type { Mandate, PolicyCheck, Side } from "./types";

export interface FillAttempt {
  mandateId: string;
  asset: string;
  side: Side;
  price: number;
  size: number;
  counterpartyId: string;
  at?: Date;
}

export interface PolicyEvaluation {
  passed: boolean;
  checks: PolicyCheck[];
  /** First failing check, for the refusal notice. */
  refusalReason?: string;
}

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function evaluatePolicy(
  mandate: Mandate,
  attempt: FillAttempt,
): PolicyEvaluation {
  const at = attempt.at ?? new Date();
  const cpName = attempt.counterpartyId;

  const priceOk =
    mandate.side === "buy"
      ? attempt.price <= mandate.limitPrice
      : attempt.price >= mandate.limitPrice;

  const priceDetail =
    mandate.side === "buy"
      ? `${usd(attempt.price)} ≤ ${usd(mandate.limitPrice)} limit`
      : `${usd(attempt.price)} ≥ ${usd(mandate.limitPrice)} reserve`;

  const sizeOk = attempt.size <= mandate.maxFill;
  const budgetOk = attempt.size <= mandate.totalBudget - mandate.spent;
  const cpOk = mandate.counterpartyIds.includes(attempt.counterpartyId);
  const activeOk =
    mandate.status === "active" && new Date(mandate.expiry).getTime() > at.getTime();

  const checks: PolicyCheck[] = [
    {
      label: "Within price limit",
      passed: priceOk,
      detail: priceDetail,
    },
    {
      label: "Within size limit",
      passed: sizeOk,
      detail: sizeOk
        ? `${usd(attempt.size)} ≤ ${usd(mandate.maxFill)} per-fill cap`
        : `${usd(attempt.size)} > ${usd(mandate.maxFill)} per-fill cap`,
    },
    {
      label: "Counterparty allowed",
      passed: cpOk,
      detail: `${cpName}`,
    },
    {
      label: "Mandate active",
      passed: activeOk,
      detail: activeOk
        ? `${mandate.reference} · active`
        : `${mandate.reference} · not currently active`,
    },
    {
      label: "Budget available",
      passed: budgetOk,
      detail: budgetOk
        ? `${usd(mandate.totalBudget - mandate.spent)} remaining of ${usd(mandate.totalBudget)}`
        : `Only ${usd(Math.max(0, mandate.totalBudget - mandate.spent))} remaining`,
    },
  ];

  const firstFailure = checks.find((c) => !c.passed);

  return {
    passed: !firstFailure,
    checks,
    refusalReason: firstFailure
      ? `${firstFailure.label.replace("Within ", "")} exceeded — refused before settlement.`
      : undefined,
  };
}

/** Convenience wrapper used by flows that already hold the mandate. */
export function evaluateForMandate(
  mandate: Mandate,
  attempt: Omit<FillAttempt, "mandateId">,
): PolicyEvaluation {
  return evaluatePolicy(mandate, { ...attempt, mandateId: mandate.id });
}
