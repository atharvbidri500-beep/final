import { Router } from "express";
import { eq, desc, and, sql, like } from "drizzle-orm";
import {
  pool, db, jobsTable, jobApplicationsTable, careerProfilesTable,
} from "@workspace/db";
import { askAI, safeParseJSON } from "../lib/ai.js";
import { awardXP } from "../lib/gamification.js";
import { recordEvent } from "../lib/careerMemory.js";
import { requirePremium } from "../lib/gating.js";
const router = Router();

const SKILL_SALARY_HINTS: Record<string, [number, number]> = {
  react: [450000, 1200000], "node.js": [500000, 1400000], python: [400000, 1300000],
  javascript: [350000, 1000000], java: [500000, 1500000], sql: [400000, 1100000],
  aws: [600000, 1800000], docker: [600000, 1600000], "machine learning": [600000, 2000000],
  data: [500000, 1600000], excel: [250000, 700000], salesforce: [700000, 2000000],
  testing: [300000, 900000], design: [300000, 1200000], marketing: [300000, 1200000],
};

function matchJobResume(job: typeof jobsTable.$inferSelect, resumeSkills: string[], yearsExp: number) {
  const jobSkills = job.skills ?? [];
  const lowerResume = resumeSkills.map(s => s.toLowerCase());
  const matched = jobSkills.filter(s => lowerResume.includes(s.toLowerCase()));
  const missing = jobSkills.filter(s => !lowerResume.includes(s.toLowerCase()));

  let score = 30 + (jobSkills.length > 0 ? (matched.length / jobSkills.length) * 40 : 20);
  if (yearsExp >= job.experienceRequired) score += 15;
  else score += Math.max(0, (yearsExp / Math.max(1, job.experienceRequired)) * 10);
  score = Math.min(98, Math.round(score));

  return { score, matchedSkills: matched, missingSkills: missing.slice(0, 6) };
}

/* ── Job listings (admin-seeded + platform) ──────────────────────────────── */

router.get("/jobs", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  const { q, remote, internship, type, minSalary, location } = req.query as Record<string, string | undefined>;

  const conditions = [eq(jobsTable.isActive, true)];
  if (remote === "true") conditions.push(eq(jobsTable.isRemote, true));
  if (internship === "true") conditions.push(eq(jobsTable.isInternship, true));
  if (type) conditions.push(eq(jobsTable.jobType, type));
  if (location) conditions.push(like(jobsTable.location, `%${location}%`));
  if (q) conditions.push(sql`(${jobsTable.title} ILIKE ${`%${q}%`} OR ${jobsTable.company} ILIKE ${`%${q}%`} OR ${jobsTable.description} ILIKE ${`%${q}%`})`);
  if (minSalary) conditions.push(gteFilter(jobsTable.salaryMax, Number(minSalary)));

  let query = db.select().from(jobsTable).where(and(...conditions)).orderBy(desc(jobsTable.createdAt));
  const jobs = await query;

  const { rows: skillRows } = userId
    ? await pool.query("SELECT name FROM skills WHERE user_id = $1", [userId])
    : { rows: [] };
  const resumeSkills = (skillRows ?? []).map((r: any) => r.name);
  const { rows: userRows } = userId
    ? await pool.query("SELECT years_of_experience FROM career_profiles WHERE user_id = $1", [userId])
    : { rows: [] };
  const yearsExp = Number(userRows?.[0]?.years_of_experience ?? 0);

  // Saved state for the logged-in user
  const savedJobs = userId
    ? await db.select({ jobId: jobApplicationsTable.jobId }).from(jobApplicationsTable)
      .where(and(eq(jobApplicationsTable.userId, userId), eq(jobApplicationsTable.status, "saved")))
    : [];

  res.json({
    total: jobs.length,
    jobs: jobs.map(j => {
      const match = userId ? matchJobResume(j, resumeSkills, yearsExp) : null;
      return {
        ...formatJob(j),
        matchScore: match?.score ?? null,
        matchedSkills: match?.matchedSkills ?? [],
        missingSkills: match?.missingSkills ?? [],
        isSaved: userId ? savedJobs.some(s => s.jobId === j.id) : false,
      };
    }),
  });
});

function gteFilter(col: any, val: number) {
  return sql`${col} >= ${val}`;
}

function formatJob(j: typeof jobsTable.$inferSelect) {
  return {
    id: j.id, title: j.title, company: j.company, location: j.location ?? null,
    isRemote: j.isRemote, jobType: j.jobType, salaryMin: j.salaryMin ?? null,
    salaryMax: j.salaryMax ?? null, description: j.description, skills: j.skills ?? [],
    experienceRequired: j.experienceRequired, isInternship: j.isInternship,
    createdAt: j.createdAt.toISOString(),
  };
}

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(formatJob(job));
});

/* ── Salary estimation (AI with rule fallback + disclaimer) ─────────────── */

