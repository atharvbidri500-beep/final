import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, coverLettersTable } from "@workspace/db";
import { askAI } from "../lib/ai.js";

const router = Router();

function fallbackCoverLetter(jobRole: string, companyName: string, experienceLevel: string, additionalInfo?: string): string {
  const expMap: Record<string, string> = {
    "fresher": "a motivated fresher eager to launch my professional career",
    "1-2 years": "a professional with 1-2 years of hands-on experience",
    "3-5 years": "an experienced professional with 3-5 years in the industry",
    "5+ years": "a seasoned professional with over 5 years of industry experience",
  };
  const expDesc = expMap[experienceLevel] ?? "a dedicated and results-driven professional";
  return `Dear Hiring Manager,

I am writing to express my strong interest in the ${jobRole} position at ${companyName}. As ${expDesc}, I am confident that my skills, dedication, and passion make me a strong fit for your team.

I have been following ${companyName}'s work with great interest and admiration. Your commitment to innovation and excellence resonates deeply with my professional values. I am particularly drawn to the opportunity to contribute meaningfully to your team's goals.

${additionalInfo ? `${additionalInfo}\n\n` : ""}Throughout my ${experienceLevel === "fresher" ? "academic journey" : "career"}, I have developed strong skills in problem-solving, communication, and collaborative teamwork. I thrive in dynamic environments and consistently go above and beyond to deliver high-quality results.

I am excited about the opportunity to bring my expertise to ${companyName} and contribute to your continued growth and success. I would welcome the opportunity to discuss how my background aligns with your needs.

Thank you for considering my application. I look forward to the possibility of speaking with you.

Yours sincerely,
[Your Name]
[Your Mobile Number]
[Your Email Address]`;
}

async function generateWithAI(jobRole: string, companyName: string, experienceLevel: string, additionalInfo?: string): Promise<string> {
  const prompt = `Write a professional, compelling cover letter for a job application in the Indian job market.

Details:
- Job Role: ${jobRole}
- Company: ${companyName}
- Experience Level: ${experienceLevel}
${additionalInfo ? `- About the candidate: ${additionalInfo}` : ""}

Requirements:
1. Start with "Dear Hiring Manager,"
2. Write 4 well-structured paragraphs
3. Be specific to the job role and company — not generic
4. Mention relevant skills for ${jobRole}
5. Show enthusiasm for ${companyName} specifically
6. Professional, warm tone suitable for Indian corporate culture
7. End with "Yours sincerely," followed by placeholder lines for name/contact
8. Do NOT use placeholders like [Your Company] — use the actual company name
9. Total length: 250-350 words

Write ONLY the cover letter text — no title, no subject line, no extra commentary.`;

  try {
    const raw = await askAI([
      { role: "system", content: "You are a professional cover letter writer specializing in Indian job applications. Write polished, specific cover letters." },
      { role: "user", content: prompt },
    ], false, 18000);
    const cleaned = raw.trim();
    if (cleaned.length > 100 && cleaned.toLowerCase().includes("dear")) return cleaned;
    return fallbackCoverLetter(jobRole, companyName, experienceLevel, additionalInfo);
  } catch {
    return fallbackCoverLetter(jobRole, companyName, experienceLevel, additionalInfo);
  }
}

router.get("/cover-letters", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Login required to view cover letters" }); return; }
  const letters = await db.select().from(coverLettersTable).where(eq(coverLettersTable.userId, userId)).orderBy(desc(coverLettersTable.createdAt));
  res.json(letters.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })));
});

router.post("/cover-letters", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Login required to generate a cover letter" }); return; }
  const { jobRole, companyName, experienceLevel, additionalInfo } = req.body;
  if (!jobRole || !companyName || !experienceLevel) {
    res.status(400).json({ error: "jobRole, companyName, and experienceLevel are required" });
    return;
  }
  const content = await generateWithAI(jobRole, companyName, experienceLevel, additionalInfo);
  const [letter] = await db.insert(coverLettersTable).values({ userId, jobRole, companyName, experienceLevel, content }).returning();
  res.status(201).json({ ...letter, createdAt: letter.createdAt.toISOString() });
});

router.get("/cover-letters/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [letter] = await db.select().from(coverLettersTable).where(eq(coverLettersTable.id, id));
  if (!letter || letter.userId !== userId) { res.status(404).json({ error: "Cover letter not found" }); return; }
  res.json({ ...letter, createdAt: letter.createdAt.toISOString() });
});

router.delete("/cover-letters/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(coverLettersTable).where(eq(coverLettersTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Cover letter not found" }); return; }
  await db.delete(coverLettersTable).where(eq(coverLettersTable.id, id));
  res.sendStatus(204);
});

export default router;
