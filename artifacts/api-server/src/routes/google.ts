import { Router } from "express";
import { pool, db, emailPreferencesTable } from "@workspace/db";
import * as jwt from "../lib/jwt.js";
import { rateLimit } from "../middlewares/rateLimit.js";
import { sendWelcomeEmail, createNotification } from "../lib/email.js";

const router = Router();

const googleStartLimiter = rateLimit({ limit: 20, windowMs: 10 * 60 * 1000, message: "Too many Google sign-in attempts. Please try again later." });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

function googleAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function redirectUri(req: any): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const host = req.get("host");
  const proto = req.protocol;
  return `${proto}://${host}/api/auth/google/callback`;
}

function formatUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile ?? null,
    city: user.city ?? null,
    isPremium: user.is_premium ?? false,
    plan: user.plan ?? "free",
    premiumExpiresAt: user.premium_expires_at?.toISOString() ?? null,
    resumeCount: 0,
    coverLetterCount: 0,
    interviewCount: 0,
    createdAt: user.created_at?.toISOString() ?? new Date().toISOString(),
  };
}

async function handleStart(req: any, res: any): Promise<void> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.status(500).json({ error: "Google Sign-In is not configured yet" });
    return;
  }
  res.redirect(googleAuthUrl(redirectUri(req)));
}

async function handleCallback(req: any, res: any): Promise<void> {
  const { code, error } = req.query;
  if (error || !code) {
    res.redirect(`/?auth=google_error`);
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(req),
        grant_type: "authorization_code",
      }),
    });
    const tokenData: any = await tokenRes.json();
    if (!tokenData.access_token) {
      res.redirect(`/?auth=google_error`);
      return;
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile: any = await userRes.json();
    if (!profile?.email) {
      res.redirect(`/?auth=google_error`);
      return;
    }

    const email = String(profile.email).toLowerCase();
    const name = profile.name ?? email.split("@")[0];

    const { rows: existing } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    let user = existing[0];
    if (!user) {
      const { rows: inserted } = await pool.query(
        `INSERT INTO users (name, email, password_hash, is_premium) VALUES ($1, $2, '', false) RETURNING *`,
        [name, email]
      );
      user = inserted[0];
      try {
        await db.insert(emailPreferencesTable).values({ userId: user.id }).onConflictDoNothing();
      } catch { /* non-fatal */ }
      sendWelcomeEmail({ id: user.id, name: user.name, email: user.email }).catch(() => {});
      createNotification({
        userId: user.id,
        type: "welcome",
        title: "Welcome to Career Boost AI! 🎉",
        body: "Your account is ready. Build your resume and start practicing interviews.",
        link: "/dashboard",
      }).catch(() => {});
    }

    const token = jwt.sign({ id: user.id, email: user.email });
    res.redirect(`/?auth=google&token=${encodeURIComponent(token)}&name=${encodeURIComponent(user.name)}`);
  } catch {
    res.redirect(`/?auth=google_error`);
  }
}

router.get("/auth/google", googleStartLimiter, handleStart);
router.get("/auth/google/callback", handleCallback);

export default router;
