import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, coverLettersTable } from "@workspace/db";

const router = Router();

function generateCoverLetter(jobRole: string, companyName: string, experienceLevel: string, additionalInfo?: string): string {
  const expMap: Record<string, string> = {
    "fresher": "a fresher eager to start my professional journey",
    "1-2 years": "a professional with 1-2 years of experience",
    "3-5 years": "an experienced professional with 3-5 years in the industry",
  };
  const expDesc = expMap[experienceLevel] ?? "a motivated professional";

  return `Dear Hiring Manager,

I am writing to express my strong interest in the ${jobRole} position at ${companyName}. As ${expDesc}, I am confident that my skills and dedication make me an excellent fit for your team.

I have been following ${companyName}'s growth and innovation in the industry with great admiration. Your commitment to excellence aligns perfectly with my professional values and career aspirations.

${additionalInfo ? `${additionalInfo}\n\n` : ""}In my ${experienceLevel === "fresher" ? "academic journey" : "professional career"}, I have developed strong skills in problem-solving, communication, and teamwork. I am passionate about contributing to meaningful projects and continuously learning in a dynamic environment.

I am particularly excited about the opportunity to bring my skills to ${companyName} and contribute to your mission. I am confident that my enthusiasm, work ethic, and ability to quickly adapt to new challenges will make me a valuable addition to your team.

I would welcome the opportunity to discuss how my background and skills can contribute to ${companyName}'s continued success. Thank you for considering my application.

Yours sincerely,
[Your Name]
[Your Mobile Number]
[Your Email]`;
}

router.get("/cover-letters", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const letters = await db.select().from(coverLettersTable).where(eq(coverLettersTable.userId, userId)).orderBy(desc(coverLettersTable.createdAt));
  res.json(letters.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })));
});

router.post("/cover-letters", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { jobRole, companyName, experienceLevel, additionalInfo } = req.body;
  if (!jobRole || !companyName || !experienceLevel) {
    res.status(400).json({ error: "jobRole, companyName, and experienceLevel are required" });
    return;
  }
  const content = generateCoverLetter(jobRole, companyName, experienceLevel, additionalInfo);
  const [letter] = await db.insert(coverLettersTable).values({ userId, jobRole, companyName, experienceLevel, content }).returning();
  res.status(201).json({ ...letter, createdAt: letter.createdAt.toISOString() });
});

router.get("/cover-letters/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [letter] = await db.select().from(coverLettersTable).where(eq(coverLettersTable.id, id));
  if (!letter || letter.userId !== userId) { res.status(404).json({ error: "Cover letter not found" }); return; }
  res.json({ ...letter, createdAt: letter.createdAt.toISOString() });
});

router.delete("/cover-letters/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [existing] = await db.select().from(coverLettersTable).where(eq(coverLettersTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Cover letter not found" }); return; }
  await db.delete(coverLettersTable).where(eq(coverLettersTable.id, id));
  res.sendStatus(204);
});

export default router;
