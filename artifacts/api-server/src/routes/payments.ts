import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, paymentsTable, qrCodesTable, supportersTable, usersTable } from "@workspace/db";
import { sendPaymentNotification, sendPaymentReceivedEmail, createNotification } from "../lib/email.js";
import { PLANS, type PlanId, type Cycle, formatPlanLabel } from "../lib/subscriptions.js";

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
  const { fullName, mobile, upiTransactionId, plan, cycle } = req.body;
  if (!fullName || !mobile || !upiTransactionId || !plan) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  const planId = plan as PlanId;
  const cycleId = (cycle as Cycle) ?? "monthly";
  if (!PLANS[planId] || !["monthly", "yearly"].includes(cycleId)) {
    res.status(400).json({ error: "plan must be 'pro' or 'premium' and cycle 'monthly' or 'yearly'" });
    return;
  }
  const amount = PLANS[planId][cycleId];

  const [payment] = await db.insert(paymentsTable).values({
    userId: userId ?? null,
    fullName,
    mobile,
    upiTransactionId,
    amount,
    plan: `${planId}_${cycleId}`,
    status: "pending",
  }).returning();

  // Look up user email if logged in
  let userEmail: string | null = null;
  if (userId) {
    const [user] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
    userEmail = user?.email ?? null;
    if (user) {
      sendPaymentReceivedEmail(user, {
        amount: payment.amount,
        plan: formatPlanLabel(planId, cycleId),
        upiTransactionId: payment.upiTransactionId,
        paymentId: payment.id,
      }).catch(() => {});
      createNotification({
        userId: user.id,
        type: "payment_received",
        title: "Payment received — under review 🧾",
        body: `Your ₹${payment.amount} payment request is being verified. We'll email you once approved.`,
        link: "/premium",
      }).catch(() => {});
    }
  }

  // Send admin email notification (non-blocking)
  sendPaymentNotification({
    paymentId: payment.id,
    fullName: payment.fullName,
    mobile: payment.mobile,
    upiTransactionId: payment.upiTransactionId,
    amount: payment.amount,
    plan: formatPlanLabel(planId, cycleId),
    submittedAt: payment.createdAt.toISOString(),
    userEmail,
  }).catch(() => {});

  res.status(201).json(formatPayment(payment));
});

router.get("/payments/qr", async (req, res): Promise<void> => {
  const [qr] = await db.select().from(qrCodesTable).where(eq(qrCodesTable.type, "payment"));
  if (!qr) { res.json({ imageUrl: "", type: "payment", updatedAt: null }); return; }
  res.json({ imageUrl: qr.imageUrl, type: qr.type, updatedAt: qr.updatedAt?.toISOString() ?? null });
});

router.get("/supporters/qr", async (req, res): Promise<void> => {
  const [qr] = await db.select().from(qrCodesTable).where(eq(qrCodesTable.type, "support"));
  if (!qr) { res.json({ imageUrl: "", type: "support", updatedAt: null }); return; }
  res.json({ imageUrl: qr.imageUrl, type: qr.type, updatedAt: qr.updatedAt?.toISOString() ?? null });
});

router.post("/supporters", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Login required to submit support" }); return; }
  const { name, mobile, amount, upiTransactionId } = req.body;
  if (!name || !mobile || !amount || !upiTransactionId) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  const [supporter] = await db.insert(supportersTable).values({ name, mobile, amount: Number(amount), upiTransactionId }).returning();
  res.status(201).json({ ...supporter, createdAt: supporter.createdAt.toISOString() });
});

export default router;
