import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { AuthGuard } from "@/components/AuthGuard";
import { UpgradeModal } from "@/components/UpgradeModal";
import { getToken } from "@/lib/auth";

export function PageShell({
  title,
  subtitle,
  icon,
  children,
  upgradeMsg,
  upgradeOpen,
  onUpgradeClose,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  upgradeMsg?: string;
  upgradeOpen?: boolean;
  onUpgradeClose?: () => void;
}) {
  return (
    <AuthGuard token={getToken()}>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 pb-28 px-4 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-4 mb-3">
              {icon && (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6] flex items-center justify-center text-white flex-shrink-0">
                  {icon}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
              </div>
            </div>
          </motion.div>
          <div className="space-y-4">{children}</div>
        </div>
        <BottomNav />
        <UpgradeModal open={!!upgradeOpen} onClose={onUpgradeClose ?? (() => {})} message={upgradeMsg} />
      </div>
    </AuthGuard>
  );
}
