import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  pool, db, careerProfilesTable, careerGoalsTable, skillsTable, certificationsTable,
  careerTasksTable, interviewSessionsTable, jobApplicationsTable, gamificationTable,
} from "@workspace/db";
import { awardXP, getOrCreateGamification, XP_TABLE, ACHIEVEMENT_DEFS, LEVEL_THRESHOLD } from "../lib/gamification.js";
import { computeCareerScore, getWeeklyActivity, getTodayTasks, getUpcomingInterviews, getCareerSnapshotMetrics } from "../lib/careerScore.js";
import { recordEvent, getCareerTimeline } from "../lib/careerMemory.js";
import { sendEmail } from "../lib/email.js";
import { requireTier } from "../lib/gating.js";

const router = Router();

/* ── Career profile (Career Memory) ──────────────────────────────────────── */

router.get("/career/profile", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [profile] = await db.select().from(careerProfilesTable).where(eq(careerProfilesTable.userId, userId));
  res.json(profile ?? null);
});

router.put("/career/profile", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const allowed = ["dreamRole", "targetSalary", "targetCompany", "currentRole", "yearsOfExperience", "strengths", "weaknesses", "preferredCompanies", "preferredLocations", "resumeUrl", "linkedinUrl", "githubUrl"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of allowed) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  const existing = await db.select().from(careerProfilesTable).where(eq(careerProfilesTable.userId, userId));
  if (existing.length === 0) {
    await db.insert(careerProfilesTable).values({ userId, ...updates } as any);
  } else {
    await db.update(careerProfilesTable).set(updates as any).where(eq(careerProfilesTable.userId, userId));
  }
  const [profile] = await db.select().from(careerProfilesTable).where(eq(careerProfilesTable.userId, userId));
  if (req.body.dreamRole) {
    recordEvent(userId, "profile", `Set dream role: ${req.body.dreamRole}`).catch(() => {});
  }
  res.json(profile);
});

/* ── Career goals ────────────────────────────────────────────────────────── */

router.get("/career/goals", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const goals = await db.select().from(careerGoalsTable).where(eq(careerGoalsTable.userId, userId)).orderBy(desc(careerGoalsTable.createdAt));
  res.json(goals.map(g => ({ ...g, deadline: g.deadline ? new Date(g.deadline).toISOString().slice(0, 10) : null })));
});

router.post("/career/goals", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, category, targetValue, currentValue, deadline, notes } = req.body;
  if (!title) { res.status(400).json({ error: "Title is required" }); return; }
  const [goal] = await db.insert(careerGoalsTable).values({
    userId, title, category: category ?? "custom",
    targetValue: targetValue ?? null, currentValue: currentValue ?? 0,
    deadline: deadline ?? null, notes: notes ?? null,
  }).returning();
  await awardXP(userId, 10, "goal_created");
  recordEvent(userId, "goal", `Created goal: ${title}`).catch(() => {});
  res.status(201).json({ ...goal, deadline: goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : null });
});

router.patch("/career/goals/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(careerGoalsTable).where(eq(careerGoalsTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Goal not found" }); return; }
  const allowed = ["title", "category", "targetValue", "currentValue", "deadline", "status", "notes"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of allowed) { if (req.body[f] !== undefined) updates[f] = req.body[f]; }
  const [updated] = await db.update(careerGoalsTable).set(updates as any).where(eq(careerGoalsTable.id, id)).returning();
  if (req.body.status === "completed" && existing.status !== "completed") {
    await awardXP(userId, XP_TABLE.goalCompleted, "goal_completed");
    recordEvent(userId, "goal", `Completed goal: ${existing.title}`).catch(() => {});
  }
  res.json({ ...updated, deadline: updated.deadline ? new Date(updated.deadline).toISOString().slice(0, 10) : null });
});

router.delete("/career/goals/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(careerGoalsTable).where(eq(careerGoalsTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Goal not found" }); return; }
  await db.delete(careerGoalsTable).where(eq(careerGoalsTable.id, id));
  res.sendStatus(204);
});

/* ── Skills ──────────────────────────────────────────────────────────────── */

router.get("/career/skills", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const skills = await db.select().from(skillsTable).where(eq(skillsTable.userId, userId)).orderBy(desc(skillsTable.createdAt));
  res.json(skills);
});

router.post("/career/skills", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, category, proficiency } = req.body;
  if (!name) { res.status(400).json({ error: "Skill name is required" }); return; }
  const existing = await db.select().from(skillsTable).where(and(eq(skillsTable.userId, userId), eq(skillsTable.name, name)));
  if (existing.length > 0) {
    const [updated] = await db.update(skillsTable).set({ proficiency: proficiency ?? existing[0].proficiency, category: category ?? existing[0].category })
      .where(eq(skillsTable.id, existing[0].id)).returning();
    res.json(updated);
    return;
  }
  const [skill] = await db.insert(skillsTable).values({ userId, name, category: category ?? "technical", proficiency: proficiency ?? 50 }).returning();
  await awardXP(userId, XP_TABLE.skillAdded, "skill_added");
  recordEvent(userId, "skill", `Added skill: ${name}`).catch(() => {});
  res.status(201).json(skill);
});

