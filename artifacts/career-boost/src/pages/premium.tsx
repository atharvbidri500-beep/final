import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, CheckCircle2, Loader2, QrCode, Copy } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

const PLANS = [
  { id: "monthly", name: "Pro Monthly", price: 149, desc: "per month", features: ["Unlimited resumes", "Unlimited interviews", "Unlimited cover letters", "Full ATS analysis", "Job match AI", "Priority support"] },
  { id: "yearly", name: "Pro Yearly", price: 999, desc: "per year — save ₹789", features: ["Everything in Monthly", "Priority email support", "Premium templates", "Early access features", "Career tips newsletter"] },
];

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

  const UPI_ID = "9579841359@fam";

  async function submitPayment() {
    if (!form.fullName || !form.mobile || !form.upiTransactionId) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/payments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          fullName: form.fullName,
          mobile: form.mobile,
          upiTransactionId: form.upiTransactionId,
          amount: selectedAmount,
          plan: selectedPlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(true);
      toast({ title: "Payment submitted! 🎉 Admin will verify within 1 hour." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Submitted!</h2>
          <p className="text-muted-foreground mb-6">Our admin will verify your payment and activate your Pro account within 1-2 hours. You'll get full access once verified.</p>
          <Button onClick={() => { setSubmitted(false); setSelectedPlan(null); setForm({ fullName: "", mobile: "", upiTransactionId: "" }); }} variant="outline" className="w-full">
            Back to Pricing
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium mb-4">
              <Crown className="w-4 h-4" /> Career Boost Pro
            </div>
            <h1 className="text-2xl font-bold mb-2">Unlock Unlimited Access</h1>
            <p className="text-muted-foreground">Pay via UPI — no credit card needed. Verified by admin within 1 hour.</p>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {PLANS.map(plan => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  selectedPlan === plan.id ? "border-indigo-500 bg-indigo-50" : "border-border bg-card hover:border-indigo-200"
                }`}
              >
                <div className="font-bold text-lg">₹{plan.price}</div>
                <div className="text-xs text-muted-foreground mb-3">{plan.desc}</div>
                <ul className="space-y-1">
                  {plan.features.slice(0, 3).map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.features.length > 3 && (
                    <li className="text-xs text-muted-foreground">+{plan.features.length - 3} more...</li>
                  )}
                </ul>
              </button>
            ))}
          </div>

          {selectedPlan && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* QR Code */}
              <div className="p-5 rounded-2xl bg-card border border-border text-center">
                <h3 className="font-semibold mb-3">Scan QR to Pay ₹{selectedAmount}</h3>
                {qrData?.imageUrl ? (
                  <img src={qrData.imageUrl} alt="UPI QR Code" className="w-48 h-48 object-contain mx-auto rounded-xl border" />
                ) : (
                  <div className="w-48 h-48 mx-auto rounded-xl border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-400">
                    <QrCode className="w-12 h-12 mb-2" />
                    <p className="text-sm">QR Code</p>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                  <span className="font-mono text-indigo-700 font-medium">{UPI_ID}</span>
                  <button onClick={() => { navigator.clipboard.writeText(UPI_ID); toast({ title: "UPI ID copied!" }); }}>
                    <Copy className="w-4 h-4 text-muted-foreground hover:text-indigo-600 transition-colors" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pay via any UPI app (GPay, PhonePe, Paytm)</p>
              </div>

              {/* Form */}
              <div className="space-y-3">
                <div>
                  <Label>Your Full Name</Label>
                  <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Priya Sharma" className="mt-1" />
                </div>
                <div>
                  <Label>Mobile Number</Label>
                  <Input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="9999999999" className="mt-1" />
                </div>
                <div>
                  <Label>UPI Transaction ID</Label>
                  <Input value={form.upiTransactionId} onChange={e => setForm({ ...form, upiTransactionId: e.target.value })} placeholder="e.g. 407812345678" className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">Find this in your UPI app after payment</p>
                </div>
              </div>

              <Button
                onClick={submitPayment}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0 gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                Submit Payment for Verification
              </Button>
              <p className="text-xs text-center text-muted-foreground">Admin verifies manually within 1-2 hours. No auto-payment capture.</p>
            </motion.div>
          )}
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
