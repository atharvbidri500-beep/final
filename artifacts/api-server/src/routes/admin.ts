import { Router } from "express";
import { eq, desc, sql, gte, and } from "drizzle-orm";
import { db, pool, usersTable, resumesTable, coverLettersTable, interviewSessionsTable, paymentsTable, supportersTable, qrCodesTable, emailLogsTable } from "@workspace/db";
import * as jwt from "../lib/jwt.js";
import { rateLimit } from "../middlewares/rateLimit.js";
import { sendPaymentApprovedEmail, sendPaymentRejectedEmail, createNotification } from "../lib/email.js";
import { parsePlanCycle, activateSubscription, syncUserAccess, formatPlanLabel } from "../lib/subscriptions.js";

const router = Router();

const adminLoginLimiter = rateLimit({ limit: 10, windowMs: 10 * 60 * 1000, message: "Too many admin login attempts. Please try again in 10 minutes." });

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD environment variable is required. Set a strong password in production.");
}

function adminAuth(req: any, res: any): boolean {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return false; }
  const payload = jwt.verify(auth.slice(7));
  if (!payload || payload.role !== "admin") { res.status(401).json({ error: "Admin access required" }); return false; }
  return true;
}

router.post("/admin/login", adminLoginLimiter, async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid admin credentials" });
    return;
  }
  const token = jwt.sign({ role: "admin", username });
  res.json({ token, role: "admin" });
});

router.get("/admin/users", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const { search } = req.query as { search?: string };
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  const filtered = search
    ? users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : users;
  const result = await Promise.all(filtered.map(async (u) => {
    const [rc] = await db.select({ count: sql<number>`count(*)` }).from(resumesTable).where(eq(resumesTable.userId, u.id));
    const [ic] = await db.select({ count: sql<number>`count(*)` }).from(interviewSessionsTable).where(eq(interviewSessionsTable.userId, u.id));
    const [cc] = await db.select({ count: sql<number>`count(*)` }).from(coverLettersTable).where(eq(coverLettersTable.userId, u.id));
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile ?? null,
      isPremium: u.isPremium,
      plan: u.plan ?? "free",
      premiumExpiresAt: u.premiumExpiresAt?.toISOString() ?? null,
      authProvider: u.passwordHash === "" ? "google" : "email",
      englishUseCount: u.englishUseCount ?? 0,
      resumeCount: Number(rc?.count ?? 0),
      interviewCount: Number(ic?.count ?? 0),
      coverLetterCount: Number(cc?.count ?? 0),
      createdAt: u.createdAt.toISOString(),
    };
  }));
  res.json(result);
});

// Delete user
router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ success: true });
});

// Manually upgrade user to a paid plan (creates/updates the subscription)
router.post("/admin/users/:id/upgrade", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  const { plan, cycle, tier } = req.body;
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }
  const planId = tier ?? plan;
  const cycleId = cycle ?? "monthly";
  if (!["pro", "premium"].includes(planId) || !["monthly", "yearly"].includes(cycleId)) {
    res.status(400).json({ error: "plan must be 'pro' or 'premium' and cycle 'monthly' or 'yearly'" }); return;
  }
  await activateSubscription(id, planId, cycleId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ success: true, user: { id: user.id, name: user.name, isPremium: user.isPremium, plan: user.plan, premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null } });
});

// Revoke premium
router.post("/admin/users/:id/revoke-premium", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  const [user] = await db.update(usersTable).set({ isPremium: false, plan: "free", premiumExpiresAt: null }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ success: true });
});

router.get("/admin/payments", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const payments = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));
  res.json(payments.map(p => ({
    id: p.id,
    userId: p.userId ?? null,
    fullName: p.fullName,
    mobile: p.mobile,
    upiTransactionId: p.upiTransactionId,
    amount: p.amount,
    plan: p.plan,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    reviewedAt: p.reviewedAt?.toISOString() ?? null,
  })));
});

router.get("/admin/payments/pending-count", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(paymentsTable).where(eq(paymentsTable.status, "pending"));
  res.json({ count: Number(row?.count ?? 0) });
});

