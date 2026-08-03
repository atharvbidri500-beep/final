# Career Score

Implementation: `artifacts/api-server/src/lib/careerScore.ts`

## Formula (0–100)
| Component | Weight | Source |
|---|---|---|
| Profile | 15% | Account completeness (name, email, mobile, city) |
| Resume | 25% | Average ATS score of saved resumes |
| Interview | 20% | Average comm+confidence of recent sessions |
| Application | 15% | Pipeline progress (saved 0.2 → applied 0.4 → interview 0.7 → offer 1.0) |
| Skill | 15% | Skills tracked with proficiency |
| Engagement | 10% | Weekly activity consistency |

`careerScore = Σ component × weight`, rounded.

## Levels
| Score | Label |
|---|---|
| ≥ 85 | Excellent |
| ≥ 70 | Strong |
| ≥ 55 | Progressing |
| ≥ 40 | Building |
| < 40 | Getting Started |

## Helpers
- `getWeeklyActivity(userId)` — 7-day engagement counts (for sparklines).
- `getTodayTasks(userId)` — today's task list.
- `getUpcomingInterviews(userId)` — future interview sessions.
- `getCareerSnapshotMetrics(userId)` — snapshot numbers for `/career/analytics`.

## Where it's used
- `/career/score` — breakdown endpoint
- `/career/analytics` — consolidated dashboard
- `/career/copilot` — dashboard headline + level badge
- `/assistant/chat` + `/assistant/context` — AI assistant grounding
- `/weekly-report/generate` — weekly narrative

Scores are always recomputed from live data — nothing is cached or hardcoded.
