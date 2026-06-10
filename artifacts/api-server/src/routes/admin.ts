import { Router } from "express";
import { eq, desc, sql, gte, and } from "drizzle-orm";
import { db, usersTable, resumesTable, coverLettersTable, interviewSessionsTable, paymentsTable, supportersTable, qrCodesTable } from "@workspace/db";
import * as jwt from "../lib/jwt.js";

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "careerboost@admin2024";

function adminAuth(req: any, res: any): boolean {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return false; }
  const payload = jwt.verify(auth.slice(7));
  if (!payload || payload.role !== "admin") { res.status(401).json({ error: "Admin access required" }); return false; }
  return true;
}

router.post("/admin/login", async (req, res): Promise<void> => {
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
      premiumExpiresAt: u.premiumExpiresAt?.toISOString() ?? null,
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

// Manually upgrade user to premium
router.post("/admin/users/:id/upgrade", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  const { plan } = req.body;
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + (plan === "yearly" ? 12 : 1));
  const [user] = await db.update(usersTable)
    .set({ isPremium: true, premiumExpiresAt: expiresAt })
    .where(eq(usersTable.id, id))
    .returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ success: true, user: { id: user.id, name: user.name, isPremium: user.isPremium, premiumExpiresAt: user.premiumExpiresAt?.toISOString() } });
});

// Revoke premium
router.post("/admin/users/:id/revoke-premium", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  const [user] = await db.update(usersTable).set({ isPremium: false, premiumExpiresAt: null }).where(eq(usersTable.id, id)).returning();
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
  if (payment.userId) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (payment.plan === "yearly" ? 12 : 1));
    await db.update(usersTable).set({ isPremium: true, premiumExpiresAt: expiresAt }).where(eq(usersTable.id, payment.userId));
  }
  res.json({ id: payment.id, status: payment.status, reviewedAt: payment.reviewedAt?.toISOString() ?? null });
});

router.post("/admin/payments/:id/reject", async (req, res): Promise<void> => {
  if (!adminAuth(req, res)) return;
  const id = parseInt(req.params.id, 10);
  const [payment] = await db.update(paymentsTable).set({ status: "rejected", reviewedAt: new Date() }).where(eq(paymentsTable.id, id)).returning();
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
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
  });
});

export default router;
