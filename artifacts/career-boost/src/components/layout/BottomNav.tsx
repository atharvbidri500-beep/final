import { Link, useLocation } from "wouter";
import { Home, FileText, Mic, LayoutDashboard, Crown } from "lucide-react";
import { motion } from "framer-motion";

const items = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/resume-builder", icon: FileText, label: "Resume" },
  { href: "/interview", icon: Mic, label: "Interview" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/premium", icon: Crown, label: "Pro" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-xl">
      <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
        {items.map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                  active ? "text-indigo-600" : "text-muted-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-indigo-100" : ""}`}>
                  <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
                </div>
                <span className={`text-[10px] font-medium ${active ? "text-indigo-600" : "text-muted-foreground"}`}>
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
