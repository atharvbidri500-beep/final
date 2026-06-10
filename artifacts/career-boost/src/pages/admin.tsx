import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, CreditCard, BarChart3, Check, X, QrCode, Loader2, LogOut, Bell, Search, Trash2, Crown, TrendingUp, RefreshCw, ChevronDown, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Tab = "stats" | "users" | "payments" | "qr";

function HirePilotLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="admbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5B5CF6"/><stop offset="100%" stopColor="#8B5CF6"/>
        </linearGradient>
        <linearGradient id="admarrow" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#06B6D4"/><stop offset="100%" stopColor="#38BDF8"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#admbg)"/>
      <rect x="10" y="11" width="5" height="26" rx="2.5" fill="white"/>
      <rect x="33" y="11" width="5" height="26" rx="2.5" fill="white"/>
      <rect x="15" y="20.5" width="18" height="5" rx="2" fill="white" opacity="0.9"/>
      <path d="M24 19 L24 7 M20 11.5 L24 7 L28 11.5" stroke="url(#admarrow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function apiHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: any; color: string; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-card border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </motion.div>
  );
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
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <HirePilotLogo size={36} />
          <div>
            <div className="font-bold text-lg">Hire<span className="text-[#5B5CF6]">Pilot</span></div>
            <div className="text-xs text-muted-foreground">Admin Panel</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-violet-100/30">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-[#5B5CF6]" />
            <h1 className="text-lg font-bold">Admin Login</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="admin" className="mt-1" required autoComplete="username" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="mt-1" required autoComplete="current-password" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Login as Admin"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function PaymentRow({ p, onApprove, onReject, approving, rejecting }: {
  p: any; onApprove: (id: number) => void; onReject: (id: number) => void; approving: boolean; rejecting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isRecent = p.status === "pending" && Date.now() - new Date(p.createdAt).getTime() < 3600_000;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      p.status === "pending" ? "border-amber-200 bg-amber-50/40" :
      p.status === "approved" ? "border-emerald-200 bg-emerald-50/20" : "border-border bg-card"
    }`}>
      <div className="p-4 flex items-start justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {isRecent && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-rose-500 animate-pulse mt-1.5" />}
          <div className="min-w-0">
            <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
              {p.fullName}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                p.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                p.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
              }`}>{p.status}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{p.mobile} · ₹{p.amount} · {p.plan === "yearly" ? "Yearly" : "Monthly"}</div>
            <div className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          {p.status === "pending" && (
            <>
              <Button size="sm" onClick={e => { e.stopPropagation(); onApprove(p.id); }} disabled={approving} className="h-7 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-xs gap-1">
                {approving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve
              </Button>
              <Button size="sm" onClick={e => { e.stopPropagation(); onReject(p.id); }} disabled={rejecting} variant="outline" className="h-7 px-2.5 text-rose-600 border-rose-200 hover:bg-rose-50 text-xs gap-1">
                {rejecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Reject
              </Button>
            </>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border/50">
            <div className="px-4 pb-4 pt-3 grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-muted-foreground">UPI Transaction ID</div><div className="font-mono font-semibold text-[#5B5CF6] text-xs mt-0.5 break-all">{p.upiTransactionId}</div></div>
              <div><div className="text-xs text-muted-foreground">Payment ID</div><div className="font-medium text-xs mt-0.5">#{p.id}</div></div>
              {p.userId && <div><div className="text-xs text-muted-foreground">User ID</div><div className="text-xs mt-0.5">#{p.userId}</div></div>}
              {p.reviewedAt && <div className="col-span-2"><div className="text-xs text-muted-foreground">Reviewed At</div><div className="text-xs mt-0.5">{new Date(p.reviewedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST</div></div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [userSearch, setUserSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [upgradingId, setUpgradingId] = useState<number | null>(null);

  const h = token ? apiHeaders(token) : ({} as Record<string, string>);

  const pendingCountQ = useQuery<{ count: number }>({
    queryKey: ["admin-pending-count"],
    queryFn: () => fetch("/api/admin/payments/pending-count", { headers: h }).then(r => r.json()),
    enabled: !!token,
    refetchInterval: 30_000,
  });
  const pendingCount = pendingCountQ.data?.count ?? 0;

  const statsQ = useQuery<any>({
    queryKey: ["admin-stats"],
    queryFn: () => fetch("/api/admin/stats", { headers: h }).then(r => r.json()),
    enabled: !!token && tab === "stats",
    refetchInterval: tab === "stats" ? 60_000 : false,
  });

  const usersQ = useQuery<any[]>({
    queryKey: ["admin-users", userSearch],
    queryFn: () => fetch(`/api/admin/users${userSearch ? `?search=${encodeURIComponent(userSearch)}` : ""}`, { headers: h }).then(r => r.json()),
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

  async function deleteUser(id: number) {
    if (!confirm("Delete this user and all their data?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/users/${id}`, { method: "DELETE", headers: h });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "User deleted." });
    } catch { toast({ title: "Error deleting user", variant: "destructive" }); }
    finally { setDeletingId(null); }
  }

  async function upgradeUser(id: number, name: string) {
    setUpgradingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/upgrade`, { method: "POST", headers: h, body: JSON.stringify({ plan: "monthly" }) });
      if (!res.ok) throw new Error("Failed");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: `✅ ${name} upgraded to Pro!` });
    } catch { toast({ title: "Error upgrading user", variant: "destructive" }); }
    finally { setUpgradingId(null); }
  }

  async function saveQr() {
    if (!qrForm.imageUrl) { toast({ title: "Image URL is required", variant: "destructive" }); return; }
    setQrSaving(true);
    try {
      const res = await fetch("/api/admin/qr", { method: "PUT", headers: h, body: JSON.stringify(qrForm) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast({ title: "QR updated successfully!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setQrSaving(false); }
  }

  if (!token) return <LoginForm onLogin={t => setToken(t)} />;

  const TABS: { id: Tab; icon: any; label: string }[] = [
    { id: "stats", icon: BarChart3, label: "Stats" },
    { id: "users", icon: Users, label: "Users" },
    { id: "payments", icon: CreditCard, label: "Payments" },
    { id: "qr", icon: QrCode, label: "QR Codes" },
  ];

  const pendingPayments = (paymentsQ.data ?? []).filter((p: any) => p.status === "pending");
  const reviewedPayments = (paymentsQ.data ?? []).filter((p: any) => p.status !== "pending");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HirePilotLogo size={30} />
            <div>
              <div className="font-bold text-sm">Hire<span className="text-[#5B5CF6]">Pilot</span></div>
              <div className="text-[10px] text-muted-foreground">Admin Panel</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button onClick={() => setTab("payments")} className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-bold text-amber-700">{pendingCount} pending</span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
              </button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { clearAdminToken(); setToken(null); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="pt-14 max-w-5xl mx-auto px-4 pb-10">
        {/* Tabs */}
        <div className="flex gap-0.5 mt-4 mb-6 border-b border-border overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${
                tab === t.id ? "border-[#5B5CF6] text-[#5B5CF6]" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.id === "payments" && pendingCount > 0 && (
                <span className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* STATS TAB */}
        {tab === "stats" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {pendingCount > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <Bell className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-amber-900 text-sm">{pendingCount} payment{pendingCount !== 1 ? "s" : ""} awaiting approval</div>
                  <div className="text-xs text-amber-700">You received an email for each submission. Go to Payments tab to review.</div>
                </div>
                <Button size="sm" onClick={() => setTab("payments")} className="bg-amber-500 hover:bg-amber-600 text-white border-0 text-xs flex-shrink-0">
                  Review
                </Button>
              </div>
            )}

            {statsQ.isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
              </div>
            )}

            {statsQ.data && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Total Users" value={statsQ.data.totalUsers} icon={Users} color="bg-[#5B5CF6]" sub={`+${statsQ.data.weeklyNewUsers} this week`} />
                  <StatCard label="Premium Users" value={statsQ.data.premiumUsers} icon={Crown} color="bg-amber-500" />
                  <StatCard label="Pending Payments" value={statsQ.data.pendingPayments} icon={CreditCard} color="bg-rose-500" />
                  <StatCard label="Total Revenue" value={`₹${statsQ.data.totalRevenue}`} icon={TrendingUp} color="bg-emerald-500" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Resumes" value={statsQ.data.totalResumes} icon={BarChart3} color="bg-violet-500" />
                  <StatCard label="Interviews" value={statsQ.data.totalInterviews} icon={BarChart3} color="bg-cyan-500" />
                  <StatCard label="Cover Letters" value={statsQ.data.totalCoverLetters} icon={BarChart3} color="bg-pink-500" />
                  <StatCard label="Supporters" value={statsQ.data.totalSupporters} icon={UserCheck} color="bg-teal-500" />
                </div>

                {/* Registration trend */}
                <div className="p-5 rounded-2xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">User Growth</h3>
                    <button onClick={() => statsQ.refetch()} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
                      <div className="text-2xl font-bold text-violet-700">{statsQ.data.weeklyNewUsers}</div>
                      <div className="text-xs text-muted-foreground mt-1">This Week</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#5B5CF6]/10 border border-[#5B5CF6]/20">
                      <div className="text-2xl font-bold text-[#5B5CF6]">{statsQ.data.monthlyNewUsers}</div>
                      <div className="text-xs text-muted-foreground mt-1">This Month</div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="text-2xl font-bold text-emerald-700">{statsQ.data.totalUsers}</div>
                      <div className="text-xs text-muted-foreground mt-1">All Time</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* USERS TAB */}
        {tab === "users" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="text-xs text-muted-foreground">{(usersQ.data ?? []).length} users found</div>

            {usersQ.isLoading && [1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}

            {(usersQ.data ?? []).map((u: any) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    {u.name}
                    {u.isPremium && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">Pro</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}{u.mobile ? ` · +91${u.mobile}` : ""}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {u.resumeCount} resumes · {u.interviewCount} interviews · {u.coverLetterCount} covers
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!u.isPremium && (
                    <Button
                      size="sm"
                      onClick={() => upgradeUser(u.id, u.name)}
                      disabled={upgradingId === u.id}
                      className="h-7 px-2 bg-amber-500 hover:bg-amber-600 text-white border-0 text-xs gap-1"
                    >
                      {upgradingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />}
                      Pro
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteUser(u.id)}
                    disabled={deletingId === u.id}
                    className="h-7 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                  >
                    {deletingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  </Button>
                </div>
              </motion.div>
            ))}

            {!usersQ.isLoading && (usersQ.data ?? []).length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>{userSearch ? "No users match your search" : "No users yet"}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* PAYMENTS TAB */}
        {tab === "payments" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {pendingPayments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-sm text-amber-700">Pending Approval</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{pendingPayments.length}</span>
                </div>
                <div className="space-y-2">
                  {pendingPayments.map((p: any) => (
                    <PaymentRow key={p.id} p={p}
                      onApprove={id => approveMut.mutate(id)}
                      onReject={id => rejectMut.mutate(id)}
                      approving={approveMut.isPending && approveMut.variables === p.id}
                      rejecting={rejectMut.isPending && rejectMut.variables === p.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {reviewedPayments.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Reviewed</h3>
                <div className="space-y-2">
                  {reviewedPayments.map((p: any) => (
                    <PaymentRow key={p.id} p={p}
                      onApprove={id => approveMut.mutate(id)}
                      onReject={id => rejectMut.mutate(id)}
                      approving={false} rejecting={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {paymentsQ.isLoading && [1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}

            {!paymentsQ.isLoading && (paymentsQ.data ?? []).length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No payments yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* QR CODES TAB */}
        {tab === "qr" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md space-y-4">
            <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-sm text-violet-800">
              <div className="font-semibold mb-1">Current QR Code</div>
              <div className="text-xs">The QR code displayed to users on the payment page. Upload a new URL to replace it.</div>
            </div>

            {/* Current QR preview */}
            <div className="p-4 rounded-2xl bg-card border border-border text-center">
              <img src="/qr.jpg" alt="Current QR" className="w-48 h-48 object-contain mx-auto rounded-xl mb-2" />
              <p className="text-xs text-muted-foreground">Current: Default QR (Shravani Bidri · 9579841359@fam)</p>
            </div>

            <div>
              <Label>QR Type</Label>
              <div className="flex gap-2 mt-1">
                {["payment", "support"].map(t => (
                  <button key={t} onClick={() => setQrForm({ ...qrForm, type: t })}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all capitalize ${
                      qrForm.type === t ? "border-[#5B5CF6] bg-violet-50 text-[#5B5CF6]" : "border-border text-muted-foreground"
                    }`}
                  >{t}</button>
                ))}
              </div>
            </div>

            <div>
              <Label>New QR Image URL</Label>
              <Input value={qrForm.imageUrl} onChange={e => setQrForm({ ...qrForm, imageUrl: e.target.value })} placeholder="https://..." className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Paste a publicly accessible image URL</p>
            </div>

            {qrForm.imageUrl && (
              <div className="p-3 rounded-xl border border-border text-center">
                <img src={qrForm.imageUrl} alt="QR Preview" className="w-40 h-40 object-contain mx-auto rounded-xl" />
                <p className="text-xs text-muted-foreground mt-1">Preview</p>
              </div>
            )}

            <Button onClick={saveQr} disabled={qrSaving} className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0">
              {qrSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update QR Code"}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