router.post("/admin/payments/:id/approve", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  const [payment] = await db.update(paymentsTable).set({ status: "approved", reviewedAt: new Date() }).where(eq(paymentsTable.id, id)).returning();
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  let premiumExpiresAt: Date | null = null;
  if (payment.userId) {
    const parsed = parsePlanCycle(payment.plan);
    const planId = parsed?.plan ?? "pro";
    const cycleId = parsed?.cycle ?? "monthly";
    await activateSubscription(payment.userId, planId, cycleId);

    const [user] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, premiumExpiresAt: usersTable.premiumExpiresAt }).from(usersTable).where(eq(usersTable.id, payment.userId));
    premiumExpiresAt = user?.premiumExpiresAt ?? null;
    if (user) {
      const label = formatPlanLabel(planId, cycleId);
      sendPaymentApprovedEmail(user, {
        amount: payment.amount,
        plan: label,
        paymentId: payment.id,
        premiumExpiresAt: (premiumExpiresAt ?? new Date()).toISOString(),
      }).catch(() => {});
      createNotification({
        userId: user.id,
        type: "payment_approved",
        title: "Payment approved — your subscription is active! 🎉",
        body: `Your ${label} subscription is active until ${(premiumExpiresAt ?? new Date()).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })}.`,
        link: "/premium",
      }).catch(() => {});
    }
  }
  res.json({ id: payment.id, status: payment.status, reviewedAt: payment.reviewedAt?.toISOString() ?? null });
});

router.post("/admin/payments/:id/reject", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  const [payment] = await db.update(paymentsTable).set({ status: "rejected", reviewedAt: new Date() }).where(eq(paymentsTable.id, id)).returning();
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  if (payment.userId) {
    const [user] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, payment.userId));
    if (user) {
      sendPaymentRejectedEmail(user, {
        amount: payment.amount,
        plan: payment.plan,
        paymentId: String(payment.id),
        reason: "The UPI transaction could not be verified. Please check the transaction ID and try again.",
      }).catch(() => {});
      createNotification({
        userId: user.id,
        type: "payment_rejected",
        title: "Payment could not be verified 😕",
        body: "Your payment request was rejected. Please double-check your UPI transaction ID and try again.",
        link: "/premium",
      }).catch(() => {});
    }
  }
  res.json({ id: payment.id, status: payment.status, reviewedAt: payment.reviewedAt?.toISOString() ?? null });
});

router.put("/admin/qr", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const { imageUrl, type } = req.body;
  if (!imageUrl || !type) { res.status(400).json({ error: "imageUrl and type are required" }); return; }
  const existing = await db.select().from(qrCodesTable).where(eq(qrCodesTable.type, type));
  let qr;
  if (existing.length > 0) {
    [qr] = await db.update(qrCodesTable).set({ imageUrl }).where(eq(qrCodesTable.type, type)).returning();
  } else {
    [qr] = await db.insert(qrCodesTable).values({ type, imageUrl }).returning();
  }
  res.json({ imageUrl: qr!.imageUrl, type: qr!.type, updatedAt: qr!.updatedAt?.toISOString() ?? null });
});

router.get("/admin/qr", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const { type = "payment" } = req.query as { type?: string };
  const [qr] = await db.select().from(qrCodesTable).where(eq(qrCodesTable.type, type));
  if (!qr) { res.json({ imageUrl: "", type, updatedAt: null }); return; }
  res.json({ imageUrl: qr.imageUrl, type: qr.type, updatedAt: qr.updatedAt?.toISOString() ?? null });
});

router.get("/admin/supporters", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const supporters = await db.select().from(supportersTable).orderBy(desc(supportersTable.createdAt));
  res.json(supporters.map(s => ({
    id: s.id,
    name: s.name,
    mobile: s.mobile,
    amount: s.amount,
    upiTransactionId: s.upiTransactionId,
    createdAt: s.createdAt.toISOString(),
  })));
});

router.delete("/admin/supporters/:id", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid supporter ID" }); return; }
  const [deleted] = await db.delete(supportersTable).where(eq(supportersTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Supporter not found" }); return; }
  res.json({ success: true });
});

router.get("/admin/email-logs", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const logs = await db.select().from(emailLogsTable).orderBy(desc(emailLogsTable.createdAt)).limit(100);
  res.json(logs.map(l => ({
    id: l.id,
    userId: l.userId ?? null,
    email: l.email,
    subject: l.subject,
    template: l.template,
    status: l.status,
    messageId: l.messageId ?? null,
    error: l.error ?? null,
    createdAt: l.createdAt.toISOString(),
  })));
});