router.post("/jobs/salary-estimate", requirePremium, async (req, res): Promise<void> => {
  const { title, skills = [], location, yearsOfExperience = 0 } = req.body as any;
  if (!title) { res.status(400).json({ error: "Job title is required" }); return; }

  const skillList: string[] = Array.isArray(skills) ? skills : [];
  const prompt = `Estimate the annual salary range in INR (₹) for a ${title} in ${location ?? "India"} with ${yearsOfExperience} years of experience and skills: ${skillList.join(", ") || "general"}. Respond ONLY with valid JSON:
{"min": <number in rupees>, "max": <number in rupees>, "median": <number>, "confidence": "low|medium|high", "factors": ["factor 1", "factor 2", "factor 3"]}`;

  try {
    const raw = await askAI([
      { role: "system", content: "You are a salary data analyst for the Indian job market. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ], true, 20000);
    const p = safeParseJSON<any>(raw, null);
    if (p && typeof p.min === "number" && p.min > 0) {
      res.json({
        ...p,
        currency: "INR",
        disclaimer: "Salary estimates are AI-generated approximations based on public market data. Actual offers vary by company, location and negotiation.",
      });
      return;
    }
  } catch { /* fallback */ }

  const hints = skillList.map(s => SKILL_SALARY_HINTS[s.toLowerCase()] ?? null).filter(Boolean) as [number, number][];
  const base = hints.length > 0
    ? [Math.min(...hints.map(h => h[0])), Math.max(...hints.map(h => h[1]))]
    : [300000, 900000];
  const boost = yearsOfExperience * 60000;
  res.json({
    min: base[0] + boost,
    max: base[1] + boost * 2,
    median: Math.round((base[0] + base[1]) / 2 + boost * 1.5),
    confidence: "low",
    factors: ["Based on your listed skills", `Experience: ${yearsOfExperience} years`, "Location-adjusted estimate"],
    currency: "INR",
    disclaimer: "Salary estimates are AI-generated approximations based on public market data. Actual offers vary by company, location and negotiation.",
  });
});

/* ── AI job recommendations (personalized from profile + skills) ────────── */

router.get("/jobs/recommendations", requirePremium, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [profile] = await db.select().from(careerProfilesTable).where(eq(careerProfilesTable.userId, userId));
  const { rows: skillRows } = await pool.query("SELECT name FROM skills WHERE user_id = $1", [userId]) as any;
  const resumeSkills = (skillRows ?? []).map((r: any) => r.name);
  const yearsExp = Number(profile?.yearsOfExperience ?? 0);
  const dreamRole = profile?.dreamRole ?? null;

  const { rows: saved } = await pool.query(
    `SELECT id, title, company, description, skills, experience_required, is_remote, is_internship, salary_min, salary_max
     FROM jobs WHERE is_active = true ORDER BY created_at DESC LIMIT 100`,
  ) as any;

  const scored = (saved ?? []).map((job: any) => {
    const jobSkills = job.skills ?? [];
    const matched = jobSkills.filter((s: string) => resumeSkills.some((rs: any) => rs.toLowerCase() === s.toLowerCase()));
    const missing = jobSkills.filter((s: string) => !resumeSkills.some((rs: any) => rs.toLowerCase() === s.toLowerCase()));
    let score = 25 + (jobSkills.length > 0 ? (matched.length / jobSkills.length) * 35 : 15);
    if (yearsExp >= job.experience_required) score += 15;
    if (dreamRole && job.title.toLowerCase().includes(dreamRole.split(" ")[0].toLowerCase())) score += 10;
    return {
      id: job.id, title: job.title, company: job.company, isRemote: job.is_remote,
      isInternship: job.is_internship, salaryMin: job.salary_min, salaryMax: job.salary_max,
      matchScore: Math.min(98, Math.round(score)), matchedSkills: matched.slice(0, 6), missingSkills: missing.slice(0, 4),
    };
  }).sort((a: any, b: any) => b.matchScore - a.matchScore).slice(0, 12);

  res.json({
    basedOn: {
      dreamRole, skills: resumeSkills, yearsOfExperience: yearsExp,
    },
    recommendations: scored,
  });
});

/* ── Application CRM ─────────────────────────────────────────────────────── */

router.get("/applications", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const apps = await db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.userId, userId)).orderBy(desc(jobApplicationsTable.createdAt));
  res.json(apps.map(formatApp));
});

