import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { setToken, getToken } from "@/lib/auth";
import GoogleIcon from "@/components/GoogleIcon";

function HirePilotLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5B5CF6"/>
          <stop offset="100%" stopColor="#8B5CF6"/>
        </linearGradient>
        <linearGradient id="rarrow" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#06B6D4"/>
          <stop offset="100%" stopColor="#38BDF8"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#rbg)"/>
      <rect x="10" y="11" width="5" height="26" rx="2.5" fill="white"/>
      <rect x="33" y="11" width="5" height="26" rx="2.5" fill="white"/>
      <rect x="15" y="20.5" width="18" height="5" rx="2" fill="white" opacity="0.9"/>
      <path d="M24 19 L24 7 M20 11.5 L24 7 L28 11.5" stroke="url(#rarrow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function validate(form: { name: string; email: string; password: string; mobile: string }) {
  if (!form.name.trim() || form.name.trim().length < 2) return "Enter your full name (min 2 characters)";
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Enter a valid email address";
  if (form.mobile && !/^[6-9]\d{9}$/.test(form.mobile.replace(/\s/g, ""))) return "Enter a valid 10-digit Indian mobile number";
  if (!form.password || form.password.length < 6) return "Password must be at least 6 characters";
  return null;
}

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "", mobile: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const existingToken = getToken();
  if (existingToken) {
    navigate("/");
    return null;
  }

  function getFieldError(field: string) {
    if (field === "email" && form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email";
    if (field === "mobile" && form.mobile && !/^[6-9]\d{9}$/.test(form.mobile.replace(/\s/g, ""))) return "Must be 10 digits starting with 6-9";
    if (field === "password" && form.password && form.password.length < 6) return "Min 6 characters";
    return errors[field] ?? "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(form);
    if (err) { toast({ title: "Validation Error", description: err, variant: "destructive" }); return; }

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          mobile: form.mobile.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.toLowerCase().includes("email")) setErrors({ email: "This email is already registered" });
        throw new Error(data.error || "Registration failed");
      }
      setToken(data.token);
      toast({ title: "Welcome to HirePilot! 🚀", description: "Your account has been created." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl" />
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
          <h1 className="text-xl font-bold mb-1">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-6">Your co-pilot to get hired starts here</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name <span className="text-rose-500">*</span></Label>
              <Input
                id="name"
                placeholder="Priya Sharma"
                className="mt-1"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email <span className="text-rose-500">*</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className={`mt-1 ${getFieldError("email") ? "border-rose-400" : ""}`}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
              {getFieldError("email") && <p className="text-xs text-rose-500 mt-1">{getFieldError("email")}</p>}
            </div>

            <div>
              <Label htmlFor="mobile">
                Mobile Number
                <span className="text-muted-foreground text-xs ml-1">(optional)</span>
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
                <Input
                  id="mobile"
                  placeholder="9999999999"
                  className={`pl-10 ${getFieldError("mobile") ? "border-rose-400" : ""}`}
                  value={form.mobile}
                  onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  inputMode="numeric"
                />
              </div>
              {getFieldError("mobile") && <p className="text-xs text-rose-500 mt-1">{getFieldError("mobile")}</p>}
              {form.mobile.length === 10 && /^[6-9]\d{9}$/.test(form.mobile) && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Valid number</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password <span className="text-rose-500">*</span></Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  className={getFieldError("password") ? "border-rose-400" : ""}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="flex gap-1 mt-1.5">
                  {[1,2,3].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                      form.password.length >= i * 3
                        ? i === 1 ? "bg-rose-400" : i === 2 ? "bg-amber-400" : "bg-emerald-500"
                        : "bg-muted"
                    }`} />
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 shadow-lg shadow-violet-200/50 gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
              ) : "Create Account — It's Free"}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <GoogleIcon />
            Sign up with Google
          </a>

          <p className="text-sm text-center text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/login"><span className="text-[#5B5CF6] font-medium cursor-pointer hover:underline">Sign in</span></Link>
          </p>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          By signing up, you agree to our terms. No spam, ever.
        </p>
      </motion.div>
    </div>
  );
}
