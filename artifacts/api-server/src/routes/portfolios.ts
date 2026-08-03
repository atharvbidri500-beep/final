import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, portfoliosTable } from "@workspace/db";
import { awardXP } from "../lib/gamification.js";
import { recordEvent } from "../lib/careerMemory.js";
import { requirePremium } from "../lib/gating.js";

const router = Router();

function makeSlug(base: string): string {
  const clean = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return clean ? `${clean}-${suffix}` : `portfolio-${suffix}`;
}

async function slugAvailable(slug: string): Promise<boolean> {
  const [existing] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.slug, slug));
  return !existing;
}

async function uniqueSlug(base: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? base.slice(0, 40) : makeSlug(base);
    if (await slugAvailable(slug)) return slug;
  }
  return makeSlug(base + Math.random().toString(36).slice(2, 6));
}

/** Own portfolio. */
router.get("/portfolio", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.userId, userId));
  res.json(portfolio ? { ...portfolio, createdAt: portfolio.createdAt.toISOString(), updatedAt: portfolio.updatedAt.toISOString() } : null);
});

/** Create portfolio (once per user). */
router.post("/portfolio", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, headline } = req.body as { title?: string; headline?: string };
  if (!title) { res.status(400).json({ error: "title is required" }); return; }

  const [existing] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.userId, userId));
  if (existing) {
    res.status(409).json({ error: "A portfolio already exists for this user", portfolio: existing });
    return;
  }

  const slug = await uniqueSlug(title);
  const [portfolio] = await db.insert(portfoliosTable).values({
    userId, slug, title, headline: headline ?? null,
  }).returning();

  awardXP(userId, 15, "Created a portfolio").catch(() => {});
  recordEvent(userId, "portfolio", `Created portfolio "${title}"`).catch(() => {});

  res.status(201).json({ ...portfolio, createdAt: portfolio.createdAt.toISOString(), updatedAt: portfolio.updatedAt.toISOString() });
});

/** Update portfolio content. */
router.put("/portfolio", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.userId, userId));
  if (!portfolio) { res.status(404).json({ error: "Create a portfolio first" }); return; }

  const {
    title, headline, about, theme, projects, certifications, achievements, contactEmail, seoTitle, seoDescription,
  } = req.body as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  if (typeof title === "string" && title.trim()) updates.title = title.trim();
  if (typeof headline === "string") updates.headline = headline;
  if (typeof about === "string") updates.about = about;
  if (typeof theme === "string") updates.theme = theme;
  if (Array.isArray(projects)) updates.projects = projects.slice(0, 20);
  if (Array.isArray(certifications)) updates.certifications = certifications.slice(0, 30);
  if (Array.isArray(achievements)) updates.achievements = achievements.slice(0, 20);
  if (typeof contactEmail === "string") updates.contactEmail = contactEmail;
  if (typeof seoTitle === "string") updates.seoTitle = seoTitle;
  if (typeof seoDescription === "string") updates.seoDescription = seoDescription;

  const [updated] = await db.update(portfoliosTable).set(updates).where(eq(portfoliosTable.id, portfolio.id)).returning();
  recordEvent(userId, "portfolio", "Updated portfolio content").catch(() => {});
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

/** Publish / unpublish the portfolio. */
router.post("/portfolio/publish", requirePremium, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { published = true } = req.body as { published?: boolean };
  const [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.userId, userId));
  if (!portfolio) { res.status(404).json({ error: "Create a portfolio first" }); return; }

  const [updated] = await db.update(portfoliosTable).set({ published: !!published })
    .where(eq(portfoliosTable.id, portfolio.id)).returning();

  if (published && !portfolio.published) {
    awardXP(userId, 10, "Published portfolio").catch(() => {});
    recordEvent(userId, "portfolio", "Published portfolio publicly").catch(() => {});
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

/** Regenerate the public slug. */
router.post("/portfolio/slug", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.userId, userId));
  if (!portfolio) { res.status(404).json({ error: "Create a portfolio first" }); return; }
  const slug = await uniqueSlug(portfolio.title);
  const [updated] = await db.update(portfoliosTable).set({ slug }).where(eq(portfoliosTable.id, portfolio.id)).returning();
  res.json({ slug: updated.slug });
});

/** Public portfolio page (no auth). */
router.get("/portfolio/:slug", async (req, res): Promise<void> => {
  const [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.slug, req.params.slug));
  if (!portfolio) { res.status(404).json({ error: "Portfolio not found" }); return; }
  if (!portfolio.published) { res.status(404).json({ error: "This portfolio is not published yet" }); return; }
  res.json({
    slug: portfolio.slug,
    title: portfolio.title,
    headline: portfolio.headline,
    about: portfolio.about,
    theme: portfolio.theme,
    projects: portfolio.projects ?? [],
    certifications: portfolio.certifications ?? [],
    achievements: portfolio.achievements ?? [],
    contactEmail: portfolio.contactEmail,
    seoTitle: portfolio.seoTitle,
    seoDescription: portfolio.seoDescription,
    updatedAt: portfolio.updatedAt.toISOString(),
  });
});

export default router;
