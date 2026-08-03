import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Loader2, QrCode, Copy, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const UPI_ID = "9579841359@fam";

export default function Support() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", mobile: "", amount: "", upiTransactionId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: qrData } = useQuery({
    queryKey: ["support-qr"],
    queryFn: () => fetch(apiUrl("/api/supporters/qr")).then(r => r.json()),
  });

  async function submitSupport() {
    if (!form.name || !form.mobile || !form.amount || !form.upiTransactionId) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/supporters"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(true);
      toast({ title: "Thank you for your support! ❤️" });
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
          <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-10 h-10 text-pink-600 fill-pink-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Thank You! 🙏</h2>
          <p className="text-muted-foreground">Your support means the world to us. We'll keep building and improving Career Boost AI for Indian students like you!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Support Career Boost AI</h1>
            <p className="text-muted-foreground">This app is made with love for Indian students. If it helped you, consider supporting us to keep it running and free!</p>
          </div>

          {/* QR */}
          <div className="p-5 rounded-2xl bg-card border border-border text-center mb-5">
            <h3 className="font-semibold mb-3">Scan to Support Us</h3>
            {qrData?.imageUrl ? (
              <img src={qrData.imageUrl} alt="Support QR" className="w-48 h-48 object-contain mx-auto rounded-xl border" />
            ) : (
              <div className="w-48 h-48 mx-auto rounded-xl border-2 border-dashed border-pink-200 flex flex-col items-center justify-center text-pink-400">
                <QrCode className="w-12 h-12 mb-2" />
                <p className="text-sm">Support QR</p>
              </div>
            )}
            <div className="mt-3 flex items-center justify-center gap-2 text-sm">
              <span className="font-mono text-pink-700 font-medium">{UPI_ID}</span>
              <button onClick={() => { navigator.clipboard.writeText(UPI_ID); toast({ title: "UPI ID copied!" }); }}>
                <Copy className="w-4 h-4 text-muted-foreground hover:text-pink-600 transition-colors" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Any amount helps! Even ₹10 makes a difference 🙏</p>
          </div>

          {/* Suggested amounts */}
          <div className="flex gap-2 mb-4">
            {["20", "50", "100", "200"].map(amt => (
              <button
                key={amt}
                onClick={() => setForm({ ...form, amount: amt })}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                  form.amount === amt ? "border-pink-400 bg-pink-50 text-pink-700" : "border-border text-muted-foreground hover:border-pink-200"
                }`}
              >
                ₹{amt}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <Label>Your Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Priya Sharma" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mobile</Label>
                <Input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="9999999999" className="mt-1" />
              </div>
              <div>
                <Label>Amount (₹)</Label>
                <Input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="50" type="number" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>UPI Transaction ID</Label>
              <Input value={form.upiTransactionId} onChange={e => setForm({ ...form, upiTransactionId: e.target.value })} placeholder="e.g. 407812345678" className="mt-1" />
            </div>

            <Button
              onClick={submitSupport}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white border-0 gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
              Submit Support
            </Button>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-pink-50 border border-pink-100">
            <h4 className="font-semibold text-pink-900 mb-2 text-sm">🙏 What your support does</h4>
            {["Keeps the app free for all Indian students", "Funds server & AI model costs", "Helps us add more features", "Supports 24/7 uptime for job seekers"].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-pink-800 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" /> {item}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
