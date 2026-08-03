import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Linkedin, Loader2, Sparkles, Copy, Check } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiFetch, isUpgradeError } from "@/lib/premiumApi";

export default function LinkedinOptimizer() {
  const [role, setRole] = useState("");
  const [years, setYears] = useState("2");
  const [skills, setSkills] = useState("");
  const [currentHeadline, setCurrentHeadline] = useState("");
  const [currentAbout, setCurrentAbout] = useState("");
  const [result, setResult] = useState<any>(null);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [niche, setNiche] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | undefined>();

  async function optimize() {
    if (!role.trim()) { setError("Enter your role"); return; }
    setWorking(true);
    setError("");
    try {
      const data = await apiFetch<any>("/api/linkedin/optimize", {
        method: "POST",
        body: JSON.stringify({
          role: role.trim(),
          yearsOfExperience: Number(years) || 0,
          skills: skills.split(",").map(s => s.trim()).filter(Boolean),
          currentHeadline: currentHeadline || undefined,
          currentAbout: currentAbout || undefined,
        }),
      });
      setResult(data);
    } catch (err: any) {
      if (isUpgradeError(err)) { setUpgradeMsg(err.message); setUpgradeOpen(true); }
      else setError(err.message ?? "Failed");
    } finally {
      setWorking(false);
    }
  }

  async function generateIdeas() {
    setWorking(true);
    try {
      const data = await apiFetch<any>("/api/linkedin/content-ideas", { method: "POST", body: JSON.stringify({ niche: niche.trim() || "your career" }) });
      setIdeas(data.ideas ?? []);
    } catch (err: any) {
      if (isUpgradeError(err)) { setUpgradeMsg(err.message); setUpgradeOpen(true); }
      else setError(err.message ?? "Failed");
    } finally {
      setWorking(false);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); }).catch(() => {});
  }

  return (
    <PageShell title="LinkedIn Optimizer" subtitle="AI-optimized profile + content ideas" icon={<Linkedin className="w-6 h-6" />} upgradeOpen={upgradeOpen} upgradeMsg={upgradeMsg} onUpgradeClose={() => setUpgradeOpen(false)}>
      {error && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>}

      <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
        <div className="font-bold">Optimize my profile</div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Role *</Label><Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Frontend Developer" /></div>
          <div><Label>Years of experience</Label><Input value={years} onChange={e => setYears(e.target.value)} type="number" /></div>
        </div>
        <div><Label>Skills (comma separated)</Label><Input value={skills} onChange={e => setSkills(e.target.value)} placeholder="React, TypeScript, Node.js" /></div>
        <div><Label>Current headline</Label><Input value={currentHeadline} onChange={e => setCurrentHeadline(e.target.value)} placeholder="optional" /></div>
        <div><Label>Current about</Label><Textarea value={currentAbout} onChange={e => setCurrentAbout(e.target.value)} rows={3} placeholder="optional" /></div>
        <Button onClick={optimize} disabled={working} className="w-full bg-gradient-to-r from-[#0077B5] to-[#00A0DC] text-white border-0 gap-2">
          {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Optimize with AI
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">Profile Strength</div>
              <span className="text-lg font-black text-[#0077B5]">{result.score}/100</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${result.score}%` }} className="h-full bg-gradient-to-r from-[#0077B5] to-[#00A0DC] rounded-full" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold">Optimized Headline</div>
              <button onClick={() => copy(result.headline, "headline")} className="text-muted-foreground hover:text-[#5B5CF6]">
                {copied === "headline" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-sm bg-muted/40 p-3 rounded-xl">{result.headline}</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold">Optimized About</div>
              <button onClick={() => copy(result.about, "about")} className="text-muted-foreground hover:text-[#5B5CF6]">
                {copied === "about" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-sm bg-muted/40 p-3 rounded-xl leading-relaxed">{result.about}</p>
          </div>

          {(result.tips ?? []).length > 0 && (
            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="font-bold mb-3">Recruiter Tips</div>
              <ul className="space-y-2">
                {result.tips.map((t: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-[#0077B5]/10 text-[#0077B5] text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
        <div className="font-bold">Content ideas</div>
        <div className="flex gap-2">
          <Input value={niche} onChange={e => setNiche(e.target.value)} placeholder="Your niche (e.g. web development)" />
          <Button onClick={generateIdeas} disabled={working} variant="outline" className="flex-shrink-0 gap-1">
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Ideas
          </Button>
        </div>
        {ideas.length > 0 && (
          <div className="space-y-2">
            {ideas.map((idea, i) => (
              <div key={i} className="p-3 rounded-xl bg-muted/40">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{idea.title}</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0077B5]/10 text-[#0077B5]">{idea.category}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{idea.content}</p>
                {idea.bestTime && <div className="text-[10px] text-muted-foreground mt-1">Best time: {idea.bestTime}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
