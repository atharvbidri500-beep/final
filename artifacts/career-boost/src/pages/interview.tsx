import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, ChevronRight, RotateCcw, Star, TrendingUp, Loader2, MessageSquare } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";

const CATEGORIES = [
  { id: "hr", label: "HR Interview", emoji: "👔", desc: "Tell me about yourself, strengths, weaknesses" },
  { id: "software", label: "Software/Tech", emoji: "💻", desc: "Technical, DSA, system design questions" },
  { id: "freshers", label: "Freshers Special", emoji: "🎓", desc: "Questions for 0 experience candidates" },
  { id: "banking", label: "Banking/Finance", emoji: "🏦", desc: "RBI, KYC, NEFT, banking knowledge" },
  { id: "sales", label: "Sales & Marketing", emoji: "📈", desc: "Client handling, target achievement" },
  { id: "customer support", label: "Customer Support", emoji: "🎧", desc: "Customer handling, empathy, resolution" },
];

const QUESTIONS: Record<string, string[]> = {
  hr: ["Tell me about yourself.", "What are your greatest strengths?", "What is your biggest weakness?", "Where do you see yourself in 5 years?", "Why do you want to work here?"],
  software: ["Explain OOP concepts.", "What is the difference between Array and LinkedList?", "Explain REST vs SOAP APIs.", "What is database normalization?", "Describe the MVC pattern."],
  freshers: ["Why should we hire you?", "Tell me about your final year project.", "What are your career goals?", "How quickly can you learn new technologies?", "Describe your internship experience."],
  banking: ["What is KYC and why is it important?", "Explain the difference between NEFT, RTGS, and IMPS.", "What do you know about RBI's role?", "What is the difference between NPA and bad debt?", "Explain the repo rate."],
  sales: ["How do you handle customer objections?", "Describe your sales process.", "Tell me about your highest sales achievement.", "How do you build long-term client relationships?", "What does cold calling mean to you?"],
  "customer support": ["How do you handle an angry customer?", "Describe a time you went above and beyond for a customer.", "How do you prioritize multiple customer issues?", "What does excellent customer service mean to you?"],
};

interface FeedbackResult {
  feedback: string;
  communicationScore: number;
  confidenceScore: number;
  improvedAnswer: string;
  strengths: string[];
  improvements: string[];
}

export default function Interview() {
  const { toast } = useToast();
  const token = getToken();
  const [category, setCategory] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionScore, setSessionScore] = useState({ comm: 0, conf: 0, count: 0 });

  const questions = category ? QUESTIONS[category] ?? [] : [];
  const currentQ = questions[qIndex] ?? "";

  async function startSession(cat: string) {
    setCategory(cat);
    setQIndex(0);
    setFeedback(null);
    setAnswer("");
    setSessionScore({ comm: 0, conf: 0, count: 0 });

    if (token) {
      try {
        const res = await fetch("/api/interview/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ category: cat }),
        });
        const d = await res.json();
        if (res.ok) setSessionId(d.id);
      } catch {}
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) { toast({ title: "Please write your answer", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/interview/answer", {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, question: currentQ, answer, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeedback(data);
      setSessionScore(prev => ({
        comm: Math.round((prev.comm * prev.count + data.communicationScore) / (prev.count + 1)),
        conf: Math.round((prev.conf * prev.count + data.confidenceScore) / (prev.count + 1)),
        count: prev.count + 1,
      }));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function nextQuestion() {
    if (qIndex < questions.length - 1) {
      setQIndex(qIndex + 1);
      setAnswer("");
      setFeedback(null);
    } else {
      toast({ title: "Session complete! 🎉", description: `Communication: ${sessionScore.comm}% | Confidence: ${sessionScore.conf}%` });
      setCategory(null);
    }
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 pb-24 px-4 max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI Interview Coach</h1>
                <p className="text-sm text-muted-foreground">Choose a category to start practicing</p>
              </div>
            </div>
            <div className="grid gap-3">
              {CATEGORIES.map((cat, i) => (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => startSession(cat.id)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-cyan-200 hover:shadow-md transition-all text-left group"
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{cat.label}</div>
                    <div className="text-sm text-muted-foreground">{cat.desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-cyan-600 transition-colors" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold">{CATEGORIES.find(c => c.id === category)?.label}</div>
                <div className="text-xs text-muted-foreground">Question {qIndex + 1} of {questions.length}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCategory(null)}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Session score */}
          {sessionScore.count > 0 && (
            <div className="flex gap-3 mb-4">
              <div className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="text-xs text-indigo-600 font-medium">Communication</div>
                  <div className="font-bold text-indigo-900">{sessionScore.comm}%</div>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-cyan-50 border border-cyan-100">
                <TrendingUp className="w-4 h-4 text-cyan-600" />
                <div>
                  <div className="text-xs text-cyan-600 font-medium">Confidence</div>
                  <div className="font-bold text-cyan-900">{sessionScore.conf}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Question */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-cyan-50 border border-indigo-100 mb-4">
            <div className="text-xs font-medium text-indigo-600 mb-2">Question {qIndex + 1}</div>
            <p className="font-semibold text-lg leading-relaxed">{currentQ}</p>
          </div>

          {/* Answer */}
          {!feedback ? (
            <div className="space-y-3">
              <Textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer here... Speak it out loud first, then write it down for best practice."
                className="h-40 resize-none"
              />
              <Button
                onClick={submitAnswer}
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Answer
              </Button>
            </div>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {/* Scores */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-card border border-border text-center">
                    <div className="text-2xl font-bold text-indigo-600">{feedback.communicationScore}%</div>
                    <div className="text-xs text-muted-foreground">Communication</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-card border border-border text-center">
                    <div className="text-2xl font-bold text-cyan-600">{feedback.confidenceScore}%</div>
                    <div className="text-xs text-muted-foreground">Confidence</div>
                  </div>
                </div>

                {/* Feedback */}
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="text-sm font-semibold text-amber-900 mb-1">💬 Feedback</div>
                  <p className="text-sm text-amber-800">{feedback.feedback}</p>
                </div>

                {/* Strengths */}
                {feedback.strengths.length > 0 && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <div className="text-sm font-semibold text-emerald-900 mb-2">✅ Strengths</div>
                    {feedback.strengths.map((s, i) => <p key={i} className="text-sm text-emerald-800">• {s}</p>)}
                  </div>
                )}

                {/* Improvements */}
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                  <div className="text-sm font-semibold text-rose-900 mb-2">📈 Improvements</div>
                  {feedback.improvements.slice(0, 3).map((s, i) => <p key={i} className="text-sm text-rose-800">• {s}</p>)}
                </div>

                {/* Improved Answer */}
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
                  <div className="text-sm font-semibold text-indigo-900 mb-2">⭐ Better Answer</div>
                  <p className="text-sm text-indigo-800 leading-relaxed">{feedback.improvedAnswer}</p>
                </div>

                <Button onClick={nextQuestion} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 gap-2">
                  {qIndex < questions.length - 1 ? "Next Question" : "Finish Session"}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
