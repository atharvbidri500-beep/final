import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, resumesTable } from "@workspace/db";

const router = Router();

function formatResume(r: typeof resumesTable.$inferSelect) {
  return {
    id: r.id,
    userId: r.userId,
    title: r.title,
    fullName: r.fullName ?? null,
    mobile: r.mobile ?? null,
    email: r.email ?? null,
    city: r.city ?? null,
    education: r.education ?? null,
    college: r.college ?? null,
    skills: r.skills ?? null,
    projects: r.projects ?? null,
    workExperience: r.workExperience ?? null,
    certifications: r.certifications ?? null,
    languages: r.languages ?? null,
    template: r.template,
    generatedContent: r.generatedContent ?? null,
    atsScore: r.atsScore ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function generateResumeContent(data: Record<string, string | null | undefined>): string {
  const lines: string[] = [];
  if (data.fullName) lines.push(`# ${data.fullName}`);
  if (data.mobile || data.email || data.city) {
    lines.push([data.mobile, data.email, data.city].filter(Boolean).join(" | "));
  }
  if (data.education || data.college) {
    lines.push("\n## Education");
    if (data.college) lines.push(data.college);
    if (data.education) lines.push(data.education);
  }
  if (data.skills) {
    lines.push("\n## Skills");
    lines.push(data.skills);
  }
  if (data.workExperience) {
    lines.push("\n## Work Experience");
    lines.push(data.workExperience);
  }
  if (data.projects) {
    lines.push("\n## Projects");
    lines.push(data.projects);
  }
  if (data.certifications) {
    lines.push("\n## Certifications");
    lines.push(data.certifications);
  }
  if (data.languages) {
    lines.push("\n## Languages");
    lines.push(data.languages);
  }
  return lines.join("\n");
}

function computeAtsScore(data: Record<string, string | null | undefined>): number {
  let score = 30;
  if (data.fullName) score += 10;
  if (data.email) score += 10;
  if (data.mobile) score += 5;
  if (data.education) score += 10;
  if (data.skills) score += 15;
  if (data.workExperience) score += 10;
  if (data.projects) score += 5;
  if (data.certifications) score += 5;
  return Math.min(100, score);
}

router.get("/resumes", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const resumes = await db.select().from(resumesTable).where(eq(resumesTable.userId, userId)).orderBy(desc(resumesTable.createdAt));
  res.json(resumes.map(formatResume));
});

router.post("/resumes", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, template, fullName, mobile, email, city, education, college, skills, projects, workExperience, certifications, languages } = req.body;
  if (!title) { res.status(400).json({ error: "Title is required" }); return; }

  const dataObj = { fullName, mobile, email, city, education, college, skills, projects, workExperience, certifications, languages };
  const generatedContent = generateResumeContent(dataObj);
  const atsScore = computeAtsScore(dataObj);

  const [resume] = await db.insert(resumesTable).values({
    userId,
    title,
    template: template ?? "professional",
    fullName: fullName ?? null,
    mobile: mobile ?? null,
    email: email ?? null,
    city: city ?? null,
    education: education ?? null,
    college: college ?? null,
    skills: skills ?? null,
    projects: projects ?? null,
    workExperience: workExperience ?? null,
    certifications: certifications ?? null,
    languages: languages ?? null,
    generatedContent,
    atsScore,
  }).returning();

  res.status(201).json(formatResume(resume));
});

router.get("/resumes/analyze", async (req, res): Promise<void> => {
  res.status(405).json({ error: "Use POST /resumes/analyze" });
});

