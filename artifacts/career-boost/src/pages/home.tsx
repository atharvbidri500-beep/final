import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { FileText, Mic, Target, Star, CheckCircle2, TrendingUp, ArrowRight, Sparkles, Crown, Rocket, Globe, ChevronDown } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

function HirePilotLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5B5CF6"/>
          <stop offset="100%" stopColor="#8B5CF6"/>
        </linearGradient>
        <linearGradient id="harrow" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#06B6D4"/>
          <stop offset="100%" stopColor="#38BDF8"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#hbg)"/>
      <rect x="10" y="11" width="5" height="26" rx="2.5" fill="white"/>
      <rect x="33" y="11" width="5" height="26" rx="2.5" fill="white"/>
      <rect x="15" y="20.5" width="18" height="5" rx="2" fill="white" opacity="0.9"/>
      <path d="M24 19 L24 7 M20 11.5 L24 7 L28 11.5" stroke="url(#harrow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const step = target / 60;
    let curr = 0;
    const timer = setInterval(() => {
      curr += step;
      if (curr >= target) { setCount(target); clearInterval(timer); return; }
      setCount(Math.floor(curr));
    }, 25);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString("en-IN")}{suffix}</>;
}

const features = [
  { icon: FileText, title: "AI Resume Builder", desc: "Build ATS-optimized resumes with Indian industry templates in minutes", color: "from-[#5B5CF6] to-[#8B5CF6]", href: "/resume-builder" },
  { icon: Mic, title: "Interview Coach", desc: "Practice with real interview questions for HR, Tech, Banking and more", color: "from-[#06B6D4] to-blue-600", href: "/interview" },
  { icon: Target, title: "Resume Score", desc: "Get ATS score, skill score and formatting feedback on your resume", color: "from-emerald-500 to-teal-600", href: "/resume-score" },
  { icon: TrendingUp, title: "Job Match AI", desc: "Match your resume against job descriptions and find skill gaps", color: "from-amber-500 to-orange-600", href: "/job-match" },
  { icon: Star, title: "Cover Letter", desc: "Generate personalized cover letters for any company in 30 seconds", color: "from-pink-500 to-rose-600", href: "/cover-letter" },
  { icon: Globe, title: "English Polish", desc: "Improve your professional English for emails, resumes and interviews", color: "from-violet-500 to-purple-600", href: "/english-tool" },
];

const testimonials = [
  { name: "Priya Sharma", role: "Fresher → SDE at TCS", text: "Got my dream offer at TCS after using HirePilot for just 2 weeks. The interview practice is absolutely outstanding!", avatar: "PS", company: "TCS" },
  { name: "Rohan Mehta", role: "BCA → MNC Job", text: "The ATS score feature helped me rewrite my resume properly. I got 3x more interview calls after that!", avatar: "RM", company: "Infosys" },
  { name: "Divya Nair", role: "MBA Fresher → HDFC Bank", text: "Banking interview prep was spot on. Got selected in my very first attempt at HDFC Bank!", avatar: "DN", company: "HDFC" },
  { name: "Arjun Patel", role: "0 → First IT Job", text: "Cover letter generator saved me hours. Got responses from 5 companies in the very first week!", avatar: "AP", company: "Wipro" },
  { name: "Sneha Reddy", role: "BBA → Sales Manager", text: "The English tool helped me write professional emails. My manager was genuinely impressed on day one!", avatar: "SR", company: "Amazon" },
  { name: "Karan Singh", role: "CS → Google India", text: "Best interview prep platform I've used. The software engineering questions are at exactly the right level.", avatar: "KS", company: "Google" },
];

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    features: ["5 resume exports", "10 interview questions", "Basic cover letter", "Resume score once", "English tool (5/day)"],
    cta: "Get Started Free",
    href: "/register",
    highlight: false,
  },
  {
    name: "Pro Monthly",
    price: "₹99",
    period: "per month",
    features: ["Unlimited resumes", "Unlimited interviews", "Unlimited cover letters", "Full ATS analysis", "Job match AI", "Priority support"],
    cta: "Go Pro Now",
    href: "/premium",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Pro Yearly",
    price: "₹499",
    period: "per year",
    features: ["Everything in Pro", "Save ₹689 vs monthly", "Early access features", "Premium templates", "1-on-1 career tips", "Lifetime updates"],
    cta: "Best Value",
    href: "/premium",
    highlight: false,
    badge: "Save 58%",
  },
];

