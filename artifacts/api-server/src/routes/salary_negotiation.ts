import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, salaryOffersTable } from "@workspace/db";
import { askAI, safeParseJSON } from "../lib/ai.js";
import { awardXP } from "../lib/gamification.js";
import { recordEvent } from "../lib/careerMemory.js";
import { requirePremium } from "../lib/gating.js";

const router = Router();

/* ── Rule-based salary benchmarks (real, conservative INR bands) ─────────── */

const BENCHMARKS: Record<string, [number, number]> = {
  developer: [400000, 1600000],
  engineer: [500000, 2200000],
  frontend: [450000, 1800000],
  backend: [500000, 2000000],
  "data scientist": [600000, 2500000],
  analyst: [400000, 1500000],
  designer: [350000, 1500000],
  marketing: [300000, 1200000],
  sales: [350000, 1800000],
  manager: [800000, 3500000],
  hr: [300000, 1200000],
  finance: [450000, 2000000],
  default: [300000, 1200000],
};

function detectRole(title: string): [string, number] {
  const lower = title.toLowerCase();
  const keys = Object.keys(BENCHMARKS);
  for (const k of keys) if (lower.includes(k)) return [k, 0];
  return ["default", 0];
}

function ruleStrategy(company: string, position: string, offered: number, expected: number, range: { min: number; max: number }) {
  const mid = Math.round((range.min + range.max) / 2);
  const gap = expected - offered;
  const messages: string[] = [];
  if (offered >= range.max) messages.push(`Offer is at the top of the ${position} band — push for non-salary items instead: joining bonus, sign-on, flexible hours, learning budget.`);
  else if (offered >= mid) messages.push("Offer is above market midpoint. Negotiate politely for 8–12% more plus one perk — the company expects a counter at this level.");
  else if (gap > 0) messages.push(`Offer is below your expectation by ₹${(gap / 100000).toFixed(1)}L. Anchor with the market range (₹${(range.min / 100000).toFixed(1)}L–₹${(range.max / 100000).toFixed(1)}L) and a specific number.`);
  else messages.push("Offer matches your expectation. Still counter +5–8% with your achievements as leverage — silence in negotiation always costs you.");
  messages.push("Never give a single number first — give a range whose floor is your real target.");
  messages.push("Always get the final offer in writing before accepting.");
  return messages.join(" ");
}

function ruleEmails(company: string, position: string, offered: number, counter: number) {
  return [
    {
      subject: `Re: Offer — ${position} at ${company}`,
      body: `Hi [Name],

Thank you for the offer of ₹${(offered / 100000).toFixed(1)} LPA for the ${position} role at ${company}. I'm very excited about the team and the work ahead.

Based on my research and comparable roles, I'd be comfortable at ₹${(counter / 100000).toFixed(1)} LPA. Given my experience and the impact I can bring from day one, I believe this reflects a fair alignment.

I'd love to move forward — could we discuss this?

Best regards,
[Your name]`,
    },
    {
      subject: `Re: ${position} offer discussion`,
      body: `Hi [Name],

I appreciate the revised offer. With my skills and the projects I've delivered, I'm confident in the value I'll bring.

Would it be possible to also consider [a joining bonus / extra leave / a learning budget] as part of the package?

Looking forward to closing this out.
Best regards,
[Your name]`,
    },
  ];
}

