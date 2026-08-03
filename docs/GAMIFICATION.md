# Gamification

Implementation: `artifacts/api-server/src/lib/gamification.ts`

## XP table
| Action | XP |
|---|---|
| Daily login | 5 |
| Resume saved / worked | 10 |
| Resume analysis | 15 |
| Resume tailored | 15 |
| Interview session started | 10 |
| Answer evaluated | 20 |
| Career roadmap generated | 20 |
| Milestone completed | 10 |
| Salary offer analyzed | 20 |
| Offer accepted | 30 |
| Weekly report generated | 15 |
| LinkedIn content ideas | 10 |
| Portfolio created / published | 15 / 10 |
| Application status change | 15 (offer reached: +40) |

## Levels & streaks
- `LEVEL_THRESHOLD = 100` — every 100 XP raises the level.
- Daily streak: consecutive active days; weekly streak: consecutive active
  weeks. Streaks earn bonus XP and are shown on the profile.

## Achievements (21 total)
Unlocked automatically by `checkAchievements()` after XP-awarding actions.
Examples: "First Resume", "Interview Novice", "ATS Star", "Offer Ace",
"Goal Getter", "Roadmap Planner", "Century Club", "Weekend Warrior",
"Consistency King", etc. Definitions live in `ACHIEVEMENT_DEFS` and each
unlock is stored in `achievements` and surfaced in `/career/gamification`
with progress toward the next unlock.

## Storage
- `gamification` — single row per user: `xp`, `level`, `daily_streak`,
  `weekly_streak`, `last_active_date`, `last_active_week`, `achievements[]`.
- `achievements` — unlock records (for history/notifications).

## Integration pattern
Call fire-and-forget so it never blocks API latency:
```ts
awardXP(userId, 15, "Tailored resume").catch(() => {});
checkAchievements(userId).catch(() => {});
recordEvent(userId, "resume", "...").catch(() => {});
```
