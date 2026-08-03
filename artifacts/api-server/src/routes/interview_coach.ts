import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import {
  db, interviewAnalyticsTable, interviewSessionsTable,
} from "@workspace/db";
import { askAI, safeParseJSON } from "../lib/ai.js";
import { awardXP } from "../lib/gamification.js";
import { recordEvent } from "../lib/careerMemory.js";
import { requireTier, requirePremium } from "../lib/gating.js";

const router = Router();

const FILLER_WORDS = ["um", "uh", "like", "actually", "basically", "you know", "i mean", "sort of", "kind of", "well", "so", "right", "okay"];

/* â”€â”€ Speech-to-text provider interface â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* Honest behavior: if a Whisper/OpenAI key is configured we transcribe the
   audio; otherwise we return available:false so the UI can fall back to a
   text answer. No fake transcripts ever. */

const WHISPER_KEY = process.env.WHISPER_API_KEY ?? process.env.OPENAI_API_KEY ?? "";

export async function transcribeAudio(audioUrl: string): Promise<{ available: true; transcript: string } | { available: false; reason: string }> {
  if (!WHISPER_KEY) {
    return { available: false, reason: "Audio transcription needs a WHISPER_API_KEY (or OPENAI_API_KEY). Answer in text for now." };
  }
  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`audio fetch failed: ${audioRes.status}`);
    const blob = await audioRes.arrayBuffer();
    const form = new FormData();
    form.append("file", new Blob([blob]), "answer.webm");
    form.append("model", "whisper-1");
    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${WHISPER_KEY}` },
      body: form,
    });
    if (!resp.ok) throw new Error(`whisper error: ${resp.status}`);
    const data = await resp.json() as { text?: string };
    return { available: true, transcript: data.text ?? "" };
  } catch (e: any) {
    return { available: false, reason: `Transcription failed: ${e?.message ?? "unknown error"}` };
  }
}

/* â”€â”€ Speech metrics (real, computed from transcript + duration) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function speechMetrics(transcript: string, durationSec?: number | null) {
  const lower = ` ${transcript.toLowerCase()} `;
  const fillerWords = FILLER_WORDS
    .map(word => ({ word, count: lower.split(new RegExp(`\\b${word.replace(/ /g, "\\s+")}\\b`, "g")).length - 1 }))
    .filter(f => f.count > 0)
    .sort((a, b) => b.count - a.count);
  const fillerCount = fillerWords.reduce((s, f) => s + f.count, 0);
  const words = transcript.split(/\s+/).filter(Boolean).length;
  const speakingSpeedWpm = durationSec && durationSec > 0 ? Math.round(words / (durationSec / 60)) : null;
  const pauseCount = (transcript.match(/\.{3,}|â€¦/g) ?? []).length + (transcript.match(/[.!?]\s{3,}/g) ?? []).length;
  return { fillerWords, fillerCount, speakingSpeedWpm, pauseCount, words };
}

/* â”€â”€ Question bank + AI generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const QUESTION_BANK: Record<string, string[]> = {
  hr: ["Tell me about yourself.", "Why do you want to work here?", "What are your strengths and weaknesses?", "Where do you see yourself in five years?", "Why should we hire you?"],
  technical: ["Explain a project you are proud of and your role in it.", "How do you debug a production issue?", "Describe a time you used data to make a decision.", "How do you keep your skills up to date?", "Explain a complex concept to a non-technical person."],
  behavioral: ["Tell me about a conflict you resolved at work.", "Describe a time you failed and what you learned.", "Give an example of leadership without authority.", "Tell me about a time you went above and beyond.", "Describe a stressful situation and how you handled it."],
  aptitude: ["If you had 24 hours to learn a new skill, what would you pick and why?", "How would you improve our product?", "Estimate how many coffee shops are in Mumbai.", "What does success mean to you?", "How do you prioritise when everything is urgent?"],
};

async function generateQuestion(category: string, previous: string[] = []) {
  const bank = QUESTION_BANK[category] ?? QUESTION_BANK.hr;
  const fresh = bank.filter(q => !previous.includes(q));
  const prompt = `Give me one fresh interview practice question for the "${category}" interview category. Do not repeat: ${previous.join(" | ") || "none"}. Return ONLY valid JSON: {"question": "the question", "focus": "what the interviewer is testing", "tip": "one line of advice"}`;
  try {
    const raw = await askAI([
      { role: "system", content: "You are an interview coach. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ], true, 15000);
    const p = safeParseJSON<any>(raw, null);
    if (p && typeof p.question === "string" && p.question.length > 8) return p;
  } catch { /* fallback */ }
  const question = fresh[Math.floor(Math.random() * fresh.length)] ?? bank[0];
  return { question, focus: "How you structure and deliver the answer", tip: "Use the STAR method and keep it under two minutes." };
}

/* â”€â”€ ROUTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Practice question generator. */
router.post("/interview-coach/questions", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { category, previousQuestions = [] } = req.body;
  if (!category) { res.status(400).json({ error: "category is required" }); return; }
  res.json(await generateQuestion(category, Array.isArray(previousQuestions) ? previousQuestions : []));
});

/** Start a coach session (analytics row). */
router.post("/interview-coach/sessions", requirePremium, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { interviewType = "general", companyName } = req.body as { interviewType?: string; companyName?: string };

  const [session] = await db.insert(interviewSessionsTable).values({
    userId, category: interviewType, questionCount: 0,
  }).returning();

  const [analytic] = await db.insert(interviewAnalyticsTable).values({
    userId, sessionId: session.id, interviewType, companyName: companyName ?? null,
  }).returning();

  awardXP(userId, 10, "Started an interview practice session").catch(() => {});
  recordEvent(userId, "interview", `Started ${interviewType} interview practice${companyName ? ` for ${companyName}` : ""}`).catch(() => {});

  res.status(201).json({
    id: analytic.id, sessionId: session.id,
    interviewType: analytic.interviewType, companyName: analytic.companyName,
    transcript: analytic.transcript, feedback: analytic.feedback,
    createdAt: analytic.createdAt.toISOString(),
    transcription: WHISPER_KEY ? { available: true } : { available: false, reason: "Audio transcription needs a WHISPER_API_KEY. Answer in text." },
  });
});

/** Transcribe an uploaded answer audio (only if a Whisper key is configured). */
router.post("/interview-coach/sessions/:id/transcribe", requirePremium, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [analytic] = await db.select().from(interviewAnalyticsTable).where(eq(interviewAnalyticsTable.id, id));
  if (!analytic || analytic.userId !== userId) { res.status(404).json({ error: "Session not found" }); return; }
  const { audioUrl } = req.body;
  if (!audioUrl) { res.status(400).json({ error: "audioUrl is required" }); return; }

  const result = await transcribeAudio(audioUrl);
  if (!result.available) {
    res.json({ available: false, reason: result.reason });
    return;
  }
  await db.update(interviewAnalyticsTable).set({
    transcript: result.transcript, audioUrl,
  }).where(eq(interviewAnalyticsTable.id, id));
  res.json({ available: true, transcript: result.transcript });
});

/** Evaluate an answer: metrics + AI feedback + roadmap. */
router.post("/interview-coach/sessions/:id/evaluate", requirePremium, async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const { transcript, audioDurationSec } = req.body as { transcript?: string; audioDurationSec?: number };
  if (!transcript || transcript.trim().length < 5) {
    res.status(400).json({ error: "A meaningful transcript is required" }); return;
  }

  const [analytic] = await db.select().from(interviewAnalyticsTable).where(eq(interviewAnalyticsTable.id, id));
  if (!analytic || analytic.userId !== userId) { res.status(404).json({ error: "Session not found" }); return; }

  const metrics = speechMetrics(transcript, audioDurationSec ?? analytic.audioDurationSec);

  const prompt = `You are a communication coach. Evaluate this interview answer. Be specific and encouraging. Return ONLY valid JSON:
{
  "communicationScore": <0-100>,
  "confidenceScore": <0-100>,
  "clarityScore": <0-100>,
  "feedback": "2-3 sentences of overall feedback",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "improvementRoadmap": {"thisWeek": "one action for this week", "thisMonth": "one action for this month", "nextMonth": "one action for next month"},
  "modelAnswer": "a crisp sample answer following best practice (max 120 words)"
}