const faqs = [
  { q: "Is HirePilot free to use?", a: "Yes! Our free plan gives you access to all core features with usage limits. Upgrade to Pro for unlimited access starting at just ₹99/month." },
  { q: "How does UPI payment work?", a: "Scan our UPI QR code, pay, and enter your UPI transaction ID. Our admin verifies and activates your Pro account within 1-2 hours." },
  { q: "Is my data secure?", a: "Yes, all your resume and personal data is encrypted and stored securely. We never share your data with third parties." },
  { q: "Which interview categories are available?", a: "We cover HR, Software Engineering, Sales, Customer Support, Banking, and Fresher-specific questions — 100+ questions in each category." },
  { q: "Can freshers use HirePilot?", a: "Absolutely! HirePilot is built specifically for Indian freshers, students, and professionals with 0-5 years experience." },
  { q: "How quickly will my Pro access activate?", a: "Typically within 1-2 hours after you submit your UPI transaction ID. Admin verifies each payment personally." },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-[#5B5CF6]/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-cyan-500/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <HirePilotLogo size={48} />
            <div className="text-left">
              <div className="font-black text-2xl tracking-tight">Hire<span className="text-[#5B5CF6]">Pilot</span></div>
              <div className="text-xs text-muted-foreground">Your Co-Pilot to Get Hired</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4" />
            India's #1 AI Career Platform for Freshers
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6"
          >
            Land Your{" "}
            <span className="bg-gradient-to-r from-[#5B5CF6] via-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">
              Dream Job
            </span>{" "}
            with AI
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            Build ATS-ready resumes, practice interviews, generate cover letters, and boost your English — all in one app. Built for Indian students & freshers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 shadow-lg shadow-violet-200 gap-2 text-base px-8">
                Start for Free
                <Rocket className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/resume-builder">
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 text-base px-8">
                <FileText className="w-4 h-4" />
                Build Resume Now
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-3xl mx-auto mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { label: "Resumes Created", value: 12847, suffix: "+" },
            { label: "Interviews Practiced", value: 8923, suffix: "+" },
            { label: "Students Placed", value: 5234, suffix: "+" },
            { label: "Success Rate", value: 94, suffix: "%" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-4 rounded-2xl bg-card border border-border shadow-sm">
              <div className="text-2xl font-bold bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] bg-clip-text text-transparent">
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything You Need to Get Hired</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">From resume building to interview prep — all tools in one place, built for the Indian job market</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link href={f.href}>
                  <div className="group p-5 rounded-2xl bg-card border border-border hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100/50 transition-all cursor-pointer h-full">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <f.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Real Success Stories</h2>
            <p className="text-muted-foreground">Thousands of Indian students got placed using HirePilot</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="p-5 rounded-2xl bg-card border border-border hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-violet-600 font-medium">{t.role}</div>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Simple, Affordable Pricing</h2>
            <p className="text-muted-foreground">Pay via UPI — no credit card needed. Admin verifies manually within 1-2 hours.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`p-6 rounded-2xl border relative overflow-hidden ${plan.highlight ? "border-violet-400 bg-gradient-to-b from-violet-50 to-white shadow-xl shadow-violet-100" : "border-border bg-card"}`}
              >
                {(plan as any).badge && (
                  <div className={`text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1 mb-3 ${plan.highlight ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}`}>
                    <Crown className="w-3 h-3" /> {(plan as any).badge}
                  </div>
                )}
                <div className="text-lg font-bold mb-1">{plan.name}</div>
                <div className="text-3xl font-black mb-0.5">{plan.price}</div>
                <div className="text-sm text-muted-foreground mb-5">{plan.period}</div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}>
                  <Button className={`w-full ${plan.highlight ? "bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 shadow-md" : ""}`} variant={plan.highlight ? "default" : "outline"}>
                    {plan.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="border border-border rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between font-medium hover:bg-muted/30 transition-colors"
                >
                  {faq.q}
                  <ChevronDown className={`w-4 h-4 text-violet-500 transition-transform flex-shrink-0 ml-3 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border/50 pt-3">{faq.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6]">
        <div className="max-w-3xl mx-auto text-center text-white">
          <div className="flex justify-center mb-4">
            <HirePilotLogo size={52} />
          </div>
          <h2 className="text-3xl font-bold mb-4">Start Your Career Journey Today</h2>
          <p className="text-violet-200 mb-8">Join 5,000+ Indian students & freshers who landed jobs with HirePilot</p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-violet-700 hover:bg-violet-50 border-0 font-bold px-8 gap-2 shadow-xl">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <HirePilotLogo size={24} />
          <span className="font-bold text-sm">HirePilot</span>
        </div>
        <p className="text-xs text-muted-foreground mb-1">Your Co-Pilot to Get Hired</p>
        <p className="text-xs text-muted-foreground mb-3">Built with ❤️ for Indian students & freshers</p>
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/support"><span className="hover:text-foreground cursor-pointer">Support</span></Link>
          <Link href="/premium"><span className="hover:text-foreground cursor-pointer">Pricing</span></Link>
          <Link href="/admin"><span className="hover:text-foreground cursor-pointer">Admin</span></Link>
        </div>
      </footer>

      <BottomNav />
      <div className="h-16 md:hidden" />
    </div>
  );
}
