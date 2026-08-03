import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Loader2, Sparkles, Mail, History } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { apiFetch, isUpgradeError } from "@/lib/premiumApi";

export default function WeeklyReport() {
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | undefined>();

  useEffect(() => {
    apiFetch<any[]>("/api/weekly-report").then(h => {
      setHistory(h);
      if (h.length > 0) setReport(h[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function generate() {
    setWorking(true);
    setError("");
    try {
      const r = await apiFetch<any>("/api/weekly-report/generate", { method: "POST" });
      setReport(r);
      setHistory(await apiFetch<any[]>("/api/weekly-report"));
      setEmailStatus(null);
    } catch (err: any) {
      if (isUpgradeError(err)) { setUpgradeMsg(err.message); setUpgradeOpen(true); }
      else setError(err.message ?? "Failed");
    } finally {
      setWorking(false);
    }
  }

  async function sendEmail() {
    setWorking(true);
    setError("");
    try {
      const r = await apiFetch<any>("/api/weekly-report/send-email", { method: "POST" });
      if (r.ok) setEmailStatus("Report emailed successfully");
      else setEmailStatus(r.skipped ? "Email skipped (check preferences or sender setup)" : "Email not sent");
    } catch (err: any) {
      if (isUpgradeError(err)) { setUpgradeMsg(err.message); setUpgradeOpen(true); }
      else setError(err.message ?? "Failed");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <PageShell title="Weekly Career Report" subtitle="Your week, summarized" icon={<CalendarCheck className="w-6 h-6" />}><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#5B5CF6]" /></div></PageShell>;
  }

  const content = report?.content ?? null;

  return (
    <PageShell title="Weekly Career Report" subtitle="Your week, summarized" icon={<CalendarCheck className="w-6 h-6" />} upgradeOpen={upgradeOpen} upgradeMsg={upgradeMsg} onUpgradeClose={() => setUpgradeOpen(false)}>
      {error && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>}
      {emailStatus && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">{emailStatus}</div>}

      <div className="flex gap-3">
        <Button onClick={generate} disabled={working} className="flex-1 bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2">
          {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {report ? "Regenerate Report" : "Generate This Week's Report"}
        </Button>
        {report && (
          <Button onClick={sendEmail} disabled={working} variant="outline" className="gap-2">
            <Mail className="w-4 h-4" /> Email me
          </Button>
        )}
      </div>

      {report && content && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white">
            <div className="text-xs text-violet-200">Week starting {content.weekStart}</div>
            <div className="flex items-center justify-between mt-1">
              <div className="text-lg font-bold">Career Score: {content.careerScore ?? "-"}/100</div>
              {report.sentViaEmail && <div className="text-xs text-emerald-200">✓ Emailed</div>}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="font-bold mb-2">Summary</div>
            <p className="text-sm leading-relaxed">{content.summary}</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="font-bold mb-3">Highlights</div>
            <ul className="space-y-2">
              {(content.highlights ?? []).map((h: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">✓</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="font-bold mb-3">Next Week</div>
            <ul className="space-y-2">
              {(content.nextWeek ?? []).map((t: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="p-5 rounded-2xl bg-card border border-border text-center py-12">
          <CalendarCheck className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No report yet. Generate your first weekly report to see how this week went.</p>
        </div>
      )}

      {history.length > 1 && (
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="font-bold mb-3 flex items-center gap-2"><History className="w-4 h-4 text-[#5B5CF6]" /> Past Reports</div>
          <div className="space-y-2">
            {history.slice(1, 6).map((h: any) => (
              <button key={h.id} onClick={() => setReport(h)} className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 text-sm hover:bg-muted/60">
                <span>{h.weekStart}</span>
                <span className="text-xs text-muted-foreground">Score {(h.content as any)?.careerScore ?? "-"}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
