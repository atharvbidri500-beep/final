import { useLocation } from "wouter";
import { Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
  token: string | null;
  featureName?: string;
}

export function AuthGuard({ children, token, featureName = "this feature" }: Props) {
  const [, navigate] = useLocation();

  if (!token) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 px-6 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6] flex items-center justify-center mb-5 shadow-lg shadow-violet-200">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-2">Login Required</h2>
        <p className="text-muted-foreground text-sm max-w-xs mb-6">
          You need to create a free account to use {featureName}. Join thousands of students already using HirePilot!
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate("/login")}
            variant="outline"
            className="gap-2"
          >
            <LogIn className="w-4 h-4" />
            Login
          </Button>
          <Button
            onClick={() => navigate("/register")}
            className="bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2"
          >
            Create Free Account
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Free account · No credit card · 100% secure
        </p>
      </motion.div>
    );
  }

  return <>{children}</>;
}
