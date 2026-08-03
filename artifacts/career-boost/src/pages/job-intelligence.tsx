import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Loader2, Sparkles, ThumbsUp, ThumbsDown, RefreshCw, ExternalLink,
  Target, Gauge, TrendingUp, ShieldCheck, CheckCircle2, XCircle, Zap, Lightbulb, ChevronDown, ChevronUp,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { apiFetch, isUpgradeError } from "@/lib/premiumApi";

interface Rec {
  id: number;
  job: any;
  score: number;
  breakdown: any[];
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  improvements: string[];
  competitiveness: string;
  feedback: boolean | null;
}

interface Profile {
  careerScore: number;
  interviewReadiness: number;
  consistencyScore: number;
  learningVelocity: number;
  derivedSkills: { name: string; confidence: number; sources: string[] }[];
  strengths: string[];
  weaknesses: string[];
  careerDirection: any;
  evidenceStats: any;
  insight: string;
}

export default function JobIntelligence() {
  const [consent, setConsent] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [computedAt, setComputedAt] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    apiFetch<any>("/api/job-intelligence/consent")
      .then((d) => setConsent(d.consent))
      .catch(() => setConsent(false));
    apiFetch<any>("/api/job-intelligence/activity", {
      method: "POST",
      body: JSON.stringify({ eventType: "feature_used", data: { feature: "job_intelligence" } }),
    }).catch(() => {});
  }, []);

  const loadRecommendations = () => {
    setLoading(true);
    apiFetch<any>("/api/job-intelligence/recommendations")
      .then((d) => {
        setProfile(d.profile);
        setRecs(d.recommendations ?? []);
        setComputedAt(d.computedAt ?? null);
        setNeedsRefresh(d.needsRefresh ?? false);
      })
      .catch((e: any) => {
        if (isUpgradeError(e)) { setUpgradeOpen(true); return; }
        if (e.status === 403) { setConsent(false); return; }
        setError(e.message ?? "Failed to load recommendations");
      })
      .finally(() => setLoading(false));
  };

  const toggleConsent = (enabled: boolean) => {
    apiFetch<any>("/api/job-intelligence/consent", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }).then((d) => {
      setConsent(d.consent);
      if (enabled) loadRecommendations();
    }).catch((e: any) => setError(e.message ?? "Failed to update consent"));
  };

  const doRefresh = () => {
    setRefreshing(true);
    setError("");
    apiFetch<any>("/api/job-intelligence/refresh", { method: "POST" })
      .then((d) => {
        setProfile(d.profile);
        setRecs(d.recommendations ?? []);
        setComputedAt(new Date().toISOString());
        setNeedsRefresh(false);
      })
      .catch((e: any) => {
        if (isUpgradeError(e)) { setUpgradeOpen(true); return; }
        setError(e.message ?? "Refresh failed. Try again.");
      })
      .finally(() => setRefreshing(false));
  };

  const sendFeedback = (id: number, helpful: boolean) => {
    setRecs((prev) => prev.map((r) => (r.id === id ? { ...r, feedback: helpful } : r)));
    apiFetch<any>(`/api/job-intelligence/recommendations/${id}/feedback`, {
      method: "POST",
      body: JSON.stringify({ helpful }),
    }).catch(() => {});
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (consent === null) {
    return <PageShell title="AI Job Intelligence" subtitle="Personal career intelligence engine" icon={<Brain className="w-6 h-6" />}><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#5B5CF6]" /></div></PageShell>;
  }

  if (!consent) {
    return (
      <PageShell title="AI Job Intelligence" subtitle="Jobs matched to who you really are" icon={<Brain className="w-6 h-6" />}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-card border border-border">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6] flex items-center justify-center text-white mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold mb-2">Your career, understood by AI</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This engine doesn't just match resume keywords. It studies everything you do in Hire Pilot — your skills, interview practice,
            assessments, projects, learning progress and career goals — and matches you with jobs that genuinely fit, explaining exactly why.
          </p>
          <ul className="space-y-2 mb-5 text-sm">
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Daily compatibility scoring across 10 factors — not keyword counting</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Fresh jobs pulled automatically from Adzuna, Jooble, Jobicy & Remotive</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> For every match: why it fits, your strong skills, what to improve, how competitive you are</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Your data stays private — only you see your profile, and you can switch this off anytime</li>
          </ul>
          <button
            onClick={() => toggleConsent(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white font-semibold"
          >
            Enable AI Intelligence (Free)
          </button>
          <p className="text-[11px] text-muted-foreground text-center mt-3">
            AI recommendations are a Premium feature. Turning off consent stops all analysis immediately.
          </p>
        </motion.div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="AI Job Intelligence"
      subtitle="Every day, the engine learns you better and finds jobs that truly fit"
      icon={<Brain className="w-6 h-6" />}
      upgradeMsg="AI job recommendations are a Premium feature. Upgrade to unlock your personal career intelligence engine."
      upgradeOpen={upgradeOpen}
      onUpgradeClose={() => setUpgradeOpen(false)}
    >
      {error && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#5B5CF6]" />
        </div>
      )}

      {!loading && !profile && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-card border border-border text-center">
          <Sparkles className="w-8 h-8 text-[#5B5CF6] mx-auto mb-3" />
          <h2 className="font-bold mb-1">Ready to build your intelligence profile</h2>
          <p className="text-sm text-muted-foreground mb-5">
            The AI analyzes your activity and matches today's jobs against it. First run takes about 15 seconds.
          </p>
          <button
            onClick={doRefresh}
            disabled={refreshing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white font-semibold flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {refreshing ? "Analyzing your profile..." : "Run my first analysis"}
          </button>
        </motion.div>
      )}

      {!loading && profile && (
        <>
          {/* Intelligence profile panel */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold"><Brain className="w-4 h-4 text-[#5B5CF6]" /> What the AI knows about you</div>
              <div className="flex items-center gap-2">
                {computedAt && <span className="text-[10px] text-muted-foreground">Updated {new Date(computedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>}
                <button onClick={doRefresh} disabled={refreshing} className="flex items-center gap-1 text-xs text-[#5B5CF6] font-semibold disabled:opacity-50">
                  {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Refresh
                </button>
              </div>
            </div>

            {profile.insight && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 text-sm mb-4">{profile.insight}</div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-muted/40 text-center">
                <Gauge className="w-4 h-4 text-[#5B5CF6] mx-auto mb-1" />
                <div className="text-xl font-black">{profile.interviewReadiness}</div>
                <div className="text-[10px] text-muted-foreground">INTERVIEW READINESS</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 text-center">
                <Target className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                <div className="text-xl font-black">{profile.consistencyScore}</div>
                <div className="text-[10px] text-muted-foreground">CONSISTENCY</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 text-center">
                <TrendingUp className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <div className="text-xl font-black">{profile.learningVelocity}</div>
                <div className="text-[10px] text-muted-foreground">LEARNING SPEED</div>
              </div>
            </div>

            {profile.derivedSkills.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2">LEARNED SKILLS (with confidence)</div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.derivedSkills.slice(0, 14).map((s) => (
                    <span key={s.name} className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-xs border border-violet-100">
                      {s.name} <span className="opacity-60">{s.confidence}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.strengths.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> STRENGTHS</div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {profile.strengths.slice(0, 5).map((s, i) => <li key={i} className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{s}</li>)}
                  </ul>
                </div>
              )}
              {profile.weaknesses.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-rose-600 mb-2 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> TO IMPROVE</div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {profile.weaknesses.slice(0, 5).map((w, i) => <li key={i} className="flex gap-1.5"><XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>

          {needsRefresh && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center justify-between gap-3">
              <span>Your matches are a day old. Practice more and refresh for smarter matches.</span>
              <button onClick={doRefresh} disabled={refreshing} className="text-amber-800 font-semibold flex items-center gap-1 flex-shrink-0 disabled:opacity-50">
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh
              </button>
            </div>
          )}

          {/* Recommendations */}
          <div className="flex items-center gap-2 font-bold pt-2">
            <Sparkles className="w-4 h-4 text-[#5B5CF6]" />
            Today's best matches <span className="text-xs text-muted-foreground font-normal">({recs.length})</span>
          </div>

          {recs.length === 0 && (
            <div className="p-6 rounded-2xl bg-card border border-border text-center text-sm text-muted-foreground">
              No matches yet — practice more, add skills, and refresh. The engine gets smarter with every activity.
            </div>
          )}

          {recs.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="p-5 rounded-2xl bg-card border border-border">
              <div className="flex items-start gap-4">
                <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl flex-shrink-0 ${r.score >= 70 ? "bg-emerald-50 text-emerald-600" : r.score >= 55 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                  <span className="text-lg font-black">{r.score}</span>
                  <span className="text-[9px] font-semibold -mt-0.5">MATCH</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm leading-tight">{r.job.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.competitiveness === "High" ? "bg-emerald-100 text-emerald-700" : r.competitiveness === "Medium" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                      {r.competitiveness} competitiveness
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.job.company}{r.job.location ? ` · ${r.job.location}` : ""}{r.job.is_remote ? " · Remote" : ""}</div>
                  {r.job.salary_min && (
                    <div className="text-xs font-semibold text-emerald-600 mt-1">₹{Number(r.job.salary_min).toLocaleString("en-IN")}{r.job.salary_max && r.job.salary_max !== r.job.salary_min ? ` - ₹${Number(r.job.salary_max).toLocaleString("en-IN")}` : ""}</div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {r.matchedSkills.slice(0, 5).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">{s}</span>
                    ))}
                    {r.missingSkills.slice(0, 4).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-500 text-[10px] font-semibold border border-rose-100">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={() => toggleExpand(r.id)} className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-[#5B5CF6] font-semibold py-1">
                {expanded.has(r.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expanded.has(r.id) ? "Hide analysis" : "Why this job matches"}
              </button>

              {expanded.has(r.id) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 space-y-3 text-xs">
                  {r.reasons.length > 0 && (
                    <div>
                      <div className="font-bold text-[#5B5CF6] mb-1.5">Why this matches you</div>
                      <ul className="space-y-1.5 text-muted-foreground">
                        {r.reasons.map((reason, j) => <li key={j} className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{reason}</li>)}
                      </ul>
                    </div>
                  )}
                  {r.missingSkills.length > 0 && (
                    <div>
                      <div className="font-bold text-rose-600 mb-1.5">Missing skills ({r.missingSkills.length})</div>
                      <div className="flex flex-wrap gap-1.5">
                        {r.missingSkills.map((s) => <span key={s} className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[10px] border border-rose-100">{s}</span>)}
                      </div>
                    </div>
                  )}
                  {r.improvements.length > 0 && (
                    <div>
                      <div className="font-bold text-amber-600 mb-1.5">Improve before applying</div>
                      <ul className="space-y-1.5 text-muted-foreground">
                        {r.improvements.map((imp, j) => <li key={j} className="flex gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />{imp}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Helpful?</span>
                      <button onClick={() => sendFeedback(r.id, true)} className={`p-1.5 rounded-lg border ${r.feedback === true ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "border-border text-muted-foreground"}`}>
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => sendFeedback(r.id, false)} className={`p-1.5 rounded-lg border ${r.feedback === false ? "bg-rose-50 border-rose-200 text-rose-500" : "border-border text-muted-foreground"}`}>
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {r.job.source_url && (
                      <a href={r.job.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[#5B5CF6] font-semibold">
                        View job <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}

          <div className="pt-2 pb-1">
            <button onClick={() => toggleConsent(false)} className="text-[11px] text-muted-foreground underline">
              Turn off AI analysis
            </button>
          </div>
        </>
      )}
    </PageShell>
  );
}
