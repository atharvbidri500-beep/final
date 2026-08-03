# Database Schema

All tables are defined in `lib/db/src/schema/*.ts` with Drizzle ORM and applied
to Neon PostgreSQL with `drizzle-kit push`.

## Users & payments
- `users` — account, `is_premium`, `premium_expires_at`, English counter
- `payments` — payment verifications, `status` pending/approved/rejected
- `supporters` — one-time supporter records
- `qr_codes` — payment QR content

## Core content
- `resumes` — structured resume fields + `generated_content`, `ats_score`
- `cover_letters` — user cover letters
- `interview_sessions` — basic sessions, running comm/confidence averages

## Email & notifications
- `email_logs` — every sent email (to, subject, status, message_id)
- `email_preferences` — per-user opt-in/out (default: all on)
- `notifications` — in-app notification center

## Career foundation
- `career_profiles` — dream role, target salary/company, years of experience
- `career_goals` — goal tracking with status
- `skills` — skill name, proficiency, category
- `certifications` — certificate entries
- `career_events` — (reserved, used via `career_events` memory rows)
- `career_tasks` — today/upcoming tasks
- `career_snapshots` — snapshots of career metrics over time

## Gamification
- `gamification` — xp, level, daily/weekly streaks, unlocked achievements
- `achievements` — achievement unlock records

## Premium modules
- `jobs` — job catalog with salary range, remote/internship flags, skills
- `job_applications` — application CRM: status pipeline + follow-up reminders
- `resume_versions` — versioned snapshots of resumes
- `resume_analyses` — ATS/quality scan history
- `resume_tailorings` — tailoring sessions (original vs tailored + changes)
- `interview_analytics` — coach sessions: transcript, filler words, speed, feedback, roadmap
- `career_roadmaps` — 24-month plans with milestone phases (jsonb)
- `portfolios` — public portfolio page (unique slug, published flag)
- `linkedin_profiles` — LinkedIn data; `content_ideas` — post idea bank
- `salary_offers` — offer analysis: range, counter-offer, emails
- `weekly_reports` — weekly report content + `sent_via_email`

## AI Job Intelligence (Premium, consent-based)
- `users.ai_job_intel_consent` — boolean opt-in flag on `users`
- `job_intel_profiles` — computed intelligence profile: career score, interview readiness,
  consistency score, learning velocity, derived skills (with confidence + sources),
  strengths/weaknesses, career direction (current role + years), evidence stats, AI insight
- `job_intel_recommendations` — scored job matches (5–99): score, 10-factor breakdown,
  matched/missing skills, reasons, improvements, competitiveness, user feedback
- `user_activity_logs` — raw activity events (job views/saves/applies, practice, etc.);
  only written when consent is enabled
- `jobs` also carries `external_id` + `source_url` for jobs fetched from Adzuna/Jooble/Jobicy/Remotive

## Conventions
- JSON payloads are `jsonb` columns typed with Drizzle `$type<T>()`
- `created_at` / `updated_at` timestamps everywhere; `updated_at` auto-updates
- Raw SQL in the API uses `pool.query` with parameterized `$1` placeholders
- Foreign keys are logical (integer `user_id`) — no DB-level FK constraints
