# API Reference

Base URL: `https://<your-host>/api` (local dev: `http://localhost:<port>/api`)

Auth: `Authorization: Bearer <JWT>` (except public endpoints).

## Core
| Method | Path | Description |
|---|---|---|
| GET | `/healthz` | Health check |
| POST | `/users/register` | Register (also `/auth/register`) |
| POST | `/users/login` | Login (also `/auth/login`) |
| GET | `/users/me` | Current user profile |
| GET | `/users/me/dashboard` | Dashboard payload |
| GET | `/stats/public` | Public site stats |

## Resumes & cover letters
| Method | Path | Description |
|---|---|---|
| GET/POST | `/resumes` | List / create resumes |
| GET/PATCH/DELETE | `/resumes/:id` | Read / update / delete |
| POST | `/resumes/analyze` | ATS analysis |
| POST | `/resumes/job-match` | Job match score |
| GET | `/resumes/:id/score` | Resume score |
| GET/POST | `/cover-letters` | Cover letter CRUD |

## Interview (basic)
| Method | Path | Description |
|---|---|---|
| GET/POST | `/interview/sessions` | List / start sessions |
| POST | `/interview/question` | Next practice question |
| POST | `/interview/answer` | Evaluate an answer |
| POST | `/interview/improve-english` | Improve English fluency |

## Payments & subscriptions
| Method | Path | Description |
|---|---|---|
| GET/POST | `/payments` | Billing history / submit UPI verification (`plan`: `pro`/`premium`, `cycle`: `monthly`/`yearly`; amount computed server-side) |
| GET | `/payments/qr` | Payment QR |
| GET | `/subscriptions/plans` | Public price config (Pro ₹149/₹1,499, Premium ₹299/₹2,999, 3-day trial) |
| GET | `/subscriptions/me` | Current plan, status, renewal date, billing history |
| POST | `/subscriptions/trial` | Activate one-time 3-day free trial (`{ plan }`) — 402 `TRIAL_USED` after first use |
| POST | `/subscriptions/cancel` | Cancel at period end; access continues until then |
| POST | `/admin/login` | Admin login |
| GET | `/admin/users` `/admin/payments` `/admin/stats` `/admin/premium` | Admin views |
| POST | `/admin/payments/:id/approve` `/admin/payments/:id/reject` | Verify payments (approve activates the subscription) |
| GET | `/admin/email-logs` | Email log |
| POST | `/admin/users/:id/upgrade` | Grant a plan (`tier`: `pro`/`premium`, `cycle`) |

## Notifications & email prefs
| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | In-app notifications |
| GET | `/notifications/unread-count` | Unread count |
| POST | `/notifications/read` | Mark read |
| GET/PUT | `/users/email-preferences` | Email opt-in/out |

## Career foundation
| Method | Path | Description |
|---|---|---|
| GET/PUT | `/career/profile` | Career profile |
| CRUD | `/career/goals` `/career/skills` `/career/certifications` `/career/tasks` | CRUD endpoints |
| GET | `/career/gamification` | Level, XP, achievements |
| GET | `/career/score` | Career score breakdown |
| GET | `/career/analytics` | Consolidated analytics |
| GET | `/career/timeline` | Career memory timeline |
| GET | `/career/copilot` | Copilot dashboard (recommendations) |

## Premium modules
| Method | Path | Gate |
|---|---|---|
| POST | `/resume-intelligence/analyze/:id` | **Premium tier** |
| GET/POST | `/resume-intelligence/:id/history`, `/:id/version`, `/:id/versions`, `/:id/restore/:versionId`, `/compare` | — |
| GET | `/jobs` `/jobs/:id` | — |
| POST | `/jobs/salary-estimate` | Pro tier |
| GET | `/jobs/recommendations` | Pro tier |
| CRUD | `/applications`, `/applications/save-job`, `/applications/:id`, `/applications/stats` | — |
| POST | `/resume-tailoring/tailor/:id` | Pro tier |
| GET | `/resume-tailoring/history`, `/history/:id` | — |
| POST | `/interview-coach/sessions`, `/sessions/:id/evaluate`, `/sessions/:id/transcribe` | Pro tier |
| GET | `/interview-coach/sessions`, `/sessions/:id` | — |
| GET | `/interview-coach/stats` | **Premium tier** |
| GET/POST | `/career-roadmap`, `/career-roadmap/generate` | generate Pro tier |
| PATCH | `/career-roadmap/:id/milestones` | — |
| CRUD | `/portfolio`, `/portfolio/publish` | publish Pro tier |
| GET | `/portfolio/:slug` | Public |
| PUT | `/linkedin` | — |
| POST | `/linkedin/optimize`, `/linkedin/content-ideas` | Pro tier |
| POST | `/salary-offers/analyze` | Pro tier |
| GET/PATCH | `/salary-offers`, `/salary-offers/:id` | — |
| POST | `/weekly-report/generate`, `/weekly-report/send-email` | **Premium tier** |
| GET | `/weekly-report` | — |
| GET | `/assistant/context` | — |
| POST | `/assistant/chat` | **Premium tier** |
| GET | `/career/analytics` | **Premium tier** |
| GET | `/career/score` | — |

Gates: **Pro tier** = any paid plan; **Premium tier** = Premium plan only.
Free users get `402 UPGRADE_REQUIRED`; Pro users get `402 UPGRADE_REQUIRED`
with `premium: true` on Premium-tier routes.

## AI Job Intelligence
All routes require Premium (`402 UPGRADE_REQUIRED` otherwise) and consent (middleware returns `403 CONSENT_REQUIRED` when off).

| Method | Path | Description |
|---|---|---|
| GET/POST | `/job-intelligence/consent` | Read / enable (or revoke) AI data consent |
| POST | `/job-intelligence/activity` | Log user activity event (validated `eventType`) |
| GET | `/job-intelligence/profile` | Latest computed intelligence profile (24h stale flag) |
| POST | `/job-intelligence/refresh` | Recompute profile + recommendations (seeds jobs when empty, async source fetch throttled 6h) |
| GET | `/job-intelligence/recommendations` | Top 25 scored recommendations |
| GET | `/job-intelligence/recommendations/:id` | Full detail: breakdown, reasons, improvements |
| POST | `/job-intelligence/recommendations/:id/feedback` | Mark recommendation helpful/not |
| GET | `/job-intelligence/sources` | Configured job sources |

## Error codes
- `400` — invalid input
- `401` — not logged in
- `402` — `UPGRADE_REQUIRED` (premium feature on free plan; `premium: true` when the Pro plan isn't enough)
- `402` — `TRIAL_USED` (free trial already claimed)
- `403` — `CONSENT_REQUIRED` (AI job intelligence consent disabled)
- `404` — resource not found
- `429` — rate limited
- `500` — server error (details logged server-side only)
