# Admin Guide

Admin panel is served by the Express API (`routes/admin.ts`). Login:
`POST /admin/login` with `ADMIN_USERNAME` / `ADMIN_PASSWORD` env values
(defaults: `admin` / `careerboost@admin2024`).

## Endpoints
| Endpoint | Purpose |
|---|---|
| `GET /admin/users` | All users + premium status |
| `POST /admin/users/:id/upgrade` | Grant premium (plan, months) |
| `POST /admin/users/:id/revoke-premium` | Revoke premium |
| `DELETE /admin/users/:id` | Delete user |
| `GET /admin/payments` | Payment verification queue |
| `GET /admin/payments/pending-count` | Pending count badge |
| `POST /admin/payments/:id/approve` | Approve → user email + notification + premium grant |
| `POST /admin/payments/:id/reject` | Reject → user email + notification |
| `GET /admin/qr` / `PUT /admin/qr` | Payment QR content |
| `GET /admin/supporters` / `DELETE /admin/supporters/:id` | Supporters |
| `GET /admin/email-logs` | All sent emails with status |
| `GET /admin/stats` | Platform KPIs (users, revenue, growth) |
| `GET /admin/premium` | Premium module usage counts + recent roadmaps/offers/portfolios |

## Approval flow (manual, human-verified)
1. User submits payment proof via `POST /payments` (payment + plan).
2. Admin reviews in `/admin/payments`.
3. Approve → user gets "payment approved" email with expiry date, premium
   flag set with `premium_expires_at`.
4. Reject → user gets a rejection email and can resubmit.

## Notes
- Admin auth is checked per-route; the admin JWT is a normal signed token with
  `role: "admin"`.
- Never grant premium without verifying the payment screenshot — that is the
  entire point of the manual flow.