/** Analyze an offer + build strategy and counter-offer script. */
router.post("/salary-offers/analyze", requirePremium, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { company, position, offeredAmount, expectedAmount } = req.body as {
    company?: string; position?: string; offeredAmount?: number; expectedAmount?: number;
  };
  if (!company || !position || !offeredAmount) {
    res.status(400).json({ error: "company, position and offeredAmount are required" }); return;
  }
  const offered = Number(offeredAmount);
  const expected = Number(expectedAmount ?? offered * 1.15);

  const [detected] = detectRole(position);
  const [lo, hi] = BENCHMARKS[detected];
  const range = { min: lo, max: hi, source: `Rule-based ${detected} benchmark (INR/year)` };

  const prompt = `You are a salary negotiation coach. Build a strategy for: ${position} at ${company}, offered ₹${offered}, my expectation ₹${expected}. Market band for this role: ₹${lo}–₹${hi} per year.

Return ONLY valid JSON (no markdown):
{
  "marketRange": {"min": <number>, "max": <number>, "source": "short justification"},
  "counterOffer": <a concrete counter number in rupees, justified>,
  "strategy": "3-5 sentences: how to negotiate, what to anchor on, what to ask for besides money",
  "emails": [{"subject": "email subject", "body": "full polite email to send"}, {"subject": "...", "body": "follow-up email"}]
}`;

  let result: { marketRange?: { min: number; max: number; source: string }; counterOffer?: number; strategy?: string; emails?: { subject: string; body: string }[] } | null = null;
  try {
    const raw = await askAI([
      { role: "system", content: "You are an expert salary negotiator for the Indian job market. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ], true, 20000);
    const p = safeParseJSON<any>(raw, null);
    if (p && typeof p.counterOffer === "number" && p.counterOffer > 0) result = p;
  } catch { /* fallback */ }

  const fallbackCounter = Math.max(Math.round((offered + expected + (range.min + range.max) / 2) / 3 / 50000) * 50000, offered + 50000);
  const counterOffer = Number(result?.counterOffer ?? fallbackCounter);
  const strategy = result?.strategy ?? ruleStrategy(company, position, offered, expected, range);
  const emails = Array.isArray(result?.emails) && result.emails!.length > 0
    ? result.emails!.slice(0, 3).map((e: any) => ({ subject: String(e.subject ?? ""), body: String(e.body ?? "").slice(0, 2000) }))
    : ruleEmails(company, position, offered, counterOffer);

  const [saved] = await db.insert(salaryOffersTable).values({
    userId, company, position, offeredAmount: offered, expectedAmount: expected,
    marketRange: result?.marketRange ?? range, strategy, counterOffer, negotiationEmails: emails,
    status: "analyzed",
  }).returning();

  awardXP(userId, 20, `Analyzed salary offer from ${company}`).catch(() => {});
  recordEvent(userId, "salary", `Analyzed ${position} offer from ${company}`).catch(() => {});

  res.status(201).json({ ...saved, createdAt: saved.createdAt.toISOString(), updatedAt: saved.updatedAt.toISOString() });
});

/** List past offer analyses. */
router.get("/salary-offers", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(salaryOffersTable)
    .where(eq(salaryOffersTable.userId, userId))
    .orderBy(desc(salaryOffersTable.createdAt))
    .limit(50);
  res.json(rows.map(r => ({
    id: r.id, company: r.company, position: r.position, offeredAmount: r.offeredAmount,
    expectedAmount: r.expectedAmount, counterOffer: r.counterOffer, status: r.status,
    createdAt: r.createdAt.toISOString(),
  })));
});

/** Detail of one analysis. */
router.get("/salary-offers/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [row] = await db.select().from(salaryOffersTable).where(eq(salaryOffersTable.id, id));
  if (!row || row.userId !== userId) { res.status(404).json({ error: "Offer analysis not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
});

/** Mark outcome: accepted / declined. */
router.patch("/salary-offers/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const { status, counterOffer } = req.body as { status?: string; counterOffer?: number };
  const [row] = await db.select().from(salaryOffersTable).where(eq(salaryOffersTable.id, id));
  if (!row || row.userId !== userId) { res.status(404).json({ error: "Offer analysis not found" }); return; }

  const updates: Record<string, unknown> = {};
  if (typeof status === "string" && ["analyzed", "negotiating", "accepted", "declined"].includes(status)) updates.status = status;
  if (typeof counterOffer === "number") updates.counterOffer = counterOffer;

  const [updated] = await db.update(salaryOffersTable).set(updates).where(eq(salaryOffersTable.id, id)).returning();
  if (status === "accepted") {
    awardXP(userId, 30, `Accepted offer from ${row.company}`).catch(() => {});
    recordEvent(userId, "salary", `Accepted ${row.position} offer from ${row.company}`).catch(() => {});
  }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

export default router;
