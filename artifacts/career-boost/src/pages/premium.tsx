import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, CheckCircle2, Loader2, QrCode, Copy, Rocket, Shield, Zap } from "lucide-react";
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
    period: "per month",
    badge: null,
    features: ["Unlimited ATS resumes", "Unlimited interview practice", "Unlimited cover letters", "Full job match AI", "Resume scoring & tips", "Priority support"],
  },
  {
    id: "yearly",
    name: "Pro Yearly",
    price: 499,
    originalPrice: 999,
    period: "per year",
    badge: "Best Value — Save ₹689",
    features: ["Everything in Monthly", "Save 58% vs monthly", "Early access features", "Premium resume templates", "1-on-1 career tips", "Lifetime discount"],
  },
];

const UPI_ID = "9579841359@fam";

function validateMobile(m: string) { return /^[6-9]\d{9}$/.test(m.replace(/\s/g, "")); }

export default function Premium() {
  const { toast } = useToast();
  const token = getToken();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", mobile: "", upiTransactionId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: qrData } = useQuery({
    queryKey: ["payment-qr"],
    queryFn: () => fetch("/api/payments/qr").then(r => r.json()),
  });

  const selectedAmount = PLANS.find(p => p.id === selectedPlan)?.price ?? 0;

  async function submitPayment() {
    if (!form.fullName.trim()) { toast({ title: "Enter your full name", variant: "destructive" }); return; }
    if (!validateMobile(form.mobile)) { toast({ title: "Invalid mobile number", description: "Enter a valid 10-digit Indian mobile number", variant: "destructive" }); return; }
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
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Payment Submitted! 🎉</h2>
          <p className="text-muted-foreground mb-2">
            We've received your payment details and notified our admin.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Your <span className="font-semibold text-violet-700">HirePilot Pro</span> access will be activated within <span className="font-semibold">1-2 hours</span> after verification.
          </p>
          <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-sm text-violet-800 mb-6 text-left">
            <div className="font-semibold mb-1">What happens next?</div>
            <ol className="space-y-1 text-violet-700 list-decimal list-inside text-xs">
              <li>Admin verifies your UPI transaction ID</li>
              <li>Your account is upgraded to Pro</li>
              <li>All Pro features unlock instantly</li>
            </ol>
          </div>
          <Button
            onClick={() => { setSubmitted(false); setSelectedPlan(null); setForm({ fullName: "", mobile: "", upiTransactionId: "" }); }}
            variant="outline"
            className="w-full"
          >
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
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-50 to-amber-50 border border-violet-200 text-violet-700 text-sm font-semibold mb-4">
              <Crown className="w-4 h-4 fill-amber-400 text-amber-500" /> HirePilot Pro
            </div>
            <h1 className="text-3xl font-bold mb-2">Unlock Your Career Potential</h1>
            <p className="text-muted-foreground">Pay via UPI — no credit card needed. Activated within 1-2 hours.</p>
          </div>

          {/* Value props */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: Zap, label: "Instant Access", desc: "After admin verification" },
              { icon: Shield, label: "100% Secure", desc: "UPI verified payments" },
              { icon: Rocket, label: "Career Growth", desc: "Land jobs faster" },
            ].map(v => (
              <div key={v.label} className="p-3 rounded-2xl bg-card border border-border text-center">
                <v.icon className="w-5 h-5 text-violet-600 mx-auto mb-1" />
                <div className="text-xs font-semibold">{v.label}</div>
                <div className="text-[10px] text-muted-foreground">{v.desc}</div>
              </div>
            ))}
          </div>

          {/* Plans */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {PLANS.map(plan => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${
                  selectedPlan === plan.id
                    ? "border-violet-500 bg-gradient-to-b from-violet-50 to-white shadow-lg shadow-violet-100"
                    : "border-border bg-card hover:border-violet-300 hover:shadow-md"
                }`}
              >
                {plan.badge && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[9px] font-bold px-2 py-1 rounded-bl-xl">
                    {plan.badge.split("—")[0]}
                  </div>
                )}
                {selectedPlan === plan.id && (
                  <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="font-bold text-2xl mt-3">₹{plan.price}</div>
                <div className="text-xs text-muted-foreground line-through mb-0.5">₹{plan.originalPrice}</div>
                <div className="text-xs text-muted-foreground mb-3">{plan.period}</div>
                <ul className="space-y-1.5">
                  {plan.features.slice(0, 4).map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="leading-tight">{f}</span>
                    </li>
                  ))}
                  {plan.features.length > 4 && (
                    <li className="text-xs text-violet-600 font-medium">+{plan.features.length - 4} more...</li>
                  )}
                </ul>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {selectedPlan && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                {/* QR Code */}
                <div className="p-5 rounded-2xl bg-card border border-border text-center">
                  <h3 className="font-semibold mb-1">Step 1: Scan & Pay ₹{selectedAmount}</h3>
                  <p className="text-xs text-muted-foreground mb-4">Use GPay, PhonePe, Paytm or any UPI app</p>

                  {qrData?.imageUrl ? (
                    <img
                      src={qrData.imageUrl}
                      alt="UPI QR Code"
                      className="w-52 h-52 object-contain mx-auto rounded-2xl border border-border shadow-md"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-52 h-52 mx-auto rounded-2xl border-2 border-dashed border-violet-200 flex flex-col items-center justify-center text-violet-400 bg-violet-50/50">
                      <QrCode className="w-14 h-14 mb-2" />
                      <p className="text-sm font-medium">QR Coming Soon</p>
                      <p className="text-xs text-muted-foreground mt-1">Use UPI ID below</p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-center gap-2 bg-muted/50 rounded-xl px-4 py-2.5">
                    <div className="text-left">
                      <div className="text-[10px] text-muted-foreground">UPI ID</div>
                      <div className="font-mono font-semibold text-sm text-violet-700">{UPI_ID}</div>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(UPI_ID); toast({ title: "UPI ID copied! ✓" }); }}
                      className="ml-2 p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Copy className="w-4 h-4 text-muted-foreground hover:text-violet-600 transition-colors" />
                    </button>
                  </div>
                </div>

                {/* Form */}
                <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
                  <h3 className="font-semibold">Step 2: Submit Payment Details</h3>

                  <div>
                    <Label>Full Name <span className="text-rose-500">*</span></Label>
                    <Input
                      value={form.fullName}
                      onChange={e => setForm({ ...form, fullName: e.target.value })}
                      placeholder="Priya Sharma"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Mobile Number <span className="text-rose-500">*</span></Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
                      <Input
                        value={form.mobile}
                        onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        placeholder="9999999999"
                        className={`pl-10 ${form.mobile && !validateMobile(form.mobile) ? "border-rose-400" : ""}`}
                        inputMode="numeric"
                      />
                    </div>
                    {form.mobile && !validateMobile(form.mobile) && (
                      <p className="text-xs text-rose-500 mt-1">Enter a valid 10-digit mobile number</p>
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
                    <p className="text-xs text-muted-foreground mt-1">📱 Find this in your UPI app → Transaction History</p>
                  </div>
                </div>

                <Button
                  onClick={submitPayment}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 shadow-lg shadow-violet-200/50 gap-2 h-12 text-base"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                  ) : (
                    <><Crown className="w-5 h-5" /> Submit Payment — ₹{selectedAmount}</>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  🔒 Admin verifies manually within 1-2 hours. Your data is secure.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
