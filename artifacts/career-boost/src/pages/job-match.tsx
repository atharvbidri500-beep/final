import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { AuthGuard } from "@/components/AuthGuard";

interface MatchResult {
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: string[];
}

export default function JobMatch() {
  const { toast } = useToast();
  const token = getToken();
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function analyzeMatch() {
    if (!resumeText.trim() || !jobDescription.trim()) {
      toast({ title: "Please fill both fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/resumes/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ resumeText, jobDescription }),
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

  const matchColor = result
    ? result.matchPercentage >= 70 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : result.matchPercentage >= 40 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-rose-600 bg-rose-50 border-rose-200"
    : "";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-2xl mx-auto">
        <AuthGuard token={token} featureName="the Job Match Analyzer">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Job Match Analyzer</h1>
              <p className="text-sm text-muted-foreground">AI checks how well your resume fits a job</p>
            </div>
          </div>

          {!result ? (
            <div className="space-y-4">
              <div>
                <Label>Your Resume Text</Label>
                <Textarea
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                  placeholder="Paste your resume text here..."
                  className="mt-1 h-36 resize-none"
                />
              </div>
              <div>
                <Label>Job Description</Label>
                <Textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  className="mt-1 h-36 resize-none"
                />
              </div>
              <Button
                onClick={analyzeMatch}
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                Analyze Match
              </Button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Match Score */}
              <div className={`p-5 rounded-2xl border text-center ${matchColor}`}>
                <div className="text-5xl font-bold mb-1">{result.matchPercentage}%</div>
                <div className="font-semibold">Job Match Score</div>
                <div className="text-sm mt-1">
                  {result.matchPercentage >= 70 ? "Great match! Apply confidently." :
                   result.matchPercentage >= 40 ? "Decent match. Add missing skills." :
                   "Low match. Tailor your resume first."}
                </div>
              </div>

              {/* Matched Skills */}
              {result.matchedSkills.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 font-semibold text-emerald-900 mb-3">
                    <CheckCircle2 className="w-4 h-4" /> Matched Skills ({result.matchedSkills.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.matchedSkills.map(skill => (
                      <span key={skill} className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {result.missingSkills.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                  <div className="flex items-center gap-2 font-semibold text-rose-900 mb-3">
                    <XCircle className="w-4 h-4" /> Missing Skills ({result.missingSkills.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.missingSkills.map(skill => (
                      <span key={skill} className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-sm font-medium">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="font-semibold text-amber-900 mb-2">💡 How to Improve</div>
                {result.suggestions.map((s, i) => (
                  <p key={i} className="text-sm text-amber-800 mb-1">→ {s}</p>
                ))}
              </div>

              <Button variant="outline" onClick={() => setResult(null)} className="w-full">
                Analyze Another Job
              </Button>
            </motion.div>
          )}
        </motion.div>
        </AuthGuard>
      </div>
      <BottomNav />
    </div>
  );
}
