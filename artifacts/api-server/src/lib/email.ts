import { Resend } from "resend";
import { logger } from "./logger.js";

const ADMIN_EMAIL = "shravanibidri28@gmail.com";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export interface PaymentNotificationData {
  paymentId: number;
  fullName: string;
  mobile: string;
  upiTransactionId: string;
  amount: number;
  plan: string;
  submittedAt: string;
  userEmail?: string | null;
}

export async function sendPaymentNotification(data: PaymentNotificationData): Promise<void> {
  const client = getResend();
  if (!client) {
    logger.warn("RESEND_API_KEY not set — skipping email notification");
    return;
  }

  const planLabel = data.plan === "yearly" ? "Pro Yearly (₹999)" : "Pro Monthly (₹149)";
  const submittedTime = new Date(data.submittedAt).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:28px 32px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">⚡</div>
        <div>
          <div style="color:#fff;font-size:18px;font-weight:700;">Career Boost AI</div>
          <div style="color:rgba(255,255,255,0.75);font-size:13px;">New Payment Verification Request</div>
        </div>
      </div>
    </div>

    <!-- Alert badge -->
    <div style="padding:20px 32px 0;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:8px 14px;">
        <span style="font-size:16px;">🔔</span>
        <span style="color:#92400e;font-weight:600;font-size:13px;">Action Required — Verify &amp; Approve Payment</span>
      </div>
    </div>

    <!-- Details -->
    <div style="padding:24px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;width:45%;">👤 User Name</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:600;color:#111827;font-size:14px;">${data.fullName}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;">📱 Mobile</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:600;color:#111827;font-size:14px;">${data.mobile}</td>
        </tr>
        ${data.userEmail ? `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;">📧 Email</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:600;color:#111827;font-size:14px;">${data.userEmail}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;">💳 UPI Transaction ID</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:600;color:#6366f1;font-size:14px;font-family:monospace;">${data.upiTransactionId}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;">💰 Amount</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:700;color:#059669;font-size:16px;">₹${data.amount}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;">📦 Plan</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:600;color:#111827;font-size:14px;">${planLabel}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#6b7280;font-size:13px;">🕐 Submitted At</td>
          <td style="padding:10px 0;font-weight:600;color:#111827;font-size:14px;">${submittedTime} IST</td>
        </tr>
      </table>
    </div>

    <!-- Action -->
    <div style="padding:0 32px 28px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;color:#374151;font-size:13px;font-weight:600;">Payment ID: #${data.paymentId}</p>
        <p style="margin:0;color:#6b7280;font-size:12px;">Log in to your admin panel to approve or reject this payment.</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #f0f0f0;padding:16px 32px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Career Boost AI India · Admin Notification System</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await client.emails.send({
      from: "Career Boost AI <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      subject: `💳 New Payment Request — ₹${data.amount} from ${data.fullName} [#${data.paymentId}]`,
      html,
    });
    logger.info({ paymentId: data.paymentId }, "Payment notification email sent");
  } catch (err) {
    logger.error({ err, paymentId: data.paymentId }, "Failed to send payment notification email");
  }
}
