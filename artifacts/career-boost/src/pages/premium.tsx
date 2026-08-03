import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Check, Minus, Loader2, Copy, Rocket, Shield, Zap, Sparkles, ArrowRight, CalendarClock, Clock, BadgeCheck, ChevronLeft, History } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { apiUrl } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

interface PlansConfig {
  trialDays: number;
  plans: Record<
    "pro" | "premium",
    { name: string; monthly: number; yearly: number; yearlySavings: number }
  >;
}

interface SubscriptionInfo {
  plan: "free" | "pro" | "premium";
  status: "none" | "trial" | "active" | "expired";
  cycle: "monthly" | "yearly";
  trialUsed: boolean;
  trialEndAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  billingHistory: Array<{
    id: number;
    amount: number;
    plan: string;
    status: string;
    upiTransactionId: string;
    createdAt: string;
    reviewedAt: string | null;
  }>;
}

const DEFAULT_PLANS: PlansConfig = {
  trialDays: 1,
  plans: {
    pro: { name: "Pro", monthly: 149, yearly: 1499, yearlySavings: 289 },
    premium: { name: "Premium", monthly: 299, yearly: 2999, yearlySavings: 589 },
  },
};

const UPI_ID = "9579841359@fam";
const DEFAULT_QR = import.meta.env.BASE_URL + "qr.jpg";

const FREE_FEATURES = [
  "1 Resume",
  "Basic Resume Builder",
  "Basic ATS Analysis",
  "Limited AI Usage",
  "Basic Job Recommendations",
  "Basic Interview Practice",
  "Limited Resume Exports",
  "Standard Support",
];

const PRO_FEATURES = [
  "Unlimited Resume Builder",
  "Unlimited Resume Tailoring",
  "Unlimited ATS Analysis",
  "Unlimited Cover Letters",
  "Unlimited Portfolio Generation",
  "AI Career Dashboard",
  "AI Job Matching",
  "Unlimited Mock Interviews",
  "Resume Version History",
  "Career Progress Tracking",
  "Premium Resume Templates",
  "Priority AI",
  "Priority Support",
];

const PREMIUM_FEATURES = [
  "Everything in Pro",
  "AI Career Copilot",
  "Advanced Career Intelligence",
  "Advanced Career Analytics",
  "Unlimited AI Career Reports",
  "Advanced Job Insights",
  "Career Score Tracking",
  "Advanced Resume Intelligence",
  "Advanced Interview Analytics",
  "Personalized Weekly Career Reports",
  "Early Access to New Features",
  "Highest AI Priority",
  "Premium Support",
];

const COMPARISON_ROWS: Array<{ label: string; free: boolean; pro: boolean; premium: boolean | "pro" }> = [
  { label: "AI Career Copilot", free: false, pro: false, premium: true },
  { label: "Advanced Career Intelligence", free: false, pro: false, premium: true },
  { label: "Advanced Career Analytics", free: false, pro: false, premium: true },
  { label: "AI Career Reports", free: false, pro: false, premium: true },
  { label: "Advanced Job Insights", free: false, pro: false, premium: true },
  { label: "Career Score Tracking", free: false, pro: false, premium: true },
  { label: "Advanced Resume Intelligence", free: false, pro: false, premium: true },
  { label: "Advanced Interview Analytics", free: false, pro: false, premium: true },
  { label: "Weekly Career Reports", free: false, pro: false, premium: true },
  { label: "Early Access to New Features", free: false, pro: false, premium: true },
  { label: "Highest AI Priority", free: false, pro: false, premium: true },
  { label: "Priority AI", free: false, pro: true, premium: "pro" },
  { label: "Premium Resume Templates", free: false, pro: true, premium: "pro" },
  { label: "Career Progress Tracking", free: false, pro: true, premium: "pro" },
  { label: "Resume Version History", free: false, pro: true, premium: "pro" },
  { label: "Unlimited Mock Interviews", free: false, pro: true, premium: "pro" },
  { label: "AI Job Matching", free: false, pro: true, premium: "pro" },
  { label: "AI Career Dashboard", free: false, pro: true, premium: "pro" },
  { label: "Portfolio Generation", free: false, pro: true, premium: "pro" },
  { label: "Cover Letters (unlimited)", free: false, pro: true, premium: "pro" },
  { label: "ATS Analysis (unlimited)", free: false, pro: true, premium: "pro" },
  { label: "Resume Tailoring", free: false, pro: true, premium: "pro" },
  { label: "Unlimited Resume Builder", free: false, pro: true, premium: "pro" },
  { label: "Resumes", free: true, pro: true, premium: "pro" },
  { label: "Basic Resume Builder", free: true, pro: true, premium: "pro" },
  { label: "Basic ATS Analysis", free: true, pro: true, premium: "pro" },
  { label: "Basic Job Recommendations", free: true, pro: true, premium: "pro" },
  { label: "Basic Interview Practice", free: true, pro: true, premium: "pro" },
  { label: "Limited AI Usage", free: true, pro: true, premium: "pro" },
  { label: "Limited Resume Exports", free: true, pro: true, premium: "pro" },
];

