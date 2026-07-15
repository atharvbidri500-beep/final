import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { setToken, getToken } from "@/lib/auth";

function HirePilotLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5B5CF6"/>
          <stop offset="100%" stopColor="#8B5CF6"/>
        </linearGradient>
        <linearGradient id="larrow" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#06B6D4"/>
          <stop offset="100%" stopColor="#38BDF8"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#lbg)"/>
      <rect x="10" y="11" width="5" height="26" rx="2.5" fill="white"/>
      <rect x="33" y="11" width="5" height="26" rx="2.5" fill="white"/>
      <rect x="15" y="20.5" width="18" height="5" rx="2" fill="white" opacity="0.9"/>
      <path d="M24 19 L24 7 M20 11.5 L24 7 L28 11.5" stroke="url(#larrow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const existingToken = getToken();
  if (existingToken) {
    navigate("/dashboard");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setToken(data.token);
      toast({ title: "Welcome back! ✈️", description: `Logged in as ${data.user?.name ?? form.email}` });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-violet-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Link href="/">
          <div className="flex items-center justify-center gap-2.5 mb-8 cursor-pointer">
            <HirePilotLogo />
            <span className="font-bold text-xl tracking-tight">Hire<span className="text-[#5B5CF6]">Pilot</span></span>
          </div>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-violet-100/30">
          <h1 className="text-xl font-bold mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your HirePilot account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="mt-1"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 shadow-lg shadow-violet-200/50 gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : "Sign In"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-4">
            Don't have an account?{" "}
            <Link href="/register">
              <span className="text-[#5B5CF6] font-medium cursor-pointer hover:underline">Sign up free</span>
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
