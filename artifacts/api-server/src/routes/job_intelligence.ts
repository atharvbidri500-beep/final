import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, jobIntelRecommendationsTable, jobsTable } from "@workspace/db";
import { requireTier } from "../lib/gating.js";
import { refreshRecommendations, getLatestIntel, logActivity } from "../lib/jobIntelligence.js";
import { getJobSourceStatus } from "../lib/jobSources.js";

const router = Router();

router.use(async (req, res, next): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (userId) {
    try {
      const [user] = await db.select({ aiJobIntelConsent: usersTable.aiJobIntelConsent })
        .from(usersTable).where(eq(usersTable.id, userId));
      (req as any).userConsent = !!user?.aiJobIntelConsent;
    } catch {
      (req as any).userConsent = false;
    }
  } else {
    (req as any).userConsent = false;
  }
  next();
});

router.get("/job-intelligence/consent", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [user] = await db.select({ aiJobIntelConsent: usersTable.aiJobIntelConsent })
    .from(usersTable).where(eq(usersTable.id, userId));
  res.json({
    consent: !!user?.aiJobIntelConsent,
    description: "The AI job intelligence engine analyzes your activity inside Hire Pilot (resumes, skills, interview practice, assessments, job activity, learning progress) to build a private profile used only to match you with better jobs. You can turn this off at any time. Your data is never shared.",
  });
});

router.post("/job-intelligence/consent", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const enabled = req.body?.enabled === true;
  await db.update(usersTable).set({ aiJobIntelConsent: enabled }).where(eq(usersTable.id, userId));
  res.json({ consent: enabled });
});

const ALLOWED_ACTIVITY_TYPES = new Set(["job_viewed", "job_saved", "job_applied", "feature_used", "practice", "quiz", "assessment"]);

router.post("/job-intelligence/activity", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { eventType, jobId, data } = req.body as { eventType?: string; jobId?: number; data?: Record<string, unknown> };
  if (!eventType || !ALLOWED_ACTIVITY_TYPES.has(eventType)) {
    res.status(400).json({ error: "Invalid eventType" });
    return;
  }
  const logged = await logActivity(userId, eventType, jobId ?? null, data ?? {});
  res.json({ logged });
});

router.get("/job-intelligence/profile", requireTier("premium"), async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(req as any).userConsent) {
    res.status(403).json({ error: "CONSENT_REQUIRED", message: "Enable AI job intelligence consent in settings to see your profile." });
    return;
  }
  const latest = await getLatestIntel(userId);
  if (!latest) {
    res.status(404).json({ error: "No profile yet. Run a refresh first." });
    return;
  }
  res.json({ profile: latest.profile, computedAt: latest.computedAt, stale: latest.stale });
});

router.post("/job-intelligence/refresh", requireTier("premium"), async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(req as any).userConsent) {
    res.status(403).json({ error: "CONSENT_REQUIRED", message: "Enable AI job intelligence consent in settings to get AI recommendations." });
    return;
  }
  try {
    const result = await refreshRecommendations(userId);
    res.json(result);
  } catch (err) {
    console.error("job-intelligence refresh error:", err);
    res.status(500).json({ error: "Intelligence refresh failed. Try again." });
  }
});

router.get("/job-intelligence/recommendations", requireTier("premium"), async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(req as any).userConsent) {
    res.status(403).json({ error: "CONSENT_REQUIRED", message: "Enable AI job intelligence consent in settings to get AI recommendations." });
    return;
  }
  const latest = await getLatestIntel(userId);
  if (!latest) {
    res.json({ profile: null, recommendations: [], computedAt: null, needsRefresh: true });
    return;
  }
  if (latest.stale) {
    res.json({ ...latest, needsRefresh: true });
    return;
  }
  res.json({ ...latest, needsRefresh: false });
});

router.get("/job-intelligence/recommendations/:id", requireTier("premium"), async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [rec] = await db.select().from(jobIntelRecommendationsTable)
    .where(eq(jobIntelRecommendationsTable.id, id));
  if (!rec || rec.userId !== userId) { res.status(404).json({ error: "Recommendation not found" }); return; }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, rec.jobId));
  res.json({
    id: rec.id,
    job,
    score: rec.score,
    breakdown: rec.breakdown ?? [],
    matchedSkills: rec.matchedSkills ?? [],
    missingSkills: rec.missingSkills ?? [],
    reasons: rec.reasons ?? [],
    improvements: rec.improvements ?? [],
    competitiveness: rec.competitiveness,
    feedback: rec.feedback ?? null,
  });
});

router.post("/job-intelligence/recommendations/:id/feedback", requireTier("premium"), async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [rec] = await db.select().from(jobIntelRecommendationsTable)
    .where(eq(jobIntelRecommendationsTable.id, id));
  if (!rec || rec.userId !== userId) { res.status(404).json({ error: "Recommendation not found" }); return; }
  const helpful = req.body?.helpful === true;
  await db.update(jobIntelRecommendationsTable).set({ feedback: helpful }).where(eq(jobIntelRecommendationsTable.id, id));
  res.json({ success: true });
});

router.get("/job-intelligence/sources", requireTier("premium"), async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const status = await getJobSourceStatus();
  res.json(status);
});

export default router;
