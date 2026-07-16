import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, CheckCircle2, Loader2, Copy, Rocket, Shield, Zap, Star, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

const PLANS = [
  {
    id: "monthly",
    name: "Pro Monthly",
    price: 99,
    originalPrice: 149,
    period: "/ month",
    badge: null,
    highlight: false,
    features: [
      "Unlimited ATS resumes",
      "Unlimited interview practice",
      "Unlimited cover letters",
      "Full job match AI",
      "Resume scoring & tips",
      "Priority support",
    ],
  },
  {
    id: "yearly",
    name: "Pro Yearly",
    price: 499,
    originalPrice: 1188,
    period: "/ year",
    badge: "Best Value",
    highlight: true,
    savings: "Save ₹689",
    features: [
      "Everything in Monthly",
      "Save 58% vs monthly",
      "Early access features",
      "Premium resume templates",
      "1-on-1 career tips",
      "Lifetime discount locked",
    ],
  },
];

const FREE_FEATURES = [
  "5 resume exports / month",
  "10 interview questions / day",
  "Basic cover letter (3/month)",
  "Resume score (once)",
  "English tool (5/day)",
];

const UPI_ID = "9579841359@fam";
const DEFAULT_QR = "/qr.jpg";

function validateMobile(m: string) {
  return /^[6-9]\d{9}$/.test(m.replace(/\s/g, ""));
}

