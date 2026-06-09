import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { FileText, Mic, Star, Mail, Crown, LogOut, TrendingUp, Zap, Rocket, BarChart2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { getToken, clearToken } from "@/lib/auth";
import { useEffect, useState } from "react";

interface UserStats {
  name: string;
  email: string;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  resumeCount: number;
  interviewCount: number;
  coverLetterCount: number;
}

const quickActions = [
  { href: "/resume-builder", icon: FileText, label: "Build Resume", color: "from-[#5B5CF6] to-[#8B5CF6]", bg: "bg-violet-50" },
  { href: "/interview", icon: Mic, label: "Practice Interview", color: "from-[#06B6D4] to-blue-600", bg: "bg-cyan-50" },
  { href: "/resume-score", icon: Star, label: "Score Resume", color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50" },
  { href: "/cover-letter", icon: Mail, label: "Cover Letter", color: "from-pink-500 to-rose-600", bg: "bg-rose-50" },
  { href: "/job-match", icon: TrendingUp, label: "Job Match", color: "from-amber-500 to-orange-600", bg: "bg-amber-50" },
  { href: "/english-tool", icon: Zap, label: "English Tool", color: "from-violet-500 to-purple-600", bg: "bg-purple-50" },
];

function SkeletonCard() {
  return (
    <div className="p-4 rounded-2xl bg-card border border-border animate-pulse">
      <div className="h-3 w-16 bg-muted rounded mb-3" />
      <div className="h-7 w-10 bg-muted rounded" />
    </div>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const token = getToken();
  const [user, setUser] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(d => setUser(d))
      .catch(() => { clearToken(); navigate("/login"); })
      .finally(() => setLoading(false));
  }, [token]);

  function handleLogout() {
    clearToken();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              {loading ? (
                <>
                  <div className="h-7 w-40 bg-muted rounded-lg animate-pulse mb-2" />
                  <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold">
                    Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}! ✈️
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
                </>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground -mt-1">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Pro badge or upgrade prompt */}
          {!loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-3">
              {user?.isPremium ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 text-amber-700 text-sm font-semibold shadow-sm">
                  <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  HirePilot Pro
                  {user.premiumExpiresAt && (
                    <span className="text-amber-500 text-xs font-normal">
                      · expires {new Date(user.premiumExpiresAt).toLocaleDateString("en-IN")}
                    </span>
                  )}
                </div>
              ) : (
                <Link href="/premium">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-sm font-medium cursor-pointer hover:bg-violet-100 transition-colors">
                    <Rocket className="w-3.5 h-3.5" />
                    Upgrade to Pro — from ₹99/month
                  </div>
                </Link>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-6">
          {loading ? (
            [1,2,3].map(i => <SkeletonCard key={i} />)
          ) : (
            [
              { label: "Resumes", value: user?.resumeCount ?? 0, icon: FileText, color: "text-violet-600" },
              { label: "Interviews", value: user?.interviewCount ?? 0, icon: Mic, color: "text-cyan-600" },
              { label: "Cover Letters", value: user?.coverLetterCount ?? 0, icon: Mail, color: "text-rose-500" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="p-4 rounded-2xl bg-card border border-border text-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Quick Actions</h2>
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link href={action.href}>
                  <div className="p-4 rounded-2xl bg-card border border-border hover:border-violet-200 hover:shadow-md transition-all cursor-pointer group">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="font-medium text-sm">{action.label}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Upgrade CTA for free users */}
        {!loading && !user?.isPremium && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6">
            <Link href="/premium">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white cursor-pointer hover:opacity-95 transition-opacity">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-base mb-1">Upgrade to HirePilot Pro</div>
                    <div className="text-violet-200 text-sm">Unlimited resumes, interviews & cover letters</div>
                    <div className="mt-2 text-xs font-semibold bg-white/20 inline-flex px-3 py-1 rounded-full">Starting ₹99/month · Pay via UPI</div>
                  </div>
                  <Crown className="w-10 h-10 text-yellow-300 fill-yellow-300 flex-shrink-0 ml-4" />
                </div>
              </div>
            </Link>
          </motion.div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
