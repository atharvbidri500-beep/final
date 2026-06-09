# HirePilot

Your Co-Pilot to Get Hired — India's #1 AI career platform for freshers: ATS resume builder, interview coach, cover letter generator, English improvement tool, and job match analyzer.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/career-boost run dev` — run the frontend (port 24558, proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Framer Motion, Lucide Icons, Wouter (routing), TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Email: Resend (admin payment notifications to shravanibidri28@gmail.com)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)

## Brand

- **Name**: HirePilot
- **Tagline**: Your Co-Pilot to Get Hired
- **Logo**: H letter + upward cyan arrow (SVG, inline in components)
- **Primary color**: #5B5CF6 (violet-indigo)
- **Secondary color**: #8B5CF6 (violet)
- **Accent color**: #06B6D4 (cyan)

## Where things live

- `artifacts/career-boost/` — React frontend
  - `src/pages/` — all pages (home, login, register, dashboard, resume-builder, interview, resume-score, job-match, cover-letter, english-tool, premium, support, admin)
  - `src/components/layout/` — Navbar (with HirePilot SVG logo), BottomNav
  - `src/lib/auth.ts` — JWT token management
- `artifacts/api-server/src/routes/` — Express route handlers (users, resumes, cover_letters, interview, payments, admin, stats)
  - Auth routes: `/api/users/register`, `/api/users/login`, `/api/users/me` (+ `/api/auth/*` aliases)
- `artifacts/api-server/src/lib/email.ts` — Resend email for payment notifications
- `artifacts/api-server/src/lib/jwt.ts` — JWT sign/verify (HMAC-SHA256)
- `artifacts/api-server/src/middlewares/auth.ts` — optionalAuth middleware
- `lib/db/src/schema/` — Drizzle ORM schema (users, resumes, cover_letters, interview_sessions, payments, supporters, qr_codes)

## Architecture decisions

- **JWT auth**: HMAC-SHA256 JWT stored in localStorage. `optionalAuth` middleware attaches `req.userId` when token is valid. Admin uses separate admin token with `role: "admin"` claim.
- **Auth route aliases**: Primary routes are `/api/users/register|login|me`. Aliases `/api/auth/register|login|me` also exist for backward compatibility.
- **QR-based payments**: Users scan UPI QR, pay, submit transaction ID. Admin reviews in panel and manually approves → user gets Pro status.
- **Email notifications**: Resend sends rich HTML email to admin on every payment submission.
- **No Stripe/Razorpay**: Intentionally manual UPI-based payment flow for India market.
- **Rule-based AI**: Resume scoring, interview feedback, English improvement, and job matching are rule-based algorithms (no external AI API needed).
- **Mobile-first**: Bottom navigation for mobile, top navbar for desktop.

## Product

- **Home page** — Hero, animated stats, feature grid, 6 testimonials, pricing (₹99/month, ₹499/year), FAQ
- **Resume Builder** — 3-step wizard (basic info, education, skills/work), ATS score, download as .txt
- **Interview Coach** — HR, Software, Freshers, Banking, Sales, Customer Support categories, answer evaluation
- **Resume Score** — Paste resume text, get ATS/skills/formatting scores, improvement suggestions
- **Job Match AI** — Compare resume vs job description, see matched/missing skills
- **Cover Letter** — Generate professional cover letters for any company
- **English Tool** — Improve professional English for emails, resumes, interview answers
- **Premium/Pricing** — UPI QR payment (₹99/month or ₹499/year), plan selection, transaction ID submission
- **Support** — Donation via UPI QR
- **Admin Panel** — Login (admin/careerboost@admin2024), stats, user list, payment approval, QR code management, notification badges

## User preferences

- Target users: Indian students, freshers, engineering/BCA/BBA graduates, 0-5 years experience
- Visual style: minimal/modern startup, Framer Motion, Lucide icons, violet/cyan palette (#5B5CF6, #8B5CF6, #06B6D4), mobile-first
- No credit card — UPI QR payments only
- Admin credentials: username `admin`, password `careerboost@admin2024`
- Admin email notifications: shravanibidri28@gmail.com

## Gotchas

- Admin env vars `ADMIN_USERNAME` and `ADMIN_PASSWORD` override defaults (default: admin / careerboost@admin2024)
- QR codes are stored in the database — admin must upload via admin panel (QR Codes tab)
- `optionalAuth` is applied globally; routes check `req.userId` themselves for protected endpoints
- DB schema push needed after any schema changes: `pnpm --filter @workspace/db run push`
- Mobile validation: 10 digits, starts with 6-9 (Indian numbers)
- Email validation: standard format check on both frontend and backend

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
