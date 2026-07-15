import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Loader2, Sparkles, ChevronRight, Check, Wand2, Printer, Camera, X, Filter } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getToken } from "@/lib/auth";

/* ─── COLOR THEMES ──────────────────────────────────────────────────────────── */
interface Theme {
  name: string;
  primary: string;   // sidebar/header bg
  accent: string;    // highlight / title accent
  dark: string;      // body text dark
  light: string;     // sidebar text
  tag: string;
}

const THEMES: Theme[] = [
  { name: "Navy",       primary: "#1e3a5f", accent: "#4a9ede", dark: "#111827", light: "#fff",    tag: "🔵" },
  { name: "Forest",     primary: "#1a4731", accent: "#4ade80", dark: "#111827", light: "#fff",    tag: "🟢" },
  { name: "Charcoal",   primary: "#1c1c1c", accent: "#f59e0b", dark: "#111827", light: "#fff",    tag: "⚫" },
  { name: "Burgundy",   primary: "#6b1e2e", accent: "#fca5a5", dark: "#111827", light: "#fff",    tag: "🔴" },
  { name: "Purple",     primary: "#2d1b69", accent: "#a78bfa", dark: "#111827", light: "#fff",    tag: "🟣" },
  { name: "Ocean",      primary: "#0a3d62", accent: "#38bdf8", dark: "#111827", light: "#fff",    tag: "🌊" },
  { name: "Slate",      primary: "#334155", accent: "#94a3b8", dark: "#111827", light: "#fff",    tag: "🩶" },
  { name: "Teal",       primary: "#115e59", accent: "#2dd4bf", dark: "#111827", light: "#fff",    tag: "🩵" },
  { name: "Brown",      primary: "#451a03", accent: "#fb923c", dark: "#111827", light: "#fff",    tag: "🟤" },
  { name: "Indigo",     primary: "#312e81", accent: "#818cf8", dark: "#111827", light: "#fff",    tag: "💙" },
];

/* ─── LAYOUT TYPES ──────────────────────────────────────────────────────────── */
type Layout = "sidebar-photo" | "panel-diamond" | "header-photo" | "bold-graphic" | "split-accent";

interface TemplateConfig {
  id: string;
  name: string;
  layout: Layout;
  theme: Theme;
  category: string;
  keywords: string[];
}

/* ─── BUILD 50 TEMPLATES (5 layouts × 10 themes) ─────────────────────────── */
const LAYOUTS: { layout: Layout; name: string; category: string; keywords: string[] }[] = [
  { layout: "sidebar-photo",  name: "Executive",    category: "Business",  keywords: ["manager","executive","mba","director","vp","ceo","business","strategy","operations","consultant","hr","admin"] },
  { layout: "panel-diamond",  name: "Creative",     category: "Creative",  keywords: ["design","ui","ux","graphic","creative","marketing","brand","digital","content","artist","social media","copywriter"] },
  { layout: "header-photo",   name: "Professional", category: "Universal", keywords: ["developer","engineer","software","tech","data","analyst","fresher","graduate","btech","bca","mca","python","react","java"] },
  { layout: "bold-graphic",   name: "Impact",       category: "Bold",      keywords: ["sales","bde","business development","target","revenue","growth","startup","product","entrepreneur"] },
  { layout: "split-accent",   name: "Elegant",      category: "Finance",   keywords: ["banking","finance","ca","accountant","audit","tax","chartered","insurance","investment","equity"] },
];

const TEMPLATES: TemplateConfig[] = LAYOUTS.flatMap(l =>
  THEMES.map(t => ({
    id: `${l.layout}-${t.name.toLowerCase()}`,
    name: `${l.name} ${t.tag}`,
    layout: l.layout,
    theme: t,
    category: l.category,
    keywords: l.keywords,
  }))
);

/* ─── AUTO SELECT ─────────────────────────────────────────────────────────── */
function autoSelect(jobRole: string, skills: string): TemplateConfig {
  const text = (jobRole + " " + skills).toLowerCase();
  let best = TEMPLATES[20]!;
  let bestScore = 0;
  for (const t of TEMPLATES) {
    const score = t.keywords.filter(k => text.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

/* ─── FORM DATA ──────────────────────────────────────────────────────────── */
interface FormData {
  jobRole: string; fullName: string; email: string; mobile: string; city: string; linkedin: string;
  profile: string; education: string; college: string;
  skills: string; workExperience: string; projects: string; certifications: string; languages: string;
}

/* ─── SKILL BARS (for panel-diamond) ─────────────────────────────────────── */
function SkillBar({ name, pct, accent }: { name: string; pct: number; accent: string }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 2 }}>
        <span>{name}</span><span style={{ color: accent }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: "#e5e7eb", borderRadius: 3 }}>
        <div style={{ height: 5, width: `${pct}%`, background: accent, borderRadius: 3 }} />
      </div>
    </div>
  );
}