router.delete("/career/skills/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(skillsTable).where(eq(skillsTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Skill not found" }); return; }
  await db.delete(skillsTable).where(eq(skillsTable.id, id));
  res.sendStatus(204);
});

/* ── Certifications ──────────────────────────────────────────────────────── */

router.get("/career/certifications", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const certs = await db.select().from(certificationsTable).where(eq(certificationsTable.userId, userId)).orderBy(desc(certificationsTable.createdAt));
  res.json(certs.map(c => ({ ...c, issuedDate: c.issuedDate?.toISOString() ?? null })));
});

router.post("/career/certifications", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, issuer, issuedDate, credentialUrl } = req.body;
  if (!name) { res.status(400).json({ error: "Certification name is required" }); return; }
  const [cert] = await db.insert(certificationsTable).values({
    userId, name, issuer: issuer ?? null,
    issuedDate: issuedDate ? new Date(issuedDate) : null,
    credentialUrl: credentialUrl ?? null,
  }).returning();
  await awardXP(userId, XP_TABLE.certificationAdded, "cert_added");
  recordEvent(userId, "cert", `Added certification: ${name}`).catch(() => {});
  res.status(201).json({ ...cert, issuedDate: cert.issuedDate?.toISOString() ?? null });
});

router.delete("/career/certifications/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Certification not found" }); return; }
  await db.delete(certificationsTable).where(eq(certificationsTable.id, id));
  res.sendStatus(204);
});

/* ── Tasks & reminders ───────────────────────────────────────────────────── */

router.get("/career/tasks", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const tasks = await db.select().from(careerTasksTable).where(eq(careerTasksTable.userId, userId)).orderBy(desc(careerTasksTable.createdAt));
  res.json(tasks.map(t => ({ ...t, dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : null, reminderAt: t.reminderAt?.toISOString() ?? null })));
});

router.post("/career/tasks", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { type, title, description, dueDate, reminderAt } = req.body;
  if (!title) { res.status(400).json({ error: "Title is required" }); return; }
  const [task] = await db.insert(careerTasksTable).values({
    userId, type: type ?? "custom", title,
    description: description ?? null, dueDate: dueDate ?? null,
    reminderAt: reminderAt ? new Date(reminderAt) : null,
  }).returning();
  res.status(201).json({ ...task, dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : null, reminderAt: task.reminderAt?.toISOString() ?? null });
});

router.patch("/career/tasks/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(careerTasksTable).where(eq(careerTasksTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Task not found" }); return; }
  const allowed = ["type", "title", "description", "dueDate", "done", "reminderAt"] as const;
  const updates: Record<string, unknown> = {};
  for (const f of allowed) { if (req.body[f] !== undefined) updates[f] = req.body[f]; }
  const [updated] = await db.update(careerTasksTable).set(updates as any).where(eq(careerTasksTable.id, id)).returning();
  if (req.body.done === true && !existing.done) {
    await awardXP(userId, 10, "task_done");
  }
  res.json({ ...updated, dueDate: updated.dueDate ? new Date(updated.dueDate).toISOString().slice(0, 10) : null, reminderAt: updated.reminderAt?.toISOString() ?? null });
});

router.delete("/career/tasks/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(careerTasksTable).where(eq(careerTasksTable.id, id));
  if (!existing || existing.userId !== userId) { res.status(404).json({ error: "Task not found" }); return; }
  await db.delete(careerTasksTable).where(eq(careerTasksTable.id, id));
  res.sendStatus(204);
});

/* ── Gamification ────────────────────────────────────────────────────────── */

