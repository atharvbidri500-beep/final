import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Scissors, Loader2, Sparkles, History } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, isUpgradeError } from "@/lib/premiumApi";

export default function ResumeTailoring() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | undefined>();
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    apiFetch<any[]>("/api/resumes").then(setResumes).catch(() => {});
    apiFetch<any[]>("/api/resume-tailoring/history").then(setHistory).catch(() => {});
    setLoading(false);
  }, []);

  async function tailor() {
    if (!selectedId || !jobDescription.trim()) { setError("Select a resume and paste the job description"); return; }
    setWorking(true);
    setError("");
    try {
      const data = await apiFetch<any>(`/api/resume-tailoring/tailor/${selectedId}`, {
        method: "POST",
        body: JSON.stringify({ jobTitle: jobTitle.trim() || undefined, company: company.trim() || undefined, jobDescription }),
      });
      setResult(data);
      const h = await apiFetch<any[]>("/api/resume-tailoring/history");
      setHistory(h);
    } catch (err: any) {
      if (isUpgradeError(err)) { setUpgradeMsg(err.message); setUpgradeOpen(true); }
      else setError(err.message ?? "Failed");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <PageShell title="Resume Tailoring" subtitle="Tailor your resume to any job" icon={<Scissors className="w-6 h-6" />}><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#5B5CF6]" /></div></PageShell>;
  }

  return (
    <PageShell title="Resume Tailoring" subtitle="Tailor your resume to any job" icon={<Scissors className="w-6 h-6" />} upgradeOpen={upgradeOpen} upgradeMsg={upgradeMsg} onUpgradeClose={() => setUpgradeOpen(false)}>
      {error && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>}

      <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
        <div>
          <Label>Resume</Label>
          <div className="space-y-1.5 mt-1.5">
            {(resumes ?? []).map(r => (
              <button key={r.id} onClick={() => setSelectedId(r.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${selectedId === r.id ? "border-[#5B5CF6] bg-violet-50" : "border-border bg-muted/30 hover:border-violet-200"}`}>
                {r.title}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Job title</Label><Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Frontend Developer" /></div>
          <div><Label>Company</Label><Input value={company} onChange={e => setCompany(e.target.value)} placeholder="optional" /></div>
        </div>
        <div>
          <Label>Job description *</Label>
          <Textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} rows={7} placeholder="Paste the full job posting here…" />
        </div>
        <Button onClick={tailor} disabled={working} className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2">
          {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {working ? "Tailoring…" : "Tailor Resume for This Job"}
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
            <div className="font-bold">Tailored for {result.jobTitle}{result.company ? ` at ${result.company}` : ""}</div>
            <div className="text-sm text-emerald-100 mt-1">Estimated ATS target: {result.targetScore}/100</div>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="font-bold mb-3">Keywords Mapped</div>
            <div className="flex flex-wrap gap-2">
              {(result.keywords ?? []).map((k: string, i: number) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-sm border border-violet-100">{k}</span>
              ))}
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="font-bold mb-3">What Changed</div>
            <ul className="space-y-2">
              {(result.changes ?? []).map((c: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="font-bold mb-3">Tailored Resume</div>
            <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed max-h-96 overflow-y-auto">{result.tailoredText}</pre>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="p-5 rounded-2xl bg-card border border-border">
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 font-bold mb-3 w-full text-left">
            <History className="w-4 h-4 text-[#5B5CF6]" /> Tailoring History ({history.length})
            <span className="ml-auto text-xs text-muted-foreground">{showHistory ? "▲" : "▼"}</span>
          </button>
          {showHistory && (
            <div className="space-y-2">
              {history.slice(0, 10).map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 text-sm">
                  <span className="font-medium">{h.jobTitle}{h.company ? ` · ${h.company}` : ""}</span>
                  <span className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
