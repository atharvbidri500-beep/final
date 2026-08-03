import { Link, useLocation } from "wouter";
import { Home, FileText, Mic, LayoutDashboard, Crown, Map } from "lucide-react";
import { motion } from "framer-motion";
import { getToken } from "@/lib/auth";

export function BottomNav() {
  const [location] = useLocation();
  const token = getToken();

  const items = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/resume-builder", icon: FileText, label: "Resume" },
    { href: "/interview", icon: Mic, label: "Interview" },
    { href: "/career-roadmap", icon: Map, label: "Roadmap" },
    { href: "/premium-hub", icon: Crown, label: "Pro" },
  ];

  if (token) {
    items.push({ href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" });
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-xl">
      <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
        {items.map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileTap={{ scale: 0.88 }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                  active ? "text-[#5B5CF6]" : "text-muted-foreground"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-violet-100" : ""}`}>
                  <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
                </div>
                <span className={`text-[10px] font-medium ${active ? "text-[#5B5CF6]" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
