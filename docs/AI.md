# AI Integration

## Provider
- **Pollinations AI** — free, keyless text generation
  (`https://text.pollinations.ai/openai`).
- Interface: `askAI(messages, jsonMode?, timeoutMs?)` in `src/lib/ai.ts`.
- JSON parsing: `safeParseJSON<T>(raw, fallback)` — never trusts raw output.

## Hard rule: AI output is never the only path
Every AI feature has a **deterministic rule-based fallback** so the product
works 100% offline/AI-down, and the user always receives honest data:

| Feature | AI | Fallback |
|---|---|---|
| Resume analysis | Deep recruiter/ATS scan | Keyword + health + readability scoring |
| Resume tailoring | Full rewrite | Keyword mapping + suggested additions |
| Interview coach feedback | Communication analysis | Filler-word + speed + length scoring |
| Interview questions | Fresh generated | Curated per-category bank |
| Job salary estimate | Market estimate | Skill benchmark table (INR bands) |
| Career roadmap | 24-month plan | Role-based milestone phases |
| LinkedIn optimize | Headline/about rewrite | Formula headline + summary |
| LinkedIn content ideas | 5 niche posts | Standard posting templates |
| Salary negotiation | Strategy + emails | Range-based strategy + email templates |
| Weekly report | Narrative summary | Data-grounded summary text |
| Assistant chat | Context-aware reply | Keyword intent + real user data |
| Job Intelligence insight | Coaching narrative (30s) | Evidence-based summary template |

## Job Intelligence scoring
- `scoreJob` is a deterministic 10-factor engine (skills 30, interview readiness
  10, experience 10, evidence 8, certifications 5, salary fit 10, location 8,
  company fit 5, career-goal alignment 8, learning progress 6) — no keyword-only
  matching; each factor explains itself in `breakdown`.
- `explain` turns the score into reasons, improvements, and a competitiveness
  tier (High ≥ 70 / Medium ≥ 55 / Low).

## Speech-to-text
- `transcribeAudio()` in `routes/interview_coach.ts`.
- Only works when `WHISPER_API_KEY` (or `OPENAI_API_KEY`) is set; otherwise the
  API returns `{ available: false, reason }` and the UI falls back to typed
  answers. No fake transcripts are ever returned.

## Prompting conventions
- System prompt demands: "Respond ONLY with valid JSON (no markdown)".
- JSON schema is spelled out in the prompt with explicit types and max counts.
- User data is always truncated (`.slice(0, N)`) before being sent.
- Timeouts (15–25s) prevent hung requests; failures drop to fallback.
