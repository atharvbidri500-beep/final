import { eq, desc, gte, and, sql, count } from "drizzle-orm";
import {
  pool, db, usersTable, resumesTable, interviewSessionsTable, coverLettersTable,
  jobApplicationsTable, skillsTable, certificationsTable, careerGoalsTable,
  gamificationTable, careerProfilesTable,
} from "@workspace/db";

export interface CareerScoreResult {
  careerScore: number;
  components: {
    profile: number;
    resume: number;
    interview: number;
    application: number;
    skill: number;
    engagement: number;
  };
  level: string;
}

export function levelLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Progressing";
  if (score >= 40) return "Building";
  return "Getting Started";
}

/** Compute a real career score from actual user activity data. */
export async function computeCareerScore(userId: number): Promise<CareerScoreResult> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    return { careerScore: 0, components: { profile: 0, resume: 0, interview: 0, application: 0, skill: 0, engagement: 0 }, level: "Getting Started" };
  }

  // Profile completeness (0-100)
  const profileFields = [user.name, user.email, user.mobile, user.city];
  const profile = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  // Resume quality: average ATS of saved resumes (0-100)
  const resumes = await db.select().from(resumesTable).where(eq(resumesTable.userId, userId));
  const resumeAvg = resumes.length > 0
    ? Math.round(resumes.reduce((s, r) => s + (r.atsScore ?? 0), 0) / resumes.length)
    : 0;

  // Interview performance: average scores of recent sessions (0-100)
  const sessions = await db.select().from(interviewSessionsTable)
    .where(eq(interviewSessionsTable.userId, userId))
    .orderBy(desc(interviewSessionsTable.createdAt))
    .limit(20);
  const scored = sessions.filter(s => s.avgCommunicationScore != null || s.avgConfidenceScore != null);
  const interviewAvg = scored.length > 0
    ? Math.round(scored.reduce((s, x) => s + ((x.avgCommunicationScore ?? 0) + (x.avgConfidenceScore ?? 0)) / 2, 0) / scored.length)
    : 0;

  // Application progress: weight by pipeline stage (0-100)
  const apps = await db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.userId, userId));
  const stageWeight: Record<string, number> = { saved: 0.2, applied: 0.4, interview: 0.7, offer: 1, rejected: 0.3 };
  const appScore = apps.length > 0
    ? Math.round((apps.reduce((s, a) => s + (stageWeight[a.status] ?? 0.3), 0) / apps.length) * 100)
    : 0;

  // Skill coverage (0-100)
  const skills = await db.select().from(skillsTable).where(eq(skillsTable.userId, userId));
  const skillScore = Math.min(100, skills.length * 8);

  // Engagement: XP-based (0-100)
  const [g] = await db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId));
  const engagement = Math.min(100, Math.round((g?.xp ?? 0) / 5));

  const weighted =
    profile * 0.15 + resumeAvg * 0.25 + interviewAvg * 0.2 + appScore * 0.15 + skillScore * 0.15 + engagement * 0.1;

  const careerScore = Math.max(0, Math.min(100, Math.round(weighted)));

  return {
    careerScore,
    components: {
      profile, resume: resumeAvg, interview: interviewAvg, application: appScore, skill: skillScore, engagement,
    },
    level: levelLabel(careerScore),
  };
}

export interface WeeklyActivity {
  day: string;
  count: number;
}

/** Real 7-day activity derived from DB rows. */
export async function getWeeklyActivity(userId: number): Promise<WeeklyActivity[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setHours(0, 0, 0, 0);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const out: WeeklyActivity[] = [];
  for (let i = 0; i < 7; i++) {
    const start = new Date(sevenDaysAgo);
    start.setDate(start.getDate() + i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const tables = [resumesTable, interviewSessionsTable, coverLettersTable, jobApplicationsTable];
    let total = 0;
    for (const t of tables) {
      const [row] = await db.select({ n: count() })
        .from(t)
        .where(and(gte((t as any).createdAt, start), sql`${(t as any).createdAt} < ${end}`, eq((t as any).userId, userId)));
      total += Number(row?.n ?? 0);
    }
    out.push({
      day: start.toLocaleDateString("en-IN", { weekday: "short" }),
      count: total,
    });
  }
  return out;
}

export async function getTodayTasks(userId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { rows } = await pool.query(
    `SELECT * FROM career_tasks WHERE user_id = $1 AND done = false
     AND (due_date IS NULL OR (due_date >= $2 AND due_date < $3))
     ORDER BY due_date ASC, created_at ASC`,
    [userId, today.toISOString().slice(0, 10), tomorrow.toISOString().slice(0, 10)],
  ) as any;
  return rows;
}

export async function getUpcomingInterviews(userId: number) {
  const { rows } = await pool.query(
    `SELECT * FROM job_applications WHERE user_id = $1 AND interview_date IS NOT NULL AND interview_date >= $2
     ORDER BY interview_date ASC LIMIT 10`,
    [userId, new Date()],
  ) as any;
  return rows;
}

export async function getCareerSnapshotMetrics(userId: number) {
  const [g] = await db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId));
  const [profile] = await db.select().from(careerProfilesTable).where(eq(careerProfilesTable.userId, userId));
  const goals = await db.select().from(careerGoalsTable).where(eq(careerGoalsTable.userId, userId));
  const skills = await db.select().from(skillsTable).where(eq(skillsTable.userId, userId));
  const certs = await db.select().from(certificationsTable).where(eq(certificationsTable.userId, userId));
  const apps = await db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.userId, userId));
  const score = await computeCareerScore(userId);

  return {
    xp: g?.xp ?? 0,
    level: g?.level ?? 1,
    dailyStreak: g?.dailyStreak ?? 0,
    weeklyStreak: g?.weeklyStreak ?? 0,
    achievements: g?.achievements ?? [],
    careerScore: score.careerScore,
    careerLevel: score.level,
    components: score.components,
    goals: goals.length,
    goalsCompleted: goals.filter(x => x.status === "completed").length,
    skills: skills.length,
    certifications: certs.length,
    applications: apps.length,
    interviews: (await countFrom("interview_sessions", userId)),
    resumes: (await countFrom("resumes", userId)),
    profileCompleted: !!profile,
  };
}

async function countFrom(table: string, userId: number): Promise<number> {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM ${table} WHERE user_id = $1`, [userId],
  ) as any;
  return Number(rows?.[0]?.n ?? 0);
}
