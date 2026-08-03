import { Router } from "express";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { pool, db, weeklyReportsTable } from "@workspace/db";
import { askAI, safeParseJSON } from "../lib/ai.js";
import { awardXP } from "../lib/gamification.js";
import { recordEvent } from "../lib/careerMemory.js";
import { computeCareerScore } from "../lib/careerScore.js";
import { sendEmail } from "../lib/email.js";
import { requireTier } from "../lib/gating.js";

const router = Router();

function weekBounds(now: Date) {
  const day = (now.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0, 0);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7, 0, 0, 0, 0);
  return { start: monday, end: sunday };
}

async function collectWeekData(userId: number, start: Date, end: Date) {
  const { rows: applications } = await pool.query(
    `SELECT count(*)::int AS total,
       count(*) FILTER (WHERE created_at >= $2 AND created_at < $3) AS this_week
     FROM job_applications WHERE user_id = $1`, [userId, start, end],
  ) as any;

  const { rows: interviews } = await pool.query(
    `SELECT count(*)::int AS total,
       count(*) FILTER (WHERE created_at >= $2 AND created_at < $3) AS this_week
     FROM interview_sessions WHERE user_id = $1`, [userId, start, end],
  ) as any;

  const { rows: resumes } = await pool.query(
    `SELECT count(*)::int AS total,
       count(*) FILTER (WHERE created_at >= $2 AND created_at < $3) AS this_week
     FROM resumes WHERE user_id = $1`, [userId, start, end],
  ) as any;

  const { rows: ats } = await pool.query(
    `SELECT round(avg(ats_score))::int AS avg_ats FROM resume_analyses WHERE user_id = $1 AND created_at >= $2 AND created_at < $3`,
    [userId, start, end],
  ) as any;

  const { rows: offers } = await pool.query(
    `SELECT count(*)::int AS n FROM salary_offers WHERE user_id = $1 AND created_at >= $2 AND created_at < $3`,
    [userId, start, end],
  ) as any;

  return {
    applicationsTotal: Number(applications?.[0]?.total ?? 0),
    applicationsThisWeek: Number(applications?.[0]?.this_week ?? 0),
    interviewsTotal: Number(interviews?.[0]?.total ?? 0),
    interviewsThisWeek: Number(interviews?.[0]?.this_week ?? 0),
    resumesTotal: Number(resumes?.[0]?.total ?? 0),
    resumesThisWeek: Number(resumes?.[0]?.this_week ?? 0),
    avgAtsThisWeek: Number(ats?.[0]?.avg_ats ?? 0),
    offersThisWeek: Number(offers?.[0]?.n ?? 0),
  };
}