export default function Premium() {
  const { toast } = useToast();
  const token = getToken();
  const [selectedPlan, setSelectedPlan] = useState<string | null>("yearly");
  const [step, setStep] = useState<"plans" | "pay" | "done">("plans");
  const [form, setForm] = useState({ fullName: "", mobile: "", upiTransactionId: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data: qrData } = useQuery({
    queryKey: ["payment-qr"],
    queryFn: () => fetch("/api/payments/qr").then(r => r.json()),
    retry: false,
  });

  const qrImageUrl = qrData?.imageUrl || DEFAULT_QR;
  const selectedPlanObj = PLANS.find(p => p.id === selectedPlan);
  const selectedAmount = selectedPlanObj?.price ?? 0;

  async function submitPayment() {
    if (!form.fullName.trim()) { toast({ title: "Enter your full name", variant: "destructive" }); return; }
    if (!validateMobile(form.mobile)) { toast({ title: "Invalid mobile number", description: "Enter a valid 10-digit Indian mobile", variant: "destructive" }); return; }
    if (!form.upiTransactionId.trim()) { toast({ title: "Enter UPI Transaction ID", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/payments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          mobile: form.mobile.trim(),
          upiTransactionId: form.upiTransactionId.trim(),
          amount: selectedAmount,
          plan: selectedPlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setStep("done");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center py-8"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
            className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-14 h-14 text-emerald-500" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Payment Submitted! 🎉</h2>
          <p className="text-muted-foreground mb-4">Admin has been notified and will verify your payment shortly.</p>

          <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 text-sm text-left mb-6">
            <div className="font-semibold text-violet-900 mb-2 flex items-center gap-2">
              <Rocket className="w-4 h-4" /> What happens next?
            </div>
            <ol className="space-y-2 text-violet-700">
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span>Admin checks your UPI transaction ID</li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span>Your account upgrades to Pro (usually within 1-2 hrs)</li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</span>All Pro features unlock instantly</li>
            </ol>
          </div>

          <Button onClick={() => { setStep("plans"); setForm({ fullName: "", mobile: "", upiTransactionId: "" }); }} variant="outline" className="w-full">
            Back to Plans
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-28 px-4 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {step === "plans" && (
            <motion.div key="plans" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 text-amber-700 text-sm font-bold mb-4">
                  <Crown className="w-4 h-4 fill-amber-400 text-amber-500" /> HirePilot Pro
                </div>
                <h1 className="text-3xl font-black tracking-tight mb-2">Unlock Your Career Potential</h1>
                <p className="text-muted-foreground">Pay via UPI — no credit card. Activated within 1-2 hours.</p>
              </div>

              {/* Value props */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { icon: Zap, label: "Instant Unlock", desc: "After verification" },
                  { icon: Shield, label: "100% Secure", desc: "UPI only" },
                  { icon: Star, label: "Trusted by 5K+", desc: "Indian students" },
                ].map(v => (
                  <div key={v.label} className="p-4 rounded-2xl bg-card border border-border text-center">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6] flex items-center justify-center mx-auto mb-2">
                      <v.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-xs font-bold">{v.label}</div>
                    <div className="text-[10px] text-muted-foreground">{v.desc}</div>
                  </div>
                ))}
              </div>

              {/* Plans comparison */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {/* Free */}
                <div className="p-4 rounded-2xl border border-border bg-card">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Free</div>
                  <div className="text-2xl font-black mb-0.5">₹0</div>
                  <div className="text-xs text-muted-foreground mb-4">forever</div>
                  <ul className="space-y-1.5 mb-4">
                    {FREE_FEATURES.map(f => (
                      <li key={f} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" className="w-full text-xs" disabled>Current Plan</Button>
                </div>

                {/* Pro plans */}
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${
                      selectedPlan === plan.id
                        ? "border-[#5B5CF6] bg-gradient-to-b from-violet-50 to-white shadow-xl shadow-violet-100"
                        : "border-border bg-card hover:border-violet-300"
                    }`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-px -right-px bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[9px] font-bold px-2.5 py-1 rounded-bl-xl rounded-tr-xl">
                        {plan.badge}
                      </div>
                    )}
                    {selectedPlan === plan.id && (
                      <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-[#5B5CF6] flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="text-xs font-semibold text-[#5B5CF6] uppercase tracking-wider mb-2 mt-3">
                      {plan.name.replace("Pro ", "")}
                    </div>
                    <div className="text-2xl font-black">₹{plan.price}</div>
                    <div className="text-[10px] text-muted-foreground line-through">₹{plan.originalPrice}</div>
                    <div className="text-[10px] text-muted-foreground mb-3">{plan.period}</div>
                    {plan.savings && (
                      <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-2">{plan.savings}</div>
                    )}
                    <ul className="space-y-1.5">
                      {plan.features.slice(0, 4).map(f => (
                        <li key={f} className="flex items-start gap-1 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setStep("pay")}
                disabled={!selectedPlan}
                className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 shadow-lg shadow-violet-200/60 gap-2 h-12 text-base font-bold"
              >
                Continue with {selectedPlanObj?.name} — ₹{selectedAmount}
                <ArrowRight className="w-5 h-5" />
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">🔒 Secure UPI payment · No credit card required · Manual verification</p>
            </motion.div>
          )}

          {step === "pay" && (
            <motion.div key="pay" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <button onClick={() => setStep("plans")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
                ← Back to plans
              </button>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200">
                <div>
                  <div className="text-xs text-violet-600 font-medium">Selected Plan</div>
                  <div className="font-bold">{selectedPlanObj?.name}</div>
                </div>
                <div className="text-2xl font-black text-[#5B5CF6]">₹{selectedAmount}</div>
              </div>

              {/* QR Code — large, prominent */}
              <div className="p-5 rounded-2xl bg-card border border-border text-center">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 px-3 py-1 rounded-full mb-4">
                  Step 1: Scan QR & Pay ₹{selectedAmount}
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-56 h-56 rounded-2xl border-2 border-violet-100 shadow-lg overflow-hidden">
                    <img
                      src={qrImageUrl}
                      alt="UPI QR Code"
                      className="w-full h-full object-cover object-center scale-[1.15]"
                      onError={e => {
                        const el = e.target as HTMLImageElement;
                        if (el.src !== DEFAULT_QR) el.src = DEFAULT_QR;
                      }}
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

              {/* Payment details form */}
              <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 px-3 py-1 rounded-full">
                  Step 2: Fill Payment Details
                </div>

                <div>
                  <Label>Full Name <span className="text-rose-500">*</span></Label>
                  <Input
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Priya Sharma"
                    className="mt-1"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <Label>Mobile Number <span className="text-rose-500">*</span></Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">+91</span>
                    <Input
                      value={form.mobile}
                      onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      placeholder="9999999999"
                      className={`pl-12 ${form.mobile && !validateMobile(form.mobile) ? "border-rose-400" : ""}`}
                      inputMode="numeric"
                    />
                  </div>
                  {form.mobile.length === 10 && validateMobile(form.mobile) && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Valid number</p>
                  )}
                  {form.mobile && !validateMobile(form.mobile) && (
                    <p className="text-xs text-rose-500 mt-1">Enter a valid 10-digit mobile (starts with 6-9)</p>
                  )}
                </div>

                <div>
                  <Label>UPI Transaction ID <span className="text-rose-500">*</span></Label>
                  <Input
                    value={form.upiTransactionId}
                    onChange={e => setForm({ ...form, upiTransactionId: e.target.value })}
                    placeholder="e.g. 407812345678"
                    className="mt-1 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">📱 GPay → Transaction → Copy 12-digit ID</p>
                </div>
              </div>

              <Button
                onClick={submitPayment}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 shadow-lg shadow-violet-200/60 gap-2 h-12 text-base font-bold"
              >
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                ) : (
                  <><Crown className="w-5 h-5 fill-white" /> I Have Paid — Submit for Verification</>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">🔒 Admin verifies each payment manually within 1-2 hours</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
