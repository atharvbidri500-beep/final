import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { FileText, Mic, Mail, Crown, LogOut, Map, Target, ChevronRight, FilePen, Headset, Gauge, Handshake, PenLine, Languages, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { getToken, clearToken } from "@/lib/auth";
import { apiUrl } from "@/lib/api";
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

interface RecentResume {
  id: number;
  title: string;
  template: string;
  atsScore: number | null;
  createdAt: string | null;
}

const quickActions = [
  { href: "/resume-builder", icon: FilePen, label: "Build Resume", sub: "ATS-ready templates", color: "from-[#5B5CF6] to-[#8B5CF6]" },
  { href: "/interview", icon: Headset, label: "Mock Interview", sub: "AI practice sessions", color: "from-[#06B6D4] to-blue-600" },
  { href: "/resume-score", icon: Gauge, label: "Score Resume", sub: "ATS + skill analysis", color: "from-emerald-500 to-teal-600" },
  { href: "/job-match", icon: Handshake, label: "Job Match", sub: "Find skill gaps", color: "from-amber-500 to-orange-600" },
  { href: "/cover-letter", icon: PenLine, label: "Cover Letter", sub: "30-second letters", color: "from-pink-500 to-rose-600" },
  { href: "/english-tool", icon: Languages, label: "English Tool", sub: "Polish your English", color: "from-violet-500 to-purple-600" },
];

function SkeletonCard() {
  return <div className="p-4 rounded-2xl bg-muted animate-pulse h-20" />;
}

function PlacementScore({ user }: { user: UserStats }) {
  const score = Math.min(100, Math.round(
    (Math.min(user.resumeCount, 3) / 3) * 30 +
    (Math.min(user.interviewCount, 5) / 5) * 30 +
    (Math.min(user.coverLetterCount, 2) / 2) * 15 +
    (user.isPremium ? 15 : 0) +
    10
  ));

  const level = score >= 80 ? "Placement Ready" : score >= 60 ? "Almost Ready" : score >= 40 ? "In Progress" : "Just Started";
  const levelColor = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : score >= 40 ? "text-[#5B5CF6]" : "text-muted-foreground";
  const barColor = score >= 80 ? "from-emerald-500 to-teal-500" : score >= 60 ? "from-amber-400 to-yellow-500" : "from-[#5B5CF6] to-[#8B5CF6]";

  const suggestions = [
    ...(user.resumeCount === 0 ? ["Build your first resume →"] : []),
    ...(user.interviewCount < 3 ? ["Practice 3+ interview sessions →"] : []),
    ...(user.coverLetterCount === 0 ? ["Generate a cover letter →"] : []),
    ...(!user.isPremium ? ["Upgrade to Pro for full access →"] : []),
  ].slice(0, 2);

  return (
    <div className="p-5 rounded-2xl bg-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#5B5CF6]" />
          <span className="font-semibold">Placement Readiness</span>
        </div>
        <span className={`text-sm font-bold ${levelColor}`}>{level}</span>
      </div>

      {/* Score ring + bar */}
      <div className="flex items-center gap-4 mb-3">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
            <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke="url(#scoreGrad)" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - score / 100)}`}
              style={{ transition: "stroke-dashoffset 1.2s ease" }}
            />
            <defs>
              <linearGradient id="scoreGrad" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5B5CF6" /><stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center rotate-0">
            <span className="text-lg font-black text-foreground">{score}</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground mb-2">Score breakdown</div>
          {[
            { label: "Resume", val: Math.min(user.resumeCount, 3), max: 3, points: 30 },
            { label: "Interviews", val: Math.min(user.interviewCount, 5), max: 5, points: 30 },
            { label: "Cover Letters", val: Math.min(user.coverLetterCount, 2), max: 2, points: 15 },
          ].map(item => (
            <div key={item.label} className="mb-1.5">
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{Math.round((item.val / item.max) * item.points)}/{item.points} pts</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.val / item.max) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-[#5B5CF6] bg-violet-50 px-3 py-2 rounded-xl cursor-pointer hover:bg-violet-100 transition-colors">
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const token = getToken();
  const [user, setUser] = useState<UserStats | null>(null);
  const [recentResumes, setRecentResumes] = useState<RecentResume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(apiUrl("/api/users/me/dashboard"), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(d => {
        setUser(d);
        setRecentResumes(Array.isArray(d.recentResumes) ? d.recentResumes : []);
      })
      .catch(() => { /* don't clear token on network error */ })
      .finally(() => setLoading(false));
  }, [token]);

  function handleLogout() { clearToken(); navigate("/"); }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-28 px-4 max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              {loading ? (
                <><div className="h-7 w-40 bg-muted rounded-lg animate-pulse mb-2" /><div className="h-4 w-32 bg-muted rounded animate-pulse" /></>
              ) : (
                <><h1 className="text-2xl font-bold">Hey, {user?.name.split(" ")[0] ?? "there"} ✈️</h1><p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p></>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground -mt-1">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          {!loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-3">
              {user?.isPremium ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 text-amber-700 text-sm font-bold shadow-sm">
                  <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> HirePilot Pro
                  {user.premiumExpiresAt && <span className="text-amber-500 text-xs font-normal">· expires {new Date(user.premiumExpiresAt).toLocaleDateString("en-IN")}</span>}
                </div>
              ) : (
                <Link href="/premium">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-sm font-medium cursor-pointer hover:bg-violet-100 transition-colors">
                    <Crown className="w-3.5 h-3.5" /> Upgrade to Pro — from ₹149/month
                  </div>
                </Link>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Activity stats */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid grid-cols-3 gap-3 mb-5">
          {loading ? [1,2,3].map(i => <SkeletonCard key={i} />) : (
            [
              { label: "Resumes", value: user?.resumeCount ?? 0, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100", icon: FileText },
              { label: "Interviews", value: user?.interviewCount ?? 0, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100", icon: Mic },
              { label: "Cover Letters", value: user?.coverLetterCount ?? 0, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100", icon: Mail },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
                className={`p-4 rounded-2xl ${stat.bg} ${stat.border} border flex items-center gap-3`}>
                <div className={`w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                </div>
                <div>
                  <div className={`text-2xl font-black leading-none ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Placement Readiness */}
        {!loading && user && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-5">
            <PlacementScore user={user} />
          </motion.div>
        )}
        {loading && <div className="h-44 rounded-2xl bg-muted animate-pulse mb-5" />}

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-5">
          <h2 className="font-semibold text-sm mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action, i) => (
              <motion.div key={action.href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 + i * 0.04 }} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                <Link href={action.href}>
                  <div className="p-4 rounded-2xl bg-card border border-border hover:border-violet-200 hover:shadow-md transition-all cursor-pointer group">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="font-medium text-sm">{action.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{action.sub}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Resumes */}
        {!loading && recentResumes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-5">
            <h2 className="font-semibold text-sm mb-3">Recent Resumes</h2>
            <div className="space-y-2">
              {recentResumes.map(r => (
                <Link key={r.id} href="/resume-builder">
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-violet-200 hover:shadow-md transition-all cursor-pointer group">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{r.title || "My Resume"}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Recently"}
                      </div>
                    </div>
                    {r.atsScore != null && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${r.atsScore >= 80 ? "bg-emerald-50 text-emerald-600" : r.atsScore >= 60 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}>
                        {r.atsScore}%
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Career Roadmap CTA */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-4">
          <Link href="/career-roadmap">
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#06B6D4]/10 to-[#5B5CF6]/10 border border-[#06B6D4]/20 cursor-pointer hover:shadow-md transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#06B6D4] to-[#5B5CF6] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Map className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Career Roadmap</div>
                    <div className="text-xs text-muted-foreground">Get a personalized action plan for your degree</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#5B5CF6] group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Upgrade CTA for free users */}
        <AnimatePresence>
          {!loading && !user?.isPremium && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-4">
              <Link href="/premium">
                <div className="p-5 rounded-2xl bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white cursor-pointer hover:opacity-95 transition-opacity">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-base mb-1">Upgrade to HirePilot Pro</div>
                      <div className="text-violet-200 text-sm">Unlimited resumes, interviews & cover letters</div>
                      <div className="mt-2 text-xs font-semibold bg-white/20 inline-flex px-3 py-1 rounded-full">Starting ₹149/month · Pay via UPI</div>
                    </div>
                    <Crown className="w-10 h-10 text-yellow-300 fill-yellow-300 flex-shrink-0 ml-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
