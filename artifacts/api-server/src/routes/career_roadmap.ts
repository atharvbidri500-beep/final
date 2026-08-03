import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  db, careerRoadmapsTable, careerProfilesTable, skillsTable,
} from "@workspace/db";
import { askAI, safeParseJSON } from "../lib/ai.js";
import { awardXP } from "../lib/gamification.js";
import { recordEvent } from "../lib/careerMemory.js";
import { requirePremium } from "../lib/gating.js";

const router = Router();

function extractRoleSkills(dreamRole: string, skills: string[]): string[] {
  const known: Record<string, string[]> = {
    developer: ["TypeScript", "React", "Node.js", "SQL", "Git", "REST APIs", "Testing", "Cloud basics"],
    engineer: ["Data structures", "System design", "TypeScript", "Python", "SQL", "Git", "CI/CD"],
    designer: ["Figma", "Design systems", "Prototyping", "User research", "HTML/CSS", "Accessibility"],
    data: ["Python", "SQL", "Pandas", "Statistics", "Visualization", "Machine learning", "ETL"],
    marketing: ["SEO", "Content strategy", "Analytics", "Social media", "Email marketing", "Branding"],
    sales: ["CRM", "Negotiation", "Lead generation", "Pipeline management", "Outbound", "Closing"],
    manager: ["Leadership", "Roadmapping", "1:1s", "OKRs", "Stakeholder management", "Hiring"],
    finance: ["Excel", "Financial modeling", "Reporting", "Budgeting", "Analysis", "Compliance"],
    hr: ["Recruitment", "Onboarding", "Payroll", "Employee relations", "Performance management"],
    default: ["Communication", "Problem solving", "Project management", "Time management", "Adaptability"],
  };
  const key = Object.keys(known).find(k => dreamRole.toLowerCase().includes(k)) ?? "default";
  return known[key].filter(s => !skills.some(u => u.toLowerCase() === s.toLowerCase()));
}

function ruleRoadmap(dreamRole: string, years: number, skills: string[]) {
  const gaps = extractRoleSkills(dreamRole, skills);
  const phases = [
    {
      phase: "0–3 months", title: "Foundation & skill building",
      milestones: [
        { title: `Learn the core skill for ${dreamRole}`, done: false },
        ...gaps.slice(0, 3).map(g => ({ title: `Add ${g} to your toolkit`, done: false })),
        { title: "Rebuild your resume around the target role", done: false },
      ],
    },
    {
      phase: "3–6 months", title: "Proof of work",
      milestones: [
        { title: "Build and publish 1 real project", done: false },
        { title: "Contribute to an open-source or community project", done: false },
        { title: "Create a portfolio page for your work", done: false },
      ],
    },
    {
      phase: "6–12 months", title: "Applications & interviews",
      milestones: [
        { title: "Apply to 20 targeted jobs per month", done: false },
        { title: "Complete 5 mock interviews and review feedback", done: false },
        { title: "Ask 3 professionals in the field for informational chats", done: false },
        { title: "Track every application and follow up", done: false },
      ],
    },
    {
      phase: "12–24 months", title: "Career leap",
      milestones: [
        { title: "Convert 2 applications into offers", done: false },
        { title: "Negotiate salary and benefits for your next role", done: false },
        { title: "Start mentoring someone at your current level", done: false },
      ],
    },
  ];
  return {
    summary: `A realistic ${years <= 1 ? "accelerated" : "sustained"} path from your current level to ${dreamRole}, built around your existing strengths.`,
    skillGaps: gaps,
    phases,
    recommendations: [
      "Dedicate 1 hour daily to skill building and applications",
      "Review your interview analytics weekly and fix one weakness at a time",
      "Use the Job Matching module to find roles that fit your growing profile",
    ],
  };
}

/** Current active roadmap (or null). */
router.get("/career-roadmap", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [roadmap] = await db.select().from(careerRoadmapsTable)
    .where(and(eq(careerRoadmapsTable.userId, userId), eq(careerRoadmapsTable.status, "active")));
  res.json(roadmap ? { ...roadmap, createdAt: roadmap.createdAt.toISOString(), updatedAt: roadmap.updatedAt.toISOString() } : null);
});

/** Past roadmaps. */
router.get("/career-roadmap/history", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(careerRoadmapsTable)
    .where(eq(careerRoadmapsTable.userId, userId))
    .orderBy(desc(careerRoadmapsTable.createdAt))
    .limit(20);
  res.json(rows.map(r => ({
    id: r.id, dreamRole: r.dreamRole, targetSalary: r.targetSalary,
    targetCompany: r.targetCompany, status: r.status,
    progress: (r.content as any)?.progress ?? 0,
    createdAt: r.createdAt.toISOString(),
  })));
});

