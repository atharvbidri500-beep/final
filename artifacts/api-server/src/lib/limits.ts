import { and, eq, gte, count } from "drizzle-orm";
import { db, resumesTable, coverLettersTable, interviewSessionsTable, usersTable } from "@workspace/db";

/* Free-tier daily/monthly limits */
export const FREE_LIMITS = {
  interviewPerDay:   5,
  coverLetterPerMonth: 3,
  resumePerMonth:    3,
  englishPerDay:     5,   // tracked separately via a counter on the user row
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* Returns whether the user is currently an active Pro subscriber */
async function isProUser(userId: number): Promise<boolean> {
  const [user] = await db.select({ isPremium: usersTable.isPremium, expiresAt: usersTable.premiumExpiresAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) return false;
  if (!user.isPremium) return false;
  if (!user.expiresAt) return true;          // no expiry = lifetime
  return user.expiresAt > new Date();
}

/* Returns a 402-ready error payload or null (under limit) */
export async function checkLimit(
  userId: number,
  feature: "interview" | "coverLetter" | "resume" | "english",
): Promise<{ over: true; message: string } | { over: false }> {
  const pro = await isProUser(userId);
  if (pro) return { over: false };

  if (feature === "interview") {
    const [row] = await db
      .select({ n: count() })
      .from(interviewSessionsTable)
      .where(and(
        eq(interviewSessionsTable.userId, userId),
        gte(interviewSessionsTable.createdAt, startOfToday()),
      ));
    const used = Number(row?.n ?? 0);
    if (used >= FREE_LIMITS.interviewPerDay) {
      return {
        over: true,
        message: `Free plan: ${FREE_LIMITS.interviewPerDay} interview sessions per day. You've used ${used}. Upgrade to Pro for unlimited practice.`,
      };
    }
  }

  if (feature === "coverLetter") {
    const [row] = await db
      .select({ n: count() })
      .from(coverLettersTable)
      .where(and(
        eq(coverLettersTable.userId, userId),
        gte(coverLettersTable.createdAt, startOfMonth()),
      ));
    const used = Number(row?.n ?? 0);
    if (used >= FREE_LIMITS.coverLetterPerMonth) {
      return {
        over: true,
        message: `Free plan: ${FREE_LIMITS.coverLetterPerMonth} cover letters per month. You've used ${used}. Upgrade to Pro for unlimited letters.`,
      };
    }
  }

  if (feature === "resume") {
    const [row] = await db
      .select({ n: count() })
      .from(resumesTable)
      .where(and(
        eq(resumesTable.userId, userId),
        gte(resumesTable.createdAt, startOfMonth()),
      ));
    const used = Number(row?.n ?? 0);
    if (used >= FREE_LIMITS.resumePerMonth) {
      return {
        over: true,
        message: `Free plan: ${FREE_LIMITS.resumePerMonth} resume saves per month. You've used ${used}. Upgrade to Pro for unlimited resumes.`,
      };
    }
  }

  return { over: false };
}
