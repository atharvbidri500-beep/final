import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";
import { db, emailLogsTable, emailPreferencesTable, notificationsTable } from "@workspace/db";
import { PLANS, PLAN_FEATURES, TRIAL_DAYS, parsePlanCycle, formatPlanLabel, type PlanId, type Cycle } from "./plans.js";

export const ADMIN_EMAIL = "shravanibidri28@gmail.com";
export const BRAND_NAME = "Hire Pilot";
export const BRAND_TAGLINE = "Your AI Career Copilot";
export const APP_URL = process.env.APP_URL ?? "https://hire-pilot-375z.onrender.com";

const EMAIL_FROM = process.env.EMAIL_FROM ?? "Hire Pilot <onboarding@resend.dev>";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

// ---------------------------------------------------------------
// Branded HTML layout
// ---------------------------------------------------------------

function layout(title: string, body: string, footerNote = "Hire Pilot India"): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:24px 32px;">
      <img src="${APP_URL}/logo-white.svg" alt="${BRAND_NAME}" width="150" height="30" style="display:block;width:150px;height:auto;border:0;"/>
      <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">${BRAND_TAGLINE}</div>
    </div>
    <div style="padding:28px 32px;">
      ${body}
    </div>
    <div style="background:#f8fafc;border-top:1px solid #f0f0f0;padding:16px 32px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">${footerNote}</p>
      <p style="margin:6px 0 0;color:#c0c4cc;font-size:11px;">You received this email because you have an account with ${BRAND_NAME}.</p>
    </div>
  </div>
</body>
</html>`;
}

function infoRow(label: string, value: string, highlight = false): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;width:45%;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:${highlight ? "700" : "600"};color:${highlight ? "#6366f1" : "#111827"};font-size:14px;">${value}</td>
    </tr>`;
}

function ctaButton(text: string, url: string): string {
  return `
  <div style="text-align:center;margin:24px 0 8px;">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;">${text}</a>
  </div>`;
}

