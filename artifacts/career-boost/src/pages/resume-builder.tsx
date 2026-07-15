import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, Loader2, Sparkles, ChevronRight, Check, Wand2, Printer, Eye } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";

/* ─── TEMPLATE CATALOGUE ───────────────────────────────────────────────────── */

interface TemplateConfig {
  id: string;
  name: string;
  category: string;
  keywords: string[];
  headerBg: string;
  headerText: string;
  accent: string;
  accentText: string;
  sidebarBg?: string;
  layout: "classic" | "sidebar" | "modern" | "minimal" | "bold";
  tag: string;
}

const TEMPLATES: TemplateConfig[] = [
  // ── Tech / Software ──────────────────────────────────────────────────────
  { id:"t1",  name:"Tech Classic",     category:"Software",  keywords:["developer","engineer","software","coding","programmer","tech","it","java","python","react","node"],   headerBg:"#1e1b4b", headerText:"#fff", accent:"#818cf8", accentText:"#1e1b4b", layout:"classic", tag:"💻" },
  { id:"t2",  name:"Dev Sidebar",      category:"Software",  keywords:["developer","software","frontend","backend","fullstack","web","javascript","typescript"],               headerBg:"#0f172a", headerText:"#7dd3fc", accent:"#06b6d4", accentText:"#fff", sidebarBg:"#0f172a", layout:"sidebar", tag:"⚙️" },
  { id:"t3",  name:"Code Blue",        category:"Software",  keywords:["software","engineer","developer","devops","cloud","aws","azure"],                                      headerBg:"#1d4ed8", headerText:"#fff", accent:"#3b82f6", accentText:"#fff", layout:"modern", tag:"🔵" },
  { id:"t4",  name:"Silicon Dark",     category:"Software",  keywords:["data","ml","ai","machine learning","data scientist","analyst"],                                        headerBg:"#111827", headerText:"#f9fafb", accent:"#10b981", accentText:"#fff", sidebarBg:"#111827", layout:"sidebar", tag:"🤖" },
  { id:"t5",  name:"Startup Purple",   category:"Software",  keywords:["startup","product","mobile","app","ios","android","flutter"],                                          headerBg:"#5b21b6", headerText:"#fff", accent:"#7c3aed", accentText:"#fff", layout:"modern", tag:"🚀" },
  { id:"t6",  name:"Dev Minimal",      category:"Software",  keywords:["junior","senior","architect","lead","principal","staff"],                                              headerBg:"#f8fafc", headerText:"#0f172a", accent:"#6366f1", accentText:"#fff", layout:"minimal", tag:"🎯" },
  { id:"t7",  name:"Cyber Green",      category:"Software",  keywords:["security","cybersecurity","network","infrastructure","sysadmin","linux"],                              headerBg:"#052e16", headerText:"#4ade80", accent:"#16a34a", accentText:"#fff", sidebarBg:"#14532d", layout:"sidebar", tag:"🔒" },
  { id:"t8",  name:"QA Pro",           category:"Software",  keywords:["qa","quality","testing","automation","selenium","performance"],                                        headerBg:"#0369a1", headerText:"#fff", accent:"#0ea5e9", accentText:"#fff", layout:"classic", tag:"🧪" },
  // ── Business / MBA ────────────────────────────────────────────────────────
  { id:"t9",  name:"Corporate Navy",   category:"Business",  keywords:["mba","manager","management","business","operations","strategy","director","vp"],                      headerBg:"#1e3a5f", headerText:"#fff", accent:"#2563eb", accentText:"#fff", layout:"classic", tag:"💼" },
  { id:"t10", name:"Executive Gold",   category:"Business",  keywords:["executive","ceo","cto","cfo","vp","director","head","chief"],                                          headerBg:"#1c1917", headerText:"#fbbf24", accent:"#f59e0b", accentText:"#1c1917", layout:"bold", tag:"⭐" },
  { id:"t11", name:"Consultant Clean", category:"Business",  keywords:["consultant","advisory","strategy","mckinsey","deloitte","kpmg","pwc"],                                 headerBg:"#374151", headerText:"#fff", accent:"#6b7280", accentText:"#fff", layout:"modern", tag:"📋" },
  { id:"t12", name:"MBA Prestige",     category:"Business",  keywords:["mba","pgdm","b-school","iim","xlri","management trainee"],                                             headerBg:"#7c2d12", headerText:"#fef3c7", accent:"#ea580c", accentText:"#fff", layout:"sidebar", tag:"🎓" },
  { id:"t13", name:"Ops Professional", category:"Business",  keywords:["operations","supply chain","logistics","procurement","scm","warehouse"],                               headerBg:"#134e4a", headerText:"#fff", accent:"#0d9488", accentText:"#fff", layout:"classic", tag:"📦" },
  // ── Finance / Banking ─────────────────────────────────────────────────────
  { id:"t14", name:"Banking Classic",  category:"Finance",   keywords:["bank","banking","finance","ca","cma","cpa","audit","tax","accounts","accountant","tally"],             headerBg:"#0c1b33", headerText:"#fff", accent:"#3b82f6", accentText:"#fff", layout:"classic", tag:"🏦" },
  { id:"t15", name:"Finance Formal",   category:"Finance",   keywords:["equity","investment","portfolio","wealth","nse","bse","ipo","nism","cfa"],                             headerBg:"#1e3a5f", headerText:"#e0e7ff", accent:"#64748b", accentText:"#fff", layout:"minimal", tag:"📈" },
  { id:"t16", name:"CA Minimal",       category:"Finance",   keywords:["chartered","ca","icai","cost accountant","icmai","tally","gst"],                                       headerBg:"#fff",    headerText:"#0f172a", accent:"#1e40af", accentText:"#fff", layout:"minimal", tag:"💰" },
  // ── HR / Admin ────────────────────────────────────────────────────────────
  { id:"t17", name:"HR Elegant",       category:"HR",        keywords:["hr","human resources","recruitment","talent","people","payroll","hris","compensation"],                headerBg:"#be185d", headerText:"#fff", accent:"#db2777", accentText:"#fff", layout:"modern", tag:"👥" },
  { id:"t18", name:"Admin Clean",      category:"HR",        keywords:["admin","administration","secretary","executive assistant","office","coordinator"],                     headerBg:"#4338ca", headerText:"#fff", accent:"#6366f1", accentText:"#fff", layout:"classic", tag:"🗂️" },
  // ── Sales / Marketing ─────────────────────────────────────────────────────
  { id:"t19", name:"Sales Vibrant",    category:"Marketing", keywords:["sales","business development","bde","bda","account manager","target","revenue","client"],              headerBg:"#f97316", headerText:"#fff", accent:"#ea580c", accentText:"#fff", layout:"bold", tag:"📣" },
  { id:"t20", name:"Digital Marketing",category:"Marketing", keywords:["marketing","digital","seo","sem","social media","content","brand","growth","performance"],             headerBg:"#7c3aed", headerText:"#fff", accent:"#8b5cf6", accentText:"#fff", layout:"modern", tag:"📱" },
  { id:"t21", name:"Creative Bold",    category:"Creative",  keywords:["creative","design","ui","ux","graphic","illustration","figma","adobe","art"],                          headerBg:"#0f172a", headerText:"#f472b6", accent:"#ec4899", accentText:"#0f172a", sidebarBg:"#1e1b4b", layout:"sidebar", tag:"🎨" },
  // ── Healthcare / Teaching ─────────────────────────────────────────────────
  { id:"t22", name:"Medical Clean",    category:"Healthcare",keywords:["doctor","nurse","medical","pharmacy","mbbs","bds","health","hospital","clinical"],                     headerBg:"#0e7490", headerText:"#fff", accent:"#0891b2", accentText:"#fff", layout:"classic", tag:"⚕️" },
  { id:"t23", name:"Teacher Blue",     category:"Education", keywords:["teacher","professor","lecturer","tutor","education","school","training","instructor"],                 headerBg:"#1d4ed8", headerText:"#fff", accent:"#60a5fa", accentText:"#1d4ed8", layout:"classic", tag:"📚" },
  // ── Fresher / Student ─────────────────────────────────────────────────────
  { id:"t24", name:"Fresher Modern",   category:"Fresher",   keywords:["fresher","graduate","student","btech","bca","bba","bcom","mca"],                                       headerBg:"#5b5cf6", headerText:"#fff", accent:"#8b5cf6", accentText:"#fff", layout:"modern", tag:"🎓" },
  { id:"t25", name:"Campus Ready",     category:"Fresher",   keywords:["campus","placement","college","internship","trainee","entry level","0 experience"],                   headerBg:"#047857", headerText:"#fff", accent:"#10b981", accentText:"#fff", layout:"classic", tag:"🌱" },
  { id:"t26", name:"Fresher Minimal",  category:"Fresher",   keywords:["diploma","iti","polytechnic","vocational"],                                                            headerBg:"#f1f5f9", headerText:"#0f172a", accent:"#64748b", accentText:"#fff", layout:"minimal", tag:"📄" },
  { id:"t27", name:"Student Violet",   category:"Fresher",   keywords:["bba","commerce","arts","humanities","ba","bsc"],                                                       headerBg:"#4f46e5", headerText:"#fff", accent:"#6366f1", accentText:"#fff", layout:"sidebar", tag:"📝" },
  // ── Customer Support / BPO ────────────────────────────────────────────────
  { id:"t28", name:"Support Pro",      category:"BPO",       keywords:["customer support","bpo","call center","customer service","chat support","helpdesk"],                  headerBg:"#0f766e", headerText:"#fff", accent:"#14b8a6", accentText:"#fff", layout:"classic", tag:"🎧" },
];

