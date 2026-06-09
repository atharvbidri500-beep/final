import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, interviewSessionsTable } from "@workspace/db";

const router = Router();

const questionsByCategory: Record<string, string[]> = {
  "hr": [
    "Tell me about yourself.",
    "What are your strengths and weaknesses?",
    "Where do you see yourself in 5 years?",
    "Why do you want to work here?",
    "Describe a challenge you faced and how you overcame it.",
    "What motivates you?",
    "How do you handle pressure and tight deadlines?",
  ],
  "software": [
    "Explain the difference between Object-Oriented and Functional programming.",
    "What is the time complexity of binary search?",
    "Describe the MVC architecture.",
    "What is REST API? How does it differ from SOAP?",
    "Explain polymorphism with an example.",
    "What is database normalization?",
    "Describe your experience with version control systems.",
  ],
  "sales": [
    "How do you handle customer objections?",
    "Describe your sales process from lead to close.",
    "Tell me about your highest sales achievement.",
    "How do you build long-term client relationships?",
    "What CRM tools have you used?",
  ],
  "customer support": [
    "How do you handle an angry customer?",
    "Describe a time you went above and beyond for a customer.",
    "How do you prioritize multiple customer issues?",
    "What does excellent customer service mean to you?",
  ],
  "banking": [
    "What do you know about the banking sector?",
    "Explain the difference between NPA and bad debt.",
    "What is KYC and why is it important?",
    "Describe the role of RBI in the Indian economy.",
    "What is the difference between NEFT, RTGS, and IMPS?",
  ],
  "freshers": [
    "Why should we hire you as a fresher?",
    "What did you learn from your internship or college projects?",
    "How quickly can you learn new technologies?",
    "What are your career goals for the next 2 years?",
    "Tell me about your final year project.",
  ],
};

function getNextQuestion(category: string, count: number): string {
  const key = category.toLowerCase();
  const questions = questionsByCategory[key] ?? questionsByCategory["hr"]!;
  return questions[count % questions.length]!;
}

function evaluateAnswer(question: string, answer: string, category: string): {
  feedback: string;
  communicationScore: number;
  confidenceScore: number;
  improvedAnswer: string;
  strengths: string[];
  improvements: string[];
} {
  const wordCount = answer.trim().split(/\s+/).length;
  const hasStructure = answer.includes(".") || answer.includes(",");
  const isDetailed = wordCount > 30;

  const communicationScore = Math.min(95, 40 + (isDetailed ? 25 : 0) + (hasStructure ? 20 : 0) + Math.min(10, Math.floor(wordCount / 10)));
  const confidenceScore = Math.min(95, 45 + (wordCount > 20 ? 20 : 0) + (hasStructure ? 20 : 0) + Math.min(10, Math.floor(wordCount / 15)));

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (isDetailed) strengths.push("Good level of detail in your answer");
  if (hasStructure) strengths.push("Well-structured response with proper sentences");
  if (wordCount > 50) strengths.push("Comprehensive answer covering key points");

  if (!isDetailed) improvements.push("Provide more specific details and examples");
  if (wordCount < 20) improvements.push("Expand your answer with more context");
  improvements.push("Use the STAR method: Situation, Task, Action, Result");
  improvements.push("Start with confidence — avoid filler words like 'um', 'like', 'basically'");

  const improvedAnswer = `${answer.trim()} Additionally, I would like to emphasize that in my experience, I have consistently demonstrated strong ${category === "software" ? "technical" : "interpersonal"} skills and a commitment to delivering high-quality results. I believe this makes me a strong candidate for this role.`;

  return {
    feedback: `Your answer shows ${wordCount > 30 ? "good" : "basic"} understanding. ${improvements[0]}. Focus on giving specific examples from your experience to strengthen your response.`,
    communicationScore,
    confidenceScore,
    improvedAnswer,
    strengths,
    improvements,
  };
}

function improveEnglishText(text: string): { improved: string; corrections: string[]; tips: string[] } {
  const corrections: string[] = [];
  let improved = text;

  if (/\bi am\b/i.test(text) && !/\bI am\b/.test(text)) {
    improved = improved.replace(/\bi am\b/g, "I am");
    corrections.push("Capitalize 'I am' correctly");
  }
  if (/gonna|wanna|gotta/.test(text)) {
    improved = improved.replace(/gonna/g, "going to").replace(/wanna/g, "want to").replace(/gotta/g, "have to");
    corrections.push("Replaced informal contractions with professional language");
  }

  const tips = [
    "Use professional vocabulary — avoid slang and informal phrases",
    "Vary your sentence structure for better flow",
    "Use active voice instead of passive voice where possible",
    "Proofread your responses before sending them",
    "Practice speaking English daily to build confidence",
  ];

  return { improved: improved || text, corrections: corrections.length ? corrections : ["Grammar looks good! Minor polish applied for professional tone."], tips };
}

router.get("/interview/sessions", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const sessions = await db.select().from(interviewSessionsTable).where(eq(interviewSessionsTable.userId, userId)).orderBy(desc(interviewSessionsTable.createdAt));
  res.json(sessions.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.post("/interview/sessions", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { category } = req.body;
  if (!category) { res.status(400).json({ error: "category is required" }); return; }
  const [session] = await db.insert(interviewSessionsTable).values({ userId, category, questionCount: 0 }).returning();
  res.status(201).json({ ...session, createdAt: session.createdAt.toISOString() });
});

router.get("/interview/sessions/:id", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [session] = await db.select().from(interviewSessionsTable).where(eq(interviewSessionsTable.id, id));
  if (!session || session.userId !== userId) { res.status(404).json({ error: "Session not found" }); return; }
  res.json({ ...session, createdAt: session.createdAt.toISOString() });
});

router.post("/interview/answer", async (req, res): Promise<void> => {
  const userId = (req as any).userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { sessionId, question, answer, category } = req.body;
  if (!question || !answer) { res.status(400).json({ error: "question and answer are required" }); return; }

  const result = evaluateAnswer(question, answer, category ?? "hr");

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
  const { text } = req.body;
  if (!text) { res.status(400).json({ error: "text is required" }); return; }
  const { improved, corrections, tips } = improveEnglishText(text);
  res.json({ improvedText: improved, corrections, professionalTips: tips });
});

export default router;