function validateMobile(m: string) {
  return /^[6-9]\d{9}$/.test(m.replace(/\s/g, ""));
}

function Cell({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="w-4 h-4 text-emerald-500 mx-auto" strokeWidth={3} />
  ) : (
    <Minus className="w-4 h-4 text-muted-foreground/40 mx-auto" />
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Premium() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = getToken();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [checkout, setCheckout] = useState<{ plan: "pro" | "premium"; cycle: "monthly" | "yearly" } | null>(null);
  const [form, setForm] = useState({ fullName: "", mobile: "", upiTransactionId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [startingTrial, setStartingTrial] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [done, setDone] = useState(false);

  const { data: plansData } = useQuery({
    queryKey: ["plans-config"],
    queryFn: async () => (await fetch(apiUrl("/api/subscriptions/plans"))).json(),
    retry: false,
  });

  const { data: qrData } = useQuery({
    queryKey: ["payment-qr"],
    queryFn: () => fetch(apiUrl("/api/payments/qr")).then((r) => r.json()),
    retry: false,
  });

  const { data: sub, refetch: refetchSub } = useQuery({
    queryKey: ["subscription-me"],
    queryFn: async () => {
      if (!token) return null;
      const res = await fetch(apiUrl("/api/subscriptions/me"), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      return (await res.json()) as SubscriptionInfo;
    },
    retry: false,
    enabled: !!token,
  });

  const plans = (plansData as PlansConfig | undefined) ?? DEFAULT_PLANS;
  const qrImageUrl = qrData?.imageUrl || DEFAULT_QR;
  const active = sub && (sub.status === "trial" || sub.status === "active") && sub.plan !== "free";
  const periodEnd = sub?.status === "trial" ? sub.trialEndAt : sub?.currentPeriodEnd;

  async function startTrial(plan: "pro" | "premium") {
    if (!token) { toast({ title: "Login required", description: "Create a free account to start your trial.", variant: "destructive" }); return; }
    setStartingTrial(plan);
    try {
      const res = await fetch(apiUrl("/api/subscriptions/trial"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan, cycle: "yearly" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error === "TRIAL_USED" ? "You can only claim one free trial." : data.error || "Failed to start trial");
      await refetchSub();
      toast({ title: `${plans.plans[plan].name} trial started! 🎉`, description: `Full ${plans.plans[plan].name} access for ${plans.trialDays} days — cancel anytime, no charge.` });
    } catch (err: any) {
      toast({ title: "Could not start trial", description: err.message, variant: "destructive" });
    } finally {
      setStartingTrial(null);
    }
  }

  async function cancelSubscription() {
    if (!token) return;
    if (!confirm("Cancel your subscription? You'll keep access until the end of the current period.")) return;
    setCanceling(true);
    try {
      const res = await fetch(apiUrl("/api/subscriptions/cancel"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      await refetchSub();
      toast({ title: "Cancellation scheduled", description: `You'll have access until ${fmtDate(periodEnd ?? null)}.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCanceling(false);
    }
  }

  async function submitPayment() {
    if (!form.fullName.trim()) { toast({ title: "Enter your full name", variant: "destructive" }); return; }
    if (!validateMobile(form.mobile)) { toast({ title: "Invalid mobile number", description: "Enter a valid 10-digit Indian mobile", variant: "destructive" }); return; }
    if (!form.upiTransactionId.trim()) { toast({ title: "Enter UPI Transaction ID", variant: "destructive" }); return; }
    if (!checkout) return;

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(apiUrl("/api/payments"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          mobile: form.mobile.trim(),
          upiTransactionId: form.upiTransactionId.trim(),
          plan: checkout.plan,
          cycle: checkout.cycle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setDone(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const selectedAmount = checkout ? plans.plans[checkout.plan][checkout.cycle] : 0;
  const selectedLabel = checkout
    ? `${plans.plans[checkout.plan].name} ${checkout.cycle === "yearly" ? "Yearly" : "Monthly"}`
    : "";

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm w-full text-center py-8">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
            className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-6"
          >
            <BadgeCheck className="w-14 h-14 text-emerald-500" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Payment Submitted! 🎉</h2>
          <p className="text-muted-foreground mb-4">Admin has been notified and will verify your payment shortly.</p>
          <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 text-sm text-left mb-6">
            <div className="font-semibold text-violet-900 mb-2 flex items-center gap-2">
              <Rocket className="w-4 h-4" /> What happens next?
            </div>
            <ol className="space-y-2 text-violet-700">
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span>Admin checks your UPI transaction ID</li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span>Your subscription activates (usually within 1-2 hrs)</li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</span>All plan features unlock instantly</li>
            </ol>
          </div>
          <Button onClick={() => { setDone(false); setCheckout(null); setForm({ fullName: "", mobile: "", upiTransactionId: "" }); }} variant="outline" className="w-full">
            Back to Pricing
          </Button>
        </motion.div>
      </div>
    );
  }

  if (checkout) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 pb-28 px-4 max-w-2xl mx-auto">
          <button onClick={() => setCheckout(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to pricing
          </button>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 mb-5">
            <div>
              <div className="text-xs text-violet-600 font-medium">Selected Plan</div>
              <div className="font-bold">{selectedLabel}</div>
            </div>
            <div className="text-2xl font-black text-[#5B5CF6]">₹{selectedAmount}</div>
          </div>

          {checkout.cycle === "yearly" && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 mb-5 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> You're saving ₹{plans.plans[checkout.plan].yearlySavings} vs paying monthly!
            </div>
          )}

          <div className="p-5 rounded-2xl bg-card border border-border text-center mb-5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 px-3 py-1 rounded-full mb-4">
              Step 1: Scan QR & Pay ₹{selectedAmount}
            </div>
            <div className="flex justify-center mb-4">
              <div className="w-56 h-56 rounded-2xl border-2 border-violet-100 shadow-lg overflow-hidden bg-white">
                <img
                  src={qrImageUrl}
                  alt="UPI QR Code"
                  className="w-full h-full object-contain p-1"
                  onError={(e) => { const el = e.target as HTMLImageElement; if (el.src !== DEFAULT_QR) el.src = DEFAULT_QR; }}
                />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 bg-muted/60 rounded-xl px-4 py-3">
              <div className="text-left">
                <div className="text-[10px] text-muted-foreground font-medium">UPI ID (Shravani Bidri)</div>
                <div className="font-mono font-bold text-[#5B5CF6]">{UPI_ID}</div>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(UPI_ID); toast({ title: "UPI ID copied! ✓" }); }}
                className="ml-2 p-2 rounded-lg hover:bg-background transition-colors"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Use GPay, PhonePe, Paytm, or any UPI app</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-4 mb-5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 px-3 py-1 rounded-full">
              Step 2: Fill Payment Details
            </div>
            <div>
              <Label>Full Name <span className="text-rose-500">*</span></Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Priya Sharma" className="mt-1" autoComplete="name" />
            </div>
            <div>
              <Label>Mobile Number <span className="text-rose-500">*</span></Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">+91</span>
                <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="9999999999" className={`pl-12 ${form.mobile && !validateMobile(form.mobile) ? "border-rose-400" : ""}`} inputMode="numeric" />
              </div>
              {form.mobile.length === 10 && validateMobile(form.mobile) && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Valid number</p>
              )}
              {form.mobile && !validateMobile(form.mobile) && (
                <p className="text-xs text-rose-500 mt-1">Enter a valid 10-digit mobile (starts with 6-9)</p>
              )}
            </div>
            <div>
              <Label>UPI Transaction ID <span className="text-rose-500">*</span></Label>
              <Input value={form.upiTransactionId} onChange={(e) => setForm({ ...form, upiTransactionId: e.target.value })} placeholder="e.g. 407812345678" className="mt-1 font-mono" />
              <p className="text-xs text-muted-foreground mt-1">📱 GPay → Transaction → Copy 12-digit ID</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 mb-5">
            <strong>⚠️ No Refunds:</strong> Payments for lower amounts cannot be refunded or credited. Pay only the exact plan amount shown above.
          </div>

          <Button
            onClick={submitPayment}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 shadow-lg shadow-violet-200/60 gap-2 h-12 text-base font-bold"
          >
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : <><Crown className="w-5 h-5 fill-white" /> I Have Paid — Submit for Verification</>}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-3">🔒 Admin verifies each payment manually within 1-2 hours</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-28 px-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 text-violet-700 text-sm font-bold mb-4">
            <Sparkles className="w-4 h-4 text-[#5B5CF6]" /> Your AI Career Copilot
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
            Invest in Your <span className="bg-gradient-to-r from-[#5B5CF6] via-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">Career Growth</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            HirePilot isn't just a resume generator — it's an AI career copilot that continuously improves your resume, discovers better opportunities, and trains you for interviews.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={() => setCycle("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${cycle === "monthly" ? "bg-[#5B5CF6] text-white shadow-lg shadow-violet-200" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${cycle === "yearly" ? "bg-[#5B5CF6] text-white shadow-lg shadow-violet-200" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            Yearly
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cycle === "yearly" ? "bg-emerald-400 text-white" : "bg-emerald-100 text-emerald-700"}`}>
              Save {Math.round((1 - plans.plans.pro.yearly / (plans.plans.pro.monthly * 12)) * 100)}%
            </span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {/* Free */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative p-6 rounded-3xl border border-border bg-card flex flex-col">
            <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Free</div>
            <div className="text-4xl font-black mb-1">₹0</div>
            <div className="text-xs text-muted-foreground mb-5">forever</div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" disabled>Current Plan</Button>
          </motion.div>

          {/* Pro */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="relative p-6 rounded-3xl border-2 border-[#5B5CF6] bg-gradient-to-b from-violet-50/80 to-white shadow-2xl shadow-violet-100 flex flex-col">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white text-[11px] font-black px-4 py-1 rounded-full shadow-lg whitespace-nowrap">
              ⭐ MOST POPULAR
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-sm font-bold uppercase tracking-wider text-[#5B5CF6]">Pro</div>
              <span className="text-[10px] font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 px-2 py-0.5 rounded-full">Recommended</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <div className="text-4xl font-black">₹{cycle === "yearly" ? plans.plans.pro.yearly : plans.plans.pro.monthly}</div>
              <div className="text-xs text-muted-foreground">/{cycle === "yearly" ? "year" : "month"}</div>
            </div>
            {cycle === "yearly" && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">SAVE ₹{plans.plans.pro.yearlySavings}</span>
                <span className="text-[10px] text-muted-foreground line-through">₹{plans.plans.pro.monthly * 12}/yr</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground mb-5">{cycle === "yearly" ? `${plans.trialDays}-day free trial · cancel anytime` : "1-day free trial available on yearly"}</div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={3} /> {f}
                </li>
              ))}
            </ul>
            {!active && cycle === "yearly" && (
              <Button
                onClick={() => startTrial("pro")}
                disabled={startingTrial !== null}
                className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 shadow-lg shadow-violet-200/60 gap-2 mb-2"
              >
                {startingTrial === "pro" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                Start {plans.trialDays}-Day Free Trial
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => setCheckout({ plan: "pro", cycle })}>
              Pay via UPI — ₹{cycle === "yearly" ? plans.plans.pro.yearly : plans.plans.pro.monthly}
            </Button>
          </motion.div>

          {/* Premium */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }} className="relative p-6 rounded-3xl border border-border bg-card flex flex-col">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[11px] font-black px-4 py-1 rounded-full shadow-lg whitespace-nowrap">
              <Crown className="w-3 h-3 inline-block mr-1 fill-white" /> BEST FOR POWER USERS
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-sm font-bold uppercase tracking-wider text-amber-600">Premium</div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Everything in Pro</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <div className="text-4xl font-black">₹{cycle === "yearly" ? plans.plans.premium.yearly : plans.plans.premium.monthly}</div>
              <div className="text-xs text-muted-foreground">/{cycle === "yearly" ? "year" : "month"}</div>
            </div>
            {cycle === "yearly" && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">SAVE ₹{plans.plans.premium.yearlySavings}</span>
                <span className="text-[10px] text-muted-foreground line-through">₹{plans.plans.premium.monthly * 12}/yr</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground mb-5">{cycle === "yearly" ? `${plans.trialDays}-day free trial · cancel anytime` : "1-day free trial available on yearly"}</div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={3} /> {f}
                </li>
              ))}
            </ul>
            {!active && cycle === "yearly" && (
              <Button
                onClick={() => startTrial("premium")}
                disabled={startingTrial !== null}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 shadow-lg shadow-amber-200/60 gap-2 mb-2"
              >
                {startingTrial === "premium" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                Start {plans.trialDays}-Day Free Trial
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => setCheckout({ plan: "premium", cycle })}>
              Pay via UPI — ₹{cycle === "yearly" ? plans.plans.premium.yearly : plans.plans.premium.monthly}
            </Button>
          </motion.div>
        </div>

        {!token && (
          <div className="text-center mb-10">
            <Link href="/login">
              <Button size="lg" className="bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 shadow-lg shadow-violet-200/60 gap-2">
                Login to Subscribe <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-2">Free forever plan available — no card required</p>
          </div>
        )}

        {/* Subscription management */}
        {token && sub && sub.status !== "none" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-card p-6 mb-10">
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock className="w-5 h-5 text-[#5B5CF6]" />
              <h2 className="text-lg font-bold">Your Subscription</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-2xl bg-muted/50">
                <div className="text-xs text-muted-foreground font-medium mb-1">Current Plan</div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black capitalize">{sub.plan === "free" ? "Free" : sub.plan}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.status === "trial" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {sub.status === "trial" ? "TRIAL" : sub.cancelAtPeriodEnd ? "CANCELS ON END" : "ACTIVE"}
                  </span>
                </div>
                {sub.cycle === "yearly" && <div className="text-xs text-muted-foreground mt-1">Yearly billing</div>}
              </div>
              <div className="p-4 rounded-2xl bg-muted/50">
                <div className="text-xs text-muted-foreground font-medium mb-1">{sub.status === "trial" ? "Trial ends" : "Renewal date"}</div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#5B5CF6]" />
                  <span className="text-lg font-bold">{fmtDate(periodEnd ?? null)}</span>
                </div>
                {sub.cancelAtPeriodEnd && <div className="text-xs text-amber-600 mt-1">Access continues until this date</div>}
              </div>
            </div>

            {sub.status === "trial" && (
              <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-sm text-violet-800 mb-4">
                You're on a free trial — no charge. At the end of {plans.trialDays} days your access ends unless you subscribe. Cancel anytime.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {!sub.cancelAtPeriodEnd && sub.status !== "expired" && (
                <Button variant="outline" onClick={cancelSubscription} disabled={canceling} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                  {canceling ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Cancel subscription
                </Button>
              )}
              {sub.cancelAtPeriodEnd && (
                <Button className="bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0" onClick={() => { setCheckout({ plan: sub.plan === "premium" ? "premium" : "pro", cycle: sub.cycle }); }}>
                  Reactivate — pay ₹{plans.plans[sub.plan === "premium" ? "premium" : "pro"][sub.cycle]}
                </Button>
              )}
              {active && sub.plan === "pro" && (
                <Button variant="outline" onClick={() => setCheckout({ plan: "premium", cycle: sub.cycle })}>
                  Upgrade to Premium
                </Button>
              )}
              {active && sub.plan === "premium" && (
                <Button variant="outline" onClick={() => setCheckout({ plan: "pro", cycle: sub.cycle })}>
                  Switch to Pro
                </Button>
              )}
              {active && (
                <Button variant="outline" onClick={() => setCheckout({ plan: sub.plan === "pro" ? "pro" : "premium", cycle: sub.cycle === "yearly" ? "monthly" : "yearly" })}>
                  {sub.cycle === "yearly" ? "Switch to Monthly" : "Switch to Yearly & save"}
                </Button>
              )}
            </div>

            {sub.billingHistory.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-bold text-muted-foreground">Billing History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="py-2 pr-4 font-semibold">Date</th>
                        <th className="py-2 pr-4 font-semibold">Plan</th>
                        <th className="py-2 pr-4 font-semibold">Amount</th>
                        <th className="py-2 pr-4 font-semibold">Status</th>
                        <th className="py-2 font-semibold">UPI ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sub.billingHistory.map((b) => (
                        <tr key={b.id} className="border-b border-border/50">
                          <td className="py-2.5 pr-4 text-muted-foreground">{fmtDate(b.createdAt)}</td>
                          <td className="py-2.5 pr-4 capitalize">{b.plan.replace("_", " ")}</td>
                          <td className="py-2.5 pr-4 font-semibold">₹{b.amount}</td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === "approved" ? "bg-emerald-100 text-emerald-700" : b.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                              {b.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-xs text-muted-foreground">{b.upiTransactionId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Feature comparison */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 mb-10">
          <h2 className="text-xl font-black text-center mb-1">Compare Plans</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">Everything you need to land your dream job — powered by AI</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="py-3 pr-4 text-left font-semibold">Feature</th>
                  <th className="py-3 px-2 text-center font-semibold text-muted-foreground w-24">Free</th>
                  <th className="py-3 px-2 text-center font-black text-[#5B5CF6] w-24">Pro</th>
                  <th className="py-3 px-2 text-center font-black text-amber-600 w-28">Premium</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-border/50">
                    <td className="py-2.5 pr-4">{row.label}</td>
                    <td className="py-2.5 px-2"><Cell ok={row.free} /></td>
                    <td className="py-2.5 px-2"><Cell ok={row.pro} /></td>
                    <td className="py-2.5 px-2"><Cell ok={row.premium === true || row.premium === "pro"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Zap, label: "Instant Unlock", desc: "After verification" },
            { icon: Shield, label: "100% Secure", desc: "UPI only" },
            { icon: Sparkles, label: "AI Career Copilot", desc: "Always improving" },
          ].map((v) => (
            <div key={v.label} className="p-4 rounded-2xl bg-card border border-border text-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6] flex items-center justify-center mx-auto mb-2">
                <v.icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-xs font-bold">{v.label}</div>
              <div className="text-[10px] text-muted-foreground">{v.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
