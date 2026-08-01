import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, resumesTable } from "@workspace/db";
import { askAI, safeParseJSON } from "../lib/ai.js";
import { checkLimit } from "../lib/limits.js";

const router = Router();

function formatResume(r: typeof resumesTable.$inferSelect) {
  return {
    id: r.id, userId: r.userId, title: r.title,
    fullName: r.fullName ?? null, mobile: r.mobile ?? null,
    email: r.email ?? null, city: r.city ?? null,
    education: r.education ?? null, college: r.college ?? null,
    skills: r.skills ?? null, projects: r.projects ?? null,
    workExperience: r.workExperience ?? null, certifications: r.certifications ?? null,
    languages: r.languages ?? null, template: r.template,
    generatedContent: r.generatedContent ?? null, atsScore: r.atsScore ?? null,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  };
}

/* ── Fallback rule-based ATS scorer ──────────────────────────────────────── */
function ruleAtsScore(data: Record<string, string | null | undefined>): number {
  let s = 20;
  if (data.fullName) s += 8;
  if (data.email) s += 10;
  if (data.mobile) s += 7;
  if (data.city) s += 3;
  if (data.education) s += 10;
  if (data.college) s += 5;
  if (data.skills) s += 15;
  if (data.workExperience) s += 12;
  if (data.projects) s += 7;
  if (data.certifications) s += 3;
  return Math.min(97, s);
}

interface ATSResult {
  atsScore: number;
  skillsScore: number;
  formattingScore: number;
  overallScore: number;
  strengths: string[];
  suggestions: string[];
}

