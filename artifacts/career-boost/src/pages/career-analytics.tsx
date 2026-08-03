import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { apiFetch } from "@/lib/premiumApi";

interface AnalyticsData {
  careerScore: any;
  weeklyActivity: any[];
  gamification: any;
  goals: any;
  topSkills: any[];
  applicationStats: any;
  counts: any;
  interviewTrend: any[];
  atsHistory: any[];
}

export default function CareerAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<any>("/api/career/analytics").then(setData).catch((e: any) => setError(e.message ?? "Failed to load")).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageShell title="Career Analytics" subtitle="Your progress at a glance" icon={<BarChart3 className="w-6 h-6" />}><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#5B5CF6]" /></div></PageShell>;
  }

  const app = data?.applicationStats;
  const maxActivity = Math.max(1, ...(data?.weeklyActivity ?? []).map((d: any) => d.count ?? 0));

  return (
    <PageShell title="Career Analytics" subtitle="Your progress at a glance" icon={<BarChart3 className="w-6 h-6" />}>
      {error && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>}

      {/* Weekly activity */}
      <div className="p-5 rounded-2xl bg-card border border-border">
        <div className="font-bold mb-4">Weekly Activity</div>
        <div className="flex items-end justify-between gap-1.5 h-28">
          {(data?.weeklyActivity ?? []).map((d: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(6, ((d.count ?? 0) / maxActivity) * 80)}px` }}
                transition={{ delay: i * 0.05 }}
                className="w-full max-w-8 rounded-t-lg bg-gradient-to-t from-[#5B5CF6] to-[#8B5CF6]"
              />
              <span className="text-[10px] text-muted-foreground">{d.day ?? d.date?.slice(5) ?? ""}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Application funnel */}
      {app && (
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="font-bold mb-4">Application Pipeline</div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-muted/40 text-center"><div className="text-xl font-black">{app.total}</div><div className="text-[10px] text-muted-foreground">TOTAL</div></div>
            <div className="p-3 rounded-xl bg-blue-50 text-center"><div className="text-xl font-black text-blue-600">{app.interview ?? 0}</div><div className="text-[10px] text-blue-500">INTERVIEWS</div></div>
            <div className="p-3 rounded-xl bg-emerald-50 text-center"><div className="text-xl font-black text-emerald-600">{app.offer ?? 0}</div><div className="text-[10px] text-emerald-500">OFFERS</div></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/40">
              <div className="text-xs text-muted-foreground">Response rate</div>
              <div className="text-lg font-bold">{app.responseRate ?? 0}%</div>
            </div>
            <div className="p-3 rounded-xl bg-muted/40">
              <div className="text-xs text-muted-foreground">Offer rate</div>
              <div className="text-lg font-bold">{app.offerRate ?? 0}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Counts */}
      {data?.counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(data.counts).map(([k, v]) => (
            <div key={k} className="p-4 rounded-2xl bg-card border border-border text-center">
              <div className="text-2xl font-black text-[#5B5CF6]">{v as number}</div>
              <div className="text-[10px] text-muted-foreground capitalize mt-0.5">{k}</div>
            </div>
          ))}
        </div>
      )}

      {/* ATS history */}
      {(data?.atsHistory ?? []).length > 0 && (
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="font-bold mb-3">ATS Score History</div>
          <div className="space-y-2">
            {(data?.atsHistory ?? []).map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-muted-foreground w-16">{a.date}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${a.score}%` }} transition={{ delay: i * 0.05 }} className="h-full rounded-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6]" />
                </div>
                <span className="text-xs font-bold w-8 text-right">{a.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top skills */}
      {(data?.topSkills ?? []).length > 0 && (
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="font-bold mb-3">Top Skills</div>
          <div className="flex flex-wrap gap-2">
            {(data?.topSkills ?? []).map((s: any) => (
              <span key={s.name} className="px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-sm border border-violet-100">
                {s.name} <span className="text-xs opacity-70">({s.proficiency}%)</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
