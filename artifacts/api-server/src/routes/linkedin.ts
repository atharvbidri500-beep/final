import { Router } from "express";
import { eq } from "drizzle-orm";
import {
  db, linkedinProfilesTable, contentIdeasTable,
} from "@workspace/db";
import { askAI, safeParseJSON } from "../lib/ai.js";
import { awardXP } from "../lib/gamification.js";
import { recordEvent } from "../lib/careerMemory.js";
import { requirePremium } from "../lib/gating.js";

const router = Router();

function ruleHeadline(role: string, skills: string[]): string {
  const core = role.trim() || "Professional";
  const top = skills.slice(0, 3);
  return top.length
    ? `${core} | ${top.join(" · ")}`
    : `${core} | Open to opportunities`;
}

function ruleAbout(role: string, years: number, skills: string[]): string {
  const skillLine = skills.slice(0, 5).join(", ");
  return `${role} with ${years} year${years === 1 ? "" : "s"} of hands-on experience building real products. I turn problems into working solutions, shipping with ${skillLine || "practical, modern tools"}. Currently focused on doing the best work of my career and growing every single week. Open to roles where I can learn fast, deliver fast, and grow with a great team.`;
}

/** Get own LinkedIn profile (or null). */
router.get("/linkedin", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [profile] = await db.select().from(linkedinProfilesTable).where(eq(linkedinProfilesTable.userId, userId));
  res.json(profile ? { ...profile, createdAt: profile.createdAt.toISOString(), updatedAt: profile.updatedAt.toISOString() } : null);
});

/** Save the current LinkedIn profile data (upsert). */
router.put("/linkedin", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { headline, about, experience, skills, featuredProjects } = req.body as Record<string, unknown>;

  const values: Record<string, unknown> = {};
  if (typeof headline === "string") values.headline = headline;
  if (typeof about === "string") values.about = about;
  if (Array.isArray(experience)) values.experience = experience.slice(0, 20);
  if (Array.isArray(skills)) values.skills = skills.slice(0, 30);
  if (Array.isArray(featuredProjects)) values.featuredProjects = featuredProjects.slice(0, 10);

  const [existing] = await db.select().from(linkedinProfilesTable).where(eq(linkedinProfilesTable.userId, userId));
  let saved;
  if (existing) {
    [saved] = await db.update(linkedinProfilesTable).set(values).where(eq(linkedinProfilesTable.id, existing.id)).returning();
  } else {
    [saved] = await db.insert(linkedinProfilesTable).values({ userId, ...values } as any).returning();
  }
  res.json({ ...saved, createdAt: saved.createdAt.toISOString(), updatedAt: saved.updatedAt.toISOString() });
});

