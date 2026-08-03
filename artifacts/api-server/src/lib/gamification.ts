import { eq } from "drizzle-orm";
import { pool, db, gamificationTable, achievementsTable } from "@workspace/db";

export const XP_TABLE = {
  resumeSave: 20,
  interviewSession: 30,
  coverLetterSave: 25,
  applicationAdded: 10,
  applicationStatusChange: 15,
  skillAdded: 10,
  certificationAdded: 20,
  goalCompleted: 40,
  portfolioPublished: 30,
  reportGenerated: 5,
  dailyLogin: 10,
};

export const LEVEL_THRESHOLD = 100;

export const ACHIEVEMENT_DEFS: { code: string; title: string; description: string; xp: number; icon: string }[] = [
  { code: "first_resume", title: "First Steps", description: "Created your first resume", xp: 50, icon: "📄" },
  { code: "resume_five", title: "Resume Architect", description: "Created 5 resumes", xp: 100, icon: "🏗️" },
  { code: "first_interview", title: "Ready for the Big Day", description: "Completed your first mock interview", xp: 50, icon: "🎤" },
  { code: "interview_ten", title: "Interview Veteran", description: "Completed 10 mock interviews", xp: 150, icon: "🎖️" },
  { code: "first_application", title: "In the Game", description: "Tracked your first job application", xp: 30, icon: "📋" },
  { code: "offer_received", title: "Offer Champion", description: "Marked your first offer", xp: 200, icon: "🏆" },
  { code: "first_skill", title: "Skill Builder", description: "Added your first skill", xp: 30, icon: "🛠️" },
  { code: "skill_ten", title: "Skill Collector", description: "Tracked 10 skills", xp: 100, icon: "🧩" },
  { code: "first_cert", title: "Certified", description: "Added your first certification", xp: 50, icon: "🎓" },
  { code: "first_goal", title: "Goal Setter", description: "Created your first career goal", xp: 30, icon: "🎯" },
  { code: "goal_completed", title: "Goal Crusher", description: "Completed a career goal", xp: 100, icon: "🚀" },
  { code: "streak_3", title: "Momentum", description: "3-day streak", xp: 50, icon: "🔥" },
  { code: "streak_7", title: "On Fire", description: "7-day streak", xp: 120, icon: "🔥" },
  { code: "streak_30", title: "Unstoppable", description: "30-day streak", xp: 400, icon: "⚡" },
  { code: "portfolio_published", title: "Show It Off", description: "Published your portfolio", xp: 100, icon: "🌐" },
  { code: "report_first", title: "Insight Seeker", description: "Generated your first weekly career report", xp: 30, icon: "📊" },
  { code: "roadmap_created", title: "Path Finder", description: "Created your career roadmap", xp: 80, icon: "🗺️" },
  { code: "salary_analyzed", title: "Negotiator", description: "Analyzed a salary offer", xp: 50, icon: "💼" },
  { code: "linkedin_optimized", title: "Network Pro", description: "Optimized your LinkedIn profile", xp: 50, icon: "🔗" },
  { code: "level_5", title: "Level 5", description: "Reached level 5", xp: 100, icon: "⭐" },
  { code: "level_10", title: "Level 10", description: "Reached level 10", xp: 250, icon: "🌟" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function getOrCreateGamification(userId: number) {
  const [existing] = await db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId));
  if (existing) return existing;
  const [created] = await db.insert(gamificationTable).values({ userId }).returning();
  return created;
}

async function ensureAchievementsSeeded(): Promise<void> {
  const existing = await db.select({ code: achievementsTable.code }).from(achievementsTable);
  const have = new Set(existing.map(a => a.code));
  const missing = ACHIEVEMENT_DEFS.filter(a => !have.has(a.code));
  if (missing.length > 0) {
    await db.insert(achievementsTable).values(missing.map(a => ({
      code: a.code, title: a.title, description: a.description, xp: a.xp, icon: a.icon,
    })));
  }
}

