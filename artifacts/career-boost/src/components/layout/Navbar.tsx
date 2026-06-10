import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User, Crown, Menu, X } from "lucide-react";
import { useState } from "react";
import { getToken, clearToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";

function HirePilotLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5B5CF6"/>
          <stop offset="100%" stopColor="#8B5CF6"/>
        </linearGradient>
        <linearGradient id="narrow" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#06B6D4"/>
          <stop offset="100%" stopColor="#38BDF8"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#nbg)"/>
      <rect x="10" y="11" width="5" height="26" rx="2.5" fill="white"/>
      <rect x="33" y="11" width="5" height="26" rx="2.5" fill="white"/>
      <rect x="15" y="20.5" width="18" height="5" rx="2" fill="white" opacity="0.9"/>
      <path d="M24 19 L24 7 M20 11.5 L24 7 L28 11.5" stroke="url(#narrow)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const navLinks = [
  { href: "/resume-builder", label: "Resume" },
  { href: "/interview", label: "Interview" },
  { href: "/cover-letter", label: "Cover Letter" },
  { href: "/english-tool", label: "English" },
  { href: "/resume-score", label: "Score" },
  { href: "/career-roadmap", label: "Roadmap" },
];

export function Navbar() {
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const token = getToken();

  function handleLogout() {
    clearToken();
    navigate("/");
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <HirePilotLogo size={34} />
            <span className="font-bold text-base text-foreground hidden sm:block tracking-tight">
              Hire<span className="text-[#5B5CF6]">Pilot</span>
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}>
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                location === l.href
                  ? "bg-violet-50 text-violet-700"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}>
                {l.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/premium">
            <Button size="sm" className="hidden sm:flex gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white border-0 shadow-md shadow-amber-200">
              <Crown className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Pro</span>
            </Button>
          </Link>

          {token ? (
            <div className="flex items-center gap-1">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-1.5 hidden sm:flex">
                  <User className="w-3.5 h-3.5" />
                  Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:flex">
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="hidden sm:flex gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0">
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-4 py-4 space-y-1"
          >
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href}>
                <div
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                    location === l.href ? "bg-violet-50 text-violet-700" : "text-foreground hover:bg-muted"
                  }`}
                >
                  {l.label}
                </div>
              </Link>
            ))}
            <div className="pt-2 border-t border-border flex gap-2">
              {token ? (
                <>
                  <Link href="/dashboard"><Button variant="outline" size="sm" className="flex-1" onClick={() => setOpen(false)}>Dashboard</Button></Link>
                  <Button variant="ghost" size="sm" onClick={() => { handleLogout(); setOpen(false); }}>Logout</Button>
                </>
              ) : (
                <>
                  <Link href="/login"><Button variant="outline" size="sm" className="flex-1" onClick={() => setOpen(false)}>Login</Button></Link>
                  <Link href="/register"><Button size="sm" className="flex-1 bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0" onClick={() => setOpen(false)}>Sign Up</Button></Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
