# Email System

Central implementation: `artifacts/api-server/src/lib/email.ts`.

## Provider
- **Resend** via `RESEND_API_KEY`. If the key is missing the service is
  degraded but never crashes the app.
- `EMAIL_FROM` env overrides the default `Career Boost AI <onboarding@resend.dev>`.
  For real user-facing mail the sending domain must be fully verified in Resend
  (DKIM + MX + SPF). See Deployment notes.

## Core function
```ts
sendEmail({ userId, email, subject, template, html })
```
1. Reads the user's `email_preferences` row — if the user unsubscribed from
   that template type, the email is skipped (`{ status: "skipped" }`).
2. Sends via Resend.
3. Logs every outcome to `email_logs` (to, subject, status, messageId, error).
4. Never throws — failures are logged and returned in the result object.

## Templates
- Welcome (register + Google signup)
- Payment received (user)
- Payment approved (user, includes expiry date)
- Payment rejected (user)
- Admin payment notification (to ADMIN_EMAIL)
- Weekly career report (weekly report module)

## Notifications (in-app)
`createNotification({ userId, type, title, body, link })` writes to
`notifications`. These are displayed in the notification center and paired
with emails so users get both channels.

## Flow wiring
| Event | Where |
|---|---|
| Register | `routes/users.ts` → welcome email + welcome notification + prefs row |
| Google signup | `routes/google.ts` → same |
| Payment submitted | `routes/payments.ts` → user "received" + admin notify |
| Payment approved | `routes/admin.ts` → user approved email + notification |
| Payment rejected | `routes/admin.ts` → user rejected email + notification |
| Weekly report | `routes/weekly_report.ts` → report email |

## Sending a verified-domain requirement
If the domain is not fully verified, Resend returns a 403/422 and the email is
logged with status `failed`; the rest of the app is unaffected.