function formatApp(a: typeof jobApplicationsTable.$inferSelect) {
  return {
    id: a.id, jobId: a.jobId ?? null, company: a.company, position: a.position,
    status: a.status, appliedAt: a.appliedAt?.toISOString() ?? null,
    interviewDate: a.interviewDate?.toISOString() ?? null,
    offerAmount: a.offerAmount ?? null, notes: a.notes ?? null,
    attachments: a.attachments ?? [], timeline: a.timeline ?? [],
    lastFollowUpAt: a.lastFollowUpAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

router.post("/applications", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { jobId, company, position, status, appliedAt, interviewDate, offerAmount, notes } = req.body;
  if (!company || !position) { res.status(400).json({ error: "company and position are required" }); return; }

  const [app] = await db.insert(jobApplicationsTable).values({
    userId,
    jobId: jobId ?? null,
    company, position,
    status: status ?? "applied",
    appliedAt: appliedAt ? new Date(appliedAt) : (status === "applied" ? new Date() : null),
    interviewDate: interviewDate ? new Date(interviewDate) : null,
    offerAmount: offerAmount ?? null,
    notes: notes ?? null,
    timeline: [{ date: new Date().toISOString(), event: `Added as ${status ?? "applied"}` }],
  }).returning();

  await awardXP(userId, 10, "application_added");
  recordEvent(userId, "application", `Tracked ${position} at ${company}`, { status: status ?? "applied" }).catch(() => {});
  res.status(201).json(formatApp(app));
});

/** Save a job from the board (creates a saved application). */
router.post("/applications/save-job", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { jobId } = req.body;
  if (!jobId) { res.status(400).json({ error: "jobId is required" }); return; }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, Number(jobId)));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const existing = await db.select().from(jobApplicationsTable)
    .where(and(eq(jobApplicationsTable.userId, userId), eq(jobApplicationsTable.jobId, job.id)));
  if (existing.length > 0) {
    await db.delete(jobApplicationsTable).where(eq(jobApplicationsTable.id, existing[0].id));
    res.json({ saved: false });
    return;
  }

  const [app] = await db.insert(jobApplicationsTable).values({
    userId, jobId: job.id, company: job.company, position: job.title, status: "saved",
  }).returning();
  res.status(201).json({ saved: true, application: formatApp(app) });
});

router.patch("/applications/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Application not found" }); return; }

  const allowed = ["company", "position", "status", "appliedAt", "interviewDate", "offerAmount", "notes", "attachments", "lastFollowUpAt"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = req.body[f] === null ? null : (f === "appliedAt" || f === "interviewDate" || f === "lastFollowUpAt" ? (req.body[f] ? new Date(req.body[f]) : null) : req.body[f]);
  }

  // Append timeline event on status change
  if (req.body.status && req.body.status !== existing.status) {
    const timeline = [...(existing.timeline ?? [])];
    timeline.push({ date: new Date().toISOString(), event: `Status changed to ${req.body.status}` });
    updates.timeline = timeline;
  }

  const [updated] = await db.update(jobApplicationsTable).set(updates as any).where(eq(jobApplicationsTable.id, id)).returning();

  if (req.body.status && req.body.status !== existing.status) {
    await awardXP(userId, 15, "application_status_change");
    recordEvent(userId, "application", `${existing.position} at ${existing.company} → ${req.body.status}`, { status: req.body.status }).catch(() => {});
    if (req.body.status === "offer") {
      await awardXP(userId, 40, "offer_received");
      recordEvent(userId, "offer", `Offer received for ${existing.position} at ${existing.company}!`).catch(() => {});
    }
  }
  res.json(formatApp(updated));
});

router.post("/applications/:id/follow-up", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Application not found" }); return; }

  const timeline = [...(existing.timeline ?? [])];
  timeline.push({ date: new Date().toISOString(), event: "Follow-up sent" });

  const [updated] = await db.update(jobApplicationsTable).set({ lastFollowUpAt: new Date(), timeline })
    .where(eq(jobApplicationsTable.id, id)).returning();
  recordEvent(userId, "application", `Followed up on ${existing.position} at ${existing.company}`).catch(() => {});
  res.json(formatApp(updated));
});

router.delete("/applications/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Application not found" }); return; }
  await db.delete(jobApplicationsTable).where(eq(jobApplicationsTable.id, id));
  res.sendStatus(204);
});

/* ── Application analytics (career analytics for jobs) ──────────────────── */

router.get("/applications/stats", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const apps = await db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.userId, userId));
  const statusCount: Record<string, number> = {};
  for (const a of apps) statusCount[a.status] = (statusCount[a.status] ?? 0) + 1;
  const total = apps.length;
  const responses = apps.filter(a => a.status !== "saved" && a.status !== "applied").length;
  const offers = apps.filter(a => a.status === "offer").length;
  const interviews = apps.filter(a => a.status === "interview").length;

  // Pipeline funnel
  const funnel = [
    { stage: "Saved", count: statusCount["saved"] ?? 0 },
    { stage: "Applied", count: statusCount["applied"] ?? 0 },
    { stage: "Interview", count: interviews },
    { stage: "Offer", count: offers },
    { stage: "Rejected", count: statusCount["rejected"] ?? 0 },
  ];

  // This week's activity
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeek = apps.filter(a => a.createdAt >= weekAgo).length;

  res.json({
    total,
    byStatus: statusCount,
    responseRate: total > 0 ? Math.round((responses / total) * 100) : 0,
    offerRate: total > 0 ? Math.round((offers / total) * 100) : 0,
    interviewRate: total > 0 ? Math.round((interviews / total) * 100) : 0,
    funnel,
    thisWeek,
    needsFollowUp: apps.filter(a => ["applied", "interview"].includes(a.status) && (!a.lastFollowUpAt || (Date.now() - a.lastFollowUpAt.getTime() > 4 * 86400000))).length,
  });
});

export default router;