async function scoreResumeWithAI(data: Record<string, string | null | undefined>): Promise<ATSResult> {
  const resumeText = [
    data.fullName, data.email, data.mobile, data.city,
    data.college, data.education,
    "Skills: " + data.skills,
    "Experience: " + data.workExperience,
    "Projects: " + data.projects,
    "Certifications: " + data.certifications,
  ].filter(Boolean).join("\n");

  const prompt = `You are a professional ATS (Applicant Tracking System) expert and resume coach for the Indian job market.

Analyze this resume and score it ACCURATELY — do not inflate scores. Be strict and honest.

Resume content:
${resumeText}

Respond with ONLY valid JSON (no markdown):
{
  "atsScore": <0-100: ATS keyword optimization and machine-readability>,
  "skillsScore": <0-100: relevance and depth of skills section>,
  "formattingScore": <0-100: structure, completeness, professional formatting>,
  "overallScore": <0-100: weighted average>,
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "suggestions": ["actionable improvement 1", "improvement 2", "improvement 3", "improvement 4", "improvement 5"]
}

Scoring guide: Missing critical fields = 40-50. Basic fields present = 50-65. Good content = 65-80. Excellent = 80-95.`;

  try {
    const raw = await askAI([
      { role: "system", content: "You are a strict ATS resume scoring expert. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ], true, 15000);
    const parsed = safeParseJSON<ATSResult>(raw, null as any);
    if (parsed && typeof parsed.atsScore === "number") {
      return {
        atsScore: Math.max(0, Math.min(100, Math.round(parsed.atsScore))),
        skillsScore: Math.max(0, Math.min(100, Math.round(parsed.skillsScore ?? parsed.atsScore))),
        formattingScore: Math.max(0, Math.min(100, Math.round(parsed.formattingScore ?? parsed.atsScore - 5))),
        overallScore: Math.max(0, Math.min(100, Math.round(parsed.overallScore ?? parsed.atsScore))),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    }
  } catch { /* fall through */ }

  const base = ruleAtsScore(data);
  return {
    atsScore: base,
    skillsScore: Math.min(97, base + 3),
    formattingScore: Math.min(97, base - 3),
    overallScore: base,
    strengths: [
      data.skills ? "Skills section present" : "Contact info provided",
      data.workExperience ? "Work experience included" : "Education details filled",
    ].filter(Boolean),
    suggestions: [
      !data.skills ? "Add a detailed skills section with at least 8-10 relevant skills" : "Expand skills with proficiency levels",
      !data.workExperience ? "Add internship or project experience even if it's academic" : "Quantify your achievements with numbers",
      !data.certifications ? "Add industry certifications like AWS, Google, or HackerRank badges" : "List certification scores if strong",
      "Use action verbs: Developed, Architected, Led, Optimized, Delivered",
      "Include a 2-3 line professional summary at the top",
    ],
  };
}

/* ── AI job match ─────────────────────────────────────────────────────────── */
interface MatchResult {
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: string[];
}

async function jobMatchWithAI(resumeText: string, jobDescription: string): Promise<MatchResult> {
  const prompt = `You are an expert recruiter and resume-to-job-description matching specialist.

Resume:
${resumeText.slice(0, 2000)}

Job Description:
${jobDescription.slice(0, 1500)}

Analyze how well this resume matches the job. Respond with ONLY valid JSON (no markdown):
{
  "matchPercentage": <0-100: realistic match score>,
  "matchedSkills": ["skill 1", "skill 2", ...up to 10 skills found in both],
  "missingSkills": ["missing skill 1", "missing skill 2", ...up to 8 skills in JD but not resume],
  "suggestions": [
    "specific actionable suggestion 1",
    "suggestion 2",
    "suggestion 3",
    "suggestion 4"
  ]
}`;

  try {
    const raw = await askAI([
      { role: "system", content: "You are an expert ATS and resume matching specialist. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ], true, 15000);
    const parsed = safeParseJSON<MatchResult>(raw, null as any);
    if (parsed && typeof parsed.matchPercentage === "number") {
      return {
        matchPercentage: Math.max(0, Math.min(100, Math.round(parsed.matchPercentage))),
        matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills.slice(0, 10) : [],
        missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills.slice(0, 8) : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    }
  } catch { /* fall through */ }

  // Rule-based fallback
  const resumeWords = new Set(resumeText.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const jdWords = jobDescription.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const keywords = ["javascript","python","java","react","node","sql","excel","communication","leadership","teamwork","management","analysis","design","testing","agile","git","api","database","html","css","aws","docker","typescript","mongodb","postgresql","machine learning","data","analytics"];
  const jdKeywords = [...new Set(jdWords.filter(w => keywords.includes(w)))];
  const matched = jdKeywords.filter(k => resumeWords.has(k));
  const missing = jdKeywords.filter(k => !resumeWords.has(k)).slice(0, 8);
  const pct = jdKeywords.length > 0 ? Math.min(92, Math.floor((matched.length / jdKeywords.length) * 100)) : 50;
  return {
    matchPercentage: pct,
    matchedSkills: matched.slice(0, 10),
    missingSkills: missing,
    suggestions: [
      `Add these missing skills to your resume: ${missing.slice(0, 3).join(", ") || "more technical skills"}`,
      "Tailor your resume summary to mirror the job description language",
      "Use exact keywords from the job posting — ATS matches them literally",
      "Quantify your experience to stand out among applicants",
    ],
  };
}

/* ── AI resume analyzer (for resume-score page) ──────────────────────────── */
interface AnalyzeResult {
  overallScore: number;
  atsScore: number;
  skillsScore: number;
  formattingScore: number;
  suggestions: string[];
  strengths: string[];
}

async function analyzeResumeText(resumeText: string, jobRole?: string): Promise<AnalyzeResult> {
  const prompt = `You are a professional ATS and resume expert for the Indian job market.

Resume text:
${resumeText.slice(0, 3000)}
${jobRole ? `\nTarget job role: ${jobRole}` : ""}

Score this resume HONESTLY. Respond with ONLY valid JSON:
{
  "overallScore": <0-100>,
  "atsScore": <0-100: ATS keyword and format score>,
  "skillsScore": <0-100: skills section quality>,
  "formattingScore": <0-100: structure and formatting>,
  "strengths": ["specific strength 1", "strength 2", "strength 3"],
  "suggestions": [
    "specific actionable improvement 1",
    "improvement 2",
    "improvement 3",
    "improvement 4",
    "improvement 5"
  ]
}

Be specific to the actual resume content, not generic advice.`;

  try {
    const raw = await askAI([
      { role: "system", content: "You are a strict resume scoring expert. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ], true, 15000);
    const parsed = safeParseJSON<AnalyzeResult>(raw, null as any);
    if (parsed && typeof parsed.overallScore === "number") {
      return {
        overallScore: Math.max(0, Math.min(100, Math.round(parsed.overallScore))),
        atsScore: Math.max(0, Math.min(100, Math.round(parsed.atsScore ?? parsed.overallScore))),
        skillsScore: Math.max(0, Math.min(100, Math.round(parsed.skillsScore ?? parsed.overallScore))),
        formattingScore: Math.max(0, Math.min(100, Math.round(parsed.formattingScore ?? parsed.overallScore))),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    }
  } catch { /* fall through */ }

  // Rule-based fallback
  const text = resumeText.toLowerCase();
  const hasEmail = /[\w.-]+@[\w.-]+/.test(resumeText);
  const hasPhone = /\d{10}/.test(resumeText);
  const hasSections = ["education", "skills", "experience", "project"].some(s => text.includes(s));
  const wc = resumeText.split(/\s+/).length;
  const ats = Math.min(93, 25 + (hasEmail ? 15 : 0) + (hasPhone ? 10 : 0) + (hasSections ? 25 : 0) + Math.min(18, Math.floor(wc / 20)));
  return {
    overallScore: ats,
    atsScore: ats,
    skillsScore: Math.min(93, ats + 5),
    formattingScore: Math.min(93, ats - 5),
    strengths: [
      ...(hasEmail ? ["Email address present"] : []),
      ...(hasSections ? ["Clear section headings"] : []),
      ...(wc > 150 ? ["Adequate content length"] : []),
    ],
    suggestions: [
      ...(!hasEmail ? ["Add your email address"] : []),
      ...(!hasPhone ? ["Add a 10-digit Indian mobile number"] : []),
      ...(!hasSections ? ["Add clear sections: Skills, Education, Experience, Projects"] : []),
      ...(wc < 150 ? ["Add more detail — aim for 300+ words"] : []),
      jobRole ? `Add keywords specific to ${jobRole} job descriptions` : "Tailor your resume for each job you apply to",
      "Add quantified achievements: 'Led a team of 5', 'Improved performance by 30%'",
    ].slice(0, 5),
  };
}

/* ── ROUTES ───────────────────────────────────────────────────────────────── */

router.get("/resumes", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Login required" }); return; }
  const resumes = await db.select().from(resumesTable).where(eq(resumesTable.userId, userId)).orderBy(desc(resumesTable.createdAt));
  res.json(resumes.map(formatResume));
});

router.post("/resumes", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Login required to build a resume" }); return; }
  const { title, template, fullName, mobile, email, city, education, college, skills, projects, workExperience, certifications, languages } = req.body;
  if (!title) { res.status(400).json({ error: "Title is required" }); return; }

  const limit = await checkLimit(userId, "resume");
  if (limit.over) { res.status(402).json({ error: "UPGRADE_REQUIRED", message: limit.message }); return; }

  const dataObj = { fullName, mobile, email, city, education, college, skills, projects, workExperience, certifications, languages };
  const aiResult = await scoreResumeWithAI(dataObj);
  const atsScore = aiResult.atsScore;
  const generatedContent = [fullName, email, mobile, city, college, education, skills, workExperience, projects, certifications, languages].filter(Boolean).join("\n");

  const [resume] = await db.insert(resumesTable).values({
    userId, title, template: template ?? "professional",
    fullName: fullName ?? null, mobile: mobile ?? null, email: email ?? null,
    city: city ?? null, education: education ?? null, college: college ?? null,
    skills: skills ?? null, projects: projects ?? null, workExperience: workExperience ?? null,
    certifications: certifications ?? null, languages: languages ?? null,
    generatedContent, atsScore,
  }).returning();

  res.status(201).json({ ...formatResume(resume), strengths: aiResult.strengths, suggestions: aiResult.suggestions });
});

router.post("/resumes/analyze", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Login required to analyze a resume" }); return; }
  const limit = await checkLimit(userId, "resume");
  if (limit.over) { res.status(402).json({ error: "UPGRADE_REQUIRED", message: limit.message }); return; }
  const { resumeText, jobRole } = req.body;
  if (!resumeText) { res.status(400).json({ error: "resumeText is required" }); return; }
  if (resumeText.trim().length < 20) { res.status(400).json({ error: "Please paste your full resume text" }); return; }
  const result = await analyzeResumeText(resumeText, jobRole);
  res.json(result);
});

router.get("/resumes/analyze", async (_req, res): Promise<void> => {
  res.status(405).json({ error: "Use POST /resumes/analyze" });
});

router.post("/resumes/job-match", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Login required to use job match" }); return; }
  const limit = await checkLimit(userId, "resume");
  if (limit.over) { res.status(402).json({ error: "UPGRADE_REQUIRED", message: limit.message }); return; }
  const { resumeText, jobDescription } = req.body;
  if (!resumeText || !jobDescription) { res.status(400).json({ error: "resumeText and jobDescription are required" }); return; }
  const result = await jobMatchWithAI(resumeText, jobDescription);
  res.json(result);
});

router.get("/resumes/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!resume || resume.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }
  res.json(formatResume(resume));
});

router.get("/resumes/:id/score", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!resume || resume.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }
  const ats = resume.atsScore ?? 50;
  res.json({ overallScore: ats, atsScore: ats, skillsScore: Math.min(100, ats + 5), formattingScore: Math.min(100, ats - 5), suggestions: ["Add more keywords", "Quantify achievements"], strengths: ["Clear contact info", "Good structure"] });
});

router.patch("/resumes/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }
  const updates: Record<string, unknown> = {};
  const fields = ["title", "fullName", "mobile", "email", "city", "education", "college", "skills", "projects", "workExperience", "certifications", "languages", "template", "generatedContent", "atsScore"] as const;
  for (const f of fields) { if (req.body[f] !== undefined) updates[f] = req.body[f]; }
  const [updated] = await db.update(resumesTable).set(updates as any).where(eq(resumesTable.id, id)).returning();
  res.json(formatResume(updated));
});

router.delete("/resumes/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }
  await db.delete(resumesTable).where(eq(resumesTable.id, id));
  res.sendStatus(204);
});

export default router;