/* ─── MAIN RESUME RENDERER ──────────────────────────────────────────────── */
function ResumePreview({ form, photo, tmpl }: { form: FormData; photo: string | null; tmpl: TemplateConfig }) {
  const { theme: t } = tmpl;
  const skills = form.skills.split(/[,，\n]/).map(s => s.trim()).filter(Boolean);
  const certs = form.certifications ? form.certifications.split(/[,，\n]/).map(s => s.trim()).filter(Boolean) : [];
  const langs = form.languages ? form.languages.split(/[,，\n]/).map(s => s.trim()).filter(Boolean) : [];
  const name = form.fullName || "Your Name";
  const role = form.jobRole || "Your Job Role";

  const sectionH = (title: string, color = t.primary) => (
    <div style={{ marginBottom: 8, marginTop: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color, borderBottom: `2px solid ${color}`, paddingBottom: 3, marginBottom: 5 }}>{title}</div>
    </div>
  );

  const photoCircle = (size: number) => photo ? (
    <img src={photo} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `3px solid ${t.accent}`, display: "block" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `${t.accent}33`, border: `3px solid ${t.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size / 3, color: t.accent }}>
      👤
    </div>
  );

  /* ── SIDEBAR-PHOTO layout (like image 1) ── */
  if (tmpl.layout === "sidebar-photo") {
    return (
      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 10, display: "flex", minHeight: 780, width: "100%", background: "#fff" }}>
        {/* LEFT SIDEBAR */}
        <div style={{ width: "32%", background: t.primary, color: t.light, padding: "28px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Photo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>{photoCircle(90)}</div>
          {/* Contact */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, borderBottom: `1px solid ${t.accent}`, paddingBottom: 3, marginBottom: 8, color: t.accent }}>Contact</div>
            {form.mobile && <div style={{ fontSize: 9, marginBottom: 5, display: "flex", gap: 5 }}>📱 +91 {form.mobile}</div>}
            {form.email && <div style={{ fontSize: 9, marginBottom: 5, wordBreak: "break-all" }}>✉ {form.email}</div>}
            {form.city && <div style={{ fontSize: 9, marginBottom: 5 }}>📍 {form.city}</div>}
            {form.linkedin && <div style={{ fontSize: 9, marginBottom: 5, wordBreak: "break-all" }}>🔗 {form.linkedin}</div>}
          </div>
          {/* Education */}
          {(form.college || form.education) && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, borderBottom: `1px solid ${t.accent}`, paddingBottom: 3, marginBottom: 8, color: t.accent }}>Education</div>
              {form.college && <div style={{ fontWeight: 700, fontSize: 9, marginBottom: 3 }}>{form.college}</div>}
              {form.education && <div style={{ fontSize: 8.5, opacity: 0.85, whiteSpace: "pre-line" }}>{form.education}</div>}
            </div>
          )}
          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, borderBottom: `1px solid ${t.accent}`, paddingBottom: 3, marginBottom: 8, color: t.accent }}>Skills</div>
              {skills.map((s, i) => <div key={i} style={{ fontSize: 9, marginBottom: 4 }}>▸ {s}</div>)}
            </div>
          )}
          {/* Languages */}
          {langs.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, borderBottom: `1px solid ${t.accent}`, paddingBottom: 3, marginBottom: 8, color: t.accent }}>Languages</div>
              {langs.map((l, i) => <div key={i} style={{ fontSize: 9, marginBottom: 4 }}>▸ {l}</div>)}
            </div>
          )}
        </div>
        {/* RIGHT MAIN */}
        <div style={{ flex: 1, padding: "28px 22px", background: "#fff" }}>
          {/* Name & Role */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, color: t.dark }}>
              {name.split(" ")[0]} <span style={{ fontWeight: 300 }}>{name.split(" ").slice(1).join(" ")}</span>
            </div>
            <div style={{ fontSize: 12, color: t.primary, fontWeight: 600, marginTop: 3, letterSpacing: 1 }}>{role.toUpperCase()}</div>
            <div style={{ width: 50, height: 3, background: t.accent, marginTop: 8, borderRadius: 2 }} />
          </div>
          {/* Profile */}
          {form.profile && (
            <div style={{ marginBottom: 16 }}>
              {sectionH("Profile")}
              <div style={{ fontSize: 10, color: "#4b5563", lineHeight: 1.7 }}>{form.profile}</div>
            </div>
          )}
          {/* Work Experience */}
          {form.workExperience && (
            <div style={{ marginBottom: 16 }}>
              {sectionH("Work Experience")}
              <div style={{ fontSize: 10, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.workExperience}</div>
            </div>
          )}
          {/* Projects */}
          {form.projects && (
            <div style={{ marginBottom: 16 }}>
              {sectionH("Projects")}
              <div style={{ fontSize: 10, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.projects}</div>
            </div>
          )}
          {/* Certifications */}
          {certs.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {sectionH("Certifications")}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {certs.map((c, i) => <span key={i} style={{ fontSize: 9, border: `1px solid ${t.primary}`, color: t.primary, padding: "2px 8px", borderRadius: 10 }}>{c}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── PANEL-DIAMOND layout (like image 2) ── */
  if (tmpl.layout === "panel-diamond") {
    const skillPcts = [90, 75, 80, 60, 85, 70, 95, 65];
    return (
      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 10, display: "flex", width: "100%", background: "#fff" }}>
        {/* LEFT PANEL */}
        <div style={{ width: "36%", background: "#f8f9fa", padding: "24px 16px", borderRight: `3px solid ${t.primary}` }}>
          {/* Diamond photo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            {photo ? (
              <div style={{ width: 90, height: 90, transform: "rotate(45deg)", overflow: "hidden", border: `3px solid ${t.primary}` }}>
                <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "rotate(-45deg) scale(1.42)" }} />
              </div>
            ) : (
              <div style={{ width: 90, height: 90, transform: "rotate(45deg)", background: `${t.primary}22`, border: `3px solid ${t.primary}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ transform: "rotate(-45deg)", fontSize: 28 }}>👤</span>
              </div>
            )}
          </div>
          {/* Name */}
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: t.dark, lineHeight: 1.2 }}>{name.toUpperCase()}</div>
            <div style={{ fontSize: 10, color: t.primary, fontWeight: 600, marginTop: 3 }}>{role}</div>
          </div>
          {/* Profile */}
          {form.profile && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: t.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Profile</div>
              <div style={{ fontSize: 9, color: "#4b5563", lineHeight: 1.6 }}>{form.profile}</div>
            </div>
          )}
          {/* Contact */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: t.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Contact</div>
            {form.mobile && <div style={{ fontSize: 9, color: "#374151", marginBottom: 3 }}>📱 +91 {form.mobile}</div>}
            {form.email && <div style={{ fontSize: 9, color: "#374151", marginBottom: 3, wordBreak: "break-all" }}>✉ {form.email}</div>}
            {form.city && <div style={{ fontSize: 9, color: "#374151", marginBottom: 3 }}>📍 {form.city}</div>}
            {form.linkedin && <div style={{ fontSize: 9, color: "#374151", marginBottom: 3, wordBreak: "break-all" }}>🔗 {form.linkedin}</div>}
          </div>
          {/* Skill bars */}
          {skills.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: t.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Skills</div>
              {skills.slice(0, 8).map((s, i) => <SkillBar key={i} name={s} pct={skillPcts[i % 8]!} accent={t.primary} />)}
            </div>
          )}
        </div>
        {/* RIGHT MAIN */}
        <div style={{ flex: 1, padding: "24px 18px" }}>
          {/* Education */}
          {(form.college || form.education) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: t.primary, color: "#fff", padding: "5px 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Education</div>
              {form.college && <div style={{ fontWeight: 700, fontSize: 10, color: t.dark }}>{form.college}</div>}
              {form.education && <div style={{ fontSize: 9.5, color: "#4b5563", whiteSpace: "pre-line", marginTop: 3 }}>{form.education}</div>}
            </div>
          )}
          {/* Work Experience */}
          {form.workExperience && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: t.primary, color: "#fff", padding: "5px 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Work Experience</div>
              <div style={{ fontSize: 9.5, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.workExperience}</div>
            </div>
          )}
          {/* Projects */}
          {form.projects && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: t.primary, color: "#fff", padding: "5px 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Projects</div>
              <div style={{ fontSize: 9.5, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.projects}</div>
            </div>
          )}
          {/* Certifications */}
          {certs.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: t.primary, color: "#fff", padding: "5px 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Certifications</div>
              {certs.map((c, i) => <div key={i} style={{ fontSize: 9.5, color: "#374151", marginBottom: 3 }}>▸ {c}</div>)}
            </div>
          )}
          {/* Languages */}
          {langs.length > 0 && (
            <div>
              <div style={{ background: t.primary, color: "#fff", padding: "5px 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Languages</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {langs.map((l, i) => <span key={i} style={{ fontSize: 9, background: `${t.primary}15`, color: t.primary, padding: "2px 8px", borderRadius: 10, border: `1px solid ${t.primary}40` }}>{l}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── HEADER-PHOTO layout (like image 3) ── */
  if (tmpl.layout === "header-photo") {
    return (
      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 10, width: "100%", background: "#fff" }}>
        {/* Dark header */}
        <div style={{ background: t.primary, color: t.light, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{name}</div>
            <div style={{ fontSize: 12, color: t.accent, fontWeight: 600, marginTop: 3 }}>{role}</div>
            {form.profile && <div style={{ fontSize: 9, opacity: 0.85, marginTop: 8, lineHeight: 1.5, maxWidth: 380 }}>{form.profile}</div>}
          </div>
          {/* Photo right */}
          <div style={{ flexShrink: 0 }}>{photoCircle(80)}</div>
          {/* Contact strip */}
          <div style={{ flexShrink: 0, fontSize: 8.5, display: "flex", flexDirection: "column", gap: 4, opacity: 0.9 }}>
            {form.email && <div>✉ {form.email}</div>}
            {form.mobile && <div>📱 +91 {form.mobile}</div>}
            {form.city && <div>📍 {form.city}</div>}
            {form.linkedin && <div>🔗 {form.linkedin}</div>}
          </div>
        </div>
        {/* Body — two columns */}
        <div style={{ display: "flex", gap: 0 }}>
          {/* Left column */}
          <div style={{ flex: 3, padding: "18px 20px", borderRight: `2px solid #f1f5f9` }}>
            {form.workExperience && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: t.primary, borderBottom: `2px solid ${t.accent}`, paddingBottom: 3, marginBottom: 8 }}>Work Experience</div>
                <div style={{ fontSize: 9.5, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.workExperience}</div>
              </div>
            )}
            {form.projects && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: t.primary, borderBottom: `2px solid ${t.accent}`, paddingBottom: 3, marginBottom: 8 }}>Projects</div>
                <div style={{ fontSize: 9.5, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.projects}</div>
              </div>
            )}
            {(form.college || form.education) && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: t.primary, borderBottom: `2px solid ${t.accent}`, paddingBottom: 3, marginBottom: 8 }}>Education</div>
                {form.college && <div style={{ fontWeight: 700 }}>{form.college}</div>}
                {form.education && <div style={{ fontSize: 9.5, color: "#4b5563", whiteSpace: "pre-line", marginTop: 2 }}>{form.education}</div>}
              </div>
            )}
          </div>
          {/* Right column */}
          <div style={{ flex: 2, padding: "18px 16px" }}>
            {skills.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: t.primary, borderBottom: `2px solid ${t.accent}`, paddingBottom: 3, marginBottom: 8 }}>Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {skills.map((s, i) => <span key={i} style={{ fontSize: 8.5, background: `${t.primary}15`, color: t.primary, padding: "3px 8px", borderRadius: 12, fontWeight: 600, border: `1px solid ${t.primary}30` }}>{s}</span>)}
                </div>
              </div>
            )}
            {certs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: t.primary, borderBottom: `2px solid ${t.accent}`, paddingBottom: 3, marginBottom: 8 }}>Certifications</div>
                {certs.map((c, i) => <div key={i} style={{ fontSize: 9.5, color: "#374151", marginBottom: 3 }}>▸ {c}</div>)}
              </div>
            )}
            {langs.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: t.primary, borderBottom: `2px solid ${t.accent}`, paddingBottom: 3, marginBottom: 8 }}>Languages</div>
                {langs.map((l, i) => <div key={i} style={{ fontSize: 9.5, color: "#374151", marginBottom: 3 }}>• {l}</div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── BOLD-GRAPHIC layout (like image 4) ── */
  if (tmpl.layout === "bold-graphic") {
    return (
      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 10, width: "100%", background: "#fff" }}>
        {/* Bold header */}
        <div style={{ background: t.primary, padding: "24px 24px 18px", position: "relative", overflow: "hidden" }}>
          {/* Decorative bars */}
          {[0,1,2,3].map(i => <div key={i} style={{ position: "absolute", right: 20 + i * 22, top: -5, width: 14, height: 80, background: t.accent, opacity: 0.2 + i * 0.1, transform: "rotate(15deg)" }} />)}
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: t.light, textTransform: "uppercase", letterSpacing: 1 }}>{name}</div>
            <div style={{ fontSize: 11, color: t.accent, fontWeight: 600, letterSpacing: 2, marginTop: 4 }}>{role.toUpperCase()}</div>
            {form.profile && <div style={{ fontSize: 9, color: `${t.light}cc`, marginTop: 8, lineHeight: 1.5, maxWidth: 500 }}>{form.profile}</div>}
          </div>
          {photo && <img src={photo} style={{ position: "absolute", right: 20, top: 10, width: 70, height: 70, borderRadius: "50%", objectFit: "cover", border: `3px solid ${t.accent}` }} />}
        </div>
        {/* Contact bar */}
        <div style={{ background: `${t.primary}22`, padding: "8px 24px", display: "flex", gap: 20, fontSize: 9 }}>
          {form.mobile && <span>📱 +91 {form.mobile}</span>}
          {form.email && <span>✉ {form.email}</span>}
          {form.city && <span>📍 {form.city}</span>}
          {form.linkedin && <span>🔗 {form.linkedin}</span>}
        </div>
        {/* Two column body */}
        <div style={{ display: "flex", padding: "16px 24px", gap: 24 }}>
          <div style={{ flex: 3 }}>
            {form.workExperience && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 2, color: t.primary, marginBottom: 8 }}>Work Experience</div>
                <div style={{ fontSize: 9.5, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.workExperience}</div>
              </div>
            )}
            {form.projects && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 2, color: t.primary, marginBottom: 8 }}>Projects</div>
                <div style={{ fontSize: 9.5, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.projects}</div>
              </div>
            )}
          </div>
          <div style={{ flex: 2 }}>
            {(form.college || form.education) && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 2, color: t.primary, marginBottom: 8 }}>Education</div>
                {form.college && <div style={{ fontWeight: 700 }}>{form.college}</div>}
                {form.education && <div style={{ fontSize: 9.5, color: "#4b5563", whiteSpace: "pre-line", marginTop: 2 }}>{form.education}</div>}
              </div>
            )}
            {skills.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 2, color: t.primary, marginBottom: 8 }}>Skills</div>
                {skills.map((s, i) => (
                  <div key={i} style={{ fontSize: 9, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, background: t.accent, borderRadius: "50%", flexShrink: 0 }} /> {s}
                  </div>
                ))}
              </div>
            )}
            {certs.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 2, color: t.primary, marginBottom: 8 }}>Certifications</div>
                {certs.map((c, i) => <div key={i} style={{ fontSize: 9.5, marginBottom: 2 }}>▸ {c}</div>)}
              </div>
            )}
            {langs.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 2, color: t.primary, marginBottom: 8 }}>Languages</div>
                {langs.map((l, i) => <div key={i} style={{ fontSize: 9.5, marginBottom: 2 }}>• {l}</div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── SPLIT-ACCENT layout (like image 2 variant) ── */
  return (
    <div style={{ fontFamily: "Georgia, serif", fontSize: 10, width: "100%", background: "#fff" }}>
      {/* Top accent bar */}
      <div style={{ height: 6, background: t.primary }} />
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid #e5e7eb` }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: t.dark, letterSpacing: 0.5 }}>{name}</div>
          <div style={{ fontSize: 12, color: t.primary, fontWeight: 700, marginTop: 4, fontFamily: "Arial, sans-serif" }}>{role}</div>
          {form.profile && <div style={{ fontSize: 9.5, color: "#6b7280", marginTop: 8, maxWidth: 420, lineHeight: 1.6 }}>{form.profile}</div>}
        </div>
        {photoCircle(75)}
      </div>
      {/* Contact bar */}
      <div style={{ background: t.primary, color: "#fff", padding: "7px 24px", display: "flex", gap: 20, fontSize: 9, flexWrap: "wrap" }}>
        {form.mobile && <span>📱 +91 {form.mobile}</span>}
        {form.email && <span>✉ {form.email}</span>}
        {form.city && <span>📍 {form.city}</span>}
        {form.linkedin && <span>🔗 {form.linkedin}</span>}
      </div>
      {/* Body */}
      <div style={{ display: "flex", padding: "16px 0" }}>
        {/* Left */}
        <div style={{ flex: 2, padding: "0 24px", borderRight: `2px solid ${t.primary}` }}>
          {(form.college || form.education) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: t.primary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "Arial, sans-serif" }}>Education</div>
              {form.college && <div style={{ fontWeight: 700, fontSize: 10 }}>{form.college}</div>}
              {form.education && <div style={{ fontSize: 9.5, color: "#4b5563", whiteSpace: "pre-line", marginTop: 2 }}>{form.education}</div>}
            </div>
          )}
          {skills.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: t.primary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "Arial, sans-serif" }}>Skills</div>
              {skills.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, fontSize: 9.5 }}>
                  <div style={{ width: 5, height: 5, background: t.accent, borderRadius: "50%" }} /> {s}
                </div>
              ))}
            </div>
          )}
          {langs.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: t.primary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "Arial, sans-serif" }}>Languages</div>
              {langs.map((l, i) => <div key={i} style={{ fontSize: 9.5, marginBottom: 2, color: "#374151" }}>▸ {l}</div>)}
            </div>
          )}
        </div>
        {/* Right */}
        <div style={{ flex: 3, padding: "0 24px" }}>
          {form.workExperience && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: t.primary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "Arial, sans-serif" }}>Work Experience</div>
              <div style={{ fontSize: 9.5, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.workExperience}</div>
            </div>
          )}
          {form.projects && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: t.primary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "Arial, sans-serif" }}>Projects</div>
              <div style={{ fontSize: 9.5, color: "#374151", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.projects}</div>
            </div>
          )}
          {certs.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: t.primary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "Arial, sans-serif" }}>Certifications</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {certs.map((c, i) => <span key={i} style={{ fontSize: 9, border: `1px solid ${t.primary}60`, color: t.primary, padding: "2px 8px", borderRadius: 3 }}>{c}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── TEMPLATE MINI CARD ─────────────────────────────────────────────────── */
function TemplateMiniCard({ t, selected, onSelect }: { t: TemplateConfig; selected: boolean; onSelect: () => void }) {
  const th = t.theme;
  return (
    <button onClick={onSelect} className={`relative rounded-xl border-2 overflow-hidden text-left transition-all hover:scale-105 active:scale-95 ${selected ? "border-[#5B5CF6] shadow-lg shadow-violet-200" : "border-border"}`}>
      {/* Layout preview */}
      <div style={{ height: 56, background: "#fff", position: "relative", overflow: "hidden" }}>
        {t.layout === "sidebar-photo" && (
          <>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "32%", background: th.primary }} />
            <div style={{ position: "absolute", left: "6%", top: 8, width: 18, height: 18, borderRadius: "50%", background: th.accent, border: "2px solid #fff" }} />
            <div style={{ position: "absolute", left: "36%", top: 10, right: 4, height: 5, background: th.dark, borderRadius: 2 }} />
            <div style={{ position: "absolute", left: "36%", top: 18, width: "40%", height: 3, background: th.accent, borderRadius: 2 }} />
            {[26,32,38,44].map((y, i) => <div key={i} style={{ position: "absolute", left: "36%", top: y, right: 4, height: 2, background: "#e5e7eb", borderRadius: 1 }} />)}
          </>
        )}
        {t.layout === "panel-diamond" && (
          <>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "36%", background: "#f8f9fa", borderRight: `2px solid ${th.primary}` }} />
            <div style={{ position: "absolute", left: "9%", top: 6, width: 18, height: 18, background: `${th.primary}22`, border: `2px solid ${th.primary}`, transform: "rotate(45deg)" }} />
            <div style={{ position: "absolute", left: "38%", top: 8 }}>
              <div style={{ width: 60, height: 7, background: th.primary, borderRadius: 1, marginBottom: 2 }} />
              {[0,1,2].map(i => <div key={i} style={{ width: 60 - i * 15, height: 4, background: "#e5e7eb", borderRadius: 1, marginBottom: 2 }}>
                <div style={{ width: `${70 - i * 10}%`, height: 4, background: th.primary, borderRadius: 1 }} />
              </div>)}
            </div>
          </>
        )}
        {t.layout === "header-photo" && (
          <>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 22, background: th.primary }} />
            <div style={{ position: "absolute", right: 6, top: 3, width: 16, height: 16, borderRadius: "50%", background: th.accent, border: "1.5px solid #fff" }} />
            <div style={{ position: "absolute", left: 4, top: 6, width: 50, height: 4, background: "#fff", borderRadius: 2 }} />
            <div style={{ position: "absolute", left: 4, top: 13, width: 35, height: 3, background: th.accent, borderRadius: 2 }} />
            {[26,32,38,44,50].map((y, i) => <div key={i} style={{ position: "absolute", left: 4, top: y, width: i < 3 ? 80 : 40, height: 2, background: "#e5e7eb", borderRadius: 1 }} />)}
          </>
        )}
        {t.layout === "bold-graphic" && (
          <>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 24, background: th.primary }} />
            {[0,1,2].map(i => <div key={i} style={{ position: "absolute", right: 12 + i * 8, top: -3, width: 5, height: 30, background: th.accent, opacity: 0.3 + i * 0.15, transform: "rotate(15deg)" }} />)}
            <div style={{ position: "absolute", left: 4, top: 6, width: 55, height: 5, background: "#fff", borderRadius: 2 }} />
            <div style={{ position: "absolute", left: 4, top: 14, width: 35, height: 3, background: th.accent, borderRadius: 2 }} />
            <div style={{ position: "absolute", top: 24, left: 0, right: 0, height: 8, background: `${th.primary}22` }} />
          </>
        )}
        {t.layout === "split-accent" && (
          <>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: th.primary }} />
            <div style={{ position: "absolute", left: 4, top: 10, width: 50, height: 5, background: th.dark, borderRadius: 2 }} />
            <div style={{ position: "absolute", left: 4, top: 18, width: 35, height: 3, background: th.primary, borderRadius: 2 }} />
            <div style={{ position: "absolute", right: 6, top: 8, width: 16, height: 16, borderRadius: "50%", background: `${th.primary}22`, border: `2px solid ${th.primary}` }} />
            <div style={{ position: "absolute", top: 28, left: 0, right: 0, height: 5, background: th.primary }} />
          </>
        )}
      </div>
      <div className="p-1.5">
        <div className="text-[9px] font-bold truncate">{t.name}</div>
        <div className="text-[8px] text-muted-foreground">{t.theme.name}</div>
      </div>
      {selected && <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#5B5CF6] flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
    </button>
  );
}

