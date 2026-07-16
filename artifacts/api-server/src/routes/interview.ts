import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, interviewSessionsTable } from "@workspace/db";
import { askAI, safeParseJSON } from "../lib/ai.js";
import { checkLimit } from "../lib/limits.js";

const router = Router();

/* ── Fallback rule-based question bank (used if AI fails) ─────────────────── */
const questionBank: Record<string, string[]> = {
  hr: [
    "Tell me about yourself and your career aspirations.",
    "What are your biggest strengths and one area you're actively improving?",
    "Where do you see yourself in 5 years?",
    "Why do you want to join our company specifically?",
    "Describe the most challenging situation you faced and how you resolved it.",
    "How do you handle failure or criticism from your manager?",
    "What motivates you to perform at your best every day?",
    "Tell me about a time you worked in a team and faced conflict — what happened?",
    "How do you prioritize tasks when you have multiple deadlines?",
    "What salary are you expecting and why?",
  ],
  software: [
    "Explain the difference between Object-Oriented and Functional programming with examples.",
    "What is the time complexity of binary search and how does it work?",
    "Describe the MVC architecture. Have you implemented it in a project?",
    "What is REST API? How does it differ from GraphQL?",
    "Explain polymorphism, encapsulation, and inheritance with real examples.",
    "What is database normalization? Explain 1NF, 2NF, 3NF.",
    "How does Git branching work? Describe your workflow.",
    "What is the difference between SQL JOIN types?",
    "Explain the concept of asynchronous programming in JavaScript.",
    "How would you optimize a slow API endpoint?",
    "What is Docker and why is it used?",
    "Explain the CAP theorem in distributed systems.",
  ],
  sales: [
    "Walk me through your entire sales process from first contact to close.",
    "How do you handle a prospect who says 'your price is too high'?",
    "Tell me about your highest-value deal and what made it successful.",
    "How do you build rapport with a cold lead over a phone call?",
    "What CRM tools have you used and how did they help you hit targets?",
    "How do you handle rejection and stay motivated?",
    "What's your strategy for upselling an existing customer?",
  ],
  "customer support": [
    "How do you handle an irate customer who is threatening to escalate?",
    "Describe a situation where you turned a negative customer experience positive.",
    "How do you manage 10 open tickets simultaneously without missing SLAs?",
    "What does customer satisfaction mean to you beyond CSAT scores?",
    "How do you handle a customer complaint you cannot immediately resolve?",
  ],
  banking: [
    "What are the key differences between NPA, bad debt, and doubtful debt?",
    "Explain KYC and AML — why are they critical for banks today?",
    "What is the role of RBI as India's central bank?",
    "Explain NEFT, RTGS, IMPS and SWIFT — when would each be used?",
    "What is CASA ratio and why does it matter for a bank's profitability?",
    "How do you handle a customer who suspects fraud on their account?",
    "What is Basel III and how does it affect Indian banks?",
  ],
  freshers: [
    "Why should we hire you over other candidates with more experience?",
    "What is the most significant project from your college and what was your exact contribution?",
    "How quickly do you pick up new technologies? Give a specific example.",
    "What do you plan to achieve in the first 90 days of this job?",
    "Describe your final year project — tech stack, challenges, what you'd do differently.",
    "What's your biggest weakness and how are you working to improve it?",
    "Why did you choose this career path over others?",
  ],
  marketing: [
    "How would you build a content marketing strategy from scratch for a B2B SaaS product?",
    "Explain the difference between SEO, SEM, and SMM — when would you use each?",
    "How do you measure the ROI of a digital marketing campaign?",
    "Tell me about a campaign you ran — what worked, what failed?",
    "How do you identify and target the right audience for a product?",
    "What analytics tools have you used and what metrics do you track daily?",
  ],
};

function getFallbackQuestion(category: string, count: number): string {
  const key = category.toLowerCase();
  const pool = questionBank[key] ?? questionBank["hr"]!;
  return pool[count % pool.length]!;
}

