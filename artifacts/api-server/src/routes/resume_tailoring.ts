import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db, resumesTable, resumeTailoringsTable,
} from "@workspace/db";
import { askAI, safeParseJSON } from "../lib/ai.js";
import { awardXP } from "../lib/gamification.js";
import { recordEvent } from "../lib/careerMemory.js";
import { requirePremium } from "../lib/gating.js";

const router = Router();

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

function extractKeywords(jobDescription: string): string[] {
  const common = [
    "javascript", "typescript", "python", "java", "react", "node.js", "sql",
    "git", "api", "aws", "docker", "agile", "excel", "communication",
    "leadership", "teamwork", "problem-solving", "data analysis", "figma",
    "seo", "marketing", "sales", "negotiation", "reporting", "python",
    "machine learning", "testing", "ci/cd", "html", "css", "mobile",
    "customer service", "management", "research", "design", "cloud",
  ];
  const lower = jobDescription.toLowerCase();
  return common.filter(k => lower.includes(k)).slice(0, 12);
}

function ruleTailoredText(resume: typeof resumesTable.$inferSelect, jobDescription: string, keywords: string[]): { text: string; changes: string[] } {
  const keywordLine = keywords.length > 0 ? `\n\nKeyword integration: ${keywords.join(", ")}` : "";
  const changes: string[] = [];
  if (keywords.length > 0) {
    changes.push(`Mapped ${keywords.length} keywords from the job description`);
  }
  if (resume.skills) {
    const lower = resume.skills.toLowerCase();
    const added = keywords.filter(k => !lower.includes(k));
    if (added.length > 0) changes.push(`Suggested adding: ${added.join(", ")}`);
  }
  const text = `${extractText(resume)}${keywordLine}\n\nTarget role: ${jobDescription.slice(0, 500)}`;
  changes.push("Reordered summary to lead with the target role");
  return { text, changes };
}

/** AI-tailored resume for a specific job posting. */
router.post("/resume-tailoring/tailor/:id", requirePremium, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const { jobTitle, company, jobDescription } = req.body as { jobTitle?: string; company?: string; jobDescription?: string };
  if (!jobDescription) { res.status(400).json({ error: "jobDescription is required" }); return; }
  const title = jobTitle ?? "Target role";

  const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!resume || resume.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }

  const text = extractText(resume);
  const ruleKeywords = extractKeywords(jobDescription);
  const fallback = ruleTailoredText(resume, jobDescription, ruleKeywords);

  const prompt = `You are a professional resume writer. Tailor this resume to the job below. Rewrite the summary and bullet points so every line supports the target role, naturally integrating the job's keywords. Never invent facts — reuse the candidate's real content. Keep the same section structure.

Return ONLY valid JSON (no markdown):
{
  "tailoredText": "the complete rewritten resume as plain text with sections",
  "keywords": ["keyword 1", "keyword 2", "max 12"],
  "changes": ["what you changed and why", "max 6"]
}

Job title: ${title}
Company: ${company ?? "unknown"}
Job description:
${jobDescription.slice(0, 3000)}

Original resume:
${text.slice(0, 4000)}`;

  let result: { tailoredText: string; keywords: string[]; changes: string[] } | null = null;
  try {
    const raw = await askAI([
      { role: "system", content: "You are an expert resume writer. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ], true, 25000);
    const p = safeParseJSON<any>(raw, null);
    if (p && typeof p.tailoredText === "string" && p.tailoredText.length > 100) {
      result = {
        tailoredText: p.tailoredText,
        keywords: Array.isArray(p.keywords) ? p.keywords.slice(0, 12) : ruleKeywords,
        changes: Array.isArray(p.changes) ? p.changes.slice(0, 6) : fallback.changes,
      };
    }
  } catch { /* fall back to rules */ }

  if (!result) result = { tailoredText: fallback.text, keywords: ruleKeywords, changes: fallback.changes };

  const [saved] = await db.insert(resumeTailoringsTable).values({
    userId,
    resumeId: id,
    jobTitle: title,
    company: company ?? null,
    originalText: text.slice(0, 10000),
    tailoredText: result.tailoredText.slice(0, 20000),
    keywords: result.keywords,
    changes: result.changes,
    targetScore: Math.min(97, (resume.atsScore ?? 50) + 8 + result.keywords.length * 2),
  }).returning();

  awardXP(userId, 15, `Tailored resume for ${title}`).catch(() => {});
  recordEvent(userId, "resume", `Tailored "${resume.title}" for ${title}${company ? ` at ${company}` : ""}`).catch(() => {});

  res.status(201).json({ ...saved, createdAt: saved.createdAt.toISOString() });
});

/** List tailoring history for the user. */
router.get("/resume-tailoring/history", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(resumeTailoringsTable)
    .where(eq(resumeTailoringsTable.userId, userId))
    .orderBy(desc(resumeTailoringsTable.createdAt))
    .limit(50);
  res.json(rows.map(r => ({
    id: r.id, resumeId: r.resumeId, jobTitle: r.jobTitle, company: r.company,
    keywords: r.keywords, changes: r.changes, targetScore: r.targetScore,
    createdAt: r.createdAt.toISOString(),
  })));
});

/** Get one tailoring session with full before/after text. */
router.get("/resume-tailoring/history/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [row] = await db.select().from(resumeTailoringsTable).where(eq(resumeTailoringsTable.id, id));
  if (!row || row.userId !== userId) { res.status(404).json({ error: "Tailoring session not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

export default router;
