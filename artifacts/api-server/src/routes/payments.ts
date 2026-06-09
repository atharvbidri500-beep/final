import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, paymentsTable, usersTable, qrCodesTable, supportersTable } from "@workspace/db";

const router = Router();

function formatPayment(p: typeof paymentsTable.$inferSelect) {
  return {
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
  };
}

router.get("/payments", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.userId, userId)).orderBy(desc(paymentsTable.createdAt));
  res.json(payments.map(formatPayment));
});

router.post("/payments", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  const { fullName, mobile, upiTransactionId, amount, plan } = req.body;
  if (!fullName || !mobile || !upiTransactionId || !amount || !plan) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  const [payment] = await db.insert(paymentsTable).values({
    userId: userId ?? null,
    fullName,
    mobile,
    upiTransactionId,
    amount: Number(amount),
    plan,
    status: "pending",
  }).returning();
  res.status(201).json(formatPayment(payment));
});

router.get("/payments/qr", async (req, res): Promise<void> => {
  const [qr] = await db.select().from(qrCodesTable).where(eq(qrCodesTable.type, "payment"));
  if (!qr) {
    res.json({ imageUrl: "", type: "payment", updatedAt: null });
    return;
  }
  res.json({ imageUrl: qr.imageUrl, type: qr.type, updatedAt: qr.updatedAt?.toISOString() ?? null });
});

router.get("/supporters/qr", async (req, res): Promise<void> => {
  const [qr] = await db.select().from(qrCodesTable).where(eq(qrCodesTable.type, "support"));
  if (!qr) {
    res.json({ imageUrl: "", type: "support", updatedAt: null });
    return;
  }
  res.json({ imageUrl: qr.imageUrl, type: qr.type, updatedAt: qr.updatedAt?.toISOString() ?? null });
});

router.post("/supporters", async (req, res): Promise<void> => {
  const { name, mobile, amount, upiTransactionId } = req.body;
  if (!name || !mobile || !amount || !upiTransactionId) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  const [supporter] = await db.insert(supportersTable).values({ name, mobile, amount: Number(amount), upiTransactionId }).returning();
  res.status(201).json({ ...supporter, createdAt: supporter.createdAt.toISOString() });
});

export default router;