const STEPS = ["Job Role", "Basic Info", "Education", "Skills & Work", "Preview"];

/* ─── AUTO-SELECT TEMPLATE ─────────────────────────────────────────────────── */
function autoSelectTemplate(title: string, skills: string): TemplateConfig {
  const text = (title + " " + skills).toLowerCase();
  let best = TEMPLATES[23]; // default: Fresher Modern
  let bestScore = 0;
  for (const t of TEMPLATES) {
    const score = t.keywords.filter(k => text.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

/* ─── LIVE RESUME RENDERER ─────────────────────────────────────────────────── */
interface FormData {
  jobRole: string; fullName: string; email: string; mobile: string; city: string;
  education: string; college: string; skills: string;
  workExperience: string; projects: string; certifications: string; languages: string;
}

function ResumePreview({ form, tmpl }: { form: FormData; tmpl: TemplateConfig }) {
  const skills = form.skills.split(/[,，\n]/).map(s => s.trim()).filter(Boolean);
  const certs = form.certifications ? form.certifications.split(/[,，\n]/).map(s => s.trim()).filter(Boolean) : [];
  const langs = form.languages ? form.languages.split(/[,，\n]/).map(s => s.trim()).filter(Boolean) : [];

  const name = form.fullName || "Your Name";
  const role = form.jobRole || "Software Developer";

  const sectionHead = (title: string) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: tmpl.accent, borderBottom: `2px solid ${tmpl.accent}`, paddingBottom: 3, marginBottom: 4 }}>{title}</div>
    </div>
  );

  const contact = [form.email, form.mobile ? `+91 ${form.mobile}` : null, form.city].filter(Boolean).join("  •  ");

  /* ── SIDEBAR LAYOUT ── */
  if (tmpl.layout === "sidebar") {
    return (
      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, display: "flex", minHeight: 700, background: "#fff", width: "100%" }}>
        {/* Sidebar */}
        <div style={{ width: "34%", background: tmpl.sidebarBg || tmpl.headerBg, color: "#fff", padding: "28px 14px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: tmpl.headerText, lineHeight: 1.2 }}>{name}</div>
            <div style={{ fontSize: 10, color: tmpl.accent, marginTop: 4, fontWeight: 600 }}>{role}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: tmpl.accent, borderBottom: `1px solid ${tmpl.accent}`, paddingBottom: 3, marginBottom: 6 }}>Contact</div>
            {form.email && <div style={{ fontSize: 9, color: "#e2e8f0", marginBottom: 3 }}>✉ {form.email}</div>}
            {form.mobile && <div style={{ fontSize: 9, color: "#e2e8f0", marginBottom: 3 }}>📱 +91 {form.mobile}</div>}
            {form.city && <div style={{ fontSize: 9, color: "#e2e8f0", marginBottom: 3 }}>📍 {form.city}</div>}
          </div>
          {skills.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: tmpl.accent, borderBottom: `1px solid ${tmpl.accent}`, paddingBottom: 3, marginBottom: 6 }}>Skills</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {skills.map((s, i) => <span key={i} style={{ fontSize: 8.5, background: `${tmpl.accent}22`, color: tmpl.accent, border: `1px solid ${tmpl.accent}44`, padding: "2px 6px", borderRadius: 3, fontWeight: 600 }}>{s}</span>)}
              </div>
            </div>
          )}
          {langs.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: tmpl.accent, borderBottom: `1px solid ${tmpl.accent}`, paddingBottom: 3, marginBottom: 6 }}>Languages</div>
              {langs.map((l, i) => <div key={i} style={{ fontSize: 9, color: "#e2e8f0", marginBottom: 2 }}>• {l}</div>)}
            </div>
          )}
          {certs.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: tmpl.accent, borderBottom: `1px solid ${tmpl.accent}`, paddingBottom: 3, marginBottom: 6 }}>Certifications</div>
              {certs.map((c, i) => <div key={i} style={{ fontSize: 9, color: "#e2e8f0", marginBottom: 2 }}>• {c}</div>)}
            </div>
          )}
        </div>
        {/* Main content */}
        <div style={{ flex: 1, padding: "24px 18px", background: "#fff" }}>
          {form.education || form.college ? (
            <div style={{ marginBottom: 14 }}>
              {sectionHead("Education")}
              {form.college && <div style={{ fontWeight: 700, fontSize: 11, color: "#111827" }}>{form.college}</div>}
              {form.education && <div style={{ fontSize: 10, color: "#4b5563", whiteSpace: "pre-line", marginTop: 2 }}>{form.education}</div>}
            </div>
          ) : null}
          {form.workExperience && (
            <div style={{ marginBottom: 14 }}>
              {sectionHead("Work Experience")}
              <div style={{ fontSize: 10, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.6 }}>{form.workExperience}</div>
            </div>
          )}
          {form.projects && (
            <div style={{ marginBottom: 14 }}>
              {sectionHead("Projects")}
              <div style={{ fontSize: 10, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.6 }}>{form.projects}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── BOLD LAYOUT ── */
  if (tmpl.layout === "bold") {
    return (
      <div style={{ fontFamily: "'Georgia', serif", fontSize: 11, background: "#fff", width: "100%" }}>
        <div style={{ background: tmpl.headerBg, color: tmpl.headerText, padding: "28px 24px" }}>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1 }}>{name.toUpperCase()}</div>
          <div style={{ fontSize: 12, color: tmpl.accent, fontWeight: 600, marginTop: 4 }}>{role.toUpperCase()}</div>
          <div style={{ fontSize: 9, marginTop: 8, opacity: 0.8 }}>{contact}</div>
        </div>
        <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            {(form.education || form.college) && <div style={{ marginBottom: 14 }}>{sectionHead("Education")}{form.college && <div style={{ fontWeight: 700 }}>{form.college}</div>}{form.education && <div style={{ fontSize: 10, color: "#555", whiteSpace: "pre-line" }}>{form.education}</div>}</div>}
            {form.workExperience && <div style={{ marginBottom: 14 }}>{sectionHead("Experience")}<div style={{ fontSize: 10, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.6 }}>{form.workExperience}</div></div>}
          </div>
          <div>
            {skills.length > 0 && <div style={{ marginBottom: 14 }}>{sectionHead("Skills")}<div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{skills.map((s, i) => <span key={i} style={{ fontSize: 9, background: tmpl.headerBg, color: tmpl.headerText, padding: "2px 7px", borderRadius: 3 }}>{s}</span>)}</div></div>}
            {form.projects && <div style={{ marginBottom: 14 }}>{sectionHead("Projects")}<div style={{ fontSize: 10, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.6 }}>{form.projects}</div></div>}
            {certs.length > 0 && <div style={{ marginBottom: 14 }}>{sectionHead("Certifications")}{certs.map((c, i) => <div key={i} style={{ fontSize: 9.5 }}>▪ {c}</div>)}</div>}
          </div>
        </div>
      </div>
    );
  }

  /* ── MINIMAL LAYOUT ── */
  if (tmpl.layout === "minimal") {
    return (
      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, background: "#fff", padding: "28px 28px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ borderBottom: `3px solid ${tmpl.accent}`, paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: 0.5 }}>{name}</div>
          <div style={{ fontSize: 11, color: tmpl.accent, fontWeight: 600, marginTop: 3 }}>{role}</div>
          <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 6 }}>{contact}</div>
        </div>
        {(form.education || form.college) && <div style={{ marginBottom: 14 }}>{sectionHead("Education")}{form.college && <div style={{ fontWeight: 700 }}>{form.college}</div>}{form.education && <div style={{ fontSize: 10, color: "#4b5563", whiteSpace: "pre-line" }}>{form.education}</div>}</div>}
        {skills.length > 0 && <div style={{ marginBottom: 14 }}>{sectionHead("Skills")}<div style={{ fontSize: 10, color: "#374151" }}>{skills.join("  ·  ")}</div></div>}
        {form.workExperience && <div style={{ marginBottom: 14 }}>{sectionHead("Experience")}<div style={{ fontSize: 10, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.workExperience}</div></div>}
        {form.projects && <div style={{ marginBottom: 14 }}>{sectionHead("Projects")}<div style={{ fontSize: 10, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.projects}</div></div>}
        {certs.length > 0 && <div style={{ marginBottom: 14 }}>{sectionHead("Certifications")}<div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{certs.map((c, i) => <span key={i} style={{ fontSize: 9, border: "1px solid #e2e8f0", padding: "2px 7px", borderRadius: 3 }}>{c}</span>)}</div></div>}
        {langs.length > 0 && <div>{sectionHead("Languages")}<div style={{ fontSize: 10, color: "#374151" }}>{langs.join("  •  ")}</div></div>}
      </div>
    );
  }

  /* ── MODERN LAYOUT ── */
  if (tmpl.layout === "modern") {
    return (
      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, background: "#fff", width: "100%" }}>
        <div style={{ background: `linear-gradient(135deg, ${tmpl.headerBg}, ${tmpl.accent})`, color: tmpl.headerText, padding: "24px 24px 20px" }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{name}</div>
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 3, fontWeight: 600 }}>{role}</div>
          <div style={{ fontSize: 9, marginTop: 8, opacity: 0.8 }}>{contact}</div>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", gap: 20 }}>
          <div style={{ flex: 2 }}>
            {(form.education || form.college) && <div style={{ marginBottom: 14 }}>{sectionHead("Education")}{form.college && <div style={{ fontWeight: 700, color: "#111" }}>{form.college}</div>}{form.education && <div style={{ fontSize: 10, color: "#4b5563", whiteSpace: "pre-line" }}>{form.education}</div>}</div>}
            {form.workExperience && <div style={{ marginBottom: 14 }}>{sectionHead("Work Experience")}<div style={{ fontSize: 10, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.workExperience}</div></div>}
            {form.projects && <div style={{ marginBottom: 14 }}>{sectionHead("Projects")}<div style={{ fontSize: 10, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.projects}</div></div>}
          </div>
          <div style={{ flex: 1 }}>
            {skills.length > 0 && <div style={{ marginBottom: 14 }}>{sectionHead("Skills")}<div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{skills.map((s, i) => <span key={i} style={{ fontSize: 8.5, background: `${tmpl.accent}18`, color: tmpl.accent, border: `1px solid ${tmpl.accent}40`, padding: "2px 6px", borderRadius: 10, fontWeight: 600 }}>{s}</span>)}</div></div>}
            {certs.length > 0 && <div style={{ marginBottom: 14 }}>{sectionHead("Certifications")}{certs.map((c, i) => <div key={i} style={{ fontSize: 9.5, color: "#374151", marginBottom: 2 }}>▸ {c}</div>)}</div>}
            {langs.length > 0 && <div>{sectionHead("Languages")}{langs.map((l, i) => <div key={i} style={{ fontSize: 9.5, color: "#374151", marginBottom: 2 }}>• {l}</div>)}</div>}
          </div>
        </div>
      </div>
    );
  }

  /* ── CLASSIC LAYOUT (default) ── */
  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, background: "#fff", width: "100%" }}>
      {/* Header */}
      <div style={{ background: tmpl.headerBg, color: tmpl.headerText, padding: "24px 24px 18px", textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0.5 }}>{name.toUpperCase()}</div>
        <div style={{ fontSize: 11, marginTop: 3, opacity: 0.9 }}>{role}</div>
        <div style={{ fontSize: 9.5, marginTop: 8, opacity: 0.8 }}>{contact}</div>
      </div>
      {/* Body */}
      <div style={{ padding: "20px 24px" }}>
        {(form.education || form.college) && (
          <div style={{ marginBottom: 14 }}>
            {sectionHead("Education")}
            {form.college && <div style={{ fontWeight: 700, color: "#111827" }}>{form.college}</div>}
            {form.education && <div style={{ fontSize: 10, color: "#4b5563", whiteSpace: "pre-line", marginTop: 2 }}>{form.education}</div>}
          </div>
        )}
        {skills.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            {sectionHead("Skills")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {skills.map((s, i) => (
                <span key={i} style={{ fontSize: 9, background: tmpl.accent, color: tmpl.accentText, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          </div>
        )}
        {form.workExperience && (
          <div style={{ marginBottom: 14 }}>
            {sectionHead("Work Experience")}
            <div style={{ fontSize: 10, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.workExperience}</div>
          </div>
        )}
        {form.projects && (
          <div style={{ marginBottom: 14 }}>
            {sectionHead("Projects")}
            <div style={{ fontSize: 10, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.projects}</div>
          </div>
        )}
        {certs.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            {sectionHead("Certifications")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {certs.map((c, i) => <span key={i} style={{ fontSize: 9, border: `1px solid ${tmpl.accent}`, color: tmpl.accent, padding: "2px 7px", borderRadius: 3 }}>{c}</span>)}
            </div>
          </div>
        )}
        {langs.length > 0 && (
          <div>
            {sectionHead("Languages")}
            <div style={{ fontSize: 10, color: "#374151" }}>{langs.join("  •  ")}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── TEMPLATE MINI CARD ────────────────────────────────────────────────────── */
function TemplateMiniCard({ t, selected, onSelect }: { t: TemplateConfig; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`relative rounded-xl border-2 overflow-hidden text-left transition-all hover:scale-105 ${selected ? "border-[#5B5CF6] shadow-lg shadow-violet-200" : "border-border"}`}
    >
      {/* Mini visual preview */}
      <div style={{ background: t.headerBg, height: 38, padding: "6px 8px" }}>
        <div style={{ width: "60%", height: 5, background: t.headerText, borderRadius: 2, opacity: 0.9 }} />
        <div style={{ width: "40%", height: 3, background: t.accent, borderRadius: 2, marginTop: 3 }} />
      </div>
      <div style={{ background: "#fff", padding: "4px 6px" }}>
        {[70, 100, 85, 60].map((w, i) => (
          <div key={i} style={{ width: `${w}%`, height: 2, background: i === 1 ? t.accent : "#e5e7eb", borderRadius: 1, marginBottom: 2 }} />
        ))}
      </div>
      <div className="p-1.5">
        <div className="text-[9px] font-bold truncate">{t.name}</div>
        <div className="text-[8px] text-muted-foreground">{t.category}</div>
      </div>
      {selected && <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#5B5CF6] flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
    </button>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────────────────────────── */
export default function ResumeBuilder() {
  const { toast } = useToast();
  const token = getToken();
  const previewRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig>(TEMPLATES[23]);
  const [autoSelected, setAutoSelected] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("All");
  const [form, setForm] = useState<FormData>({
    jobRole: "", fullName: "", email: "", mobile: "", city: "",
    education: "", college: "",
    skills: "", workExperience: "", projects: "", certifications: "", languages: "",
  });
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const f = (k: keyof FormData) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value }),
  });

  function handleAutoSelect() {
    const t = autoSelectTemplate(form.jobRole, form.skills);
    setSelectedTemplate(t);
    setAutoSelected(true);
    toast({ title: `Template auto-selected: ${t.name} ${t.tag}`, description: `Best match for "${form.jobRole || "your role"}"` });
  }

  const categories = ["All", ...Array.from(new Set(TEMPLATES.map(t => t.category)))];
  const visibleTemplates = filterCat === "All" ? TEMPLATES : TEMPLATES.filter(t => t.category === filterCat);

  async function handleBuild() {
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...form, title: form.jobRole || "My Resume", template: selectedTemplate.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to build resume");
      setAtsScore(data.atsScore ?? 72);
      setStep(4);
      toast({ title: `Resume built! 🎉 ATS Score: ${data.atsScore}%` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    const content = previewRef.current?.innerHTML || "";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${form.fullName || "Resume"}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
    </head><body>${content}</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => { w.print(); }, 400); }
  }

  function nextStep() { if (step < 3) setStep(s => s + 1); }
  function prevStep() { if (step > 0) setStep(s => s - 1); }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Title */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6] flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Resume Builder</h1>
              <p className="text-sm text-muted-foreground">28 templates · Auto-select by job role · Download as PDF</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5 flex-shrink-0">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all ${
                  i < step ? "bg-[#5B5CF6] text-white" : i === step ? "bg-[#5B5CF6] text-white shadow-md" : "bg-muted text-muted-foreground"
                }`}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-xs whitespace-nowrap ${i === step ? "text-[#5B5CF6] font-semibold" : "text-muted-foreground"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`w-4 h-0.5 ${i < step ? "bg-[#5B5CF6]" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ─── STEP 0: Job Role + Template picker ─── */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200">
                  <Label className="font-semibold">Your Target Job Role <span className="text-rose-500">*</span></Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      {...f("jobRole")}
                      placeholder="e.g. Software Developer, Marketing Manager, CA, Fresher..."
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAutoSelect}
                      disabled={!form.jobRole}
                      className="gap-1.5 bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 flex-shrink-0"
                    >
                      <Wand2 className="w-4 h-4" /> Auto-Pick
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Type your job role and click Auto-Pick — we'll choose the perfect template for you</p>
                </div>

                {autoSelected && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-2xl">{selectedTemplate.tag}</span>
                    <div>
                      <div className="font-semibold text-emerald-900 text-sm">Auto-selected: {selectedTemplate.name}</div>
                      <div className="text-xs text-emerald-700">Best template for {form.jobRole}. You can still change below.</div>
                    </div>
                    <Check className="w-5 h-5 text-emerald-500 ml-auto" />
                  </motion.div>
                )}

                {/* Category filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Choose Template <span className="text-muted-foreground font-normal">({TEMPLATES.length} available)</span></h3>
                  </div>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {categories.map(cat => (
                      <button key={cat} onClick={() => setFilterCat(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterCat === cat ? "bg-[#5B5CF6] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
                    {visibleTemplates.map(t => (
                      <TemplateMiniCard key={t.id} t={t} selected={selectedTemplate.id === t.id} onSelect={() => { setSelectedTemplate(t); setAutoSelected(false); }} />
                    ))}
                  </div>
                </div>

                <Button onClick={nextStep} disabled={!form.jobRole} className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2 h-11">
                  Continue with {selectedTemplate.name} {selectedTemplate.tag} <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* ─── STEP 1: Basic Info ─── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                    <div style={{ background: selectedTemplate.headerBg, height: 22, padding: "4px 5px" }}><div style={{ width: "60%", height: 3.5, background: selectedTemplate.headerText, borderRadius: 1.5 }}/></div>
                    <div style={{ background: "#fff", height: 10 }} />
                  </div>
                  <div className="text-sm"><span className="font-medium">{selectedTemplate.name}</span> <span className="text-muted-foreground text-xs">selected</span></div>
                  <button onClick={() => setStep(0)} className="ml-auto text-xs text-[#5B5CF6] underline">Change</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Full Name <span className="text-rose-500">*</span></Label><Input {...f("fullName")} placeholder="Priya Sharma" className="mt-1" /></div>
                  <div><Label>City</Label><Input {...f("city")} placeholder="Bangalore" className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email <span className="text-rose-500">*</span></Label><Input {...f("email")} type="email" placeholder="priya@gmail.com" className="mt-1" /></div>
                  <div><Label>Mobile</Label><Input {...f("mobile")} placeholder="9999999999" inputMode="numeric" className="mt-1" /></div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep} className="flex-1">Back</Button>
                  <Button onClick={nextStep} disabled={!form.fullName || !form.email} className="flex-1 bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 2: Education ─── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div><Label>College / University</Label><Input {...f("college")} placeholder="e.g. VIT Pune, Mumbai University" className="mt-1" /></div>
                <div><Label>Education Details</Label><Textarea {...f("education")} placeholder="B.Tech CSE (2024) — 8.5 CGPA&#10;12th CBSE — 85% (2020)&#10;10th — 90% (2018)" className="mt-1 h-28" /></div>
                <div><Label>Languages Known</Label><Input {...f("languages")} placeholder="English, Hindi, Marathi" className="mt-1" /></div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep} className="flex-1">Back</Button>
                  <Button onClick={nextStep} className="flex-1 bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 3: Skills & Work ─── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <Label>Skills <span className="text-rose-500">*</span></Label>
                  <Textarea {...f("skills")} placeholder="JavaScript, React, Python, SQL, Git, Communication, Leadership..." className="mt-1 h-20" />
                  <p className="text-xs text-muted-foreground mt-1">Separate by commas — these become skill badges in your resume</p>
                </div>
                <div><Label>Work Experience</Label><Textarea {...f("workExperience")} placeholder="Software Intern at XYZ Corp (June–Aug 2023)&#10;• Built REST APIs using Node.js&#10;• Reduced load time by 30%" className="mt-1 h-24" /></div>
                <div><Label>Projects</Label><Textarea {...f("projects")} placeholder="E-Commerce App: Built with React & Node.js, 500+ users&#10;AI Chatbot: Python & OpenAI API, deployed on AWS" className="mt-1 h-24" /></div>
                <div><Label>Certifications</Label><Input {...f("certifications")} placeholder="AWS Certified Cloud Practitioner, Google Analytics, HackerRank Python" className="mt-1" /></div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep} className="flex-1">Back</Button>
                  <Button onClick={handleBuild} disabled={saving || !form.skills} className="flex-1 bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2 h-11">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Building...</> : <><Sparkles className="w-4 h-4" /> Build Resume</>}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 4: Visual Preview ─── */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                {/* ATS Score */}
                {atsScore !== null && (
                  <div className={`flex items-center gap-4 p-4 rounded-2xl border ${atsScore >= 80 ? "bg-emerald-50 border-emerald-200" : atsScore >= 60 ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"}`}>
                    <div className={`text-3xl font-black ${atsScore >= 80 ? "text-emerald-600" : atsScore >= 60 ? "text-amber-600" : "text-rose-600"}`}>{atsScore}%</div>
                    <div>
                      <div className={`font-bold ${atsScore >= 80 ? "text-emerald-900" : atsScore >= 60 ? "text-amber-900" : "text-rose-900"}`}>ATS Score</div>
                      <div className={`text-sm ${atsScore >= 80 ? "text-emerald-700" : atsScore >= 60 ? "text-amber-700" : "text-rose-700"}`}>
                        {atsScore >= 80 ? "🎉 Excellent! Recruiters will love this." : atsScore >= 60 ? "👍 Good. Add more skills to improve." : "⚠️ Add more details for a better ATS score."}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => setStep(0)} variant="outline" size="sm" className="gap-1.5"><Eye className="w-3.5 h-3.5" /> Change Template</Button>
                  <Button onClick={() => setStep(1)} variant="outline" size="sm">Edit Info</Button>
                  <Button onClick={handlePrint} className="gap-1.5 bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 ml-auto" size="sm">
                    <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                  </Button>
                  <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Download
                  </Button>
                </div>

                {/* Live resume preview */}
                <div className="rounded-2xl border-2 border-[#5B5CF6]/20 overflow-hidden shadow-xl shadow-violet-100/50">
                  <div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Preview — {selectedTemplate.name} {selectedTemplate.tag}</span>
                    <span className="text-[10px] text-muted-foreground">Click "Print / Save PDF" to download</span>
                  </div>
                  <div className="overflow-y-auto max-h-[600px] bg-white" ref={previewRef}>
                    <ResumePreview form={form} tmpl={selectedTemplate} />
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground">💡 Tip: In Print dialog, choose "Save as PDF" for the best quality</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
