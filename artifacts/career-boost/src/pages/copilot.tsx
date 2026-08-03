import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Compass, Loader2, TrendingUp, Trophy, Target, CalendarCheck, Sparkles } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { apiFetch, isUpgradeError } from "@/lib/premiumApi";
import { Link } from "wouter";

interface CopilotData {
  profile: any;
  goals: any[];
  skills: any[];
  certifications: any[];
  tasks: any[];
  gamification: any;
  score: any;
  recommendations: any[];
  timeline: any[];
  todayTasks: any[];
  upcomingInterviews: any[];
}

export default function Copilot() {
  const [data, setData] = useState<CopilotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        const [profile, goals, skills, certifications, tasks, gamification, score, copilot, timeline] = await Promise.all([
          apiFetch<any>("/api/career/profile"),
          apiFetch<any>("/api/career/goals"),
          apiFetch<any>("/api/career/skills"),
          apiFetch<any>("/api/career/certifications"),
          apiFetch<any>("/api/career/tasks"),
          apiFetch<any>("/api/career/gamification"),
          apiFetch<any>("/api/career/score"),
          apiFetch<any>("/api/career/copilot"),
          apiFetch<any>("/api/career/timeline"),
        ]);
        setData({ profile, goals, skills, certifications, tasks, gamification, score, recommendations: copilot?.recommendations ?? [], timeline, todayTasks: copilot?.todayTasks ?? [], upcomingInterviews: copilot?.upcomingInterviews ?? [] });
      } catch (err: any) {
        setError(err.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <PageShell title="Career Copilot" subtitle="Loading your career dashboard…" icon={<Compass className="w-6 h-6" />}><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#5B5CF6]" /></div></PageShell>;
  }

  const s = data?.score;
  const g = data?.gamification;
  const score = s?.careerScore ?? 0;

  return (
    <PageShell title="Career Copilot" subtitle="Your personalized career command center" icon={<Compass className="w-6 h-6" />} upgradeOpen={upgradeOpen} upgradeMsg={upgradeMsg} onUpgradeClose={() => setUpgradeOpen(false)}>
      {error && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>}

      {/* Score + level */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-violet-200 font-medium">Career Score</div>
            <div className="text-4xl font-black mt-1">{score}<span className="text-lg font-bold text-violet-200">/100</span></div>
            <div className="text-sm text-violet-100 mt-1">{s?.level ?? "Getting Started"}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 text-amber-300 text-sm font-bold"><Trophy className="w-4 h-4" /> Level {g?.level ?? 0}</div>
            <div className="text-xs text-violet-200 mt-1">{g?.xp ?? 0} XP • {g?.xpToNext ?? 100} to next level</div>
            <div className="text-xs text-violet-200">🔥 {g?.streakDays ?? 0}-day streak</div>
            <div className="text-xs text-violet-200 mt-1">🏆 {g?.achievementsUnlocked ?? 0} achievements</div>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1 }} className="h-full bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full" />
        </div>
      </div>

      {/* Component scores */}
      {s?.components && (
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="font-bold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#5B5CF6]" /> Score Breakdown</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(s.components).map(([k, v]) => (
              <div key={k} className="p-3 rounded-xl bg-muted/40">
                <div className="text-xs text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</div>
                <div className="text-lg font-bold mt-0.5">{v as number}/100</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="p-5 rounded-2xl bg-card border border-border">
        <div className="font-bold mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> Recommended for You</div>
        {(data?.recommendations ?? []).length > 0 ? (
          <ul className="space-y-2">
            {(data?.recommendations ?? []).slice(0, 6).map((r: any, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/30">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                {r.title ?? r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Complete your career profile to get personalized recommendations.</p>
        )}
      </div>

      {/* Today */}
      <div className="p-5 rounded-2xl bg-card border border-border">
        <div className="font-bold mb-3 flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-emerald-600" /> Today's Tasks</div>
        {(data?.todayTasks ?? []).length > 0 ? (
          <ul className="space-y-2">
            {(data?.todayTasks ?? []).map((t: any) => (
              <li key={t.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30">
                <span className={`w-4 h-4 rounded-full border-2 ${t.done ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40"} flex items-center justify-center`}>
                  {t.done && <span className="text-white text-[9px]">✓</span>}
                </span>
                {t.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No tasks for today. Add tasks from your Copilot dashboard.</p>
        )}
      </div>

      {/* Goals */}
      <div className="p-5 rounded-2xl bg-card border border-border">
        <div className="font-bold mb-3 flex items-center gap-2"><Target className="w-5 h-5 text-[#06B6D4]" /> Career Goals</div>
        {(data?.goals ?? []).length > 0 ? (
          <div className="space-y-2">
            {(data?.goals ?? []).slice(0, 4).map((goal: any) => (
              <div key={goal.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div>
                  <div className="text-sm font-medium">{goal.title}</div>
                  <div className="text-xs text-muted-foreground">{goal.deadline ? new Date(goal.deadline).toLocaleDateString() : "No deadline"}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${goal.status === "done" ? "bg-emerald-100 text-emerald-700" : goal.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                  {goal.status ?? "todo"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Set your first career goal to start tracking progress.</p>
        )}
      </div>

      {/* Timeline */}
      {(data?.timeline ?? []).length > 0 && (
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="font-bold mb-3">Recent Activity</div>
          <div className="space-y-2">
            {(data?.timeline ?? []).slice(0, 6).map((t: any, i: number) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-[#5B5CF6] mt-1.5 flex-shrink-0" />
                <div>
                  <div>{t.description}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/career-analytics"><Button variant="outline" className="w-full">View Analytics</Button></Link>
        <Link href="/roadmap-planner"><Button className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0">Plan My Roadmap</Button></Link>
      </div>
    </PageShell>
  );
}
