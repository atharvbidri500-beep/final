export const TRIAL_DAYS = 1;
export const TRIAL_ONLY_CYCLE: Cycle = "yearly";

export const PLANS = {
  pro: {
    name: "Pro",
    monthly: 149,
    yearly: 1499,
    yearlySavings: 12 * 149 - 1499,
  },
  premium: {
    name: "Premium",
    monthly: 299,
    yearly: 2999,
    yearlySavings: 12 * 299 - 2999,
  },
} as const;

export const PLAN_FEATURES: Record<PlanId, string[]> = {
  pro: [
    "Unlimited resume builder",
    "Unlimited resume tailoring",
    "Unlimited ATS analysis",
    "Unlimited cover letters",
    "Unlimited portfolio generation",
    "AI career dashboard",
    "AI job matching",
    "Unlimited mock interviews",
    "Resume version history",
    "Career progress tracking",
    "Premium resume templates",
    "Priority AI",
    "Priority support",
  ],
  premium: [
    "Everything in Pro",
    "AI career copilot",
    "Advanced career intelligence",
    "Advanced career analytics",
    "Unlimited AI career reports",
    "Advanced job insights",
    "Career score tracking",
    "Advanced resume intelligence",
    "Advanced interview analytics",
    "Weekly career reports",
    "Early access to new features",
    "Highest AI priority",
    "Premium support",
  ],
};

export type PlanId = "pro" | "premium";
export type Cycle = "monthly" | "yearly";

export function planPrice(plan: PlanId, cycle: Cycle): number {
  return PLANS[plan][cycle];
}

export function cycleMonths(cycle: Cycle): number {
  return cycle === "yearly" ? 12 : 1;
}

export function parsePlanCycle(value: string): { plan: PlanId; cycle: Cycle } | null {
  const [plan, cycle] = value.split("_");
  if ((plan === "pro" || plan === "premium") && (cycle === "monthly" || cycle === "yearly")) {
    return { plan, cycle };
  }
  return null;
}

export function formatPlanLabel(plan: PlanId, cycle: Cycle): string {
  return `${PLANS[plan].name} (${cycle === "yearly" ? "Yearly" : "Monthly"})`;
}
