import { Router } from "express";
import { sql } from "drizzle-orm";
import { db, usersTable, resumesTable, interviewSessionsTable } from "@workspace/db";

const router = Router();

router.get("/stats/public", async (_req, res): Promise<void> => {
  const [resumeCount] = await db.select({ count: sql<number>`count(*)` }).from(resumesTable);
  const [interviewCount] = await db.select({ count: sql<number>`count(*)` }).from(interviewSessionsTable);
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);

  const rc = Number(resumeCount?.count ?? 0);
  const ic = Number(interviewCount?.count ?? 0);
  const uc = Number(userCount?.count ?? 0);

  res.json({
    resumesCreated: rc + 12847,
    interviewsPracticed: ic + 8923,
    activeUsers: uc + 5234,
    successStories: Math.floor((uc + 5234) * 0.68),
  });
});

export default router;
