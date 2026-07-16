import { motion, AnimatePresence } from "framer-motion";
import { Crown, X, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface Props {
  open: boolean;
  onClose: () => void;
  message?: string;
}

export function UpgradeModal({ open, onClose, message }: Props) {
  const [, navigate] = useLocation();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm"
          >
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Top gradient banner */}
              <div className="bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] p-6 text-white text-center relative">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <Crown className="w-7 h-7 fill-yellow-300 text-yellow-300" />
                </div>
                <h2 className="text-xl font-black">You've Hit Your Free Limit</h2>
                <p className="text-white/80 text-sm mt-1">Upgrade to Pro to keep going</p>
              </div>

              <div className="p-5 space-y-4">
                {/* Message */}
                <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
                  <p className="text-sm text-violet-800 text-center leading-relaxed">
                    {message ?? "You've used all your free credits for this feature today."}
                  </p>
                </div>

                {/* Benefits */}
                <div className="space-y-2">
                  {[
                    "Unlimited interview practice sessions",
                    "Unlimited cover letters every month",
                    "Unlimited resume saves & downloads",
                    "AI-powered feedback & scoring",
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span className="text-gray-700">{b}</span>
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
                    <div className="text-lg font-black text-[#5B5CF6]">₹99</div>
                    <div className="text-xs text-gray-500">/ month</div>
                  </div>
                  <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-center relative">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">BEST VALUE</div>
                    <div className="text-lg font-black text-[#5B5CF6]">₹499</div>
                    <div className="text-xs text-gray-500">/ year</div>
                  </div>
                </div>

                {/* CTA */}
                <Button
                  onClick={() => { onClose(); navigate("/premium"); }}
                  className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 h-11 font-bold gap-2 shadow-lg shadow-violet-200"
                >
                  <Crown className="w-4 h-4 fill-white" />
                  Upgrade to Pro — Pay via UPI
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <button onClick={onClose} className="w-full text-xs text-center text-gray-400 hover:text-gray-600 py-1">
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