router.get("/career/gamification", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const g = await getOrCreateGamification(userId);
  const [profile] = await db.select().from(careerProfilesTable).where(eq(careerProfilesTable.userId, userId));
  const { rows: resumeCount } = await pool.query(`SELECT count(*)::int AS n FROM resumes WHERE user_id = $1`, [userId]) as any;
  const { rows: interviewCount } = await pool.query(`SELECT count(*)::int AS n FROM interview_sessions WHERE user_id = $1`, [userId]) as any;
  const { rows: appCount } = await pool.query(`SELECT count(*)::int AS n FROM job_applications WHERE user_id = $1`, [userId]) as any;
  const { rows: skillCount } = await pool.query(`SELECT count(*)::int AS n FROM skills WHERE user_id = $1`, [userId]) as any;
  const { rows: certCount } = await pool.query(`SELECT count(*)::int AS n FROM certifications WHERE user_id = $1`, [userId]) as any;

  const progress: Record<string, number> = {
    first_resume: Math.min(100, Number(resumeCount?.[0]?.n ?? 0) * 100),
    resume_five: Math.min(100, (Number(resumeCount?.[0]?.n ?? 0) / 5) * 100),
    first_interview: Math.min(100, Number(interviewCount?.[0]?.n ?? 0) * 100),
    interview_ten: Math.min(100, (Number(interviewCount?.[0]?.n ?? 0) / 10) * 100),
    first_application: Math.min(100, Number(appCount?.[0]?.n ?? 0) * 100),
    offer_received: 0,
    first_skill: Math.min(100, Number(skillCount?.[0]?.n ?? 0) * 100),
    skill_ten: Math.min(100, (Number(skillCount?.[0]?.n ?? 0) / 10) * 100),
    first_cert: Math.min(100, Number(certCount?.[0]?.n ?? 0) * 100),
  };
  const { rows: offers } = await pool.query(`SELECT count(*)::int AS n FROM job_applications WHERE user_id = $1 AND status = 'offer'`, [userId]) as any;
  progress.offer_received = Math.min(100, Number(offers?.[0]?.n ?? 0) * 100);

  res.json({
    xp: g.xp,
    level: g.level,
    xpIntoLevel: g.xp % 100,
    xpNeededForNext: 100 - (g.xp % 100),
    dailyStreak: g.dailyStreak,
    weeklyStreak: g.weeklyStreak,
    achievements: g.achievements ?? [],
    allAchievements: ACHIEVEMENT_DEFS.map(a => ({
      ...a,
      earned: (g.achievements ?? []).includes(a.code),
      progress: Math.round(progress[a.code] ?? 0),
    })),
    careerMemoryProfile: profile?.dreamRole ?? null,
  });
});

/* ── Career score & analytics ────────────────────────────────────────────── */

router.get("/career/score", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const score = await computeCareerScore(userId);
  res.json(score);
});

router.get("/career/analytics", requireTier("premium"), async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const score = await computeCareerScore(userId);
  const weekly = await getWeeklyActivity(userId);

  const apps = await db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.userId, userId));
  const statusCount: Record<string, number> = {};
  for (const a of apps) statusCount[a.status] = (statusCount[a.status] ?? 0) + 1;
  const responses = apps.filter(a => a.status !== "saved" && a.status !== "applied").length;
  const offers = apps.filter(a => a.status === "offer").length;

  const { rows: resumes } = await pool.query(`SELECT count(*)::int AS n FROM resumes WHERE user_id = $1`, [userId]) as any;
  const { rows: interviews } = await pool.query(`SELECT count(*)::int AS n FROM interview_sessions WHERE user_id = $1`, [userId]) as any;
  const { rows: skills } = await pool.query(`SELECT count(*)::int AS n FROM skills WHERE user_id = $1`, [userId]) as any;
  const { rows: certs } = await pool.query(`SELECT count(*)::int AS n FROM certifications WHERE user_id = $1`, [userId]) as any;

  // Interview improvement over time
  const sessions = await db.select().from(interviewSessionsTable)
    .where(eq(interviewSessionsTable.userId, userId))
    .orderBy(desc(interviewSessionsTable.createdAt))
    .limit(30);
  const interviewTrend = sessions.slice().reverse().map(s => ({
    date: s.createdAt.toISOString().slice(0, 10),
    score: Math.round(((s.avgCommunicationScore ?? 0) + (s.avgConfidenceScore ?? 0)) / 2),
  }));

  // ATS history from resume analyses
  const { rows: atsHistory } = await pool.query(
    `SELECT created_at, ats_score FROM resume_analyses WHERE user_id = $1 ORDER BY created_at ASC LIMIT 30`,
    [userId],
  ) as any;

  const [gamification] = await db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId));
  const goals = await db.select().from(careerGoalsTable).where(eq(careerGoalsTable.userId, userId));
  const skillRows2 = await db.select().from(skillsTable).where(eq(skillsTable.userId, userId)).orderBy(desc(skillsTable.proficiency)).limit(8);

  res.json({
    careerScore: score,
    weeklyActivity: weekly,
    gamification: gamification ? {
      level: gamification.level,
      xp: gamification.xp,
      xpToNext: Math.max(0, LEVEL_THRESHOLD - gamification.xp),
      streakDays: gamification.dailyStreak,
      achievementsUnlocked: (gamification.achievements ?? []).length,
    } : null,
    goals: {
      total: goals.length,
      completed: goals.filter(g => g.status === "done").length,
      inProgress: goals.filter(g => g.status === "in_progress").length,
    },
    topSkills: skillRows2.map(s => ({ name: s.name, proficiency: s.proficiency, category: s.category })),
    applicationStats: {
      total: apps.length,
      saved: statusCount["saved"] ?? 0,
      applied: statusCount["applied"] ?? 0,
      interview: statusCount["interview"] ?? 0,
      offer: offers,
      rejected: statusCount["rejected"] ?? 0,
      responseRate: apps.length > 0 ? Math.round((responses / apps.length) * 100) : 0,
      offerRate: apps.length > 0 ? Math.round((offers / apps.length) * 100) : 0,
    },
    counts: {
      resumes: Number(resumes?.[0]?.n ?? 0),
      interviews: Number(interviews?.[0]?.n ?? 0),
      skills: Number(skills?.[0]?.n ?? 0),
      certifications: Number(certs?.[0]?.n ?? 0),
    },
    interviewTrend,
    atsHistory: (atsHistory ?? []).map((r: any) => ({
      date: new Date(r.created_at).toISOString().slice(0, 10),
      score: r.ats_score,
    })),
  });
});

