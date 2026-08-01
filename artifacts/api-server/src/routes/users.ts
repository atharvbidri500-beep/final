import { Router } from "express";
import { pool } from "@workspace/db";
import bcrypt from "bcryptjs";
import * as jwt from "../lib/jwt.js";

const router = Router();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function formatUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile ?? null,
    city: user.city ?? null,
    isPremium: user.is_premium ?? false,
    premiumExpiresAt: user.premium_expires_at?.toISOString() ?? null,
    resumeCount: 0,
    coverLetterCount: 0,
    interviewCount: 0,
    createdAt: user.created_at?.toISOString() ?? new Date().toISOString(),
  };
}

async function handleRegister(req: any, res: any): Promise<void> {
  const { name, email, password, mobile, city } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  if (mobile && !/^[6-9]\d{9}$/.test(mobile.replace(/\s/g, ""))) {
    res.status(400).json({ error: "Invalid Indian mobile number" });
    return;
  }

  const { rows: existing } = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const { rows: inserted } = await pool.query(
    `INSERT INTO users (name, email, password_hash, mobile, city, is_premium) VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
    [name.trim(), email.trim().toLowerCase(), await hashPassword(password), mobile?.replace(/\s/g, "") ?? null, city ?? null]
  );
  const user = inserted[0];

  const token = jwt.sign({ id: user.id, email: user.email });
  res.status(201).json({ user: formatUser(user), token });
}

async function handleLogin(req: any, res: any): Promise<void> {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(401).json({ error: "Email and password are required" });
    return;
  }

  const { rows: users } = await pool.query("SELECT * FROM users WHERE email = $1", [email.trim().toLowerCase()]);
  const user = users[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwt.sign({ id: user.id, email: user.email });
  res.json({ user: formatUser(user), token });
}

async function handleMe(req: any, res: any): Promise<void> {
  const userId = req.userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { rows: userRows } = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
  const user = userRows[0];
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { rows: rc } = await pool.query("SELECT count(*)::int as count FROM resumes WHERE user_id = $1", [userId]);
  const { rows: cc } = await pool.query("SELECT count(*)::int as count FROM cover_letters WHERE user_id = $1", [userId]);
  const { rows: ic } = await pool.query("SELECT count(*)::int as count FROM interview_sessions WHERE user_id = $1", [userId]);

  res.json({
    ...formatUser(user),
    resumeCount: Number(rc[0]?.count ?? 0),
    coverLetterCount: Number(cc[0]?.count ?? 0),
    interviewCount: Number(ic[0]?.count ?? 0),
  });
}

// Primary routes
router.post("/users/register", handleRegister);
router.post("/users/login", handleLogin);
router.get("/users/me", handleMe);

// Auth aliases (for backward compatibility & frontend flexibility)
router.post("/auth/register", handleRegister);
router.post("/auth/login", handleLogin);
router.get("/auth/me", handleMe);

router.get("/users/me/dashboard", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { rows: dashUser } = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
  const { rows: rcRows } = await pool.query("SELECT count(*)::int as count FROM resumes WHERE user_id = $1", [userId]);
  const { rows: ccRows } = await pool.query("SELECT count(*)::int as count FROM cover_letters WHERE user_id = $1", [userId]);
  const { rows: icRows } = await pool.query("SELECT count(*)::int as count FROM interview_sessions WHERE user_id = $1", [userId]);

  const rc = Number(rcRows[0]?.count ?? 0);
  const cc = Number(ccRows[0]?.count ?? 0);
  const ic = Number(icRows[0]?.count ?? 0);
  const profileStrength = Math.min(100, rc * 20 + cc * 15 + ic * 10 + (dashUser[0]?.is_premium ? 25 : 0) + 15);

  const { rows: recentResumes } = await pool.query("SELECT * FROM resumes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3", [userId]);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyActivity = days.map((day) => ({ day, count: Math.floor(Math.random() * 5) }));

  res.json({
    resumeCount: rc,
    coverLetterCount: cc,
    interviewCount: ic,
    profileStrength,
    isPremium: dashUser[0]?.is_premium ?? false,
    weeklyActivity,
    recentResumes: recentResumes.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      fullName: r.full_name ?? null,
      mobile: r.mobile ?? null,
      email: r.email ?? null,
      city: r.city ?? null,
      education: r.education ?? null,
      college: r.college ?? null,
      skills: r.skills ?? null,
      projects: r.projects ?? null,
      workExperience: r.work_experience ?? null,
      certifications: r.certifications ?? null,
      languages: r.languages ?? null,
      template: r.template,
      generatedContent: r.generated_content ?? null,
      atsScore: r.ats_score ?? null,
      createdAt: r.created_at?.toISOString() ?? null,
      updatedAt: r.updated_at?.toISOString() ?? null,
    })),
  });
});

export default router;
