import { motion } from "framer-motion";
import { Crown, Compass, Brain, Briefcase, Scissors, Mic, BarChart3, Map, FolderKanban, Linkedin, HandCoins, CalendarCheck, Bot, Trophy, Radar } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Link } from "wouter";

const MODULES = [
  { href: "/job-intelligence", icon: Radar, title: "AI Job Intelligence", desc: "Jobs matched to your real growth", color: "from-[#5B5CF6] to-[#8B5CF6]" },
  { href: "/copilot", icon: Compass, title: "Career Copilot", desc: "Score, XP, goals & daily recommendations", color: "from-[#5B5CF6] to-[#8B5CF6]" },
  { href: "/resume-intelligence", icon: Brain, title: "Resume Intelligence", desc: "Deep ATS scan, versions & compare", color: "from-violet-500 to-purple-600" },
  { href: "/job-match", icon: Briefcase, title: "Job Match & CRM", desc: "Matched jobs, applications & follow-ups", color: "from-emerald-500 to-teal-600" },
  { href: "/resume-tailoring", icon: Scissors, title: "Resume Tailoring", desc: "Rewrite your resume for each job", color: "from-rose-500 to-pink-600" },
  { href: "/interview-coach", icon: Mic, title: "Interview Coach", desc: "AI feedback, speech metrics & roadmap", color: "from-cyan-500 to-blue-600" },
  { href: "/career-analytics", icon: BarChart3, title: "Career Analytics", desc: "Trends, funnel & ATS history", color: "from-amber-500 to-orange-600" },
  { href: "/roadmap-planner", icon: Map, title: "Career Roadmap", desc: "AI 24-month plan with milestones", color: "from-indigo-500 to-violet-600" },
  { href: "/portfolio-builder", icon: FolderKanban, title: "Portfolio Builder", desc: "Your public portfolio page", color: "from-fuchsia-500 to-pink-600" },
  { href: "/linkedin-optimizer", icon: Linkedin, title: "LinkedIn Optimizer", desc: "Headline, about & content ideas", color: "from-sky-500 to-blue-700" },
  { href: "/salary-negotiation", icon: HandCoins, title: "Salary Negotiation", desc: "Benchmark, counter & email scripts", color: "from-yellow-500 to-amber-600" },
  { href: "/weekly-report", icon: CalendarCheck, title: "Weekly Report", desc: "Your week summarized + emailed", color: "from-lime-500 to-green-600" },
  { href: "/assistant", icon: Bot, title: "AI Assistant", desc: "Context-aware career chat", color: "from-[#5B5CF6] to-cyan-500" },
];

export default function PremiumHub() {
  return (
    <PageShell title="Premium Hub" subtitle="All your career superpowers in one place" icon={<Crown className="w-6 h-6" />}>
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-white flex items-center justify-between">
        <div>
          <div className="font-bold flex items-center gap-2"><Trophy className="w-4 h-4" /> Pro features unlocked</div>
          <div className="text-xs text-amber-50 mt-0.5">Every module is real, backed by AI + your data</div>
        </div>
        <Link href="/premium"><span className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full">Manage</span></Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULES.map((m, i) => (
          <motion.div key={m.href} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Link href={m.href}>
              <div className="p-4 rounded-2xl border border-border bg-card hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100 transition-all h-full cursor-pointer group">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.color} text-white flex items-center justify-center mb-3`}>
                  <m.icon className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm group-hover:text-[#5B5CF6] transition-colors">{m.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{m.desc}</div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </PageShell>
  );
}
