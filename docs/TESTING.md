# Testing

The project uses `pnpm run typecheck` at the repo root as the primary gate —
every package (api-server, career-boost, mockup-sandbox) must typecheck clean.

## Commands
```powershell
pnpm run typecheck                        # all packages (repo root)
pnpm run build                            # api-server production build
cd artifacts/api-server && pnpm run build # backend compile check
```

## Manual smoke tests (API)
1. Start the API locally with `DATABASE_URL` set.
2. Register a user, login, and verify `GET /users/me`.
3. Create a resume → run `/resumes/analyze` → check scores.
4. Create a career profile → `GET /career/copilot` returns recommendations.
5. `POST /resume-intelligence/analyze/:id` → verify `resume_analyses` row.
6. Jobs: `GET /jobs`, `POST /applications`, `PATCH /applications/:id`,
   `GET /applications/stats`.
7. Roadmap: `POST /career-roadmap/generate` → mark milestones → progress.
8. Interview coach: create session → evaluate with a transcript → check
   filler words + feedback; without `WHISPER_API_KEY` transcribe returns
   `available: false`.
9. Weekly report: generate → verify content; email send is skipped/logged
   when the sender domain is unverified.
10. Assistant: `POST /assistant/chat` (Premium user) → grounded reply;
    free user → 402.
11. Admin: login → approve a payment → user becomes premium + email logged.
12. Gamification: actions grant XP; `/career/gamification` shows level.

## Checklist before release
- [ ] `pnpm run typecheck` green on all packages
- [ ] api-server production build succeeds
- [ ] All new tables pushed to Neon ("Changes applied")
- [ ] No fake/hardcoded user-facing numbers
- [ ] AI features verified to fall back when AI is down
- [ ] Existing UI untouched (only additive changes)
