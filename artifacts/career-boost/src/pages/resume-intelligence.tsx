import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Loader2, Sparkles, History } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { apiFetch, isUpgradeError } from "@/lib/premiumApi";

interface Resume { id: number; title: string; }

export default function ResumeIntelligence() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | undefined>();

  useEffect(() => {
    apiFetch<any[]>("/api/resumes").then(setResumes).catch(() => {}).finally(() => setLoading(false));
    apiFetch<any[]>("/api/resume-intelligence/history").then(setHistory).catch(() => {});
  }, []);

  async function analyze() {
    if (!selectedId) return;
    setAnalyzing(true);
    setError("");
    try {
      const data = await apiFetch<any>(`/api/resume-intelligence/analyze/${selectedId}`, { method: "POST" });
      setAnalysis(data);
    } catch (err: any) {
      if (isUpgradeError(err)) { setUpgradeMsg(err.message); setUpgradeOpen(true); }
      else setError(err.message ?? "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function ScoreBar({ label, value, color = "from-[#5B5CF6] to-[#8B5CF6]" }: { label: string; value: number; color?: string }) {
    return (
      <div>
        <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{label}</span><span className="font-bold">{value}</span></div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className={`h-full rounded-full bg-gradient-to-r ${color}`} />
        </div>
      </div>
    );
  }

  if (loading) {
    return <PageShell title="Resume Intelligence" subtitle="Deep ATS analysis of your resume" icon={<Brain className="w-6 h-6" />}><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#5B5CF6]" /></div></PageShell>;
  }

  return (
    <PageShell title="Resume Intelligence" subtitle="Deep ATS analysis of your resume" icon={<Brain className="w-6 h-6" />} upgradeOpen={upgradeOpen} upgradeMsg={upgradeMsg} onUpgradeClose={() => setUpgradeOpen(false)}>
      {error && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>}

      <div className="p-5 rounded-2xl bg-card border border-border">
        <div className="font-bold mb-3">Choose a resume to analyze</div>
        {(resumes ?? []).length > 0 ? (
          <div className="space-y-2 mb-4">
            {(resumes ?? []).map(r => (
              <button key={r.id} onClick={() => setSelectedId(r.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${selectedId === r.id ? "border-[#5B5CF6] bg-violet-50" : "border-border bg-muted/30 hover:border-violet-200"}`}>
                <div className="text-sm font-medium">{r.title}</div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">No resumes yet. Build one in the Resume Builder first.</p>
        )}
        <Button onClick={analyze} disabled={!selectedId || analyzing} className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2">
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {analyzing ? "Analyzing with AI…" : "Run Deep Analysis"}
        </Button>
      </div>

      {analysis && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-violet-50 text-center">
                <div className="text-2xl font-black text-[#5B5CF6]">{analysis.atsScore ?? 0}</div>
                <div className="text-[10px] text-violet-500">ATS SCORE</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 text-center">
                <div className="text-2xl font-black text-emerald-600">{analysis.qualityScore ?? 0}</div>
                <div className="text-[10px] text-emerald-500">QUALITY</div>
              </div>
            </div>
            <ScoreBar label="Health" value={analysis.healthScore ?? 0} color="from-emerald-400 to-teal-500" />
            <ScoreBar label="Readability" value={analysis.readabilityScore ?? 0} color="from-cyan-400 to-blue-500" />
            <ScoreBar label="Keywords" value={analysis.keywordScore ?? 0} color="from-amber-400 to-orange-500" />
          </div>

          {(analysis.missingKeywords ?? []).length > 0 && (
            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="font-bold mb-3">Missing Keywords</div>
              <div className="flex flex-wrap gap-2">
                {(analysis.missingKeywords ?? []).map((k: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 text-sm border border-rose-100">{k}</span>
                ))}
              </div>
            </div>
          )}

          {(analysis.suggestions ?? []).length > 0 && (
            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="font-bold mb-3">Suggestions</div>
              <ul className="space-y-2">
                {(analysis.suggestions ?? []).map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(analysis.strengths ?? []).length > 0 && (
            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="font-bold mb-3">Strengths</div>
              <ul className="space-y-1 text-sm text-emerald-700">
                {(analysis.strengths ?? []).map((s: string, i: number) => (
                  <li key={i}>✓ {s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="font-bold mb-3 flex items-center gap-2"><History className="w-4 h-4 text-[#5B5CF6]" /> Analysis History</div>
          <div className="space-y-2">
            {history.slice(0, 8).map((h: any) => (
              <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 text-sm">
                <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                <span className="font-bold text-[#5B5CF6]">{h.atsScore ?? 0}/100</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
