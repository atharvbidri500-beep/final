import { useState } from "react";
import { motion } from "framer-motion";
import { Target, Loader2, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ScoreResult {
  overallScore: number;
  atsScore: number;
  skillsScore: number;
  formattingScore: number;
  suggestions: string[];
  strengths: string[];
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle
          cx="45" cy="45" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="45" y="50" textAnchor="middle" className="text-sm font-bold" fill="currentColor" fontSize="16" fontWeight="700">{score}%</text>
      </svg>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

export default function ResumeScore() {
  const { toast } = useToast();
  const [resumeText, setResumeText] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function analyzeResume() {
    if (!resumeText.trim()) { toast({ title: "Please paste your resume text", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/resumes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Resume Score Checker</h1>
              <p className="text-sm text-muted-foreground">Get ATS & skill analysis in seconds</p>
            </div>
          </div>

          {!result ? (
            <div className="space-y-4">
              <div>
                <Label>Paste Your Resume Text</Label>
                <Textarea
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                  placeholder="Paste the full text of your resume here..."
                  className="mt-1 h-48 resize-none"
                />
              </div>
              <div>
                <Label>Target Job Role (optional)</Label>
                <Input
                  value={jobRole}
                  onChange={e => setJobRole(e.target.value)}
                  placeholder="e.g. Software Engineer, Data Analyst, Sales Executive"
                  className="mt-1"
                />
              </div>
              <Button
                onClick={analyzeResume}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                Analyze Resume
              </Button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Overall Score */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-center">
                <div className="text-5xl font-bold text-emerald-600 mb-1">{result.overallScore}%</div>
                <div className="font-semibold text-emerald-900">Overall Resume Score</div>
                <div className="text-sm text-emerald-700 mt-1">
                  {result.overallScore >= 80 ? "Excellent! Your resume is ATS-ready." : result.overallScore >= 60 ? "Good resume. Some improvements will help." : "Needs improvement. Follow suggestions below."}
                </div>
              </div>

              {/* Score rings */}
              <div className="flex justify-around p-5 rounded-2xl bg-card border border-border">
                <ScoreRing score={result.atsScore} label="ATS Score" color="hsl(239 84% 60%)" />
                <ScoreRing score={result.skillsScore} label="Skills" color="hsl(191 91% 43%)" />
                <ScoreRing score={result.formattingScore} label="Formatting" color="hsl(142 71% 45%)" />
              </div>

              {/* Strengths */}
              {result.strengths.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-3 font-semibold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4" /> Strengths
                  </div>
                  {result.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-emerald-800 mb-1">
                      <span className="text-emerald-500 mt-0.5">✓</span> {s}
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 mb-3 font-semibold text-amber-900">
                  <AlertCircle className="w-4 h-4" /> Improvements Needed
                </div>
                {result.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-800 mb-1.5">
                    <span className="text-amber-500 mt-0.5">→</span> {s}
                  </div>
                ))}
              </div>

              <Button variant="outline" onClick={() => setResult(null)} className="w-full">
                Analyze Another Resume
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
