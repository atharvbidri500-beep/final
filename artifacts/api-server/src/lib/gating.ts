import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";

export type PlanTier = "pro" | "premium";

export interface Access {
  isPremium: boolean;
  plan: PlanTier;
  premiumExpiresAt: Date | null;
}

/**
 * Effective access for a user. Lazy-expires: if the cached expiry has passed,
 * the user is downgraded to free (also synced to the subscription row).
 * Users paid via the legacy flow (isPremium but plan "free") are treated as Pro.
 */
export async function getUserAccess(userId: number): Promise<Access> {
  const [user] = await db.select({
    isPremium: usersTable.isPremium,
    plan: usersTable.plan,
    premiumExpiresAt: usersTable.premiumExpiresAt,
  }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return { isPremium: false, plan: "pro", premiumExpiresAt: null };
  if (!user.isPremium) return { isPremium: false, plan: "pro", premiumExpiresAt: null };
  if (user.premiumExpiresAt && user.premiumExpiresAt <= new Date()) {
    db.update(usersTable).set({ isPremium: false, plan: "free", premiumExpiresAt: null })
      .where(eq(usersTable.id, userId)).catch(() => {});
    return { isPremium: false, plan: "pro", premiumExpiresAt: null };
  }
  const plan: PlanTier = user.plan === "premium" ? "premium" : "pro";
  return { isPremium: true, plan, premiumExpiresAt: user.premiumExpiresAt };
}

/** True if the user has an active paid plan (Pro or Premium). */
export async function isPremiumUser(userId: number): Promise<boolean> {
  return (await getUserAccess(userId)).isPremium;
}

/** Express middleware: rejects non-premium users with a 402 upgrade payload. */
export async function requirePremium(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await isPremiumUser(userId))) {
    res.status(402).json({
      error: "UPGRADE_REQUIRED",
      message: "This is a Premium feature. Upgrade to unlock unlimited access.",
      premium: false,
    });
    return;
  }
  next();
}

/**
 * Express middleware: requires a specific plan tier.
 * `requireTier("premium")` blocks Pro users with a 402 upgrade payload.
 */
export function requireTier(tier: PlanTier) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).userId as number | undefined;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const access = await getUserAccess(userId);
    if (!access.isPremium) {
      res.status(402).json({
        error: "UPGRADE_REQUIRED",
        message: "This is a Premium feature. Upgrade to unlock unlimited access.",
        premium: false,
      });
      return;
    }
    if (tier === "premium" && access.plan !== "premium") {
      res.status(402).json({
        error: "UPGRADE_REQUIRED",
        message: "This feature requires the Premium plan. Upgrade from Pro to unlock it.",
        premium: true,
      });
      return;
    }
    next();
  };
}
