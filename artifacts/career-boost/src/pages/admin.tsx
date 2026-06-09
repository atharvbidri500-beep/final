import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Users, CreditCard, BarChart3, Check, X, QrCode, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Tab = "stats" | "users" | "payments" | "qr";

interface Stats { totalUsers: number; totalResumes: number; totalInterviews: number; totalCoverLetters: number; totalRevenue: number; pendingPayments: number; totalSupporters: number; }

function apiHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid credentials");
      setAdminToken(data.token);
      onLogin(data.token);
      toast({ title: "Welcome, Admin! 🛡️" });
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">Admin Panel</span>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          <h1 className="text-lg font-bold mb-4">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="admin" className="mt-1" required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="mt-1" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white border-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Login as Admin"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [token, setToken] = useState(getAdminToken);
  const [tab, setTab] = useState<Tab>("stats");
  const [qrForm, setQrForm] = useState({ imageUrl: "", type: "payment" });
  const [qrSaving, setQrSaving] = useState(false);

  const h = token ? apiHeaders(token) : {};

  const statsQ = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: () => fetch("/api/admin/stats", { headers: h }).then(r => r.json()),
    enabled: !!token && tab === "stats",
  });

  const usersQ = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetch("/api/admin/users", { headers: h }).then(r => r.json()),
    enabled: !!token && tab === "users",
  });

  const paymentsQ = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => fetch("/api/admin/payments", { headers: h }).then(r => r.json()),
    enabled: !!token && tab === "payments",
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/admin/payments/${id}/approve`, { method: "POST", headers: h }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-payments"] }); toast({ title: "Payment approved! User upgraded to Pro." }); },
  });

  const rejectMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/admin/payments/${id}/reject`, { method: "POST", headers: h }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-payments"] }); toast({ title: "Payment rejected." }); },
  });

  async function saveQr() {
    if (!qrForm.imageUrl) { toast({ title: "Image URL is required", variant: "destructive" }); return; }
    setQrSaving(true);
    try {
      const res = await fetch("/api/admin/qr", { method: "PUT", headers: h, body: JSON.stringify(qrForm) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast({ title: "QR updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setQrSaving(false);
    }
  }

  if (!token) return <LoginForm onLogin={t => setToken(t)} />;

  const TABS: { id: Tab; icon: React.ComponentType<any>; label: string }[] = [
    { id: "stats", icon: BarChart3, label: "Stats" },
    { id: "users", icon: Users, label: "Users" },
    { id: "payments", icon: CreditCard, label: "Payments" },
    { id: "qr", icon: QrCode, label: "QR Codes" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-500" />
            <span className="font-bold">Admin Panel</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { clearAdminToken(); setToken(null); }}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="pt-16 max-w-5xl mx-auto px-4 pb-10">
        {/* Tabs */}
        <div className="flex gap-1 mt-4 mb-6 border-b border-border">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                tab === t.id ? "border-rose-500 text-rose-600" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {tab === "stats" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {statsQ.data && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Users", value: statsQ.data.totalUsers },
                  { label: "Total Resumes", value: statsQ.data.totalResumes },
                  { label: "Interviews", value: statsQ.data.totalInterviews },
                  { label: "Cover Letters", value: statsQ.data.totalCoverLetters },
                  { label: "Total Revenue", value: `₹${statsQ.data.totalRevenue}` },
                  { label: "Pending Payments", value: statsQ.data.pendingPayments },
                  { label: "Supporters", value: statsQ.data.totalSupporters },
                ].map(s => (
                  <div key={s.label} className="p-4 rounded-2xl bg-card border border-border text-center">
                    <div className="text-2xl font-bold text-indigo-600">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            {statsQ.isLoading && <div className="text-center py-10 text-muted-foreground">Loading...</div>}
          </motion.div>
        )}

        {/* Users */}
        {tab === "users" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="space-y-2">
              {(usersQ.data ?? []).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border">
                  <div>
                    <div className="font-semibold text-sm">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email} · Resumes: {u.resumeCount} · Interviews: {u.interviewCount}</div>
                  </div>
                  {u.isPremium && <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Pro</span>}
                </div>
              ))}
              {usersQ.isLoading && <div className="text-center py-10 text-muted-foreground">Loading...</div>}
              {!usersQ.isLoading && usersQ.data?.length === 0 && <div className="text-center py-10 text-muted-foreground">No users yet</div>}
            </div>
          </motion.div>
        )}

        {/* Payments */}
        {tab === "payments" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="space-y-2">
              {(paymentsQ.data ?? []).map((p: any) => (
                <div key={p.id} className="p-4 rounded-2xl bg-card border border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-sm">{p.fullName}</div>
                      <div className="text-xs text-muted-foreground">{p.mobile} · ₹{p.amount} · {p.plan}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">TXN: {p.upiTransactionId}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        p.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        p.status === "rejected" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                        "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {p.status}
                      </span>
                      {p.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => approveMut.mutate(p.id)} disabled={approveMut.isPending} className="h-7 w-7 p-0 bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" onClick={() => rejectMut.mutate(p.id)} disabled={rejectMut.isPending} variant="outline" className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 border-rose-200">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {paymentsQ.isLoading && <div className="text-center py-10 text-muted-foreground">Loading...</div>}
              {!paymentsQ.isLoading && paymentsQ.data?.length === 0 && <div className="text-center py-10 text-muted-foreground">No payments yet</div>}
            </div>
          </motion.div>
        )}

        {/* QR Codes */}
        {tab === "qr" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md space-y-4">
            <p className="text-sm text-muted-foreground">Update the UPI QR code shown to users for payment and support.</p>
            <div>
              <Label>QR Type</Label>
              <div className="flex gap-2 mt-1">
                {["payment", "support"].map(t => (
                  <button key={t} onClick={() => setQrForm({ ...qrForm, type: t })} className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all capitalize ${qrForm.type === t ? "border-rose-400 bg-rose-50 text-rose-700" : "border-border text-muted-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>QR Image URL</Label>
              <Input value={qrForm.imageUrl} onChange={e => setQrForm({ ...qrForm, imageUrl: e.target.value })} placeholder="https://..." className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Enter an image URL of the QR code</p>
            </div>
            {qrForm.imageUrl && (
              <div className="p-3 rounded-xl border border-border">
                <img src={qrForm.imageUrl} alt="QR Preview" className="w-40 h-40 object-contain mx-auto rounded-xl" />
              </div>
            )}
            <Button onClick={saveQr} disabled={qrSaving} className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white border-0">
              {qrSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save QR Code"}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
