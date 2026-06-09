import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Loader2, Copy, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ImproveResult {
  improvedText: string;
  corrections: string[];
  professionalTips: string[];
}

export default function EnglishTool() {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImproveResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function improve() {
    if (!text.trim()) { toast({ title: "Please enter some text", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/interview/improve-english", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function copy(content: string) {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied!" });
  }

  const EXAMPLES = [
    "I want to apply for the job. I am good in coding and also I have did internship.",
    "My name is Rohan and I am fresher. I am looking for job in IT company.",
    "I have experience in Java and also know about database. I worked in project last year.",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">English Improvement Tool</h1>
              <p className="text-sm text-muted-foreground">Polish your professional English instantly</p>
            </div>
          </div>

          {/* Examples */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Try an example:</p>
            <div className="space-y-2">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setText(ex)}
                  className="w-full text-left text-xs p-3 rounded-xl bg-muted hover:bg-muted/80 border border-border transition-colors line-clamp-1"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type or paste your English text here... (emails, resume sentences, interview answers, cover letter snippets)"
              className="h-36 resize-none"
            />
            <Button
              onClick={improve}
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Improve English
            </Button>
          </div>

          {result && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-4">
              {/* Improved text */}
              <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-violet-900 text-sm">✨ Improved Version</span>
                  <button onClick={() => copy(result.improvedText)} className="text-violet-600 hover:text-violet-800">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-violet-800 leading-relaxed">{result.improvedText}</p>
              </div>

              {/* Before vs After */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="text-xs font-semibold text-rose-700 mb-2">❌ Before</div>
                  <p className="text-xs text-rose-800 leading-relaxed">{text}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xs font-semibold text-emerald-700 mb-2">✅ After</div>
                  <p className="text-xs text-emerald-800 leading-relaxed">{result.improvedText}</p>
                </div>
              </div>

              {/* Corrections */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="font-semibold text-amber-900 text-sm mb-2">🔧 Corrections Made</div>
                {result.corrections.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-amber-800 mb-1">
                    <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" /> {c}
                  </div>
                ))}
              </div>

              {/* Tips */}
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
                <div className="font-semibold text-indigo-900 text-sm mb-2">💡 Professional English Tips</div>
                {result.professionalTips.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-indigo-800 mb-1.5">
                    <span className="text-indigo-500">•</span> {t}
                  </div>
                ))}
              </div>

              <Button variant="outline" onClick={() => { setResult(null); setText(""); }} className="w-full">
                Try Another Text
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
