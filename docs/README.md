# Hire Pilot / Career Boost — README

Hire Pilot is a premium AI career platform that helps users build resumes, practice interviews, match with jobs, track applications, and grow their career — all in one place.

## Stack
- **Backend**: Node.js + Express + TypeScript (`artifacts/api-server`)
- **Database**: PostgreSQL on Neon, managed via Drizzle ORM (`lib/db`)
- **Frontend**: React + Vite SPA (`artifacts/career-boost`)
- **AI**: Pollinations AI (free, keyless) for all AI text features, with deterministic rule-based fallbacks so nothing is ever faked
- **Email**: Resend API with in-app notification center
- **Deploy**: Render (backend), frontend served as static build

## Workspace layout
- `lib/db` — Drizzle schema + migrations (push)
- `lib/api-zod` — shared API validation schemas
- `artifacts/api-server` — Express REST API
- `artifacts/career-boost` — user-facing React app
- `artifacts/mockup-sandbox` — design mockups

## Common commands
From repo root `E:\my project\Hire-pilot\Hire-pilot`:

```bash
pnpm install          # install all workspace deps
pnpm run typecheck    # typecheck every package
```

DB schema push (from `lib/db`):
```powershell
$env:DATABASE_URL="postgresql://..."
pnpm run push
```

Build backend:
```bash
cd artifacts/api-server && pnpm run build
```

## Environment variables
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `SESSION_SECRET` | JWT signing secret |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | From address for emails |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin panel login |
| `WHISPER_API_KEY` / `OPENAI_API_KEY` | Optional: audio transcription |

## Docs index
1. [Architecture](ARCHITECTURE.md)
2. [API Reference](API.md)
3. [Database Schema](DATABASE.md)
4. [Authentication](AUTHENTICATION.md)
5. [Email System](EMAIL.md)
6. [AI Integration](AI.md)
7. [Gamification](GAMIFICATION.md)
8. [Career Score](CAREER_SCORE.md)
9. [Premium Modules](PREMIUM_MODULES.md)
10. [Admin Guide](ADMIN.md)
11. [Frontend Guide](FRONTEND.md)
12. [Deployment](DEPLOYMENT.md)
13. [Testing](TESTING.md)
14. [Security](SECURITY.md)
15. [Roadmap & Contribute](ROADMAP.md)