/** AI optimize: headline + about + profile score. */
router.post("/linkedin/optimize", requirePremium, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { role, yearsOfExperience = 0, skills = [], currentHeadline, currentAbout } = req.body as {
    role?: string; yearsOfExperience?: number; skills?: string[]; currentHeadline?: string; currentAbout?: string;
  };
  if (!role) { res.status(400).json({ error: "role is required" }); return; }

  const skillList = Array.isArray(skills) ? skills.slice(0, 15) : [];
  const fallbackHeadline = ruleHeadline(role, skillList);
  const fallbackAbout = ruleAbout(role, Number(yearsOfExperience), skillList);

  const prompt = `Optimize this LinkedIn profile for recruiters. Role: "${role}", ${yearsOfExperience} years experience, skills: ${skillList.join(", ") || "none"}.
Current headline: ${currentHeadline ?? "(empty)"}
Current about: ${currentAbout ?? "(empty)"}

Return ONLY valid JSON (no markdown):
{
  "headline": "one strong recruiter-focused headline under 120 characters",
  "about": "concise 3-4 sentence profile summary with keywords and a hook",
  "score": <0-100 current profile strength>,
  "tips": ["improvement tip 1", "tip 2", "tip 3", "max 5"]
}`;

  let result: { headline: string; about: string; score: number; tips: string[] } | null = null;
  try {
    const raw = await askAI([
      { role: "system", content: "You are a LinkedIn profile expert. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ], true, 20000);
    const p = safeParseJSON<any>(raw, null);
    if (p && typeof p.headline === "string" && p.headline.length > 5) {
      result = {
        headline: p.headline.slice(0, 200),
        about: typeof p.about === "string" ? p.about.slice(0, 2000) : fallbackAbout,
        score: typeof p.score === "number" ? Math.max(0, Math.min(100, Math.round(p.score))) : 50,
        tips: Array.isArray(p.tips) ? p.tips.slice(0, 5) : [],
      };
    }
  } catch { /* fallback */ }

  if (!result) result = { headline: fallbackHeadline, about: fallbackAbout, score: 45, tips: [] };

  const existing = await db.select().from(linkedinProfilesTable).where(eq(linkedinProfilesTable.userId, userId));
  if (existing.length > 0) {
    const scoreBase = existing[0].headline ? 20 : 0;
    result.score = Math.max(result.score, scoreBase);
  }

  res.json(result);
});

/** AI generate 5 post ideas around the user's niche. */
router.post("/linkedin/content-ideas", requirePremium, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { niche = "your career" } = req.body as { niche?: string };

  const prompt = `Give me 5 LinkedIn post ideas for someone building a personal brand around "${niche}". Each idea must be specific, engaging and realistic to write. Return ONLY valid JSON:
{"ideas": [{"title": "short title", "content": "one-line hook", "category": "post|story|opinion|question", "bestTime": "e.g. Tue 9am"}]}`;

  let ideas: { title: string; content: string; category: string; bestTime: string }[] = [];
  try {
    const raw = await askAI([
      { role: "system", content: "You are a LinkedIn growth strategist. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ], true, 20000);
    const p = safeParseJSON<any>(raw, null);
    if (p && Array.isArray(p.ideas)) {
      ideas = p.ideas.slice(0, 5).map((i: any) => ({
        title: String(i.title ?? "").slice(0, 100),
        content: String(i.content ?? "").slice(0, 300),
        category: String(i.category ?? "post"),
        bestTime: String(i.bestTime ?? ""),
      })).filter((i: any) => i.title);
    }
  } catch { /* fallback below */ }

  if (ideas.length === 0) {
    ideas = [
      { title: "The skill that changed my week", content: `Share one practical lesson you learned this week about ${niche}.`, category: "post", bestTime: "Tue 9am" },
      { title: "A mistake I made at work", content: `Own a mistake, what you learned, and what you'd do differently in ${niche}.`, category: "story", bestTime: "Thu 6pm" },
      { title: "Hot take on our industry", content: `One opinion about ${niche} you're willing to defend — respectfully.`, category: "opinion", bestTime: "Mon 8am" },
      { title: "A question for my network", content: `Ask your network their best advice on breaking into ${niche}.`, category: "question", bestTime: "Wed 12pm" },
      { title: "How I learned X", content: `Break down how you learned one core skill in ${niche}, step by step.`, category: "story", bestTime: "Fri 10am" },
    ];
  }

  for (const idea of ideas) {
    await db.insert(contentIdeasTable).values({ userId, category: idea.category, content: idea.content }).execute().catch(() => {});
  }
  awardXP(userId, 10, "Generated LinkedIn content ideas").catch(() => {});

  res.json({ ideas });
});

/** Saved content ideas. */
router.get("/linkedin/content-ideas", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(contentIdeasTable).where(eq(contentIdeasTable.userId, userId));
  res.json(rows.map(r => ({ id: r.id, category: r.category, content: r.content, used: r.used, createdAt: r.createdAt.toISOString() })));
});

/** Mark an idea as used. */
router.patch("/linkedin/content-ideas/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [idea] = await db.select().from(contentIdeasTable).where(eq(contentIdeasTable.id, id));
  if (!idea || idea.userId !== userId) { res.status(404).json({ error: "Idea not found" }); return; }
  const [updated] = await db.update(contentIdeasTable).set({ used: !idea.used }).where(eq(contentIdeasTable.id, id)).returning();
  res.json(updated);
});

export default router;
