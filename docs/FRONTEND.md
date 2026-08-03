# Frontend Guide

Frontend lives in `artifacts/career-boost` (React + Vite). The mockup sandbox
(`artifacts/mockup-sandbox`) holds design experiments.

## Working rules (critical)
1. **Never modify or restructure existing pages/components/UI** unless the
   change is explicitly requested. Existing UI is treated as frozen.
2. New features are added as **new pages/routes/components** only.
3. Keep the existing design system, styling approach and conventions of the
   page you extend (match class names, spacing, palette).
4. All user-facing data comes from the API — no hardcoded fake numbers.
5. Premium 402 responses should redirect the user to the upgrade page.

## API access pattern
- API base URL is configured in the frontend environment (same-origin in
  production via the Express static server).
- Auth token: store JWT in localStorage; send as `Authorization: Bearer`.
- Shared zod schemas live in `lib/api-zod`.

## New module pages to add (matching the premium modules)
- Career Copilot dashboard
- Resume Intelligence (scan, versions, compare)
- Job Match + Application CRM
- Resume Tailoring
- Interview Coach (text-based with honest voice fallback)
- Career Analytics
- Career Roadmap
- Portfolio Builder + public page
- LinkedIn Optimizer
- Salary Negotiation
- Weekly Report
- AI Assistant chat
- Gamification/XP profile section

## Build & preview
```bash
cd artifacts/career-boost
pnpm dev          # dev server
pnpm run build    # production build served by the API
```

## Quality bar
- Run `pnpm run typecheck` from the repo root before finishing any change.
- Every new page must handle loading, empty states and API errors.