/** Generate an AI career roadmap from the user's profile. */
router.post("/career-roadmap/generate", requirePremium, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { dreamRole, targetSalary, targetCompany } = req.body as { dreamRole?: string; targetSalary?: number; targetCompany?: string };
  if (!dreamRole) { res.status(400).json({ error: "dreamRole is required" }); return; }

  const [profile] = await db.select().from(careerProfilesTable).where(eq(careerProfilesTable.userId, userId));
  const skillRows = await db.select().from(skillsTable).where(eq(skillsTable.userId, userId));
  const skills = skillRows.map(s => s.name);
  const years = Number(profile?.yearsOfExperience ?? 0);
  const currentRole = profile?.currentRole ?? profile?.dreamRole ?? "Current role";

  const fallback = ruleRoadmap(dreamRole, years, skills);

  const prompt = `Create a career development roadmap to reach "${dreamRole}"${targetCompany ? ` at ${targetCompany}` : ""}${targetSalary ? ` with target salary ₹${targetSalary}` : ""}. Current role: "${currentRole}", ${years} years of experience. Existing skills: ${skills.join(", ") || "none listed"}.

Return ONLY valid JSON (no markdown):
{
  "summary": "one paragraph realistic strategy",
  "skillGaps": ["skill to develop", "max 6"],
  "phases": [
    {"phase": "0–3 months", "title": "short title", "milestones": [{"title": "specific action", "done": false}]}
  ],
  "recommendations": ["3 practical weekly habits"]
}
Aim for 4 phases spanning 24 months, 3-4 milestones each. Milestones must be concrete and trackable.`;

  let content: Record<string, unknown> | null = null;
  try {
    const raw = await askAI([
      { role: "system", content: "You are a senior career coach. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ], true, 25000);
    const p = safeParseJSON<any>(raw, null);
    if (p && Array.isArray(p.phases) && p.phases.length > 0) {
      const phases = p.phases.slice(0, 5).map((ph: any) => ({
        phase: String(ph.phase ?? ""), title: String(ph.title ?? ""),
        milestones: Array.isArray(ph.milestones) ? ph.milestones.slice(0, 5).map((m: any) => ({ title: String(m.title), done: !!m.done })) : [],
      }));
      const total = phases.reduce((s: number, ph: any) => s + ph.milestones.length, 0);
      const done = phases.reduce((s: number, ph: any) => s + ph.milestones.filter((m: any) => m.done).length, 0);
      content = {
        summary: String(p.summary ?? fallback.summary),
        skillGaps: Array.isArray(p.skillGaps) ? p.skillGaps.slice(0, 6) : fallback.skillGaps,
        phases,
        recommendations: Array.isArray(p.recommendations) ? p.recommendations.slice(0, 3) : fallback.recommendations,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    }
  } catch { /* fall back to rules */ }

  if (!content) {
    const total = fallback.phases.reduce((s, ph) => s + ph.milestones.length, 0);
    content = {
      ...fallback,
      progress: 0,
      source: "rule-based",
      _total: total,
    };
  }

  const [roadmap] = await db.insert(careerRoadmapsTable).values({
    userId,
    dreamRole,
    targetSalary: targetSalary ?? null,
    targetCompany: targetCompany ?? null,
    content,
    status: "active",
  }).returning();

  awardXP(userId, 20, `Generated career roadmap for ${dreamRole}`).catch(() => {});
  recordEvent(userId, "roadmap", `Created career roadmap for ${dreamRole}`).catch(() => {});

  res.status(201).json({ ...roadmap, createdAt: roadmap.createdAt.toISOString(), updatedAt: roadmap.updatedAt.toISOString() });
});

/** Toggle a milestone done/undone (recomputes progress, awards XP once per milestone). */
router.patch("/career-roadmap/:id/milestones", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const { phaseIndex, milestoneIndex, done } = req.body as { phaseIndex?: number; milestoneIndex?: number; done?: boolean };

  const [roadmap] = await db.select().from(careerRoadmapsTable).where(eq(careerRoadmapsTable.id, id));
  if (!roadmap || roadmap.userId !== userId) { res.status(404).json({ error: "Roadmap not found" }); return; }

  const content = (roadmap.content ?? {}) as any;
  if (!Array.isArray(content.phases) || typeof phaseIndex !== "number" || typeof milestoneIndex !== "number") {
    res.status(400).json({ error: "Invalid milestone target" }); return;
  }
  const phase = content.phases[phaseIndex];
  const milestone = phase?.milestones?.[milestoneIndex];
  if (!phase || !milestone) { res.status(404).json({ error: "Milestone not found" }); return; }

  const wasDone = !!milestone.done;
  milestone.done = !!done;
  const total = content.phases.reduce((s: number, ph: any) => s + (ph.milestones?.length ?? 0), 0);
  const doneCount = content.phases.reduce((s: number, ph: any) => s + (ph.milestones ?? []).filter((m: any) => m.done).length, 0);
  content.progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  await db.update(careerRoadmapsTable).set({ content }).where(eq(careerRoadmapsTable.id, id));

  if (done && !wasDone) {
    awardXP(userId, 10, `Completed milestone: ${milestone.title}`).catch(() => {});
    recordEvent(userId, "roadmap", `Completed milestone "${milestone.title}"`).catch(() => {});
  }

  res.json({ progress: content.progress, phase, milestone });
});

/** Delete a roadmap. */
router.delete("/career-roadmap/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [roadmap] = await db.select().from(careerRoadmapsTable).where(eq(careerRoadmapsTable.id, id));
  if (!roadmap || roadmap.userId !== userId) { res.status(404).json({ error: "Roadmap not found" }); return; }
  await db.delete(careerRoadmapsTable).where(eq(careerRoadmapsTable.id, id));
  res.json({ ok: true });
});

export default router;
