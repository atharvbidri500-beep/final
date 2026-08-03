# Premium Modules

All 16 premium features are real, API-first, and stored in Neon. Every AI
endpoint has a deterministic fallback (see AI.md). Free users get HTTP 402
`UPGRADE_REQUIRED` on gated endpoints.

## Module → Router → Key endpoints
| # | Module | Router file | Highlights |
|---|---|---|---|
| 1 | Career Copilot | `routes/career.ts` | `/career/copilot`, profile, goals, tasks, timeline |
| 2 | Resume Intelligence | `routes/resume_intelligence.ts` | ATS scan, versions, restore, compare |
| 3 | Job Matching | `routes/jobs.ts` | `/jobs` with match scoring, salary estimate (Premium) |
| 4 | Application CRM | `routes/jobs.ts` | pipeline, follow-up reminders, stats funnel |
| 5 | Resume Tailoring | `routes/resume_tailoring.ts` | tailor to job description (Premium), history |
| 6 | Interview Coach | `routes/interview_coach.ts` | voice metrics, filler words, feedback, roadmap (Premium) |
| 7 | Career Analytics | `routes/career.ts` | `/career/analytics` consolidated dashboard |
| 8 | Career Roadmap | `routes/career_roadmap.ts` | AI 24-month plan + milestones (generate Premium) |
| 9 | Portfolio Builder | `routes/portfolios.ts` | slug pages, public view (publish Premium) |
| 10 | LinkedIn Optimizer | `routes/linkedin.ts` | headline/about rewrite, content ideas (Premium) |
| 11 | Salary Negotiation | `routes/salary_negotiation.ts` | benchmarks, counter-offer, emails (Premium) |
| 12 | Weekly Career Report | `routes/weekly_report.ts` | data-driven narrative + email (Premium) |
| 13 | Career Memory | `lib/careerMemory.ts` | `recordEvent` + `/career/timeline` |
| 14 | Gamification | `lib/gamification.ts` | XP, levels, streaks, 21 achievements |
| 15 | Premium Dashboard | `routes/career.ts` | `/career/analytics` + `/career/copilot` |
| 16 | AI Assistant | `routes/assistant.ts` | context-aware chat (Premium) |
| 17 | AI Job Intelligence | `routes/job_intelligence.ts` | consent-based continuous job matching (Premium) |

## Gating map
### Premium tier (requires Premium plan — Pro users get HTTP 402)
- AI Job Intelligence: all routes (`/job-intelligence/*`)
- Career Analytics: `GET /career/analytics`
- AI Career Reports: weekly report generate + email
- Advanced Resume Intelligence: resume analyze
- Advanced Interview Analytics: `GET /interview-coach/stats`
- AI Career Copilot: assistant chat

### Pro tier (any paid plan)
- Job salary estimate, job recommendations, resume tailor,
  interview coach sessions/evaluate/transcribe, roadmap generate,
  portfolio publish, LinkedIn optimize + content ideas, salary offer analyze.

Free (always available): job search + applications CRM, roadmap view, portfolio
create/update, LinkedIn profile save, salary history, report history, assistant
context, versions/history, core career CRUD.

## Subscriptions
- Plans: Free (₹0), Pro (₹149/mo, ₹1,499/yr), Premium (₹299/mo, ₹2,999/yr).
- One 3-day free trial per user (`POST /subscriptions/trial`); cancel anytime,
  access continues to the end of the period (`POST /subscriptions/cancel`).
- Manual UPI payments: `POST /payments` (amounts computed server-side),
  verified by admin (`POST /admin/payments/:id/approve`) which activates the
  subscription (`lib/subscriptions.ts` → `activateSubscription`).
- Billing: monthly/yearly, upgrade/downgrade anytime, billing history in
  `GET /subscriptions/me`; renewal date + status shown on the pricing page.
- Source of truth: `subscriptions` table; `users.plan/is_premium/premium_expires_at`
  are a cache synced by `syncUserAccess`.

## AI Job Intelligence
- **Consent:** each user opts in via `GET/POST /job-intelligence/consent`;
  nothing is logged or computed until consent is enabled (403 `CONSENT_REQUIRED`).
- **Continuous analysis:** profile built from resumes, skills, certifications,
  portfolios, interview sessions + analytics, roadmaps, gamification, career
  events, and activity logs — derived skills carry confidence + source evidence.
- **Fresh jobs daily:** Adzuna + Jooble (India, keyed), Jobicy + Remotive
  (remote, keyless); deduped by external ID / title+company+location; seeded
  catalog (~60 in-app jobs) when empty.
- **Multi-factor scoring:** 10 factors (skills, interview readiness, experience,
  evidence, certifications, salary, location/remote, company, career-goal
  alignment, learning progress) → score 5–99 + competitiveness tier.
- **Explanations:** matched/missing skills, reasons, improvements, and feedback
  buttons on every recommendation; refreshed automatically as the user practices.

## Honest states
- Audio transcription without `WHISPER_API_KEY` returns `available: false`.
- AI failures fall back to rules and are labeled `rule-based` where relevant.
- Salary estimates always carry a market-data disclaimer.
