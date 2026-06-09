import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, CreditCard, BarChart3, Check, X, QrCode, Loader2, LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Tab = "stats" | "users" | "payments" | "qr";

interface Stats {
  totalUsers: number;
  totalResumes: number;
  totalInterviews: number;
  totalCoverLetters: number;
  totalRevenue: number;
  pendingPayments: number;
  totalSupporters: number;
}

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

function PaymentRow({ p, onApprove, onReject, approving, rejecting }: {
  p: any;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isNew = p.status === "pending" &&
    Date.now() - new Date(p.createdAt).getTime() < 3600_000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border transition-all ${
        p.status === "pending"
          ? "border-amber-200 bg-amber-50/50"
          : p.status === "approved"
          ? "border-emerald-200 bg-emerald-50/30"
          : "border-border bg-card"
      }`}
    >
      <div
        className="p-4 flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          {isNew && (
            <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
          <div>
            <div className="font-semibold text-sm flex items-center gap-2">
              {p.fullName}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                p.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                p.status === "rejected" ? "bg-rose-100 text-rose-700" :
                "bg-amber-100 text-amber-700"
              }`}>
                {p.status}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {p.mobile} · ₹{p.amount} · {p.plan === "yearly" ? "Yearly" : "Monthly"}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(p.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST
            </div>
          </div>
        </div>

        {p.status === "pending" && (
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <Button
              size="sm"
              onClick={e => { e.stopPropagation(); onApprove(p.id); }}
              disabled={approving}
              className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-xs gap-1"
            >
              {approving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Approve
            </Button>
            <Button
              size="sm"
              onClick={e => { e.stopPropagation(); onReject(p.id); }}
              disabled={rejecting}
              variant="outline"
              className="h-8 px-3 text-rose-600 border-rose-200 hover:bg-rose-50 text-xs gap-1"
            >
              {rejecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Reject
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-border/50">
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">UPI Transaction ID</span>
                  <div className="font-mono font-medium text-indigo-600 text-xs mt-0.5 break-all">{p.upiTransactionId}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Payment ID</span>
                  <div className="font-medium text-xs mt-0.5">#{p.id}</div>
                </div>
                {p.reviewedAt && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">Reviewed At</span>
                    <div className="text-xs mt-0.5">
                      {new Date(p.reviewedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Admin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [token, setToken] = useState(getAdminToken);
  const [tab, setTab] = useState<Tab>("stats");
  const [qrForm, setQrForm] = useState({ imageUrl: "", type: "payment" });
  const [qrSaving, setQrSaving] = useState(false);

  const h = token ? apiHeaders(token) : ({} as Record<string, string>);

  // Pending count — polling every 30 seconds for badge
  const pendingCountQ = useQuery<{ count: number }>({
    queryKey: ["admin-pending-count"],
    queryFn: () => fetch("/api/admin/payments/pending-count", { headers: h }).then(r => r.json()),
    enabled: !!token,
    refetchInterval: 30_000,
  });
  const pendingCount = pendingCountQ.data?.count ?? 0;

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

  const paymentsQ = useQuery<any[]>({
    queryKey: ["admin-payments"],
    queryFn: () => fetch("/api/admin/payments", { headers: h }).then(r => r.json()),
    enabled: !!token && tab === "payments",
    refetchInterval: tab === "payments" ? 30_000 : false,
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/admin/payments/${id}/approve`, { method: "POST", headers: h }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-count"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "✅ Payment approved! User upgraded to Pro." });
    },
  });

  const rejectMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/admin/payments/${id}/reject`, { method: "POST", headers: h }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-count"] });
      toast({ title: "Payment rejected." });
    },
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

  const pendingPayments = (paymentsQ.data ?? []).filter((p: any) => p.status === "pending");
  const otherPayments = (paymentsQ.data ?? []).filter((p: any) => p.status !== "pending");

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-500" />
            <span className="font-bold">Admin Panel</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification badge */}
            {pendingCount > 0 && (
              <button
                onClick={() => setTab("payments")}
                className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <Bell className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">{pendingCount} pending</span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
              </button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { clearAdminToken(); setToken(null); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="pt-16 max-w-5xl mx-auto px-4 pb-10">
        {/* Tabs */}
        <div className="flex gap-1 mt-4 mb-6 border-b border-border">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                tab === t.id ? "border-rose-500 text-rose-600" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.id === "payments" && pendingCount > 0 && (
                <span className="ml-1 flex items-center justify-center w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stats */}
        {tab === "stats" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Pending alert */}
            {pendingCount > 0 && (
              <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <Bell className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-amber-900 text-sm">{pendingCount} payment{pendingCount > 1 ? "s" : ""} awaiting approval</div>
                  <div className="text-xs text-amber-700">You received an email for each submission. Go to Payments tab to review.</div>
                </div>
                <Button size="sm" onClick={() => setTab("payments")} className="bg-amber-500 hover:bg-amber-600 text-white border-0 text-xs">
                  Review
                </Button>
              </div>
            )}
            {statsQ.data && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Users", value: statsQ.data.totalUsers, color: "text-indigo-600" },
                  { label: "Total Resumes", value: statsQ.data.totalResumes, color: "text-violet-600" },
                  { label: "Interviews", value: statsQ.data.totalInterviews, color: "text-cyan-600" },
                  { label: "Cover Letters", value: statsQ.data.totalCoverLetters, color: "text-pink-600" },
                  { label: "Total Revenue", value: `₹${statsQ.data.totalRevenue}`, color: "text-emerald-600" },
                  { label: "Pending Payments", value: statsQ.data.pendingPayments, color: "text-amber-600" },
                  { label: "Supporters", value: statsQ.data.totalSupporters, color: "text-rose-600" },
                ].map(s => (
                  <div key={s.label} className="p-4 rounded-2xl bg-card border border-border text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            {statsQ.isLoading && <div className="text-center py-10 text-muted-foreground">Loading stats...</div>}
          </motion.div>
        )}

        {/* Users */}
        {tab === "users" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {(usersQ.data ?? []).map((u: any) => (
              <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border">
                <div>
                  <div className="font-semibold text-sm">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}{u.mobile ? ` · ${u.mobile}` : ""}</div>
                  <div className="text-xs text-muted-foreground">Resumes: {u.resumeCount} · Interviews: {u.interviewCount} · Covers: {u.coverLetterCount}</div>
                </div>
                {u.isPremium && <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">Pro</span>}
              </div>
            ))}
            {usersQ.isLoading && <div className="text-center py-10 text-muted-foreground">Loading users...</div>}
            {!usersQ.isLoading && usersQ.data?.length === 0 && <div className="text-center py-10 text-muted-foreground">No users yet</div>}
          </motion.div>
        )}

        {/* Payments */}
        {tab === "payments" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Pending section */}
            {pendingPayments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-sm text-amber-700">Pending Approval</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{pendingPayments.length}</span>
                </div>
                <div className="space-y-2">
                  {pendingPayments.map((p: any) => (
                    <PaymentRow
                      key={p.id}
                      p={p}
                      onApprove={id => approveMut.mutate(id)}
                      onReject={id => rejectMut.mutate(id)}
                      approving={approveMut.isPending && approveMut.variables === p.id}
                      rejecting={rejectMut.isPending && rejectMut.variables === p.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other payments */}
            {otherPayments.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Reviewed</h3>
                <div className="space-y-2">
                  {otherPayments.map((p: any) => (
                    <PaymentRow
                      key={p.id}
                      p={p}
                      onApprove={id => approveMut.mutate(id)}
                      onReject={id => rejectMut.mutate(id)}
                      approving={false}
                      rejecting={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {paymentsQ.isLoading && <div className="text-center py-10 text-muted-foreground">Loading payments...</div>}
            {!paymentsQ.isLoading && (paymentsQ.data ?? []).length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No payments yet</p>
              </div>
            )}
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
                  <button
                    key={t}
                    onClick={() => setQrForm({ ...qrForm, type: t })}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all capitalize ${
                      qrForm.type === t ? "border-rose-400 bg-rose-50 text-rose-700" : "border-border text-muted-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>QR Image URL</Label>
              <Input
                value={qrForm.imageUrl}
                onChange={e => setQrForm({ ...qrForm, imageUrl: e.target.value })}
                placeholder="https://..."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Paste a publicly accessible image URL of the QR code</p>
            </div>
            {qrForm.imageUrl && (
              <div className="p-3 rounded-xl border border-border text-center">
                <img src={qrForm.imageUrl} alt="QR Preview" className="w-40 h-40 object-contain mx-auto rounded-xl" />
              </div>
            )}
            <Button
              onClick={saveQr}
              disabled={qrSaving}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white border-0"
            >
              {qrSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save QR Code"}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
