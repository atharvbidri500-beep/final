import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HandCoins, Loader2, Sparkles, History, Mail } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, isUpgradeError } from "@/lib/premiumApi";

export default function SalaryNegotiation() {
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [offered, setOffered] = useState("");
  const [expected, setExpected] = useState("");
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<any[]>("/api/salary-offers").then(setHistory).catch(() => {});
  }, []);

  async function analyze() {
    if (!company.trim() || !position.trim() || !offered) { setError("Company, position and offered amount are required"); return; }
    setWorking(true);
    setError("");
    try {
      const data = await apiFetch<any>("/api/salary-offers/analyze", {
        method: "POST",
        body: JSON.stringify({ company: company.trim(), position: position.trim(), offeredAmount: Number(offered), expectedAmount: expected ? Number(expected) : undefined }),
      });
      setResult(data);
      setEmailStatus(null);
      const h = await apiFetch<any[]>("/api/salary-offers");
      setHistory(h);
    } catch (err: any) {
      if (isUpgradeError(err)) { setUpgradeMsg(err.message); setUpgradeOpen(true); }
      else setError(err.message ?? "Failed");
    } finally {
      setWorking(false);
    }
  }

  async function copyEmail(body: string, index: number) {
    navigator.clipboard?.writeText(body).then(() => setEmailStatus(`Email ${index + 1} copied`)).catch(() => {});
  }

  return (
    <PageShell title="Salary Negotiation" subtitle="Benchmark your offer and counter like a pro" icon={<HandCoins className="w-6 h-6" />} upgradeOpen={upgradeOpen} upgradeMsg={upgradeMsg} onUpgradeClose={() => setUpgradeOpen(false)}>
      {error && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>}
      {emailStatus && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">{emailStatus}</div>}

      <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Company *</Label><Input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Infosys" /></div>
          <div><Label>Position *</Label><Input value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. Software Engineer" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Offered (₹/year) *</Label><Input value={offered} onChange={e => setOffered(e.target.value)} type="number" placeholder="e.g. 600000" /></div>
          <div><Label>Your expectation (₹/year)</Label><Input value={expected} onChange={e => setExpected(e.target.value)} type="number" placeholder="optional" /></div>
        </div>
        <Button onClick={analyze} disabled={working} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-2">
          {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Analyze Offer
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-amber-100">Your counter offer</div>
                <div className="text-3xl font-black mt-0.5">₹{(result.counterOffer / 100000).toFixed(2)} LPA</div>
                <div className="text-xs text-amber-100 mt-1">Offered: ₹{(result.offeredAmount / 100000).toFixed(2)} LPA</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-amber-100">Market band</div>
                <div className="font-bold">₹{(result.marketRange?.min / 100000)?.toFixed(1)}–{(result.marketRange?.max / 100000)?.toFixed(1)}L</div>
                <div className="text-[10px] text-amber-100 mt-1">{result.marketRange?.source}</div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="font-bold mb-2">Strategy</div>
            <p className="text-sm leading-relaxed">{result.strategy}</p>
          </div>

          <div className="space-y-3">
            {(result.negotiationEmails ?? []).map((email: any, i: number) => (
              <div key={i} className="p-5 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-bold text-sm"><Mail className="w-4 h-4 text-[#5B5CF6]" /> {email.subject}</div>
                  <Button size="sm" variant="outline" onClick={() => copyEmail(email.body, i)}>Copy</Button>
                </div>
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans leading-relaxed bg-muted/40 p-3 rounded-xl">{email.body}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="p-5 rounded-2xl bg-card border border-border">
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 font-bold mb-3 w-full text-left">
            <History className="w-4 h-4 text-[#5B5CF6]" /> Offer History ({history.length})
            <span className="ml-auto text-xs text-muted-foreground">{showHistory ? "▲" : "▼"}</span>
          </button>
          {showHistory && (
            <div className="space-y-2">
              {history.slice(0, 8).map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 text-sm">
                  <span className="font-medium">{h.position} · {h.company}</span>
                  <span className="text-xs text-muted-foreground">₹{(h.offeredAmount / 100000).toFixed(1)}L → ₹{((h.counterOffer ?? 0) / 100000).toFixed(1)}L</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
