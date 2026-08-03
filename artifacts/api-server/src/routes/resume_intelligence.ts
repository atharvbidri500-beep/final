import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import {
  pool, db, resumesTable, resumeAnalysesTable, resumeVersionsTable,
} from "@workspace/db";
import { askAI, safeParseJSON } from "../lib/ai.js";
import { awardXP } from "../lib/gamification.js";
import { recordEvent } from "../lib/careerMemory.js";
import { requireTier } from "../lib/gating.js";

const router = Router();

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  software: ["javascript", "typescript", "python", "java", "react", "node.js", "sql", "git", "api", "aws", "docker", "testing", "ci/cd", "agile"],
  data: ["python", "sql", "pandas", "numpy", "machine learning", "statistics", "visualization", "etl", "excel", "power bi", "tableau", "bigquery"],
  design: ["figma", "photoshop", "illustrator", "wireframing", "prototyping", "user research", "design systems", "html", "css", "accessibility"],
  marketing: ["seo", "content", "social media", "analytics", "email marketing", "google ads", "branding", "copywriting", "crm"],
  finance: ["excel", "accounting", "financial modeling", "reporting", "taxation", "budgeting", "tally", "analysis", "compliance"],
  hr: ["recruitment", "employee relations", "payroll", "onboarding", "performance management", "labor laws", "communication"],
  sales: ["crm", "negotiation", "lead generation", "outbound", "salesforce", "closing", "pipeline", "account management"],
};

function extractText(resume: typeof resumesTable.$inferSelect): string {
  return [
    resume.fullName, resume.email, resume.mobile, resume.city,
    resume.college, resume.education,
    "Skills: " + resume.skills,
    "Experience: " + resume.workExperience,
    "Projects: " + resume.projects,
    "Certifications: " + resume.certifications,
    resume.generatedContent,
  ].filter(Boolean).join("\n");
}