/** Award XP, update streaks and levels. Returns the new gamification state. */
export async function awardXP(userId: number, amount: number, reason: string): Promise<void> {
  try {
    const g = await getOrCreateGamification(userId);
    const today = startOfDay(new Date());

    // Streak logic
    let dailyStreak = g.dailyStreak;
    const last = g.lastActiveDate;
    if (!last || startOfDay(last).getTime() < today.getTime() - DAY_MS) {
      dailyStreak = 1; // new streak (or first ever)
    } else if (startOfDay(last).getTime() < today.getTime()) {
      dailyStreak = g.dailyStreak + 1; // consecutive day
    }

    let weeklyStreak = g.weeklyStreak;
    const weekStart = startOfDay(new Date());
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const lastWeek = g.lastActiveWeek;
    if (!lastWeek || lastWeek.getTime() < weekStart.getTime() - 7 * DAY_MS) {
      weeklyStreak = 1;
    } else if (lastWeek.getTime() < weekStart.getTime()) {
      weeklyStreak = g.weeklyStreak + 1;
    }

    const newXp = g.xp + amount;
    const newLevel = Math.max(1, Math.floor(newXp / LEVEL_THRESHOLD) + 1);

    await db.update(gamificationTable).set({
      xp: newXp,
      level: newLevel,
      dailyStreak,
      weeklyStreak,
      lastActiveDate: new Date(),
      lastActiveWeek: new Date(),
    }).where(eq(gamificationTable.id, g.id));

    await checkAchievements(userId);
  } catch (err) {
    // gamification must never break core flows
    console.error("awardXP failed:", err);
  }
}

export async function checkAchievements(userId: number): Promise<string[]> {
  try {
    await ensureAchievementsSeeded();
    const g = await getOrCreateGamification(userId);
    const earned = new Set<string>(g.achievements ?? []);

    const [resumeCount, interviewCount, appCount, skillCount, certCount] = await Promise.all([
      countFrom("resumes", userId),
      countFrom("interview_sessions", userId),
      countFrom("job_applications", userId),
      countFrom("skills", userId),
      countFrom("certifications", userId),
    ]);
    const offers = await countFrom("job_applications", userId, "offer");

    const checks: [string, boolean][] = [
      ["first_resume", resumeCount >= 1],
      ["resume_five", resumeCount >= 5],
      ["first_interview", interviewCount >= 1],
      ["interview_ten", interviewCount >= 10],
      ["first_application", appCount >= 1],
      ["first_skill", skillCount >= 1],
      ["skill_ten", skillCount >= 10],
      ["first_cert", certCount >= 1],
      ["streak_3", g.dailyStreak >= 3],
      ["streak_7", g.dailyStreak >= 7],
      ["streak_30", g.dailyStreak >= 30],
      ["level_5", g.level >= 5],
      ["level_10", g.level >= 10],
      ["offer_received", offers >= 1],
    ];

    const newlyEarned: string[] = [];
    for (const [code, ok] of checks) {
      if (ok && !earned.has(code)) {
        earned.add(code);
        newlyEarned.push(code);
      }
    }

    if (newlyEarned.length > 0) {
      await db.update(gamificationTable).set({ achievements: [...earned] }).where(eq(gamificationTable.id, g.id));
      const xpToAdd = newlyEarned.reduce((sum, code) => {
        const def = ACHIEVEMENT_DEFS.find(a => a.code === code);
        return sum + (def?.xp ?? 0);
      }, 0);
      if (xpToAdd > 0) await awardXP(userId, xpToAdd, `achievement:${newlyEarned.join(",")}`);
    }
    return newlyEarned;
  } catch (err) {
    console.error("checkAchievements failed:", err);
    return [];
  }
}

async function countFrom(table: string, userId: number, status?: string): Promise<number> {
  const { rows } = await pool.query(
    status
      ? `SELECT count(*)::int AS n FROM ${table} WHERE user_id = $1 AND status = $2`
      : `SELECT count(*)::int AS n FROM ${table} WHERE user_id = $1`,
    status ? [userId, status] : [userId],
  ) as any;
  return Number(rows?.[0]?.n ?? 0);
}

export async function dailyLoginXP(userId: number): Promise<void> {
  const g = await getOrCreateGamification(userId);
  const today = startOfDay(new Date());
  const last = g.lastActiveDate;
  if (!last || startOfDay(last).getTime() < today.getTime()) {
    await awardXP(userId, XP_TABLE.dailyLogin, "daily login");
  }
}
