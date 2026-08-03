import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, isUpgradeError } from "@/lib/premiumApi";

interface Roadmap {
  id: number;
  dreamRole: string;
  content: any;
  createdAt: string;
}

export default function RoadmapPlanner() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | undefined>();
  const [dreamRole, setDreamRole] = useState("");
  const [targetSalary, setTargetSalary] = useState("");
  const [targetCompany, setTargetCompany] = useState("");

  useEffect(() => {
    apiFetch<any>("/api/career-roadmap").then(setRoadmap).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function generate() {
    if (!dreamRole.trim()) { setError("Enter your dream role"); return; }
    setGenerating(true);
    setError("");
    try {
      const data = await apiFetch<any>("/api/career-roadmap/generate", {
        method: "POST",
        body: JSON.stringify({ dreamRole: dreamRole.trim(), targetSalary: targetSalary ? Number(targetSalary) : undefined, targetCompany: targetCompany.trim() || undefined }),
      });
      setRoadmap(data);
    } catch (err: any) {
      if (isUpgradeError(err)) { setUpgradeMsg(err.message); setUpgradeOpen(true); }
      else setError(err.message ?? "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  async function toggleMilestone(phaseIndex: number, milestoneIndex: number, done: boolean) {
    if (!roadmap) return;
    try {
      const data = await apiFetch<any>(`/api/career-roadmap/${roadmap.id}/milestones`, {
        method: "PATCH",
        body: JSON.stringify({ phaseIndex, milestoneIndex, done: !done }),
      });
      setRoadmap({ ...roadmap, content: { ...roadmap.content, phases: data.phase ? (roadmap.content.phases ?? []).map((p: any, i: number) => i === phaseIndex ? data.phase : p) : roadmap.content.phases, progress: data.progress } });
    } catch { /* keep state */ }
  }

  if (loading) {
    return <PageShell title="Career Roadmap" subtitle="Your personalized 24-month plan" icon={<Map className="w-6 h-6" />}><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#5B5CF6]" /></div></PageShell>;
  }

  const content = roadmap?.content ?? null;
  const phases = content?.phases ?? [];

  return (
    <PageShell title="Career Roadmap" subtitle="Your personalized 24-month plan" icon={<Map className="w-6 h-6" />} upgradeOpen={upgradeOpen} upgradeMsg={upgradeMsg} onUpgradeClose={() => setUpgradeOpen(false)}>
      {error && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>}

      {!roadmap ? (
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="font-bold mb-1">Generate your roadmap</div>
          <p className="text-sm text-muted-foreground mb-4">AI builds a realistic 24-month plan with concrete milestones based on your profile and skills.</p>
          <div className="space-y-3">
            <div>
              <Label>Dream role *</Label>
              <Input value={dreamRole} onChange={e => setDreamRole(e.target.value)} placeholder="e.g. Full Stack Developer" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Target salary (₹/yr)</Label>
                <Input value={targetSalary} onChange={e => setTargetSalary(e.target.value)} placeholder="e.g. 1200000" type="number" />
              </div>
              <div>
                <Label>Target company</Label>
                <Input value={targetCompany} onChange={e => setTargetCompany(e.target.value)} placeholder="e.g. Google" />
              </div>
            </div>
            <Button onClick={generate} disabled={generating} className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Building your roadmap…" : "Generate Roadmap"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">{roadmap.dreamRole}</div>
                <div className="text-sm text-violet-100 mt-0.5">{content?.summary}</div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <div className="text-3xl font-black">{content?.progress ?? 0}%</div>
                <div className="text-[10px] text-violet-200">COMPLETE</div>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${content?.progress ?? 0}%` }} className="h-full bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full" />
            </div>
          </div>

          {(content?.skillGaps ?? []).length > 0 && (
            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="font-bold mb-3">Skill Gaps to Close</div>
              <div className="flex flex-wrap gap-2">
                {(content?.skillGaps ?? []).map((g: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-sm border border-amber-100">{g}</span>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {phases.map((phase: any, pi: number) => (
              <motion.div key={pi} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pi * 0.07 }} className="p-5 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{phase.phase}</span>
                  <span className="font-bold text-sm">{phase.title}</span>
                </div>
                <div className="space-y-2">
                  {(phase.milestones ?? []).map((m: any, mi: number) => (
                    <button
                      key={mi}
                      onClick={() => toggleMilestone(pi, mi, m.done)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors text-left"
                    >
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${m.done ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40"}`}>
                        {m.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </span>
                      <span className={`text-sm ${m.done ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {(content?.recommendations ?? []).length > 0 && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200">
              <div className="font-bold mb-3 text-violet-900">Weekly Habits</div>
              <ul className="space-y-2">
                {(content?.recommendations ?? []).map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-violet-800">
                    <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