const LAYOUT_NAMES: Record<Layout, string> = {
  "sidebar-photo": "Executive",
  "panel-diamond": "Creative",
  "header-photo": "Professional",
  "bold-graphic": "Impact",
  "split-accent": "Elegant",
};
const STEPS = ["Job Role", "Basic Info", "Education", "Skills & Work", "Preview"];

/* ─── MAIN PAGE ──────────────────────────────────────────────────────────── */
export default function ResumeBuilder() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const token = getToken();
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<TemplateConfig>(TEMPLATES[20]!);
  const [autoSelected, setAutoSelected] = useState(false);
  const [filterLayout, setFilterLayout] = useState<Layout | "all">("all");
  const [photo, setPhoto] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    jobRole: "", fullName: "", email: "", mobile: "", city: "", linkedin: "",
    profile: "", education: "", college: "",
    skills: "", workExperience: "", projects: "", certifications: "", languages: "",
  });
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const f = (k: keyof FormData) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value }),
  });

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast({ title: "Photo too large. Max 3MB.", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = ev => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleAutoSelect() {
    const t = autoSelect(form.jobRole, form.skills);
    setSelected(t);
    setAutoSelected(true);
    toast({ title: `Template auto-selected: ${t.name}`, description: `${LAYOUT_NAMES[t.layout]} layout in ${t.theme.name}` });
  }

  const visible = filterLayout === "all" ? TEMPLATES : TEMPLATES.filter(t => t.layout === filterLayout);

  async function handleBuild() {
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...form, title: form.jobRole || "My Resume", template: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to build resume");
      setAtsScore(data.atsScore ?? 72);
      setStep(4);
      toast({ title: `Resume built! ATS Score: ${data.atsScore}% 🎉` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    const content = previewRef.current?.innerHTML || "";
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${form.fullName || "Resume"} - HirePilot</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{size:A4;margin:0}}</style>
      </head><body>${content}</body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 400);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-24 px-4 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6] flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Resume Builder</h1>
              <p className="text-sm text-muted-foreground">50 templates · Photo upload · Print as PDF</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-shrink-0">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all ${i < step ? "bg-[#5B5CF6] text-white" : i === step ? "bg-[#5B5CF6] text-white shadow-md" : "bg-muted text-muted-foreground"}`}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-xs whitespace-nowrap hidden sm:inline ${i === step ? "text-[#5B5CF6] font-semibold" : "text-muted-foreground"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`w-4 h-0.5 ${i < step ? "bg-[#5B5CF6]" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ─── STEP 0: Job Role + Template ─── */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200">
                  <Label className="font-semibold">Your Target Job Role *</Label>
                  <div className="flex gap-2 mt-2">
                    <Input {...f("jobRole")} placeholder="e.g. Software Developer, Marketing Manager, CA, Fresher..." className="flex-1" />
                    <Button onClick={handleAutoSelect} disabled={!form.jobRole} className="gap-1.5 bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 flex-shrink-0">
                      <Wand2 className="w-4 h-4" /> Auto
                    </Button>
                  </div>
                  {autoSelected && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" /> Auto-selected: {selected.name} ({LAYOUT_NAMES[selected.layout]}, {selected.theme.name})
                    </motion.div>
                  )}
                </div>

                {/* Layout filter */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Choose Template Layout</span>
                    <span className="text-xs text-muted-foreground ml-auto">{visible.length} templates</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {(["all", "sidebar-photo", "panel-diamond", "header-photo", "bold-graphic", "split-accent"] as const).map(l => (
                      <button key={l} onClick={() => setFilterLayout(l)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterLayout === l ? "bg-[#5B5CF6] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                        {l === "all" ? "All 50" : LAYOUT_NAMES[l as Layout]}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1">
                    {visible.map(t => (
                      <TemplateMiniCard key={t.id} t={t} selected={selected.id === t.id} onSelect={() => { setSelected(t); setAutoSelected(false); }} />
                    ))}
                  </div>
                </div>

                <Button onClick={() => setStep(1)} disabled={!form.jobRole} className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2 h-11">
                  Continue with {selected.name} <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* ─── STEP 1: Basic Info + Photo ─── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                {/* Photo upload */}
                <div className="p-4 rounded-2xl border border-dashed border-violet-300 bg-violet-50/50">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {photo ? (
                        <div className="relative">
                          <img src={photo} className="w-16 h-16 rounded-full object-cover border-2 border-[#5B5CF6]" />
                          <button onClick={() => setPhoto(null)} className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center">
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-violet-100 border-2 border-dashed border-violet-300 flex items-center justify-center">
                          <Camera className="w-6 h-6 text-violet-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Profile Photo</p>
                      <p className="text-xs text-muted-foreground mb-2">Will appear in your resume template</p>
                      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                      <Button size="sm" variant="outline" onClick={() => photoInputRef.current?.click()} className="gap-1.5 text-xs">
                        <Camera className="w-3.5 h-3.5" /> {photo ? "Change Photo" : "Upload Photo"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Full Name *</Label><Input {...f("fullName")} placeholder="Priya Sharma" className="mt-1" /></div>
                  <div><Label>City</Label><Input {...f("city")} placeholder="Bangalore" className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email *</Label><Input {...f("email")} type="email" placeholder="priya@gmail.com" className="mt-1" /></div>
                  <div><Label>Mobile</Label><Input {...f("mobile")} placeholder="9999999999" inputMode="numeric" className="mt-1" /></div>
                </div>
                <div><Label>LinkedIn / Portfolio (optional)</Label><Input {...f("linkedin")} placeholder="linkedin.com/in/priyasharma" className="mt-1" /></div>
                <div>
                  <Label>Professional Summary / Profile</Label>
                  <Textarea {...f("profile")} placeholder="A passionate software developer with 2 years of experience in React and Node.js, seeking a challenging role to grow and contribute..." className="mt-1 h-20 resize-none" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Back</Button>
                  <Button onClick={() => setStep(2)} disabled={!form.fullName || !form.email} className="flex-1 bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 2: Education ─── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div><Label>College / University</Label><Input {...f("college")} placeholder="e.g. VIT Pune, Mumbai University" className="mt-1" /></div>
                <div><Label>Education Details</Label><Textarea {...f("education")} placeholder="B.Tech CSE (2024) — 8.5 CGPA&#10;12th CBSE — 85% (2020)&#10;10th — 90% (2018)" className="mt-1 h-28 resize-none" /></div>
                <div><Label>Languages Known</Label><Input {...f("languages")} placeholder="English (Fluent), Hindi (Fluent), Marathi (Native)" className="mt-1" /></div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button onClick={() => setStep(3)} className="flex-1 bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 3: Skills & Work ─── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <Label>Skills *</Label>
                  <Textarea {...f("skills")} placeholder="JavaScript, React, Python, SQL, Communication, Leadership, Git..." className="mt-1 h-20 resize-none" />
                  <p className="text-xs text-muted-foreground mt-1">Separate by commas — shown as badges or skill bars in your template</p>
                </div>
                <div><Label>Work Experience</Label><Textarea {...f("workExperience")} placeholder="Software Intern at XYZ Corp (June–Aug 2023)&#10;• Built REST APIs using Node.js&#10;• Reduced load time by 30%" className="mt-1 h-24 resize-none" /></div>
                <div><Label>Projects</Label><Textarea {...f("projects")} placeholder="E-Commerce App: Built with React & Node.js, 500+ users&#10;AI Chatbot: Python & OpenAI API, deployed on AWS" className="mt-1 h-24 resize-none" /></div>
                <div><Label>Certifications</Label><Input {...f("certifications")} placeholder="AWS Certified Cloud Practitioner, Google Analytics, HackerRank Python" className="mt-1" /></div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                  <Button onClick={handleBuild} disabled={saving || !form.skills} className="flex-1 bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 gap-2 h-11">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Building...</> : <><Sparkles className="w-4 h-4" /> Build Resume</>}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 4: Preview ─── */}
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
                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => setStep(0)} variant="outline" size="sm">Change Template</Button>
                  <Button onClick={() => setStep(1)} variant="outline" size="sm">Edit Info</Button>
                  <Button onClick={handlePrint} className="gap-1.5 bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0 ml-auto" size="sm">
                    <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                  </Button>
                </div>
                {/* Live visual resume */}
                <div className="rounded-2xl border-2 border-[#5B5CF6]/20 overflow-hidden shadow-xl shadow-violet-100/50">
                  <div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Preview — {selected.name} ({selected.theme.name})</span>
                    <span className="text-[10px] text-muted-foreground">Print → Save as PDF</span>
                  </div>
                  <div className="overflow-y-auto max-h-[600px] bg-white" ref={previewRef}>
                    <ResumePreview form={form} photo={photo} tmpl={selected} />
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">💡 In Print dialog: select "Save as PDF" & set margins to "None"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
