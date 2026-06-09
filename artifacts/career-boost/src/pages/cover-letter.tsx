import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, Copy, Download } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";

const EXP_LEVELS = ["fresher", "1-2 years", "3-5 years"];

export default function CoverLetter() {
  const { toast } = useToast();
  const token = getToken();
  const [form, setForm] = useState({ jobRole: "", companyName: "", experienceLevel: "fresher", additionalInfo: "" });
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const f = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value }),
  });

  async function generate() {
    if (!form.jobRole || !form.companyName) {
      toast({ title: "Job role and company name are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/cover-letters", {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.content);
      toast({ title: "Cover letter generated! ✉️" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(result);
    toast({ title: "Copied to clipboard!" });
  }

  function download() {
    if (!result) return;
    const blob = new Blob([result], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${form.companyName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Cover Letter Generator</h1>
              <p className="text-sm text-muted-foreground">Generate a professional cover letter in 30 seconds</p>
            </div>
          </div>

          <div className="space-y-4 mb-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Job Role</Label>
                <Input {...f("jobRole")} placeholder="Software Engineer" className="mt-1" />
              </div>
              <div>
                <Label>Company Name</Label>
                <Input {...f("companyName")} placeholder="Infosys" className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Experience Level</Label>
              <div className="flex gap-2 mt-1">
                {EXP_LEVELS.map(l => (
                  <button
                    key={l}
                    onClick={() => setForm({ ...form, experienceLevel: l })}
                    className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                      form.experienceLevel === l
                        ? "border-pink-400 bg-pink-50 text-pink-700"
                        : "border-border text-muted-foreground hover:border-pink-200"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Additional Info (optional)</Label>
              <Textarea
                {...f("additionalInfo")}
                placeholder="Any specific achievements, skills, or projects you want to highlight..."
                className="mt-1 h-24 resize-none"
              />
            </div>

            <Button
              onClick={generate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white border-0 gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Generate Cover Letter
            </Button>
          </div>

          {result && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="p-5 rounded-2xl bg-card border border-border mb-3">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{result}</pre>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={copyToClipboard} className="flex-1 gap-2">
                  <Copy className="w-4 h-4" /> Copy
                </Button>
                <Button variant="outline" onClick={download} className="flex-1 gap-2">
                  <Download className="w-4 h-4" /> Download
                </Button>
                <Button onClick={generate} disabled={loading} className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white border-0">
                  Regenerate
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