/** Generate (or regenerate) the current week's report. */
router.post("/weekly-report/generate", requireTier("premium"), async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { start, end } = weekBounds(new Date());
  const data = await collectWeekData(userId, start, end);
  const score = await computeCareerScore(userId);

  const fallback = {
    weekStart: start.toISOString().slice(0, 10),
    summary: data.applicationsThisWeek + data.interviewsThisWeek + data.resumesThisWeek === 0
      ? "Quiet week â€” no applications, interviews or resume work recorded. Even 30 minutes of practice next week will move your career score."
      : `You sent ${data.applicationsThisWeek} application${data.applicationsThisWeek === 1 ? "" : "s"}, practiced ${data.interviewsThisWeek} interview${data.interviewsThisWeek === 1 ? "" : "s"} and worked on ${data.resumesThisWeek} resume${data.resumesThisWeek === 1 ? "" : "s"} this week.`,
    highlights: [
      data.offersThisWeek > 0 ? `${data.offersThisWeek} salary offer${data.offersThisWeek > 1 ? "s" : ""} analyzed` : null,
      data.avgAtsThisWeek > 0 ? `Average ATS score for scanned resumes: ${data.avgAtsThisWeek}/100` : null,
      data.interviewsThisWeek > 0 ? `${data.interviewsThisWeek} interview practice session${data.interviewsThisWeek > 1 ? "s" : ""}` : null,
    ].filter(Boolean) as string[],
    nextWeek: ["Book 3 interview practice sessions", "Tailor 1 resume to a specific job posting", "Send 10 targeted applications"],
    careerScore: score.careerScore,
  };

  const prompt = `Write a weekly career progress report. This week's real data: applications sent ${data.applicationsThisWeek} (total ${data.applicationsTotal}), interview practices ${data.interviewsThisWeek} (total ${data.interviewsTotal}), resumes worked ${data.resumesThisWeek} (total ${data.resumesTotal}), salary offers analyzed ${data.offersThisWeek}, avg ATS score this week ${data.avgAtsThisWeek || "n/a"}, current career score ${score.careerScore}/100.

Return ONLY valid JSON (no markdown):
{
  "summary": "2-3 encouraging sentences grounded ONLY in the data above",
  "highlights": ["3 concrete highlights, each tied to real data"],
  "nextWeek": ["3 actionable tasks for next week"],
  "careerScore": <the career score number>
}`;

  let content: Record<string, unknown> | null = null;
  try {
    const raw = await askAI([
      { role: "system", content: "You are a career coach writing a weekly report. Be honest, encouraging, specific. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ], true, 20000);
    const p = safeParseJSON<any>(raw, null);
    if (p && typeof p.summary === "string") {
      content = {
        weekStart: start.toISOString().slice(0, 10),
        summary: p.summary,
        highlights: Array.isArray(p.highlights) ? p.highlights.slice(0, 3) : fallback.highlights,
        nextWeek: Array.isArray(p.nextWeek) ? p.nextWeek.slice(0, 3) : fallback.nextWeek,
        careerScore: typeof p.careerScore === "number" ? p.careerScore : score.careerScore,
        rawData: data,
      };
    }
  } catch { /* fallback */ }

  if (!content) content = { ...fallback, rawData: data };

  const [existing] = await db.select().from(weeklyReportsTable)
    .where(and(eq(weeklyReportsTable.userId, userId), eq(weeklyReportsTable.weekStart, start)));
  let saved;
  if (existing) {
    [saved] = await db.update(weeklyReportsTable).set({ content }).where(eq(weeklyReportsTable.id, existing.id)).returning();
  } else {
    [saved] = await db.insert(weeklyReportsTable).values({ userId, weekStart: start, content }).returning();
  }

  awardXP(userId, 15, "Generated weekly career report").catch(() => {});
  recordEvent(userId, "report", "Generated weekly career report").catch(() => {});

  res.json({ ...saved, createdAt: saved.createdAt.toISOString(), emailStatus: "not_sent" });
});

/** Latest + historical reports. */
router.get("/weekly-report", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(weeklyReportsTable)
    .where(eq(weeklyReportsTable.userId, userId))
    .orderBy(desc(weeklyReportsTable.weekStart))
    .limit(20);
  res.json(rows.map(r => ({
    id: r.id, weekStart: r.weekStart.toISOString().slice(0, 10),
    content: r.content, sentViaEmail: r.sentViaEmail, createdAt: r.createdAt.toISOString(),
  })));
});

/** Email the current week's report (respects email preferences). */
router.post("/weekly-report/send-email", requireTier("premium"), async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { start, end } = weekBounds(new Date());
  const [report] = await db.select().from(weeklyReportsTable)
    .where(and(eq(weeklyReportsTable.userId, userId), eq(weeklyReportsTable.weekStart, start)));
  if (!report) {
    res.status(404).json({ error: "Generate this week's report first" }); return;
  }

  const { rows: users } = await pool.query("SELECT name, email FROM users WHERE id = $1", [userId]) as any;
  const user = users?.[0];
  if (!user?.email) { res.status(400).json({ error: "No email on account" }); return; }

  const c = (report.content ?? {}) as any;
  const result = await sendEmail({
    userId,
    email: user.email,
    subject: `Your Career Boost weekly report â€” ${c.weekStart ?? start.toISOString().slice(0, 10)}`,
    template: "weekly_report",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#1f2937">
        <h2 style="color:#111827;margin:0 0 4px">Your Weekly Career Report</h2>
        <p style="color:#6b7280;margin:0 0 20px">Week starting ${c.weekStart ?? ""}</p>
        <p>${String(c.summary ?? "")}</p>
        <h3 style="margin:20px 0 8px">Highlights</h3>
        <ul style="margin:0 0 20px">${(c.highlights ?? []).map((h: string) => `<li>${h}</li>`).join("")}</ul>
        <h3 style="margin:20px 0 8px">Next week</h3>
        <ul style="margin:0 0 20px">${(c.nextWeek ?? []).map((t: string) => `<li>${t}</li>`).join("")}</ul>
        <p style="font-size:20px;font-weight:bold;color:#2563eb">Career Score: ${c.careerScore ?? "-"}/100</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Sent by Career Boost AI</p>
      </div>`,
  });

  if (result.status === "sent") {
    await db.update(weeklyReportsTable).set({ sentViaEmail: true }).where(eq(weeklyReportsTable.id, report.id));
    res.json({ ok: true, messageId: result.messageId ?? null });
  } else {
    res.json({ ok: false, skipped: result.skipped ?? "unsent" });
  }
});

export default router;