/* ── AI-powered question generator ───────────────────────────────────────── */
async function generateAIQuestion(category: string, count: number, previousQuestions: string[]): Promise<string> {
  const prev = previousQuestions.length > 0
    ? `Already asked: ${previousQuestions.slice(-3).map((q, i) => `${i + 1}. ${q}`).join("; ")}`
    : "This is the first question.";

  const prompt = `You are a senior interviewer at a top Indian company conducting a ${category} interview.
${prev}
Generate ONE fresh, specific, and challenging interview question for a ${category} role in India. 
Do NOT repeat previously asked questions. Make it realistic and practical.
Respond with ONLY the question text — no numbering, no preamble, no quotes.`;

  try {
    const raw = await askAI([{ role: "user", content: prompt }], false, 8000);
    const q = raw.replace(/^["'\d.\s-]+/, "").replace(/["']$/, "").trim();
    if (q.length > 10 && q.includes("?")) return q;
    return getFallbackQuestion(category, count);
  } catch {
    return getFallbackQuestion(category, count);
  }
}

/* ── AI-powered answer evaluator ─────────────────────────────────────────── */
interface EvalResult {
  feedback: string;
  communicationScore: number;
  confidenceScore: number;
  improvedAnswer: string;
  strengths: string[];
  improvements: string[];
}

function ruleFallback(answer: string, category: string): EvalResult {
  const wc = answer.trim().split(/\s+/).length;
  const hasStructure = answer.includes(".") || answer.includes(",");
  const isDetailed = wc > 30;
  const comm = Math.min(95, 40 + (isDetailed ? 25 : 0) + (hasStructure ? 20 : 0) + Math.min(10, Math.floor(wc / 10)));
  const conf = Math.min(95, 45 + (wc > 20 ? 20 : 0) + (hasStructure ? 20 : 0) + Math.min(10, Math.floor(wc / 15)));
  return {
    feedback: `Your answer has ${wc} words. ${isDetailed ? "Good detail level." : "Add more specific examples."} Use the STAR method for stronger responses.`,
    communicationScore: comm,
    confidenceScore: conf,
    strengths: isDetailed ? ["Good detail", "Structured response"] : ["Shows basic understanding"],
    improvements: ["Add specific examples with numbers", "Use STAR: Situation, Task, Action, Result", "Quantify your achievements"],
    improvedAnswer: `${answer.trim()} I would also highlight that my ${category === "software" ? "technical problem-solving approach" : "collaborative nature and communication skills"} have consistently helped me deliver results.`,
  };
}

async function evaluateWithAI(question: string, answer: string, category: string): Promise<EvalResult> {
  const prompt = `You are an expert ${category} interviewer and communication coach at a top Indian company.

Question asked: "${question}"
Candidate's answer: "${answer}"

Evaluate this answer STRICTLY and ACCURATELY — do not give inflated scores. Respond with ONLY valid JSON (no markdown, no explanation):
{
  "feedback": "2-3 sentences of honest, specific feedback mentioning what's good and what's missing",
  "communicationScore": <integer 0-100 based on clarity, vocabulary, sentence structure>,
  "confidenceScore": <integer 0-100 based on assertiveness, specificity, avoiding vague phrases>,
  "strengths": ["specific strength 1", "specific strength 2"],
  "improvements": ["specific actionable improvement 1", "improvement 2", "improvement 3"],
  "improvedAnswer": "A significantly better version of their answer using STAR method in 4-5 sentences"
}

Scoring guide: 0-40 = poor, 41-60 = average, 61-75 = good, 76-90 = strong, 91-100 = exceptional.`;

  try {
    const raw = await askAI([{ role: "system", content: "You are a strict interview evaluator. Respond only with valid JSON." }, { role: "user", content: prompt }], true, 15000);
    const parsed = safeParseJSON<EvalResult>(raw, ruleFallback(answer, category));
    if (
      typeof parsed.communicationScore === "number" &&
      typeof parsed.confidenceScore === "number" &&
      typeof parsed.feedback === "string" &&
      parsed.feedback.length > 10
    ) {
      return {
        ...parsed,
        communicationScore: Math.max(0, Math.min(100, Math.round(parsed.communicationScore))),
        confidenceScore: Math.max(0, Math.min(100, Math.round(parsed.confidenceScore))),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      };
    }
    return ruleFallback(answer, category);
  } catch {
    return ruleFallback(answer, category);
  }
}

/* ── AI-powered English improver ─────────────────────────────────────────── */
interface EnglishResult {
  improvedText: string;
  corrections: string[];
  professionalTips: string[];
}

function englishFallback(text: string): EnglishResult {
  let improved = text
    .replace(/\bi am\b/g, "I am")
    .replace(/\bi have\b/g, "I have")
    .replace(/\bi will\b/g, "I will")
    .replace(/\bgonna\b/g, "going to")
    .replace(/\bwanna\b/g, "want to")
    .replace(/\bgotta\b/g, "have to")
    .replace(/\bu r\b/gi, "you are")
    .replace(/\bthx\b/gi, "thank you")
    .replace(/\bpls\b/gi, "please")
    .replace(/\bbtw\b/gi, "by the way");
  return {
    improvedText: improved,
    corrections: ["Applied basic grammar and formality corrections"],
    professionalTips: [
      "Use complete sentences with subject, verb, and object",
      "Avoid slang and abbreviations in professional emails",
      "Use active voice: 'I completed the project' not 'The project was completed by me'",
      "Proofread before sending — read it aloud once",
    ],
  };
}

async function improveEnglishWithAI(text: string): Promise<EnglishResult> {
  const prompt = `You are a professional English coach helping Indian students and professionals improve their written communication.

Original text: "${text}"

Improve this text for professional use (job applications, emails, resumes, interviews). 
Respond with ONLY valid JSON:
{
  "improvedText": "the improved, polished professional version",
  "corrections": ["correction 1 — specific to this text", "correction 2", "correction 3"],
  "professionalTips": ["tip 1 specific to issues in this text", "tip 2", "tip 3", "tip 4"]
}`;

  try {
    const raw = await askAI([{ role: "system", content: "You are a professional English writing coach. Respond only with valid JSON." }, { role: "user", content: prompt }], true, 12000);
    const parsed = safeParseJSON<EnglishResult>(raw, englishFallback(text));
    if (typeof parsed.improvedText === "string" && parsed.improvedText.length > 5) return parsed;
    return englishFallback(text);
  } catch {
    return englishFallback(text);
  }
}

/* ── ROUTES ───────────────────────────────────────────────────────────────── */

router.get("/interview/sessions", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Login required to view sessions" }); return; }
  const sessions = await db.select().from(interviewSessionsTable).where(eq(interviewSessionsTable.userId, userId)).orderBy(desc(interviewSessionsTable.createdAt));
  res.json(sessions.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.post("/interview/sessions", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Login required to start an interview session" }); return; }
  const { category } = req.body;
  if (!category) { res.status(400).json({ error: "category is required" }); return; }

  const limit = await checkLimit(userId, "interview");
  if (limit.over) { res.status(402).json({ error: "UPGRADE_REQUIRED", message: limit.message }); return; }

  const [session] = await db.insert(interviewSessionsTable).values({ userId, category, questionCount: 0 }).returning();
  res.status(201).json({ ...session, createdAt: session.createdAt.toISOString() });
});

router.get("/interview/sessions/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(String(req.params.id), 10);
  const [session] = await db.select().from(interviewSessionsTable).where(eq(interviewSessionsTable.id, id));
  if (!session || session.userId !== userId) { res.status(404).json({ error: "Session not found" }); return; }
  res.json({ ...session, createdAt: session.createdAt.toISOString() });
});

router.post("/interview/question", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Login required to get interview questions" }); return; }
  const { category, count = 0, previousQuestions = [] } = req.body;
  if (!category) { res.status(400).json({ error: "category is required" }); return; }
  const question = await generateAIQuestion(category, count, previousQuestions);
  res.json({ question });
});

router.post("/interview/answer", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Login required to evaluate answers" }); return; }
  const { sessionId, question, answer, category } = req.body;
  if (!question || !answer) { res.status(400).json({ error: "question and answer are required" }); return; }
  if (answer.trim().length < 5) { res.status(400).json({ error: "Please provide a meaningful answer" }); return; }

  const result = await evaluateWithAI(question, answer, category ?? "hr");

  if (sessionId) {
    const [session] = await db.select().from(interviewSessionsTable).where(eq(interviewSessionsTable.id, sessionId));
    if (session && session.userId === userId) {
      const newCount = session.questionCount + 1;
      const newAvgComm = Math.floor(((session.avgCommunicationScore ?? 0) * session.questionCount + result.communicationScore) / newCount);
      const newAvgConf = Math.floor(((session.avgConfidenceScore ?? 0) * session.questionCount + result.confidenceScore) / newCount);
      await db.update(interviewSessionsTable).set({
        questionCount: newCount,
        avgCommunicationScore: newAvgComm,
        avgConfidenceScore: newAvgConf,
      }).where(eq(interviewSessionsTable.id, sessionId));
    }
  }

  res.json(result);
});

router.post("/interview/improve-english", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Login required to use English tool" }); return; }
  const { text } = req.body;
  if (!text || text.trim().length < 3) { res.status(400).json({ error: "Please enter some text to improve" }); return; }
  const result = await improveEnglishWithAI(text);
  res.json(result);
});

export default router;
