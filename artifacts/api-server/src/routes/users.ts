import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, resumesTable, coverLettersTable, interviewSessionsTable } from "@workspace/db";
import * as crypto from "crypto";
import * as jwt from "../lib/jwt.js";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "careerboost_salt").digest("hex");
}

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile ?? null,
    city: user.city ?? null,
    isPremium: user.isPremium,
    premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null,
    resumeCount: 0,
    coverLetterCount: 0,
    interviewCount: 0,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/users/register", async (req, res): Promise<void> => {
  const { name, email, password, mobile, city } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash: hashPassword(password),
    mobile: mobile ?? null,
    city: city ?? null,
    isPremium: false,
  }).returning();

  const token = jwt.sign({ id: user.id, email: user.email });
  res.status(201).json({ user: formatUser(user), token });
});

router.post("/users/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(401).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwt.sign({ id: user.id, email: user.email });
  res.json({ user: formatUser(user), token });
});

router.get("/users/me", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [resumeCount] = await db.select({ count: sql<number>`count(*)` }).from(resumesTable).where(eq(resumesTable.userId, userId));
  const [clCount] = await db.select({ count: sql<number>`count(*)` }).from(coverLettersTable).where(eq(coverLettersTable.userId, userId));
  const [ivCount] = await db.select({ count: sql<number>`count(*)` }).from(interviewSessionsTable).where(eq(interviewSessionsTable.userId, userId));

  res.json({
    ...formatUser(user),
    resumeCount: Number(resumeCount?.count ?? 0),
    coverLetterCount: Number(clCount?.count ?? 0),
    interviewCount: Number(ivCount?.count ?? 0),
  });
});

router.get("/users/me/dashboard", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const [resumeCount] = await db.select({ count: sql<number>`count(*)` }).from(resumesTable).where(eq(resumesTable.userId, userId));
  const [clCount] = await db.select({ count: sql<number>`count(*)` }).from(coverLettersTable).where(eq(coverLettersTable.userId, userId));
  const [ivCount] = await db.select({ count: sql<number>`count(*)` }).from(interviewSessionsTable).where(eq(interviewSessionsTable.userId, userId));

  const rc = Number(resumeCount?.count ?? 0);
  const cc = Number(clCount?.count ?? 0);
  const ic = Number(ivCount?.count ?? 0);
  const profileStrength = Math.min(100, rc * 20 + cc * 15 + ic * 10 + (user?.isPremium ? 25 : 0) + 15);

  const recentResumes = await db.select().from(resumesTable).where(eq(resumesTable.userId, userId)).orderBy(resumesTable.createdAt).limit(3);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyActivity = days.map((day, i) => ({ day, count: Math.floor(Math.random() * 5) }));

  res.json({
    resumeCount: rc,
    coverLetterCount: cc,
    interviewCount: ic,
    profileStrength,
    isPremium: user?.isPremium ?? false,
    weeklyActivity,
    recentResumes: recentResumes.map(r => ({
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
    })),
  });
});

export default router;