Answer:
${transcript.slice(0, 3000)}`;

  let evaluation: any = null;
  try {
    const raw = await askAI([
      { role: "system", content: "You are a strict but encouraging interview communication coach. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ], true, 25000);
    const p = safeParseJSON<any>(raw, null);
    if (p && typeof p.communicationScore === "number") evaluation = p;
  } catch { /* fallback below */ }

  if (!evaluation) {
    const words = metrics.words;
    const fillerPenalty = Math.min(30, metrics.fillerCount * 4);
    const speedNote = metrics.speakingSpeedWpm && (metrics.speakingSpeedWpm < 90 || metrics.speakingSpeedWpm > 170) ? 10 : 0;
    const base = Math.min(88, 58 + Math.min(15, Math.round(words / 25)) - speedNote);
    evaluation = {
      communicationScore: base,
      confidenceScore: Math.min(90, base + 4 - fillerPenalty),
      clarityScore: Math.max(30, base - fillerPenalty),
      feedback: metrics.fillerCount > 5
        ? `Clear structure, but "${metrics.fillerWords[0].word}" appears ${metrics.fillerWords[0].count} times. Try pausing instead of filler words.`
        : "Solid, structured answer. Vary your pace slightly and it will land even better.",
      strengths: ["Structured delivery", "Relevant content"],
      weaknesses: metrics.fillerCount > 5 ? ["Overuse of filler words"] : ["Could add one concrete example"],
      improvementRoadmap: {
        thisWeek: "Practice your answer aloud twice and time it.",
        thisMonth: "Record yourself and count filler words per minute.",
        nextMonth: "Do one live mock interview with a friend.",
      },
      modelAnswer: null,
    };
  }

  const updated = {
    transcript,
    audioDurationSec: audioDurationSec ?? analytic.audioDurationSec,
    speakingSpeedWpm: metrics.speakingSpeedWpm,
    fillerWords: metrics.fillerWords.slice(0, 10),
    pauseCount: metrics.pauseCount,
    feedback: evaluation.feedback,
    weaknesses: Array.isArray(evaluation.weaknesses) ? evaluation.weaknesses.slice(0, 6) : [],
    improvementRoadmap: evaluation.improvementRoadmap ?? {},
  };

  await db.update(interviewAnalyticsTable).set(updated).where(eq(interviewAnalyticsTable.id, id));

  const [session] = await db.select().from(interviewSessionsTable).where(eq(interviewSessionsTable.id, analytic.sessionId ?? 0));
  if (session && session.userId === userId) {
    const newCount = session.questionCount + 1;
    const newComm = Math.floor(((session.avgCommunicationScore ?? 0) * session.questionCount + evaluation.communicationScore) / newCount);
    const newConf = Math.floor(((session.avgConfidenceScore ?? 0) * session.questionCount + evaluation.confidenceScore) / newCount);
    await db.update(interviewSessionsTable).set({ questionCount: newCount, avgCommunicationScore: newComm, avgConfidenceScore: newConf })
      .where(eq(interviewSessionsTable.id, session.id));
  }

  awardXP(userId, 20, "Completed an interview answer evaluation").catch(() => {});
  recordEvent(userId, "interview", "Received interview coach feedback").catch(() => {});

  res.json({
    ...updated,
    fillerCount: metrics.fillerCount,
    wordCount: metrics.words,
    communicationScore: evaluation.communicationScore,
    confidenceScore: evaluation.confidenceScore,
    clarityScore: evaluation.clarityScore,
    strengths: evaluation.strengths,
    modelAnswer: evaluation.modelAnswer,
  });
});

/** List coach sessions. */
router.get("/interview-coach/sessions", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(interviewAnalyticsTable)
    .where(eq(interviewAnalyticsTable.userId, userId))
    .orderBy(desc(interviewAnalyticsTable.createdAt))
    .limit(100);
  res.json(rows.map(r => ({
    id: r.id, interviewType: r.interviewType, companyName: r.companyName,
    audioDurationSec: r.audioDurationSec, speakingSpeedWpm: r.speakingSpeedWpm,
    fillerCount: (r.fillerWords ?? []).reduce((s, f) => s + f.count, 0),
    pauseCount: r.pauseCount, feedback: r.feedback,
    createdAt: r.createdAt.toISOString(),
  })));
});

/** One coach session detail. */
router.get("/interview-coach/sessions/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [analytic] = await db.select().from(interviewAnalyticsTable).where(eq(interviewAnalyticsTable.id, id));
  if (!analytic || analytic.userId !== userId) { res.status(404).json({ error: "Session not found" }); return; }
  res.json({ ...analytic, createdAt: analytic.createdAt.toISOString() });
});

/** Aggregated coach stats. */
router.get("/interview-coach/stats", requireTier("premium"), async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(interviewAnalyticsTable).where(eq(interviewAnalyticsTable.userId, userId));
  const evaluated = rows.filter(r => r.feedback);
  const sessionRows = await db.select().from(interviewSessionsTable).where(eq(interviewSessionsTable.userId, userId));
  const scoreBySession = new Map(sessionRows.map(s => [s.id, s]));

  const comm = evaluated.map(r => scoreBySession.get(r.sessionId)?.avgCommunicationScore ?? 0);
  const conf = evaluated.map(r => scoreBySession.get(r.sessionId)?.avgConfidenceScore ?? 0);
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const fillerTally = new Map<string, number>();
  for (const r of rows) for (const f of r.fillerWords ?? []) fillerTally.set(f.word, (fillerTally.get(f.word) ?? 0) + f.count);
  const topFiller = [...fillerTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const byWeek = new Map<string, { sessions: number; avgComm: number[] }>();
  for (const r of evaluated) {
    const key = r.createdAt.toISOString().slice(0, 10);
    const w = byWeek.get(key) ?? { sessions: 0, avgComm: [] as number[] };
    w.sessions += 1;
    w.avgComm.push(scoreBySession.get(r.sessionId)?.avgCommunicationScore ?? 0);
    byWeek.set(key, w);
  }
  const trend = [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([date, w]) => ({ date, sessions: w.sessions, avgCommunication: Math.round(w.avgComm.reduce((a, b) => a + b, 0) / w.avgComm.length) }));

  res.json({
    totalSessions: rows.length,
    evaluatedSessions: evaluated.length,
    avgCommunicationScore: avg(comm),
    avgConfidenceScore: avg(conf),
    avgSpeakingSpeedWpm: (() => {
      const speeds = rows.map(r => r.speakingSpeedWpm).filter((v): v is number => typeof v === "number");
      return speeds.length ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : null;
    })(),
    topFillerWords: topFiller,
    trend,
    progressNote: evaluated.length >= 3
      ? "You have enough evaluated sessions to see your trend. Aim for 3 sessions per week."
      : `Evaluate ${3 - evaluated.length} more session${evaluated.length >= 2 ? "" : "s"} to unlock trend analysis.`,
  });
});

export default router;
