# Deployment

Current production host: **Render** (`career-boost-1x9r.onrender.com`).

## Components
1. **Web service** — runs the compiled Express API
   (`artifacts/api-server`, `pnpm run build` then start).
2. **Frontend** — built by `artifacts/career-boost` (`pnpm run build`) and
   served by Express via `FRONTEND_DIST` (or mounted static folder).
3. **Database** — Neon PostgreSQL (serverless). Connection string in
   `DATABASE_URL`.
4. **Emails** — Resend (`RESEND_API_KEY` set on Render).

## Environment variables to set on Render
| Variable | Value notes |
|---|---|
| `DATABASE_URL` | Neon connection string with `sslmode=require` |
| `SESSION_SECRET` | Long random string |
| `RESEND_API_KEY` | Resend API key (already set) |
| `EMAIL_FROM` | Verified sender domain when available |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin login |
| `NODE_ENV` | `production` |

## Deploying schema changes
From `lib/db`:
```powershell
$env:DATABASE_URL="postgresql://<neon-url>"
pnpm run push
```
Confirm "Changes applied" — the API works with the new tables immediately.

## Deploying code
1. `pnpm run typecheck` (repo root) — must pass.
2. `pnpm run build` in `artifacts/api-server`.
3. Build frontend in `artifacts/career-boost`.
4. Push to the branch and let Render auto-deploy (or manual deploy).

## Sending real user emails (pending)
Resend currently has no fully verified sender domain:
- The free DuckDNS subdomain (`hire-pilot.duckdns.org`) passed DKIM but
  cannot host MX/SPF records (DuckDNS free tier limitation), so Resend
  refuses to send from it.
- **Fix**: register the domain on dynu.com (or another DNS provider that
  supports TXT + MX) and add the Resend verification records, then set
  `EMAIL_FROM` accordingly. Until then the email system logs sends and
  reports `failed` — the app keeps working.

## Rollback
- DB: `drizzle-kit push` applies forward only; keep the prior schema snapshot
  to restore manually if needed.
- Code: revert the commit; Render redeploys the previous build.
