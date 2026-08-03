# Roadmap & Contribution

## Status: all 17 premium modules implemented (backend)
Completed: Career Copilot, Resume Intelligence, Job Matching, Application CRM,
Resume Tailoring, Interview Coach, Career Analytics, Career Roadmap, Portfolio
Builder, LinkedIn Optimizer, Salary Negotiation, Weekly Career Report, Career
Memory, Gamification, Premium Dashboard, AI Assistant, AI Job Intelligence —
all with real database storage, AI + rule fallbacks, and premium gating.

## Remaining work
1. **Frontend pages** for the premium modules (new pages only — existing UI
   stays untouched). Priority order:
   Copilot dashboard → Resume Intelligence → Job Match/CRM → Tailoring →
   Interview Coach → Analytics → Roadmap → Portfolio → LinkedIn → Salary →
   Weekly Report → Assistant chat → Gamification profile.
2. **Verified sender domain** for real user emails (dynu.com or equivalent;
   DuckDNS cannot host MX records for Resend verification).
3. Optional: `WHISPER_API_KEY` to enable voice answer transcription.
4. Optional: seed data for the jobs catalog + weekly report email scheduling.

## Contribution guidelines
- Match existing conventions (see ARCHITECTURE.md, FRONTEND.md).
- Never fake functionality: data must come from the API/database.
- Every AI feature must keep a deterministic fallback.
- Run `pnpm run typecheck` from the repo root before finishing work.
- Schema changes must be pushed to Neon and confirmed.

## Ideas beyond v1
- Job catalog ingestion from live sources
- AI cover letter per job description
- Interview scheduling reminders
- Team/community features
- Localization (Hindi + more)
