# Career Boost AI India

India's #1 AI career platform for freshers — ATS resume builder, interview coach, cover letter generator, English improvement tool, and job match analyzer.

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
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/career-boost/` — React frontend
  - `src/pages/` — all pages (home, login, register, dashboard, resume-builder, interview, resume-score, job-match, cover-letter, english-tool, premium, support, admin)
  - `src/components/layout/` — Navbar, BottomNav
  - `src/lib/auth.ts` — JWT token management
- `artifacts/api-server/src/routes/` — Express route handlers (users, resumes, cover_letters, interview, payments, admin, stats)
- `artifacts/api-server/src/lib/jwt.ts` — JWT sign/verify (HMAC-SHA256)
- `artifacts/api-server/src/middlewares/auth.ts` — optionalAuth middleware
- `lib/db/src/schema/` — Drizzle ORM schema (users, resumes, cover_letters, interview_sessions, payments, supporters, qr_codes)
- `lib/api-spec/openapi.yaml` — OpenAPI 3 spec (source of truth for API contract)
- `lib/api-client-react/` — Generated React Query hooks + Zod schemas

## Architecture decisions

- **JWT auth**: HMAC-SHA256 JWT stored in localStorage. `optionalAuth` middleware attaches `req.userId` when token is valid. Admin uses separate admin token with `role: "admin"` claim.
- **QR-based payments**: Users scan UPI QR, pay, submit transaction ID. Admin reviews in panel and manually approves → user gets Pro status.
- **No Stripe/Razorpay**: Intentionally manual UPI-based payment flow for India market. Admin verifies via admin panel.
- **Rule-based AI**: Resume scoring, interview feedback, English improvement, and job matching are rule-based algorithms (no external AI API needed).
- **Mobile-first**: Bottom navigation for mobile, top navbar for desktop.

## Product

- **Home page** — Hero, animated stats, feature grid, testimonials, pricing, FAQ
- **Resume Builder** — 3-step wizard (basic info, education, skills/work), ATS score, download as .txt
- **Interview Coach** — HR, Software, Freshers, Banking, Sales, Customer Support categories, answer evaluation with scores
- **Resume Score** — Paste resume text, get ATS/skills/formatting scores, improvement suggestions
- **Job Match AI** — Compare resume vs job description, see matched/missing skills
- **Cover Letter** — Generate professional cover letters for any company
- **English Tool** — Improve professional English for emails, resumes, interview answers
- **Premium/Pricing** — UPI QR payment, plan selection, transaction ID submission
- **Support** — Donation via UPI QR
- **Admin Panel** — Login (admin/careerboost@admin2024), stats, user list, payment approval, QR code management

## User preferences

- Target users: Indian students, freshers, engineering/BCA/BBA graduates, 0-5 years experience
- Visual style: glassmorphism, Framer Motion, Lucide icons, indigo/cyan/gold gradient palette, mobile-first
- No credit card — UPI QR payments only
- Admin credentials: username `admin`, password `careerboost@admin2024`

## Gotchas

- Admin env vars `ADMIN_USERNAME` and `ADMIN_PASSWORD` override defaults (default: admin / careerboost@admin2024)
- QR codes are stored in the database — admin must upload via admin panel (Settings → QR Codes tab)
- `optionalAuth` is applied globally; routes check `req.userId` themselves for protected endpoints
- DB schema push needed after any schema changes: `pnpm --filter @workspace/db run push`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