router.get("/admin/stats", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [totalResumes] = await db.select({ count: sql<number>`count(*)` }).from(resumesTable);
  const [totalInterviews] = await db.select({ count: sql<number>`count(*)` }).from(interviewSessionsTable);
  const [totalCoverLetters] = await db.select({ count: sql<number>`count(*)` }).from(coverLettersTable);
  const [revenueResult] = await db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(paymentsTable).where(eq(paymentsTable.status, "approved"));
  const [pendingPayments] = await db.select({ count: sql<number>`count(*)` }).from(paymentsTable).where(eq(paymentsTable.status, "pending"));
  const [totalSupporters] = await db.select({ count: sql<number>`count(*)` }).from(supportersTable);
  const [premiumUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.isPremium, true));

  // Registration trends: last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const [recentUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(gte(usersTable.createdAt, sevenDaysAgo));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [monthlyUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(gte(usersTable.createdAt, thirtyDaysAgo));

  const [englishUses] = await db.select({ total: sql<number>`coalesce(sum(english_use_count), 0)` }).from(usersTable);
  const [googleUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.passwordHash, ""));

  const growthDays: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(and(gte(usersTable.createdAt, start), sql`${usersTable.createdAt} < ${end}`));
    growthDays.push({
      day: start.toLocaleDateString("en-IN", { weekday: "short" }),
      count: Number(row?.count ?? 0),
    });
  }

  res.json({
    totalUsers: Number(totalUsers?.count ?? 0),
    totalResumes: Number(totalResumes?.count ?? 0),
    totalInterviews: Number(totalInterviews?.count ?? 0),
    totalCoverLetters: Number(totalCoverLetters?.count ?? 0),
    totalRevenue: Number(revenueResult?.total ?? 0),
    pendingPayments: Number(pendingPayments?.count ?? 0),
    totalSupporters: Number(totalSupporters?.count ?? 0),
    premiumUsers: Number(premiumUsers?.count ?? 0),
    weeklyNewUsers: Number(recentUsers?.count ?? 0),
    monthlyNewUsers: Number(monthlyUsers?.count ?? 0),
    englishUses: Number(englishUses?.total ?? 0),
    googleUsers: Number(googleUsers?.count ?? 0),
    growthDays,
  });
});

/** Premium modules overview (usage counts per module). */
router.get("/admin/premium", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const count = async (table: any, col: any) => {
    const [row] = await db.select({ n: sql<number>`count(*)` }).from(table);
    return Number(row?.n ?? 0);
  };
  const [roadmaps, tailorings, coachSessions, portfolios, linkedin, salaryOffers, weeklyReports, analyses] = await Promise.all([
    count(sql`career_roadmaps`, null), count(sql`resume_tailorings`, null), count(sql`interview_analytics`, null),
    count(sql`portfolios`, null), count(sql`linkedin_profiles`, null), count(sql`salary_offers`, null),
    count(sql`weekly_reports`, null), count(sql`resume_analyses`, null),
  ]);

  const { rows: topRoadmaps } = await pool.query(
    `SELECT u.name, u.email, cr.dream_role, cr.content->>'progress' AS progress, cr.created_at
     FROM career_roadmaps cr JOIN users u ON u.id = cr.user_id
     ORDER BY cr.created_at DESC LIMIT 10`,
  ) as any;
  const { rows: topSalaries } = await pool.query(
    `SELECT u.name, u.email, so.position, so.company, so.offered_amount, so.counter_offer, so.created_at
     FROM salary_offers so JOIN users u ON u.id = so.user_id
     ORDER BY so.created_at DESC LIMIT 10`,
  ) as any;
  const { rows: topPortfolios } = await pool.query(
    `SELECT u.name, u.email, p.title, p.slug, p.published, p.updated_at
     FROM portfolios p JOIN users u ON u.id = p.user_id ORDER BY p.updated_at DESC LIMIT 10`,
  ) as any;

  res.json({
    counts: { roadmaps, tailorings, coachSessions, portfolios, linkedin, salaryOffers, weeklyReports, analyses },
    recentRoadmaps: topRoadmaps ?? [],
    recentSalaryOffers: topSalaries ?? [],
    recentPortfolios: topPortfolios ?? [],
  });
});

export default router;
