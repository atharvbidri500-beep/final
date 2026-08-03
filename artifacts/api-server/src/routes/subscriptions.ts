import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import {
  PLANS,
  TRIAL_DAYS,
  type PlanId,
  type Cycle,
  syncUserAccess,
  billingHistory,
  formatPlanLabel,
} from "../lib/subscriptions.js";
import { createNotification, sendTrialStartedEmail, sendSubscriptionCanceledEmail } from "../lib/email.js";

const router = Router();

const VALID_PLANS: PlanId[] = ["pro", "premium"];

function formatSubscription(sub: typeof subscriptionsTable.$inferSelect | undefined, trialUsed: boolean, history: unknown[]) {
  const now = new Date();
  const periodEnd = sub?.status === "trial" ? sub.trialEndAt : sub?.currentPeriodEnd;
  const expired = !periodEnd || periodEnd <= now;
  const effectivePlan = sub && !expired ? sub.plan : "free";
  const effectiveStatus = !sub ? "none" : expired ? "expired" : sub.status;
  return {
    plan: effectivePlan,
    status: effectiveStatus,
    cycle: sub?.cycle ?? "monthly",
    trialUsed,
    trialEndAt: sub?.trialEndAt?.toISOString() ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    canceledAt: sub?.canceledAt?.toISOString() ?? null,
    billingHistory: history,
  };
}

router.get("/subscriptions/plans", (_req, res) => {
  res.json({
    trialDays: TRIAL_DAYS,
    plans: {
      pro: { name: PLANS.pro.name, monthly: PLANS.pro.monthly, yearly: PLANS.pro.yearly, yearlySavings: PLANS.pro.yearlySavings },
      premium: { name: PLANS.premium.name, monthly: PLANS.premium.monthly, yearly: PLANS.premium.yearly, yearlySavings: PLANS.premium.yearlySavings },
    },
  });
});

router.get("/subscriptions/me", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number;
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  const history = await billingHistory(userId);
  const now = new Date();
  const periodEnd = sub?.status === "trial" ? sub.trialEndAt : sub?.currentPeriodEnd;

  if (sub && periodEnd && periodEnd <= now) {
    const status = sub.status === "trial" ? "expired" : "expired";
    if (sub.status !== "expired") {
      await db.update(subscriptionsTable)
        .set({ status, currentPeriodEnd: null, cancelAtPeriodEnd: false, canceledAt: now })
        .where(eq(subscriptionsTable.userId, userId));
    }
    await syncUserAccess(userId);
  }

  const [fresh] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  res.json(formatSubscription(fresh, !!fresh, history));
});

router.post("/subscriptions/trial", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number;
  const { plan, cycle } = req.body as { plan?: string; cycle?: string };
  if (!plan || !VALID_PLANS.includes(plan as PlanId)) {
    res.status(400).json({ error: "plan must be 'pro' or 'premium'" });
    return;
  }
  if (cycle !== "yearly") {
    res.status(400).json({ error: "Free trial is only available on yearly plans" });
    return;
  }
  const [existing] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  if (existing) {
    res.status(402).json({ error: "TRIAL_USED", message: "You can only claim one free trial." });
    return;
  }

  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  const [sub] = await db.insert(subscriptionsTable).values({
    userId,
    plan: plan as PlanId,
    cycle: "yearly",
    status: "trial",
    trialStartAt: now,
    trialEndAt: trialEnd,
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd,
    cancelAtPeriodEnd: false,
  }).returning();

  await syncUserAccess(userId);
  const [user] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
  if (user) {
    sendTrialStartedEmail(user, { plan: plan as PlanId, cycle: "yearly", trialEndsAt: trialEnd.toISOString() }).catch(() => {});
  }
  createNotification({
    userId,
    type: "trial_started",
    title: `${PLANS[plan as PlanId].name} trial started 🎉`,
    body: `Your ${TRIAL_DAYS}-day free trial of the ${PLANS[plan as PlanId].name} plan is active until ${trialEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}. Cancel anytime — no charge.`,
    link: "/premium",
  }).catch(() => {});

  res.status(201).json(formatSubscription(sub, true, []));
});

router.post("/subscriptions/cancel", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number;
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  if (!sub) {
    res.status(400).json({ error: "No active subscription to cancel" });
    return;
  }
  const now = new Date();
  const periodEnd = sub.status === "trial" ? sub.trialEndAt : sub.currentPeriodEnd;
  if (!periodEnd || periodEnd <= now) {
    res.status(400).json({ error: "Subscription is already expired" });
    return;
  }
  await db.update(subscriptionsTable)
    .set({ cancelAtPeriodEnd: true, canceledAt: now })
    .where(eq(subscriptionsTable.userId, userId));
  await syncUserAccess(userId);

  const [user] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
  if (user) {
    sendSubscriptionCanceledEmail(user, {
      plan: sub.plan as PlanId,
      cycle: sub.cycle as Cycle,
      accessUntil: periodEnd.toISOString(),
    }).catch(() => {});
  }

  const [fresh] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  const history = await billingHistory(userId);
  createNotification({
    userId,
    type: "subscription_canceled",
    title: "Subscription scheduled for cancellation",
    body: `Your ${formatPlanLabel(sub.plan as PlanId, sub.cycle as Cycle)} access continues until ${periodEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`,
    link: "/premium",
  }).catch(() => {});

  res.json(formatSubscription(fresh, true, history));
});

export default router;