/* ── Career timeline (Career Memory) ─────────────────────────────────────── */

router.get("/career/timeline", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const events = await getCareerTimeline(userId, 100);
  res.json(events.map((e: any) => ({ ...e, createdAt: new Date(e.created_at).toISOString() })));
});

/* ── AI Career Copilot dashboard ─────────────────────────────────────────── */

router.get("/career/copilot", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [profile] = await db.select().from(careerProfilesTable).where(eq(careerProfilesTable.userId, userId));
  const score = await computeCareerScore(userId);
  const weekly = await getWeeklyActivity(userId);
  const tasks = await getTodayTasks(userId);
  const interviews = await getUpcomingInterviews(userId);
  const metrics = await getCareerSnapshotMetrics(userId);

  // Recommendations built from real data
  const recommendations: { type: string; title: string; reason: string; link: string; priority: "high" | "medium" | "low" }[] = [];

  if (score.components.resume < 70) {
    recommendations.push({
      type: "resume", title: "Improve your resume ATS score",
      reason: `Your average resume score is ${score.components.resume}/100. Higher scores get more callbacks.`,
      link: "/resume-score", priority: "high",
    });
  }
  if (score.components.interview < 60) {
    recommendations.push({
      type: "interview", title: "Practice mock interviews",
      reason: `Your interview average is ${score.components.interview}/100. Regular practice raises it fast.`,
      link: "/interview", priority: "high",
    });
  }
  if (metrics.applications === 0) {
    recommendations.push({
      type: "job", title: "Start tracking job applications",
      reason: "Tracking applications triples follow-through. Save your first job today.",
      link: "/applications", priority: "medium",
    });
  }
  if (metrics.skills === 0) {
    recommendations.push({
      type: "skill", title: "Add your skills",
      reason: "Skills power your career score, job matching and interview questions.",
      link: "/career", priority: "medium",
    });
  }
  if (!profile) {
    recommendations.push({
      type: "profile", title: "Complete your career profile",
      reason: "Set your dream role and preferences to get personalized recommendations.",
      link: "/career", priority: "medium",
    });
  }
  if (metrics.careerScore >= 60 && metrics.goals === 0) {
    recommendations.push({
      type: "goal", title: "Set a career goal",
      reason: "Users with written goals are 42% more likely to land offers.",
      link: "/career", priority: "low",
    });
  }

  // Personalized timeline based on career score milestones
  const timeline = [
    { phase: "Profile Foundation", done: score.components.profile >= 80, next: "Complete contact, role and preferences" },
    { phase: "Resume Strength", done: score.components.resume >= 75, next: "Reach 75+ ATS score" },
    { phase: "Interview Readiness", done: score.components.interview >= 70, next: "Reach 70+ interview average" },
    { phase: "Application Pipeline", done: metrics.applications >= 10, next: "Track 10 applications" },
    { phase: "Offer Stage", done: metrics.applications > 0 && metrics.careerScore >= 70, next: "Push applications to offer stage" },
  ];

  res.json({
    careerScore: score,
    weeklyActivity: weekly,
    todayTasks: tasks.map((t: any) => ({ id: t.id, title: t.title, type: t.type, done: t.done })),
    upcomingInterviews: interviews.map((i: any) => ({
      id: i.id, company: i.company, position: i.position, interviewDate: new Date(i.interview_date).toISOString(),
    })),
    recommendations,
    timeline,
    metrics,
  });
});

/* ── Email preferences reminder endpoint (used by reminder scheduler) ────── */

router.post("/career/reminder-test", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { rows: userRows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId]) as any;
  const user = userRows?.[0];
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const result = await sendEmail({
    userId,
    email: user.email,
    subject: "Career Boost AI — reminder test",
    template: "reminder_test",
    html: `<p>Hi ${user.name}, this is a test of the reminder system. It works.</p>`,
  });
  res.json(result);
});

export default router;
