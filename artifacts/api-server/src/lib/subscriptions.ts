import { eq } from "drizzle-orm";
import { db, usersTable, subscriptionsTable, paymentsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import {
  PLANS,
  TRIAL_DAYS,
  PLAN_FEATURES,
  planPrice,
  cycleMonths,
  parsePlanCycle,
  formatPlanLabel,
  type PlanId,
  type Cycle,
} from "./plans.js";
export {
  PLANS,
  TRIAL_DAYS,
  PLAN_FEATURES,
  planPrice,
  cycleMonths,
  parsePlanCycle,
  formatPlanLabel,
} from "./plans.js";
export type { PlanId, Cycle } from "./plans.js";

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Recompute users.plan / isPremium / premiumExpiresAt from the current
 * subscription row so every display + gate reflects the real state.
 */
export async function syncUserAccess(userId: number): Promise<void> {
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  const now = new Date();
  let plan: string = "free";
  let expiresAt: Date | null = null;
  if (sub) {
    const periodEnd = sub.status === "trial" ? sub.trialEndAt : sub.currentPeriodEnd;
    if (periodEnd && periodEnd > now) {
      plan = sub.plan;
      expiresAt = periodEnd;
    }
  }
  await db.update(usersTable).set({ plan, isPremium: plan !== "free", premiumExpiresAt: expiresAt }).where(eq(usersTable.id, userId));
}

/**
 * Activate (or replace) the subscription for a user after an approved payment.
 * Renewal extends from the current active period end; a plan change starts a fresh period.
 */
export async function activateSubscription(userId: number, plan: PlanId, cycle: Cycle): Promise<void> {
  const [existing] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  const now = new Date();
  const periodEnd = addMonths(now, cycleMonths(cycle));
  const wasActive = existing && !existing.cancelAtPeriodEnd && existing.currentPeriodEnd && existing.currentPeriodEnd > now;
  const samePlan = existing && existing.plan === plan && existing.cycle === cycle;
  const effectiveStart = wasActive && samePlan && existing.currentPeriodEnd ? existing.currentPeriodEnd : now;
  const effectiveEnd = addMonths(effectiveStart, cycleMonths(cycle));

  if (existing) {
    await db.update(subscriptionsTable)
      .set({
        plan,
        cycle,
        status: "active",
        trialStartAt: null,
        trialEndAt: null,
        currentPeriodStart: effectiveStart,
        currentPeriodEnd: effectiveEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      })
      .where(eq(subscriptionsTable.userId, userId));
  } else {
    await db.insert(subscriptionsTable).values({
      userId,
      plan,
      cycle,
      status: "active",
      currentPeriodStart: effectiveStart,
      currentPeriodEnd: effectiveEnd,
      cancelAtPeriodEnd: false,
    });
  }
  void periodEnd;
  await syncUserAccess(userId);
}

/** Full billing history for a user (approved payments only). */
export async function billingHistory(userId: number) {
  const rows = await db.select().from(paymentsTable)
    .where(eq(paymentsTable.userId, userId))
    .orderBy(desc(paymentsTable.createdAt));
  return rows.map((p) => ({
    id: p.id,
    amount: p.amount,
    plan: p.plan,
    status: p.status,
    upiTransactionId: p.upiTransactionId,
    createdAt: p.createdAt.toISOString(),
    reviewedAt: p.reviewedAt?.toISOString() ?? null,
  }));
}
