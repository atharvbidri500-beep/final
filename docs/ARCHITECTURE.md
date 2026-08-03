# Architecture

## High-level flow
```
Browser (React SPA)  ──HTTPS──▶  Express API (api-server)
                                       │
                                       ├── Drizzle ORM ──▶ Neon PostgreSQL
                                       ├── Resend API (email)
                                       ├── Pollinations AI (free AI text)
                                       └── Render (hosting)
```

## Monorepo packages
- **`lib/db`** — the single source of truth for the database schema. All tables are
  declared in `src/schema/*.ts` and exported from `src/schema/index.ts`. Schema
  changes are applied to Neon with `drizzle-kit push`.
- **`lib/api-zod`** — shared zod schemas used by both API and frontend.
- **`artifacts/api-server`** — Express application. `src/app.ts` boots the server,
  `src/routes/index.ts` mounts every router under the `optionalAuth` middleware.
- **`artifacts/career-boost`** — React SPA consuming the API.

## Request lifecycle
1. `optionalAuth` middleware in `src/middlewares/auth.ts` reads the JWT from
   `Authorization: Bearer <token>` and attaches `req.userId` when valid.
2. Routers declare endpoints; each handler is a self-contained async function.
3. Responses are JSON. Errors: `400` bad input, `401` unauthorized, `402`
   `UPGRADE_REQUIRED` for premium-gated features, `404` missing resources.
4. Raw SQL goes through `pool.query` (from `@workspace/db`), structured queries
   use the drizzle `db` instance.

## Feature wiring
- **Premium gating**: `src/lib/gating.ts` exports `requirePremium` middleware.
  Routes that are Premium-only attach it; free users receive HTTP 402.
- **Gamification**: every meaningful action calls `awardXP(userId, xp, reason)`
  and `recordEvent(userId, type, description)` fire-and-forget — these never
  block the main response.
- **Emails**: `src/lib/email.ts` centralizes templates, preference checks,
  and logging to `email_logs`.

## Design rules
- AI output is never trusted: every AI feature validates JSON with
  `safeParseJSON` and falls back to deterministic rule logic.
- No fake functionality: if a capability needs a key (e.g. Whisper
  transcription), the API reports `available: false` honestly.
