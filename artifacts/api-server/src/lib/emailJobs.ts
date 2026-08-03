import { and, eq, gte, lte } from "drizzle-orm";
import { db, usersTable, subscriptionsTable } from "@workspace/db";
import { logger } from "./logger.js";
import { PLANS, type PlanId, type Cycle } from "./plans.js";
import { syncUserAccess } from "./subscriptions.js";
import {
  sendRenewalDueEmail,
  sendSubscriptionExpiredEmail,
  createNotification,
} from "./email.js";

const REMINDER_WINDOW_DAYS = 4;
const EXPIRY_LOOKBACK_DAYS = 30;

/**
 * Automatic subscription lifecycle emails:
 * - Renewal due: sent once when a paid period ends within the reminder window
 *   (skipped for subscriptions scheduled to cancel).
 * - Expiry: sent once when a period has passed — access is downgraded to Free
 *   and the user is told how to re-subscribe.
 * Runs daily; deduplicated via renewal_reminder_at / expiry_notified_at.
 */
export async function runSubscriptionEmailJobs(): Promise<void> {
  const now = new Date();
  const reminderEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const expiryLookback = new Date(now.getTime() - EXPIRY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const subs = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        lte(subscriptionsTable.currentPeriodEnd, reminderEnd),
        gte(subscriptionsTable.currentPeriodEnd, expiryLookback),
      ),
    );

  for (const sub of subs) {
    if (sub.status !== "trial" && sub.status !== "active") continue;
    const plan = sub.plan as PlanId;
    const cycle = sub.cycle as Cycle;
    const periodEnd = sub.status === "trial" ? sub.trialEndAt : sub.currentPeriodEnd;
    if (!periodEnd) continue;

    try {
      if (periodEnd > now) {
        if (sub.cancelAtPeriodEnd || sub.renewalReminderAt) continue;
        const daysLeft = Math.max(1, Math.ceil((periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
        const [user] = await db
          .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
          .from(usersTable)
          .where(eq(usersTable.id, sub.userId));
        if (!user) continue;
        await db.update(subscriptionsTable)
          .set({ renewalReminderAt: now })
          .where(eq(subscriptionsTable.id, sub.id));
        await sendRenewalDueEmail(user, {
          plan,
          cycle,
          amount: PLANS[plan][cycle],
          periodEnd: periodEnd.toISOString(),
          daysLeft,
        });
        createNotification({
          userId: user.id,
          type: "renewal_due",
          title: `Your ${PLANS[plan].name} plan renews in ${daysLeft} day${daysLeft === 1 ? "" : "s"} ⏳`,
          body: `Pay ₹${PLANS[plan][cycle]} via UPI on the pricing page to keep your ${PLANS[plan].name} features.`,
          link: "/premium",
        }).catch(() => {});
        logger.info({ userId: user.id, subscriptionId: sub.id }, "Renewal reminder sent");
      } else {
        if (sub.expiryNotifiedAt) continue;
        await db.update(subscriptionsTable)
          .set({ status: "expired", currentPeriodEnd: null, cancelAtPeriodEnd: false, expiryNotifiedAt: now })
          .where(eq(subscriptionsTable.id, sub.id));
        await syncUserAccess(sub.userId);
        const [user] = await db
          .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
          .from(usersTable)
          .where(eq(usersTable.id, sub.userId));
        if (!user) continue;
        await sendSubscriptionExpiredEmail(user, { plan, cycle });
        createNotification({
          userId: user.id,
          type: "subscription_expired",
          title: `Your ${PLANS[plan].name} access has ended`,
          body: `Re-subscribe on the pricing page to continue where you left off.`,
          link: "/premium",
        }).catch(() => {});
        logger.info({ userId: user.id, subscriptionId: sub.id }, "Subscription expired email sent");
      }
    } catch (err) {
      logger.error({ err, subscriptionId: sub.id }, "Subscription email job failed for subscription");
    }
  }
}

/** Daily scheduler — runs once at boot, then every 24h. */
export function startSubscriptionEmailScheduler(intervalMs = 24 * 60 * 60 * 1000): void {
  const run = () => {
    runSubscriptionEmailJobs().catch((err) => {
      logger.error({ err }, "Subscription email job crashed");
    });
  };
  run();
  setInterval(run, intervalMs);
  logger.info("Subscription email scheduler started (daily)");
}