/* â”€â”€ Rule-based fallback scoring (deterministic, real) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function ruleIntelligence(text: string, skillsList: string[]) {
  const lower = text.toLowerCase();
  const hasEmail = /[\w.-]+@[\w.-]+\.[a-z]{2,}/i.test(text);
  const hasPhone = /[6-9]\d{9}/.test(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const bullets = (text.match(/[â€¢\-\*]/g) ?? []).length;
  const sections = ["education", "skills", "experience", "project", "certification", "summary"].filter(s => lower.includes(s)).length;
  const actionVerbs = ["developed", "built", "led", "managed", "created", "improved", "designed", "implemented", "increased", "reduced", "launched", "delivered", "automated", "optimized"].filter(v => lower.includes(v));
  const numbers = (text.match(/\d+%/g) ?? []).length + (text.match(/\b\d{2,}\b/g) ?? []).length;

  const readability = Math.min(100, 20 + wordCount * 0.05 + sections * 8 + (bullets > 3 ? 15 : 0) + Math.min(15, actionVerbs.length * 3));
  const health = Math.min(100, 25 + (hasEmail ? 12 : 0) + (hasPhone ? 10 : 0) + (sections >= 4 ? 20 : sections * 4) + (wordCount >= 200 ? 13 : 0) + (wordCount >= 350 ? 10 : 0) + (bullets >= 5 ? 10 : 0));
  const keywordScore = Math.min(100, 30 + Math.min(40, skillsList.length * 4) + (actionVerbs.length >= 5 ? 15 : actionVerbs.length * 3) + (numbers > 0 ? 10 : 0));
  const quality = Math.round(health * 0.4 + keywordScore * 0.35 + readability * 0.25);
  const atsScore = Math.min(97, Math.round(health * 0.5 + keywordScore * 0.3 + (sections >= 4 ? 15 : sections * 3)));
  return { atsScore, qualityScore: quality, healthScore: health, readabilityScore: readability, keywordScore };
}

/* â”€â”€ Deep AI intelligence scan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function aiIntelligence(resume: typeof resumesTable.$inferSelect) {
  const text = extractText(resume);
  const skills = (resume.skills ?? "").split(/[,\n;]/).map(s => s.trim().toLowerCase()).filter(Boolean);
  const rule = ruleIntelligence(text, skills);

  const prompt = `You are a senior recruiter and ATS analyst. Analyze this resume and return ONLY valid JSON (no markdown):

Resume:
${text.slice(0, 4000)}

{
  "atsScore": <0-100>,
  "qualityScore": <0-100>,
  "healthScore": <0-100>,
  "readabilityScore": <0-100>,
  "keywordScore": <0-100>,
  "missingKeywords": ["industry keyword absent from resume", ...max 8],
  "skillGaps": ["skill worth adding given the stated experience", ...max 6],
  "industryComparison": {"industry": "software", "typicalRange": [50, 80], "yourPosition": "below average"},
  "suggestions": ["actionable fix 1", "fix 2", "fix 3", "fix 4", "fix 5"],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "recruiterSimulation": {"timeSpentSec": 7, "firstImpression": "text", "wouldShortlist": true, "reason": "text"}
}`;

  try {
    const raw = await askAI([
      { role: "system", content: "You are a strict ATS resume analyst. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ], true, 20000);
    const p = safeParseJSON<any>(raw, null);
    if (p && typeof p.atsScore === "number") {
      return {
        atsScore: Math.max(0, Math.min(100, Math.round(p.atsScore))),
        qualityScore: Math.max(0, Math.min(100, Math.round(p.qualityScore ?? p.atsScore))),
        healthScore: Math.max(0, Math.min(100, Math.round(p.healthScore ?? p.atsScore))),
        readabilityScore: Math.max(0, Math.min(100, Math.round(p.readabilityScore ?? p.atsScore))),
        keywordScore: Math.max(0, Math.min(100, Math.round(p.keywordScore ?? p.atsScore))),
        missingKeywords: Array.isArray(p.missingKeywords) ? p.missingKeywords.slice(0, 8) : [],
        skillGaps: Array.isArray(p.skillGaps) ? p.skillGaps.slice(0, 6) : [],
        industryComparison: p.industryComparison && typeof p.industryComparison === "object" ? p.industryComparison : { industry: "unknown", typicalRange: [40, 75], yourPosition: "unknown" },
        suggestions: Array.isArray(p.suggestions) ? p.suggestions.slice(0, 5) : [],
        strengths: Array.isArray(p.strengths) ? p.strengths.slice(0, 3) : [],
        recruiterSimulation: p.recruiterSimulation && typeof p.recruiterSimulation === "object" ? p.recruiterSimulation : {},
      };
    }
  } catch { /* fall through to rules */ }

  const detectedIndustry = Object.entries(INDUSTRY_KEYWORDS)
    .sort((a, b) => (b[1].filter(k => text.toLowerCase().includes(k)).length) - (a[1].filter(k => text.toLowerCase().includes(k)).length))[0];

  const topKeywords = detectedIndustry ? detectedIndustry[1] : INDUSTRY_KEYWORDS.software;
  const missingKeywords = topKeywords.filter(k => !text.toLowerCase().includes(k)).slice(0, 8);
  const present = topKeywords.filter(k => text.toLowerCase().includes(k));

  return {
    ...rule,
    missingKeywords,
    skillGaps: missingKeywords.slice(0, 6),
    industryComparison: {
      industry: detectedIndustry?.[0] ?? "general",
      typicalRange: [40, 80],
      yourPosition: rule.atsScore >= 65 ? "above average" : rule.atsScore >= 50 ? "average" : "below average",
      keywordCoverage: `${present.length}/${topKeywords.length} common ${detectedIndustry?.[0] ?? "industry"} keywords`,
    },
    suggestions: [
      missingKeywords.length > 0 ? `Add these keywords: ${missingKeywords.slice(0, 4).join(", ")}` : "Your keyword coverage is strong",
      text.length < 400 ? "Add more detail â€” aim for 400+ words" : "Quantify achievements with percentages and numbers",
      /summary|objective/i.test(text) ? "" : "Add a 2-3 line professional summary at the top",
      "Use action verbs: Developed, Led, Optimized, Delivered",
      "Keep bullet points under 15 words for ATS readability",
    ].filter(Boolean).slice(0, 5),
    strengths: [
      hasSection(text, "skills") ? "Clear skills section" : "",
      hasSection(text, "experience") ? "Work experience documented" : "",
      /[\w.-]+@[\w.-]+\.[a-z]{2,}/i.test(text) ? "Contact email present" : "",
    ].filter(Boolean).slice(0, 3),
    recruiterSimulation: {
      timeSpentSec: 7,
      firstImpression: rule.healthScore >= 60 ? "Clean, structured resume with key sections visible." : "Hard to scan â€” consider clearer section headings.",
      wouldShortlist: rule.atsScore >= 60,
      reason: rule.atsScore >= 60 ? "Meets basic ATS keyword and structure criteria." : "Needs keyword and structure improvements before shortlisting.",
    },
  };
}

function hasSection(text: string, section: string): boolean {
  return text.toLowerCase().includes(section);
}

/* â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Full deep analysis of a saved resume (saved to resume_analyses). */
router.post("/resume-intelligence/analyze/:id", requireTier("premium"), async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!resume || resume.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }

  const result = await aiIntelligence(resume);

  await db.insert(resumeAnalysesTable).values({
    resumeId: resume.id,
    userId,
    ...result,
  });

  await awardXP(userId, 15, "resume_analyzed");
  recordEvent(userId, "resume", `Deep analysis: ${resume.title}`, { ats: result.atsScore }).catch(() => {});

  res.json(result);
});

/** Analysis history for a resume (ATS progression chart). */
router.get("/resume-intelligence/:id/history", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!resume || resume.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }
  const analyses = await db.select().from(resumeAnalysesTable)
    .where(eq(resumeAnalysesTable.resumeId, id))
    .orderBy(desc(resumeAnalysesTable.createdAt));
  res.json(analyses.map(a => ({
    id: a.id,
    atsScore: a.atsScore,
    qualityScore: a.qualityScore,
    healthScore: a.healthScore,
    readabilityScore: a.readabilityScore,
    keywordScore: a.keywordScore,
    createdAt: a.createdAt.toISOString(),
  })));
});

