import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, usersTable, resumesTable, coverLettersTable, interviewSessionsTable, paymentsTable, supportersTable, qrCodesTable } from "@workspace/db";
import * as jwt from "../lib/jwt.js";

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "careerboost@admin2024";

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
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const payload = jwt.verify(auth.slice(7));
  if (!payload || payload.role !== "admin") { res.status(401).json({ error: "Admin access required" }); return; }

  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  const result = await Promise.all(users.map(async (u) => {
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

router.get("/admin/payments", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const payload = jwt.verify(auth.slice(7));
  if (!payload || payload.role !== "admin") { res.status(401).json({ error: "Admin access required" }); return; }

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

router.post("/admin/payments/:id/approve", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const payload = jwt.verify(auth.slice(7));
  if (!payload || payload.role !== "admin") { res.status(401).json({ error: "Admin access required" }); return; }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [payment] = await db.update(paymentsTable).set({ status: "approved", reviewedAt: new Date() }).where(eq(paymentsTable.id, id)).returning();
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }

  if (payment.userId) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (payment.plan === "yearly" ? 12 : 1));
    await db.update(usersTable).set({ isPremium: true, premiumExpiresAt: expiresAt }).where(eq(usersTable.id, payment.userId));
  }

  res.json({ id: payment.id, userId: payment.userId ?? null, fullName: payment.fullName, mobile: payment.mobile, upiTransactionId: payment.upiTransactionId, amount: payment.amount, plan: payment.plan, status: payment.status, createdAt: payment.createdAt.toISOString(), reviewedAt: payment.reviewedAt?.toISOString() ?? null });
});

router.post("/admin/payments/:id/reject", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const payload = jwt.verify(auth.slice(7));
  if (!payload || payload.role !== "admin") { res.status(401).json({ error: "Admin access required" }); return; }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [payment] = await db.update(paymentsTable).set({ status: "rejected", reviewedAt: new Date() }).where(eq(paymentsTable.id, id)).returning();
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }

  res.json({ id: payment.id, userId: payment.userId ?? null, fullName: payment.fullName, mobile: payment.mobile, upiTransactionId: payment.upiTransactionId, amount: payment.amount, plan: payment.plan, status: payment.status, createdAt: payment.createdAt.toISOString(), reviewedAt: payment.reviewedAt?.toISOString() ?? null });
});

router.put("/admin/qr", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const payload = jwt.verify(auth.slice(7));
  if (!payload || payload.role !== "admin") { res.status(401).json({ error: "Admin access required" }); return; }

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
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const payload = jwt.verify(auth.slice(7));
  if (!payload || payload.role !== "admin") { res.status(401).json({ error: "Admin access required" }); return; }

  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [totalResumes] = await db.select({ count: sql<number>`count(*)` }).from(resumesTable);
  const [totalInterviews] = await db.select({ count: sql<number>`count(*)` }).from(interviewSessionsTable);
  const [totalCoverLetters] = await db.select({ count: sql<number>`count(*)` }).from(coverLettersTable);
  const [revenueResult] = await db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(paymentsTable).where(eq(paymentsTable.status, "approved"));
  const [pendingPayments] = await db.select({ count: sql<number>`count(*)` }).from(paymentsTable).where(eq(paymentsTable.status, "pending"));
  const [totalSupporters] = await db.select({ count: sql<number>`count(*)` }).from(supportersTable);

  res.json({
    totalUsers: Number(totalUsers?.count ?? 0),
    totalResumes: Number(totalResumes?.count ?? 0),
    totalInterviews: Number(totalInterviews?.count ?? 0),
    totalCoverLetters: Number(totalCoverLetters?.count ?? 0),
    totalRevenue: Number(revenueResult?.total ?? 0),
    pendingPayments: Number(pendingPayments?.count ?? 0),
    totalSupporters: Number(totalSupporters?.count ?? 0),
  });
});

export default router;