function formatIST(date: Date | string): string {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** "pro_monthly" / "premium_yearly" → "Pro (Monthly) — ₹149/month" */
export function planLabel(plan: string): string {
  const parsed = parsePlanCycle(plan);
  if (!parsed) return plan;
  return `${PLANS[parsed.plan].name} (${parsed.cycle === "yearly" ? "Yearly" : "Monthly"}) — ₹${PLANS[parsed.plan][parsed.cycle]}${parsed.cycle === "yearly" ? "/year" : "/month"}`;
}

function featureListHtml(plan: PlanId): string {
  const items = PLAN_FEATURES[plan].map(
    (f) => `<li style="color:#374151;font-size:13px;line-height:1.6;padding-left:20px;position:relative;">${f}</li>`,
  ).join("");
  return `<ul style="list-style:none;margin:0 0 16px;padding:0;">${items}</ul>`;
}

function planFeaturesBoxHtml(plan: PlanId, label: string): string {
  return `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin:16px 0;">
      <p style="margin:0 0 10px;color:#111827;font-size:13px;font-weight:700;">✨ What's included in ${label}:</p>
      ${featureListHtml(plan)}
    </div>`;
}

function paymentInfoHtml(planId: PlanId, cycle: Cycle, amount: number, upiId = "9579841359@fam"): string {
  return `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin:16px 0;">
      <p style="margin:0 0 10px;color:#111827;font-size:13px;font-weight:700;">💳 How to pay (UPI):</p>
      <ol style="margin:0;padding-left:20px;color:#374151;font-size:13px;line-height:1.9;">
        <li>Open any UPI app — GPay, PhonePe, Paytm</li>
        <li>Scan the QR or pay ${amount > 0 ? `₹${amount} to` : "to"} <strong>${upiId}</strong></li>
        <li>Enter your UPI transaction ID on the pricing page to verify</li>
      </ol>
      <p style="margin:10px 0 0;color:#6b7280;font-size:12px;">Your subscription activates within a few hours of verification.</p>
    </div>`;
}

// ---------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------

export function welcomeEmailHtml(name: string): string {
  const body = `
    <h2 style="margin:0 0 8px;color:#111827;">Welcome to ${BRAND_NAME}, ${name}! 🎉</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6;">
      Your account is ready. Build ATS-optimized resumes, practice mock interviews with AI feedback,
      improve your English fluency, and land your dream job — all in one place.
    </p>
    ${ctaButton("Start building your career", `${APP_URL}/dashboard`)}
    <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">Need help? Just reply to this email — we're here for you.</p>`;
  return layout("Welcome to " + BRAND_NAME + " 🎉", body);
}

export function paymentReceivedHtml(data: {
  fullName: string;
  amount: number;
  plan: string;
  upiTransactionId: string;
  paymentId: number;
}): string {
  const parsed = parsePlanCycle(data.plan);
  const body = `
    <h2 style="margin:0 0 8px;color:#111827;">Payment received — under review 🧾</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;">Hi ${data.fullName}, we received your payment request. Our team verifies payments within a few hours. You'll get an email the moment it's approved.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${infoRow("💳 UPI Transaction ID", `<span style="font-family:monospace;">${data.upiTransactionId}</span>`, true)}
      ${infoRow("💰 Amount", `₹${data.amount}`)}
      ${infoRow("📦 Plan", planLabel(data.plan))}
      ${infoRow("📄 Payment ID", `#${data.paymentId}`)}
      ${infoRow("🕐 Submitted At", `${formatIST(new Date())} IST`)}
    </table>
    ${parsed ? planFeaturesBoxHtml(parsed.plan, planLabel(data.plan)) : ""}`;
  return layout("Payment received 🧾", body);
}

export function paymentApprovedHtml(data: {
  fullName: string;
  amount: number;
  plan: string;
  paymentId: number;
  premiumExpiresAt: string;
}): string {
  const parsed = parsePlanCycle(data.plan);
  const planName = parsed ? `${PLANS[parsed.plan].name} plan` : "Pro plan";
  const body = `
    <h2 style="margin:0 0 8px;color:#111827;">Payment approved — your ${planName} is active! 🎉</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;">Congratulations ${data.fullName}! Your ${planLabel(data.plan)} subscription is now active.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${infoRow("💰 Amount Paid", `₹${data.amount}`)}
      ${infoRow("📦 Plan", planLabel(data.plan))}
      ${infoRow("📄 Payment ID", `#${data.paymentId}`)}
      ${infoRow("⏳ Access Until", `${formatIST(data.premiumExpiresAt)} IST`)}
    </table>
    ${parsed ? planFeaturesBoxHtml(parsed.plan, planLabel(data.plan)) : ""}
    ${ctaButton("Explore your features", `${APP_URL}/premium`)}
    <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">Thank you for trusting ${BRAND_NAME} with your career! 🚀</p>`;
  return layout(`You're on ${planName}! 🎉`, body);
}

export function paymentRejectedHtml(data: {
  fullName: string;
  amount: number;
  plan: string;
  paymentId: string;
  reason: string;
}): string {
  const body = `
    <h2 style="margin:0 0 8px;color:#111827;">Payment could not be verified 😕</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;">Hi ${data.fullName}, we were unable to verify your payment request.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${infoRow("💰 Amount", `₹${data.amount}`)}
      ${infoRow("📦 Plan", planLabel(data.plan))}
      ${infoRow("📄 Payment ID", `#${data.paymentId}`)}
    </table>
    ${data.reason ? `<p style="margin:16px 0 0;color:#b45309;font-size:13px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;">Reason: ${data.reason}</p>` : ""}
    <p style="margin:16px 0 0;color:#6b7280;font-size:13px;">Please double-check your UPI transaction and try again, or contact us for help.</p>`;
  return layout("Payment update", body);
}

export function trialStartedHtml(data: {
  name: string;
  plan: PlanId;
  cycle: Cycle;
  trialEndsAt: string;
  amount: number;
}): string {
  const label = formatPlanLabel(data.plan, data.cycle);
  const body = `
    <h2 style="margin:0 0 8px;color:#111827;">Your ${PLANS[data.plan].name} trial is live! 🚀</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6;">
      Hi ${data.name}, your <strong>${data.cycle === "yearly" ? "yearly" : "monthly"} ${PLANS[data.plan].name} plan</strong> free trial
      is active until <strong>${formatIST(data.trialEndsAt)} IST</strong>. Explore every feature — no charge during the trial.
    </p>
    ${planFeaturesBoxHtml(data.plan, label)}
    <p style="margin:0 0 8px;color:#374151;font-size:13px;">Love it? Your subscription starts automatically after the trial unless you cancel. Pay via UPI to keep it:</p>
    ${paymentInfoHtml(data.plan, data.cycle, data.amount)}
    ${ctaButton(`Manage your ${PLANS[data.plan].name} plan`, `${APP_URL}/premium`)}
    <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">You can cancel anytime from the pricing page — no questions asked.</p>`;
  return layout(`Your ${PLANS[data.plan].name} trial is live 🚀`, body);
}

export function subscriptionCanceledHtml(data: {
  name: string;
  plan: PlanId;
  cycle: Cycle;
  accessUntil: string;
}): string {
  const body = `
    <h2 style="margin:0 0 8px;color:#111827;">Cancellation scheduled — we'll miss you 💙</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6;">
      Hi ${data.name}, your <strong>${formatPlanLabel(data.plan, data.cycle)}</strong> subscription is scheduled to end.
      You'll keep full access until <strong>${formatIST(data.accessUntil)} IST</strong> — no charges after that.
    </p>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6;">
      Changed your mind? You can reactivate your subscription anytime — just pay via UPI and you're back in.
    </p>
    ${paymentInfoHtml(data.plan, data.cycle, PLANS[data.plan][data.cycle])}
    ${ctaButton("Reactivate your subscription", `${APP_URL}/premium`)}
    <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">If this was a mistake, reply to this email and we'll help.</p>`;
  return layout("Cancellation scheduled", body);
}

export function renewalDueHtml(data: {
  name: string;
  plan: PlanId;
  cycle: Cycle;
  amount: number;
  periodEnd: string;
  daysLeft: number;
}): string {
  const label = formatPlanLabel(data.plan, data.cycle);
  const body = `
    <h2 style="margin:0 0 8px;color:#111827;">Your ${PLANS[data.plan].name} subscription renews in ${data.daysLeft} day${data.daysLeft === 1 ? "" : "s"} ⏳</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6;">
      Hi ${data.name}, your <strong>${label}</strong> access ends on <strong>${formatIST(data.periodEnd)} IST</strong>.
      Renew for <strong>₹${data.amount}</strong> and keep your career copilot working without a gap.
    </p>
    ${planFeaturesBoxHtml(data.plan, label)}
    ${paymentInfoHtml(data.plan, data.cycle, data.amount)}
    ${ctaButton("Renew now — keep your plan", `${APP_URL}/premium`)}
    <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">If you've already renewed, you can ignore this email.</p>`;
  return layout(`Your ${PLANS[data.plan].name} plan renews soon`, body);
}

export function subscriptionExpiredHtml(data: {
  name: string;
  plan: PlanId;
  cycle: Cycle;
}): string {
  const label = formatPlanLabel(data.plan, data.cycle);
  const body = `
    <h2 style="margin:0 0 8px;color:#111827;">Your ${PLANS[data.plan].name} access has ended</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6;">
      Hi ${data.name}, your <strong>${label}</strong> period has ended, so your account returned to the Free plan.
      Your saved data is safe — resumes, practice history and progress are all still there.
    </p>
    <p style="margin:0 0 8px;color:#374151;font-size:13px;">Re-subscribe anytime to continue where you left off:</p>
    ${paymentInfoHtml(data.plan, data.cycle, PLANS[data.plan][data.cycle])}
    ${ctaButton(`Get ${PLANS[data.plan].name} again`, `${APP_URL}/premium`)}
    <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">Thanks for using ${BRAND_NAME} — your dream job is still waiting. 💪</p>`;
  return layout("Subscription ended", body);
}

export function adminPaymentNotificationHtml(data: {
  paymentId: number;
  fullName: string;
  mobile: string;
  upiTransactionId: string;
  amount: number;
  plan: string;
  submittedAt: string;
  userEmail?: string | null;
}): string {
  const body = `
    <div style="display:inline-flex;align-items:center;gap:8px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:8px 14px;">
      <span style="font-size:16px;">🔔</span>
      <span style="color:#92400e;font-weight:600;font-size:13px;">Action Required — Verify &amp; Approve Payment</span>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      ${infoRow("👤 User Name", data.fullName)}
      ${infoRow("📱 Mobile", data.mobile)}
      ${data.userEmail ? infoRow("📧 Email", data.userEmail) : ""}
      ${infoRow("💳 UPI Transaction ID", `<span style="font-family:monospace;">${data.upiTransactionId}</span>`, true)}
      ${infoRow("💰 Amount", `₹${data.amount}`, true)}
      ${infoRow("📦 Plan", planLabel(data.plan))}
      ${infoRow("🕐 Submitted At", `${formatIST(data.submittedAt)} IST`)}
    </table>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center;margin-top:16px;">
      <p style="margin:0 0 4px;color:#374151;font-size:13px;font-weight:600;">Payment ID: #${data.paymentId}</p>
      <p style="margin:0;color:#6b7280;font-size:12px;">Log in to your admin panel to approve or reject this payment.</p>
    </div>`;
  return layout("New Payment Verification Request", body, "Career Boost AI India · Admin Notification System");
}

// ---------------------------------------------------------------
// In-app notification helper (notification center)
// ---------------------------------------------------------------

export async function createNotification(data: {
  userId: number;
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  try {
    await db.insert(notificationsTable).values(data);
  } catch (err) {
    logger.error({ err }, "Failed to create notification");
  }
}

// ---------------------------------------------------------------
// Core send function with preferences check + logging
// ---------------------------------------------------------------

export interface SendEmailInput {
  userId: number | null;
  email: string;
  subject: string;
  template: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ status: string; messageId?: string; skipped?: string }> {
  const client = getResend();

  // Respect user email preferences
  if (input.userId) {
    const [pref] = await db
      .select()
      .from(emailPreferencesTable)
      .where(eq(emailPreferencesTable.userId, input.userId));
    if (pref?.unsubscribed) {
      await db.insert(emailLogsTable).values({
        userId: input.userId,
        email: input.email,
        subject: input.subject,
        template: input.template,
        status: "skipped",
        error: "user unsubscribed",
      });
      return { status: "skipped", skipped: "user unsubscribed" };
    }
    if (pref?.emailNotifications === false) {
      await db.insert(emailLogsTable).values({
        userId: input.userId,
        email: input.email,
        subject: input.subject,
        template: input.template,
        status: "skipped",
        error: "email notifications disabled",
      });
      return { status: "skipped", skipped: "email notifications disabled" };
    }
  }

  if (!client) {
    await db.insert(emailLogsTable).values({
      userId: input.userId,
      email: input.email,
      subject: input.subject,
      template: input.template,
      status: "failed",
      error: "RESEND_API_KEY not set",
    });
    logger.warn("RESEND_API_KEY not set — email skipped and logged");
    return { status: "failed", skipped: "RESEND_API_KEY not set" };
  }

  try {
    const result = await client.emails.send({
      from: EMAIL_FROM,
      to: input.email,
      subject: input.subject,
      html: input.html,
    });
    if (!result.data?.id) {
      throw new Error(result.error?.message ?? "Resend returned no message id");
    }
    await db.insert(emailLogsTable).values({
      userId: input.userId,
      email: input.email,
      subject: input.subject,
      template: input.template,
      status: "sent",
      messageId: result.data.id,
    });
    logger.info({ template: input.template, to: input.email }, "Email sent");
    return { status: "sent", messageId: result.data.id };
  } catch (err: any) {
    await db.insert(emailLogsTable).values({
      userId: input.userId,
      email: input.email,
      subject: input.subject,
      template: input.template,
      status: "failed",
      error: err?.message ?? String(err),
    });
    logger.error({ err, template: input.template, to: input.email }, "Failed to send email");
    return { status: "failed" };
  }
}

// ---------------------------------------------------------------
// High-level user-facing email helpers (fire and forget)
// ---------------------------------------------------------------

export function sendWelcomeEmail(user: { id: number; name: string; email: string }): Promise<{ status: string; messageId?: string; skipped?: string }> {
  return sendEmail({
    userId: user.id,
    email: user.email,
    subject: `Welcome to ${BRAND_NAME}, ${user.name}! 🎉`,
    template: "welcome",
    html: welcomeEmailHtml(user.name),
  });
}

export function sendPaymentReceivedEmail(
  user: { id: number; name: string; email: string },
  data: { amount: number; plan: string; upiTransactionId: string; paymentId: number },
): Promise<{ status: string; messageId?: string; skipped?: string }> {
  return sendEmail({
    userId: user.id,
    email: user.email,
    subject: `Payment received — under review 🧾 (₹${data.amount})`,
    template: "payment_received",
    html: paymentReceivedHtml({ fullName: user.name, ...data }),
  });
}

export function sendPaymentApprovedEmail(
  user: { id: number; name: string; email: string },
  data: { amount: number; plan: string; paymentId: number; premiumExpiresAt: string },
): Promise<{ status: string; messageId?: string; skipped?: string }> {
  return sendEmail({
    userId: user.id,
    email: user.email,
    subject: `Payment approved — you're now Pro! 🎉`,
    template: "payment_approved",
    html: paymentApprovedHtml({ fullName: user.name, ...data }),
  });
}

export function sendPaymentRejectedEmail(
  user: { id: number; name: string; email: string },
  data: { amount: number; plan: string; paymentId: string; reason: string },
): Promise<{ status: string; messageId?: string; skipped?: string }> {
  return sendEmail({
    userId: user.id,
    email: user.email,
    subject: `Payment update — could not be verified 😕`,
    template: "payment_rejected",
    html: paymentRejectedHtml({ fullName: user.name, ...data }),
  });
}

export function sendTrialStartedEmail(
  user: { id: number; name: string; email: string },
  data: { plan: PlanId; cycle: Cycle; trialEndsAt: string },
): Promise<{ status: string; messageId?: string; skipped?: string }> {
  return sendEmail({
    userId: user.id,
    email: user.email,
    subject: `Your ${PLANS[data.plan].name} trial is live — ${TRIAL_DAYS} day free! 🚀`,
    template: "trial_started",
    html: trialStartedHtml({ name: user.name, plan: data.plan, cycle: data.cycle, trialEndsAt: data.trialEndsAt, amount: PLANS[data.plan][data.cycle] }),
  });
}

export function sendSubscriptionCanceledEmail(
  user: { id: number; name: string; email: string },
  data: { plan: PlanId; cycle: Cycle; accessUntil: string },
): Promise<{ status: string; messageId?: string; skipped?: string }> {
  return sendEmail({
    userId: user.id,
    email: user.email,
    subject: `Your ${PLANS[data.plan].name} subscription is scheduled to end`,
    template: "subscription_canceled",
    html: subscriptionCanceledHtml({ name: user.name, plan: data.plan, cycle: data.cycle, accessUntil: data.accessUntil }),
  });
}

export function sendRenewalDueEmail(
  user: { id: number; name: string; email: string },
  data: { plan: PlanId; cycle: Cycle; amount: number; periodEnd: string; daysLeft: number },
): Promise<{ status: string; messageId?: string; skipped?: string }> {
  return sendEmail({
    userId: user.id,
    email: user.email,
    subject: `⏳ ${PLANS[data.plan].name} renews in ${data.daysLeft} day${data.daysLeft === 1 ? "" : "s"} — keep your plan`,
    template: "renewal_due",
    html: renewalDueHtml({ name: user.name, plan: data.plan, cycle: data.cycle, amount: data.amount, periodEnd: data.periodEnd, daysLeft: data.daysLeft }),
  });
}

export function sendSubscriptionExpiredEmail(
  user: { id: number; name: string; email: string },
  data: { plan: PlanId; cycle: Cycle },
): Promise<{ status: string; messageId?: string; skipped?: string }> {
  return sendEmail({
    userId: user.id,
    email: user.email,
    subject: `Your ${PLANS[data.plan].name} access has ended — rejoin anytime`,
    template: "subscription_expired",
    html: subscriptionExpiredHtml({ name: user.name, plan: data.plan, cycle: data.cycle }),
  });
}

export async function sendPaymentNotification(data: {
  paymentId: number;
  fullName: string;
  mobile: string;
  upiTransactionId: string;
  amount: number;
  plan: string;
  submittedAt: string;
  userEmail?: string | null;
}): Promise<void> {
  const client = getResend();
  if (!client) {
    logger.warn("RESEND_API_KEY not set — skipping admin email notification");
    return;
  }
  try {
    await client.emails.send({
      from: EMAIL_FROM,
      to: ADMIN_EMAIL,
      subject: `💳 New Payment Request — ₹${data.amount} from ${data.fullName} [#${data.paymentId}]`,
      html: adminPaymentNotificationHtml(data),
    });
    await db.insert(emailLogsTable).values({
      userId: null,
      email: ADMIN_EMAIL,
      subject: `💳 New Payment Request — ₹${data.amount} from ${data.fullName} [#${data.paymentId}]`,
      template: "admin_payment_notification",
      status: "sent",
    });
    logger.info({ paymentId: data.paymentId }, "Admin payment notification email sent");
  } catch (err) {
    logger.error({ err, paymentId: data.paymentId }, "Failed to send admin payment notification email");
  }
}
