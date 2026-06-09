import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Loader2, Sparkles, ChevronRight, Check } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";

const TEMPLATES = [
  { id: "professional", label: "Professional", desc: "Clean & ATS-ready" },
  { id: "modern", label: "Modern", desc: "Creative & bold" },
  { id: "minimal", label: "Minimal", desc: "Simple & elegant" },
];

const STEPS = ["Basic Info", "Education", "Skills & Work", "Preview"];

export default function ResumeBuilder() {
  const { toast } = useToast();
  const token = getToken();
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState("professional");
  const [form, setForm] = useState({
    title: "", fullName: "", email: "", mobile: "", city: "",
    education: "", college: "",
    skills: "", workExperience: "", projects: "", certifications: "", languages: "",
  });
  const [result, setResult] = useState<null | { generatedContent: string; atsScore: number }>(null);
  const [saving, setSaving] = useState(false);

  const f = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value }),
  });

  async function handleBuild() {
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...form, template }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to build resume");
      setResult({ generatedContent: data.generatedContent, atsScore: data.atsScore });
      setStep(3);
      toast({ title: "Resume built! 🎉 ATS Score: " + data.atsScore + "%" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function downloadResume() {
    if (!result) return;
    const blob = new Blob([result.generatedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.fullName || "resume"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Resume downloaded!" });
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Resume Builder</h1>
              <p className="text-sm text-muted-foreground">Build an ATS-optimized resume in minutes</p>
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                  i < step ? "bg-indigo-500 text-white" : i === step ? "bg-indigo-500 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 w-8 ${i < step ? "bg-indigo-400" : "bg-muted"}`} />}
              </div>
            ))}
            <span className="ml-2 text-sm font-medium text-muted-foreground">{STEPS[step]}</span>
          </div>

          {/* Step 0: Basic Info */}
          {step === 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div>
                <Label>Resume Title (for your reference)</Label>
                <Input {...f("title")} placeholder="e.g. Software Developer Resume" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full Name</Label>
                  <Input {...f("fullName")} placeholder="Priya Sharma" className="mt-1" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input {...f("city")} placeholder="Bangalore" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email</Label>
                  <Input {...f("email")} type="email" placeholder="priya@gmail.com" className="mt-1" />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input {...f("mobile")} placeholder="9999999999" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Template</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${template === t.id ? "border-indigo-500 bg-indigo-50" : "border-border hover:border-indigo-200"}`}
                    >
                      <div className="font-medium text-sm">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={() => setStep(1)} className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0 gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 1: Education */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div>
                <Label>College / University</Label>
                <Input {...f("college")} placeholder="e.g. VIT Pune" className="mt-1" />
              </div>
              <div>
                <Label>Education Details</Label>
                <Textarea {...f("education")} placeholder="B.Tech CSE (2024) — 8.5 CGPA&#10;12th — 85% | 10th — 90%" className="mt-1 h-28" />
              </div>
              <div>
                <Label>Languages Known</Label>
                <Input {...f("languages")} placeholder="English, Hindi, Marathi" className="mt-1" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(2)} className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0 gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Skills & Work */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div>
                <Label>Skills</Label>
                <Textarea {...f("skills")} placeholder="JavaScript, React, Python, SQL, Git, Communication, Problem Solving..." className="mt-1 h-20" />
              </div>
              <div>
                <Label>Work Experience (optional)</Label>
                <Textarea {...f("workExperience")} placeholder="Software Intern at XYZ Corp (June 2023 - Aug 2023)&#10;• Built REST APIs using Node.js" className="mt-1 h-24" />
              </div>
              <div>
                <Label>Projects</Label>
                <Textarea {...f("projects")} placeholder="E-commerce Website: Developed using React & Node.js with payment integration" className="mt-1 h-24" />
              </div>
              <div>
                <Label>Certifications</Label>
                <Input {...f("certifications")} placeholder="AWS Certified, Google Analytics, HackerRank Python" className="mt-1" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button
                  onClick={handleBuild}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0 gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Build Resume
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && result && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="text-3xl font-bold text-emerald-600">{result.atsScore}%</div>
                <div>
                  <div className="font-semibold text-emerald-900">ATS Score</div>
                  <div className="text-sm text-emerald-700">
                    {result.atsScore >= 80 ? "Excellent! Recruiters will love this." : result.atsScore >= 60 ? "Good. A few improvements needed." : "Add more details for a better score."}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold mb-3 text-sm">Resume Preview</h3>
                <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground leading-relaxed max-h-80 overflow-y-auto">
                  {result.generatedContent}
                </pre>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Edit</Button>
                <Button onClick={downloadResume} className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0 gap-2">
                  <Download className="w-4 h-4" />
                  Download
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
