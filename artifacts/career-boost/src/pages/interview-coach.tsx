import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Loader2, Send, BarChart3 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, isUpgradeError } from "@/lib/premiumApi";

const CATEGORIES = ["general", "hr", "technical", "behavioral", "aptitude"];

export default function InterviewCoach() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [transcriptionNote, setTranscriptionNote] = useState<string | undefined>();
  const [question, setQuestion] = useState<any>(null);
  const [previous, setPrevious] = useState<string[]>([]);
  const [category, setCategory] = useState("hr");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | undefined>();

  useEffect(() => {
    apiFetch<any>("/api/interview-coach/stats").then(setStats).catch(() => {});
  }, []);

  async function startSession() {
    setWorking(true);
    setError("");
    try {
      const s = await apiFetch<any>("/api/interview-coach/sessions", { method: "POST", body: JSON.stringify({ interviewType: category }) });
      setSessionId(s.id);
      if (!s.transcription?.available) setTranscriptionNote(s.transcription?.reason);
      await nextQuestion();
    } catch (err: any) {
      if (isUpgradeError(err)) { setUpgradeMsg(err.message); setUpgradeOpen(true); }
      else setError(err.message ?? "Failed to start session");
    } finally {
      setWorking(false);
    }
  }

  async function nextQuestion() {
    try {
      const q = await apiFetch<any>("/api/interview-coach/questions", { method: "POST", body: JSON.stringify({ category, previousQuestions: previous }) });
      setQuestion(q);
      setPrevious(p => [...p, q.question]);
      setAnswer("");
      setResult(null);
    } catch { /* keep */ }
  }

  async function evaluate() {
    if (!sessionId || !answer.trim()) return;
    setWorking(true);
    setError("");
    try {
      const r = await apiFetch<any>(`/api/interview-coach/sessions/${sessionId}/evaluate`, {
        method: "POST",
        body: JSON.stringify({ transcript: answer, audioDurationSec: 60 }),
      });
      setResult(r);
      setAnswer("");
      apiFetch<any>("/api/interview-coach/stats").then(setStats).catch(() => {});
    } catch (err: any) {
      if (isUpgradeError(err)) { setUpgradeMsg(err.message); setUpgradeOpen(true); }
      else setError(err.message ?? "Evaluation failed");
    } finally {
      setWorking(false);
    }
  }

  function ScoreRing({ score, label }: { score: number; label: string }) {
    const r = 30;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - score / 100);
    const color = score >= 70 ? "#10B981" : score >= 45 ? "#F59E0B" : "#F43F5E";
    return (
      <div className="flex flex-col items-center gap-1.5">
        <svg width="76" height="76" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 38 38)" />
          <text x="38" y="43" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">{score}</text>
        </svg>
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      </div>
    );
  }

  return (
    <PageShell title="Interview Coach" subtitle="Practice with AI feedback and speech analytics" icon={<Mic className="w-6 h-6" />} upgradeOpen={upgradeOpen} upgradeMsg={upgradeMsg} onUpgradeClose={() => setUpgradeOpen(false)}>
      {error && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>}
      {transcriptionNote && <div className="p-3 rounded-xl bg-amber-50 text-amber-700 text-xs">{transcriptionNote}</div>}

      {!sessionId ? (
        <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
          <div>
            <div className="text-sm font-medium mb-1.5">Interview category</div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={startSession} disabled={working} className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2">
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            Start Practice Session
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white">
            <div className="text-xs text-violet-200 mb-1">Question {previous.length}</div>
            <div className="text-lg font-bold">{question?.question ?? "Loading question…"}</div>
            {question?.focus && <div className="text-sm text-violet-100 mt-2">🎯 {question.focus}</div>}
            {question?.tip && <div className="text-sm text-violet-100 mt-1">💡 {question.tip}</div>}
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <Textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={6} placeholder="Type your answer here… (voice transcription is available when a WHISPER key is configured)" />
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={evaluate} disabled={!answer.trim() || working} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 gap-1.5">
                {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Evaluate
              </Button>
              <Button onClick={nextQuestion} variant="outline">Next Question</Button>
            </div>
          </div>

          {result && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-card border border-border flex justify-around">
                <ScoreRing score={result.communicationScore ?? 0} label="Communication" />
                <ScoreRing score={result.confidenceScore ?? 0} label="Confidence" />
                <ScoreRing score={result.clarityScore ?? 0} label="Clarity" />
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="font-bold mb-3">Speech Metrics</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-muted/40"><div className="text-xs text-muted-foreground">Speaking speed</div><div className="font-bold">{result.speakingSpeedWpm ?? "—"} wpm</div></div>
                  <div className="p-3 rounded-xl bg-muted/40"><div className="text-xs text-muted-foreground">Words</div><div className="font-bold">{result.wordCount ?? 0}</div></div>
                  <div className="p-3 rounded-xl bg-muted/40"><div className="text-xs text-muted-foreground">Filler words</div><div className="font-bold">{result.fillerCount ?? 0}</div></div>
                  <div className="p-3 rounded-xl bg-muted/40"><div className="text-xs text-muted-foreground">Pauses</div><div className="font-bold">{result.pauseCount ?? 0}</div></div>
                </div>
                {(result.fillerWords ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(result.fillerWords ?? []).map((f: any, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs border border-rose-100">"{f.word}" ×{f.count}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="font-bold mb-2">Feedback</div>
                <p className="text-sm">{result.feedback}</p>
                {(result.strengths ?? []).length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-emerald-700">{result.strengths.map((s: string, i: number) => <li key={i}>✓ {s}</li>)}</ul>
                )}
                {(result.weaknesses ?? []).length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-rose-600">{result.weaknesses.map((w: string, i: number) => <li key={i}>• {w}</li>)}</ul>
                )}
                {result.improvementRoadmap && (
                  <div className="mt-4 p-3 rounded-xl bg-violet-50 border border-violet-100 space-y-1.5">
                    <div className="text-sm font-bold text-violet-800">Improvement Roadmap</div>
                    {["thisWeek", "thisMonth", "nextMonth"].map(k => (
                      <div key={k} className="text-xs text-violet-700"><span className="font-bold capitalize">{k.replace(/([A-Z])/g, " $1")}:</span> {result.improvementRoadmap[k]}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {stats && stats.evaluatedSessions > 0 && (
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="font-bold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#5B5CF6]" /> Your Progress</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><div className="text-xl font-black text-[#5B5CF6]">{stats.avgCommunicationScore}</div><div className="text-[10px] text-muted-foreground">AVG COMM</div></div>
            <div><div className="text-xl font-black text-emerald-600">{stats.avgConfidenceScore}</div><div className="text-[10px] text-muted-foreground">AVG CONF</div></div>
            <div><div className="text-xl font-black">{stats.totalSessions}</div><div className="text-[10px] text-muted-foreground">SESSIONS</div></div>
          </div>
          {stats.topFillerWords?.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">Top filler: {stats.topFillerWords.map((f: any) => `"${f[0]}" ×${f[1]}`).join(", ")}</div>
          )}
        </div>
      )}
    </PageShell>
  );
}
