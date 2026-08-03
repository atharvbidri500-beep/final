import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { pool, db, careerProfilesTable, skillsTable, careerGoalsTable } from "@workspace/db";
import { askAI, safeParseJSON } from "../lib/ai.js";
import { computeCareerScore } from "../lib/careerScore.js";
import { getCareerTimeline } from "../lib/careerMemory.js";
import { requireTier } from "../lib/gating.js";
import { recordEvent } from "../lib/careerMemory.js";

const router = Router();

/* ── Real context snapshot assembled from the user's actual data ─────────── */

async function buildContext(userId: number) {
  const [profile] = await db.select().from(careerProfilesTable).where(eq(careerProfilesTable.userId, userId));
  const skills = await db.select().from(skillsTable).where(eq(skillsTable.userId, userId)).orderBy(desc(skillsTable.proficiency)).limit(10);
  const goals = await db.select().from(careerGoalsTable).where(eq(careerGoalsTable.userId, userId)).limit(5);
  const timeline = await getCareerTimeline(userId, 5);
  const score = await computeCareerScore(userId);

  const { rows: apps } = await pool.query(
    `SELECT status, count(*)::int AS n FROM job_applications WHERE user_id = $1 GROUP BY status ORDER BY n DESC LIMIT 5`,
    [userId],
  ) as any;

  return {
    user: { dreamRole: profile?.dreamRole ?? null, currentRole: profile?.currentRole ?? null, yearsOfExperience: profile?.yearsOfExperience ?? 0 },
    careerScore: score.careerScore,
    level: score.level,
    topSkills: skills.map(s => s.name),
    goals: goals.map(g => ({ title: g.title, status: g.status })),
    applications: (apps ?? []).map((a: any) => ({ status: a.status, count: a.n })),
    recentActivity: timeline.map((t: any) => `${t.type}: ${t.description}`),
  };
}

/* ── Rule fallback (grounded in real user data) ──────────────────────────── */

function ruleReply(message: string, ctx: Awaited<ReturnType<typeof buildContext>>): string {
  const m = message.toLowerCase();
  if (/hi|hello|hey|namaste/.test(m)) {
    return `Hello! I'm your Career Copilot. You're currently at level "${ctx.level}" with a career score of ${ctx.careerScore}/100. Ask me anything about resumes, interviews, jobs or your career plan.`;
  }
  if (/score|progress|how am i doing/.test(m)) {
    return `Your current career score is ${ctx.careerScore}/100 (${ctx.level}). Your top skills: ${ctx.topSkills.join(", ") || "none yet"}. ${ctx.goals.length > 0 ? `You have ${ctx.goals.filter(g => g.status === "done").length}/${ctx.goals.length} goals completed.` : "Set your first career goal in the Copilot dashboard to start tracking."}`;
  }
  if (/resume|ats/.test(m)) {
    return "For a stronger resume: use AI Resume Intelligence to scan your resume for ATS gaps, then Resume Tailoring to match each job posting. Rebuild your resume around the target role and quantify every bullet with numbers.";
  }
  if (/interview|mock/.test(m)) {
    return "Practice daily with the Interview Coach — it scores your communication, confidence and filler words, and builds your improvement roadmap. Review your analytics weekly and fix one weakness at a time.";
  }
  if (/job|apply|application/.test(m)) {
    const total = ctx.applications.reduce((s: number, a: any) => s + a.count, 0);
    return total > 0
      ? `You've sent ${total} applications: ${ctx.applications.map((a: any) => `${a.status} (${a.count})`).join(", ")}. Use Job Matching to find roles, and follow up on every application within 5 days — the CRM reminds you.`
      : "You haven't tracked any applications yet. Start by saving jobs you like from Job Matching, then move them through the pipeline — applied → interview → offer.";
  }
  if (/salary|offer|negotiat/.test(m)) {
    return "When you get an offer, use Salary Negotiation — it benchmarks your offer against the market, builds a counter number, and writes the negotiation emails for you. Never accept a first offer; always counter with a range.";
  }
  if (/roadmap|plan|goal/.test(m)) {
    return "The Career Roadmap builds your personalized 24-month plan with concrete milestones. Mark milestones done as you complete them — every milestone earns XP.";
  }
  if (/skill|learn/.test(m)) {
    return `Based on your profile, your strongest areas are: ${ctx.topSkills.join(", ") || "not yet defined"}. Map skill gaps in the Career Roadmap or add skills from the Copilot dashboard to raise your career score.`;
  }
  if (/thank|thanks|thx/.test(m)) {
    return "You're welcome! Keep showing up — consistency is what moves your career score. Anything else you'd like help with?";
  }
  return `I can help with resumes (${ctx.careerScore > 50 ? "strong" : "needs work"}), interviews, job applications, salary negotiation and your career plan. Right now you have ${ctx.topSkills.length || 0} tracked skills and ${ctx.goals.length || 0} goals. What would you like to focus on?`;
}

/* ── Routes ───────────────────────────────────────────────────────────────── */

/** Context snapshot the chat UI can display. */
router.get("/assistant/context", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  res.json(await buildContext(userId));
});

/** Context-aware chat (Premium). */
router.post("/assistant/chat", requireTier("premium"), async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  const { message } = req.body as { message?: string };
  if (!message || message.trim().length < 2) { res.status(400).json({ error: "Type a message first" }); return; }
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const ctx = await buildContext(userId);
  const contextBlob = JSON.stringify({
    user: ctx.user,
    careerScore: ctx.careerScore,
    level: ctx.level,
    topSkills: ctx.topSkills,
    goals: ctx.goals,
    applications: ctx.applications,
    recentActivity: ctx.recentActivity,
  });

  const prompt = `You are Career Copilot, the personal AI career coach inside the Hire Pilot / Career Boost app. The user's REAL data: ${contextBlob}

Answer helpfully and concisely (2-4 sentences). Ground every answer in the real data above — never invent facts about the user. If data is missing, say so and guide them to the feature that collects it. Use plain text, no markdown headers.

User message: ${message.slice(0, 1000)}`;

  let reply: string | null = null;
  try {
    const raw = await askAI([
      { role: "system", content: "You are a friendly, specific career coach assistant. Plain text answers only." },
      { role: "user", content: prompt },
    ], false, 25000);
    const cleaned = (raw ?? "").trim();
    if (cleaned.length >= 10) reply = cleaned;
  } catch { /* fallback */ }

  if (!reply) reply = ruleReply(message, ctx);

  recordEvent(userId, "assistant", "Asked the AI assistant a question").catch(() => {});
  res.json({ reply, context: { careerScore: ctx.careerScore, level: ctx.level, topSkills: ctx.topSkills.slice(0, 5) } });
});

export default router;