/** Save a version snapshot of a resume. */
router.post("/resume-intelligence/:id/version", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!resume || resume.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }

  const { rows: lastRow } = await pool.query(
    `SELECT max(version_no)::int AS max_v FROM resume_versions WHERE resume_id = $1`, [id],
  );
  const nextVersion = (Number(lastRow?.[0]?.max_v ?? 0) || 0) + 1;

  const [version] = await db.insert(resumeVersionsTable).values({
    resumeId: id,
    userId,
    versionNo: nextVersion,
    snapshot: {
      title: resume.title, fullName: resume.fullName, email: resume.email, mobile: resume.mobile,
      city: resume.city, education: resume.education, college: resume.college, skills: resume.skills,
      projects: resume.projects, workExperience: resume.workExperience, certifications: resume.certifications,
      languages: resume.languages, template: resume.template, generatedContent: resume.generatedContent,
    },
    atsScore: resume.atsScore,
    note: req.body.note ?? null,
  }).returning();

  recordEvent(userId, "resume", `Saved version ${nextVersion} of ${resume.title}`).catch(() => {});
  res.status(201).json({ ...version, createdAt: version.createdAt.toISOString() });
});

/** List all versions of a resume. */
router.get("/resume-intelligence/:id/versions", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!resume || resume.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }
  const versions = await db.select().from(resumeVersionsTable)
    .where(eq(resumeVersionsTable.resumeId, id))
    .orderBy(desc(resumeVersionsTable.versionNo));
  res.json(versions.map(v => ({ id: v.id, versionNo: v.versionNo, atsScore: v.atsScore, note: v.note, createdAt: v.createdAt.toISOString() })));
});

/** Restore a previous version (creates a new snapshot of current, then applies old). */
router.post("/resume-intelligence/:id/restore/:versionId", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const versionId = parseInt(String(req.params.versionId), 10);
  const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!resume || resume.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }
  const [version] = await db.select().from(resumeVersionsTable).where(eq(resumeVersionsTable.id, versionId));
  if (!version || version.resumeId !== id || version.userId !== userId) { res.status(404).json({ error: "Version not found" }); return; }

  const snap = version.snapshot as Record<string, any>;
  const fields = ["title", "fullName", "email", "mobile", "city", "education", "college", "skills", "projects", "workExperience", "certifications", "languages", "template", "generatedContent"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of fields) { if (snap[f] !== undefined) updates[f] = snap[f]; }

  const [updated] = await db.update(resumesTable).set(updates as any).where(eq(resumesTable.id, id)).returning();
  recordEvent(userId, "resume", `Restored ${resume.title} to version ${version.versionNo}`).catch(() => {});
  res.json(updated);
});

/** Compare two resumes (or two versions) side by side. */
router.post("/resume-intelligence/compare", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { resumeAId, resumeBId } = req.body;
  if (!resumeAId || !resumeBId) { res.status(400).json({ error: "resumeAId and resumeBId are required" }); return; }
  const [a] = await db.select().from(resumesTable).where(eq(resumesTable.id, Number(resumeAId)));
  const [b] = await db.select().from(resumesTable).where(eq(resumesTable.id, Number(resumeBId)));
  if (!a || a.userId !== userId) { res.status(404).json({ error: "Resume A not found" }); return; }
  if (!b || b.userId !== userId) { res.status(404).json({ error: "Resume B not found" }); return; }

  const ia = await aiIntelligence(a);
  const ib = await aiIntelligence(b);

  const textA = extractText(a).toLowerCase();
  const textB = extractText(b).toLowerCase();
  const skillsA = new Set((a.skills ?? "").toLowerCase().split(/[,\n;]/).map(s => s.trim()).filter(Boolean));
  const skillsB = new Set((b.skills ?? "").toLowerCase().split(/[,\n;]/).map(s => s.trim()).filter(Boolean));
  const onlyA = [...skillsA].filter(s => !skillsB.has(s));
  const onlyB = [...skillsB].filter(s => !skillsA.has(s));

  res.json({
    resumeA: { id: a.id, title: a.title, scores: ia },
    resumeB: { id: b.id, title: b.title, scores: ib },
    skillsOnlyInA: onlyA,
    skillsOnlyInB: onlyB,
    winner: ia.atsScore === ib.atsScore ? "tie" : ia.atsScore > ib.atsScore ? "A" : "B",
    advice: ia.atsScore > ib.atsScore
      ? `${a.title} scores higher (${ia.atsScore} vs ${ib.atsScore}). Use its structure as your base.`
      : `${b.title} scores higher (${ib.atsScore} vs ${ia.atsScore}). Use its structure as your base.`,
  });
});

export default router;
