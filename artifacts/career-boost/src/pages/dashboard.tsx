import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { FileText, Mic, Star, Mail, Zap, Crown, LogOut, Plus, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { getToken, clearToken } from "@/lib/auth";
import { useEffect, useState } from "react";

interface UserStats { name: string; email: string; isPremium: boolean; resumeCount: number; interviewCount: number; coverLetterCount: number; }

const quickActions = [
  { href: "/resume-builder", icon: FileText, label: "Build Resume", color: "from-indigo-500 to-violet-600" },
  { href: "/interview", icon: Mic, label: "Practice Interview", color: "from-cyan-500 to-blue-600" },
  { href: "/resume-score", icon: Star, label: "Score Resume", color: "from-emerald-500 to-teal-600" },
  { href: "/cover-letter", icon: Mail, label: "Cover Letter", color: "from-pink-500 to-rose-600" },
  { href: "/job-match", icon: TrendingUp, label: "Job Match", color: "from-amber-500 to-orange-600" },
  { href: "/english-tool", icon: Zap, label: "English Tool", color: "from-violet-500 to-purple-600" },
];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const token = getToken();
  const [user, setUser] = useState<UserStats | null>(null);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUser(d))
      .catch(() => {});
  }, [token]);

  function handleLogout() {
    clearToken();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}! 👋
              </h1>
              <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          {user?.isPremium ? (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
              <Crown className="w-3.5 h-3.5" /> Pro Member
            </div>
          ) : (
            <Link href="/premium">
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium cursor-pointer hover:bg-indigo-100 transition-colors">
                <Crown className="w-3.5 h-3.5" /> Upgrade to Pro — ₹149/month
              </div>
            </Link>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Resumes", value: user?.resumeCount ?? 0, icon: FileText, color: "text-indigo-600" },
            { label: "Interviews", value: user?.interviewCount ?? 0, icon: Mic, color: "text-cyan-600" },
            { label: "Cover Letters", value: user?.coverLetterCount ?? 0, icon: Mail, color: "text-pink-600" },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl p-4 text-center"
            >
              <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((a, i) => (
              <motion.div
                key={a.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link href={a.href}>
                  <div className="group flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <a.icon className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
                    </div>
                    <span className="font-medium text-sm">{a.label}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200"
        >
          <h3 className="font-semibold text-indigo-900 mb-2">💡 Today's Career Tip</h3>
          <p className="text-sm text-indigo-800 leading-relaxed">
            Use the STAR method (Situation, Task, Action, Result) when answering behavioral interview questions. It makes your answers structured and impressive!
          </p>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