router.post("/resumes/analyze", async (req, res): Promise<void> => {
  const { resumeText, jobRole } = req.body;
  if (!resumeText) { res.status(400).json({ error: "resumeText is required" }); return; }

  const text = resumeText as string;
  const hasEmail = /[\w.-]+@[\w.-]+/.test(text);
  const hasPhone = /\d{10}/.test(text);
  const hasSections = ["education", "skills", "experience", "project"].some(s => text.toLowerCase().includes(s));
  const wordCount = text.split(/\s+/).length;

  const atsScore = Math.min(95, 30 + (hasEmail ? 15 : 0) + (hasPhone ? 10 : 0) + (hasSections ? 20 : 0) + Math.min(25, Math.floor(wordCount / 20)));
  const skillsScore = Math.min(95, 40 + (text.toLowerCase().includes("skill") ? 25 : 0) + Math.min(30, Math.floor(wordCount / 30)));
  const formattingScore = Math.min(95, 50 + (hasSections ? 30 : 0) + (wordCount > 150 ? 15 : 0));
  const overallScore = Math.floor((atsScore + skillsScore + formattingScore) / 3);

  const suggestions: string[] = [];
  if (!hasEmail) suggestions.push("Add your email address for recruiter contact");
  if (!hasPhone) suggestions.push("Include a 10-digit mobile number");
  if (!hasSections) suggestions.push("Add clear section headings: Skills, Education, Experience");
  if (wordCount < 100) suggestions.push("Add more detail — aim for at least 200-300 words");
  if (jobRole) suggestions.push(`Add keywords from ${jobRole} job descriptions`);
  suggestions.push("Use action verbs: Developed, Led, Implemented, Achieved");
  suggestions.push("Quantify achievements with numbers and percentages");

  const strengths: string[] = [];
  if (hasEmail) strengths.push("Contact information is present");
  if (hasSections) strengths.push("Good section structure");
  if (wordCount > 150) strengths.push("Adequate content length");

  res.json({ overallScore, atsScore, skillsScore, formattingScore, suggestions, strengths });
});

router.post("/resumes/job-match", async (req, res): Promise<void> => {
  const { resumeText, jobDescription } = req.body;
  if (!resumeText || !jobDescription) { res.status(400).json({ error: "resumeText and jobDescription are required" }); return; }

  const resumeWords = new Set((resumeText as string).toLowerCase().split(/\W+/).filter((w: string) => w.length > 3));
  const jobWords = (jobDescription as string).toLowerCase().split(/\W+/).filter((w: string) => w.length > 3);

  const techKeywords = ["javascript", "python", "java", "react", "node", "sql", "excel", "communication", "leadership", "teamwork", "management", "analysis", "design", "testing", "agile", "git", "api", "database", "html", "css"];
  const jobKeywords = [...new Set(jobWords.filter(w => techKeywords.includes(w) || jobWords.indexOf(w) < 50))];
  const matched = jobKeywords.filter(k => resumeWords.has(k));
  const missing = jobKeywords.filter(k => !resumeWords.has(k)).slice(0, 8);

  const matchPercentage = jobKeywords.length > 0 ? Math.min(95, Math.floor((matched.length / jobKeywords.length) * 100)) : 50;

  res.json({
    matchPercentage,
    matchedSkills: matched.slice(0, 10),
    missingSkills: missing,
    suggestions: [
      `Add these missing skills to your resume: ${missing.slice(0, 3).join(", ")}`,
      "Tailor your resume summary to match the job description",
      "Use exact keywords from the job posting",
      "Quantify your experience to stand out",
    ],
  });
});

router.get("/resumes/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!resume || resume.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }
  res.json(formatResume(resume));
});

router.get("/resumes/:id/score", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!resume || resume.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }

  const ats = resume.atsScore ?? 50;
  res.json({
    overallScore: ats,
    atsScore: ats,
    skillsScore: Math.min(100, ats + 5),
    formattingScore: Math.min(100, ats - 5),
    suggestions: ["Add more keywords relevant to your target role", "Quantify your achievements", "Keep your resume to 1-2 pages"],
    strengths: ["Clear contact information", "Good structure"],
  });
});

router.patch("/resumes/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [existing] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }

  const updates: Partial<typeof resumesTable.$inferSelect> = {};
  const fields = ["title", "fullName", "mobile", "email", "city", "education", "college", "skills", "projects", "workExperience", "certifications", "languages", "template", "generatedContent", "atsScore"] as const;
  for (const f of fields) {
    if (req.body[f] !== undefined) (updates as any)[f] = req.body[f];
  }

  const [updated] = await db.update(resumesTable).set(updates).where(eq(resumesTable.id, id)).returning();
  res.json(formatResume(updated));
});

router.delete("/resumes/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [existing] = await db.select().from(resumesTable).where(eq(resumesTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Resume not found" }); return; }
  await db.delete(resumesTable).where(eq(resumesTable.id, id));
  res.sendStatus(204);
});

export default router;
