# Authentication

## How it works
- Password auth: `POST /users/register` and `POST /users/login` (aliases:
  `/auth/register`, `/auth/login`).
- Google OAuth: `GET /auth/google` → redirect → `GET /auth/google/callback`.
- On success the server returns a signed JWT (`SESSION_SECRET`) valid 30 days.
- The frontend stores the token and sends `Authorization: Bearer <token>`.

## Middleware
`src/middlewares/auth.ts` exports:
- `optionalAuth` — attaches `req.userId` when a valid token exists; public
  routes can act on logged-in state but never require it.
- `requireAuth` (used internally where needed) — 401 when no valid user.

Every router in `src/routes/index.ts` runs under `optionalAuth`; handlers that
need a user check `if (!userId) { res.status(401)... }` themselves.

## Roles
- **User** — standard account.
- **Premium/Pro user** — `is_premium = true` and `premium_expires_at` in the
  future (or NULL = lifetime). Granted by admin after payment verification.
- **Admin** — separate session from `POST /admin/login` (env
  `ADMIN_USERNAME` / `ADMIN_PASSWORD`), checked per-route via `adminAuth`.

## Rate limiting
Login/register and Google routes are rate limited (see
`src/middlewares/rateLimit.ts`) to prevent brute force.

## Security notes
- Passwords are hashed with bcrypt before storage.
- The JWT contains `id`, `name`, `email`, `role`; verify with `src/lib/jwt.ts`.
- Never log tokens or passwords. Tokens are only sent over HTTPS.
