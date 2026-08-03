# Security

## Authentication & sessions
- Passwords: bcrypt-hashed, never stored in plaintext.
- Sessions: signed JWTs (`SESSION_SECRET` env) with 30-day expiry; verified on
  every request via `optionalAuth`.
- Admin: separate credentials from env; per-route `adminAuth` checks; admin
  JWT carries `role: "admin"`.
- Rate limiting on login/register/Google auth (brute-force protection).

## Data protection
- All queries use parameterized SQL (`$1` placeholders via `pool.query`) —
  no string interpolation into SQL.
- Drizzle queries are typed and parameterized by construction.
- User-scoped endpoints always verify `row.userId === userId` before
  returning or mutating data (defense in depth against IDOR).
- Public portfolio pages only expose explicitly public fields.

## Secrets handling
- No secrets in source code. All keys via env: `DATABASE_URL`,
  `RESEND_API_KEY`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`,
  `GOOGLE_CLIENT_ID/SECRET`, `WHISPER_API_KEY`/`OPENAI_API_KEY`.
- Logs never include passwords, tokens, or full API keys.
- `email_logs` stores only message metadata, not credentials.

## AI safety
- AI prompts embed truncated user data only (`.slice(0, N)` limits).
- AI JSON output is validated with `safeParseJSON`; malformed output falls
  back to deterministic rules — AI can never inject SQL or break flows.
- Prompt injection risk is mitigated by instructing strict JSON-only output
  and truncating inputs; the assistant never executes actions.

## Transport & CORS
- Production runs HTTPS (Render default).
- JWT sent only via `Authorization` header over HTTPS.
- CORS is configured for the frontend origin only.

## Do not
- Never commit `.env` files or API keys.
- Never log request bodies from auth endpoints.
- Never disable auth middleware to "test faster" in production.
