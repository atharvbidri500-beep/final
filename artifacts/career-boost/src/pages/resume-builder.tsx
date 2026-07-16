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
import { UpgradeModal } from "@/components/UpgradeModal";

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
  let best = TEMPLATES[0]!;
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
  const nameParts = (form.fullName || "Your Name").split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");
  const name = form.fullName || "Your Name";
  const role = form.jobRole || "Your Job Role";

  /* Sidebar section header — white text with accent underline */
  const sidebarSec = (title: string) => (
    <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: 2, color: "#fff", borderBottom: `1px solid rgba(255,255,255,0.35)`, paddingBottom: 4, marginBottom: 9, marginTop: 2 }}>{title}</div>
  );

  /* Main section header — dark text with bottom border */
  const mainSec = (title: string) => (
    <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: 2.5, color: t.dark, borderBottom: `2px solid ${t.dark}`, paddingBottom: 3, marginBottom: 9, marginTop: 2 }}>{title}</div>
  );

  const photoEl = (size: number) => photo ? (
    <img src={photo} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `4px solid rgba(255,255,255,0.9)`, display: "block" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "4px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    </div>
  );

  /* ── SIDEBAR-PHOTO layout — EXACTLY like reference image ── */
  if (tmpl.layout === "sidebar-photo") {
    const workLines = form.workExperience ? form.workExperience.split("\n").filter(Boolean) : [];
    const projectLines = form.projects ? form.projects.split("\n").filter(Boolean) : [];

    return (
      <div style={{ fontFamily: "'Arial', sans-serif", display: "flex", width: "100%", minHeight: 820, background: "#fff" }}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{ width: "31%", background: t.primary, color: "#fff", padding: "28px 18px 28px 18px", display: "flex", flexDirection: "column", gap: 0 }}>

          {/* Photo — centered, large circle with white border */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
            <div style={{ borderRadius: "50%", padding: 3, background: "rgba(255,255,255,0.2)" }}>
              {photoEl(96)}
            </div>
          </div>

          {/* CONTACT */}
          <div style={{ marginBottom: 18 }}>
            {sidebarSec("Contact")}
            {form.mobile && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 7, fontSize: 9 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)" style={{ flexShrink: 0, marginTop: 1 }}><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
                <span style={{ opacity: 0.9, lineHeight: 1.4 }}>+91 {form.mobile}</span>
              </div>
            )}
            {form.email && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 7, fontSize: 9 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)" style={{ flexShrink: 0, marginTop: 1 }}><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                <span style={{ opacity: 0.9, wordBreak: "break-all", lineHeight: 1.4 }}>{form.email}</span>
              </div>
            )}
            {form.city && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 7, fontSize: 9 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <span style={{ opacity: 0.9, lineHeight: 1.4 }}>{form.city}</span>
              </div>
            )}
            {form.linkedin && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 7, fontSize: 9 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)" style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <span style={{ opacity: 0.9, wordBreak: "break-all", lineHeight: 1.4 }}>{form.linkedin}</span>
              </div>
            )}
          </div>

          {/* EDUCATION */}
          {(form.college || form.education) && (
            <div style={{ marginBottom: 18 }}>
              {sidebarSec("Education")}
              {form.education && form.education.split("\n").filter(Boolean).map((line, i) => (
                <div key={i} style={{ fontSize: 8.5, opacity: 0.88, marginBottom: 5, lineHeight: 1.5 }}>{line}</div>
              ))}
              {form.college && <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.95, marginBottom: 2, lineHeight: 1.4 }}>{form.college.toUpperCase()}</div>}
            </div>
          )}

          {/* SKILLS */}
          {skills.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              {sidebarSec("Skills")}
              {skills.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, fontSize: 9 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.8)", flexShrink: 0 }} />
                  <span style={{ opacity: 0.9 }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* LANGUAGES */}
          {langs.length > 0 && (
            <div style={{ marginBottom: 0 }}>
              {sidebarSec("Languages")}
              {langs.map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, fontSize: 9 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.8)", flexShrink: 0 }} />
                  <span style={{ opacity: 0.9 }}>{l}</span>
                </div>
              ))}
            </div>
          )}

          {/* CERTIFICATIONS in sidebar */}
          {certs.length > 0 && (
            <div style={{ marginTop: 18 }}>
              {sidebarSec("Certifications")}
              {certs.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 5, fontSize: 8.5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.8)", flexShrink: 0, marginTop: 3 }} />
                  <span style={{ opacity: 0.9, lineHeight: 1.4 }}>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT MAIN CONTENT ── */}
        <div style={{ flex: 1, padding: "32px 28px 24px 28px", background: "#fff", display: "flex", flexDirection: "column", gap: 0 }}>

          {/* NAME — large, bold first name + light last name (like "RICHARD SANCHEZ") */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 30, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.5, color: "#1a1a2e", lineHeight: 1, marginBottom: 6 }}>
              {firstName}
              {lastName && <span style={{ fontWeight: 300 }}> {lastName}</span>}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 400, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>{role}</div>
            <div style={{ width: 48, height: 3, background: t.primary, borderRadius: 2 }} />
          </div>

          {/* PROFILE */}
          {form.profile && (
            <div style={{ marginBottom: 18 }}>
              {mainSec("Profile")}
              <div style={{ fontSize: 9.5, color: "#4b5563", lineHeight: 1.75, textAlign: "justify" }}>{form.profile}</div>
            </div>
          )}

          {/* WORK EXPERIENCE — with left timeline dot */}
          {workLines.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              {mainSec("Work Experience")}
              {workLines.map((line, i) => {
                const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*");
                const isHeader = !isBullet && i === 0 || (!isBullet && workLines[i-1]?.trim() === "");
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: isBullet ? 3 : 6 }}>
                    {!isBullet && (
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.primary, flexShrink: 0, marginTop: 4 }} />
                    )}
                    {isBullet && <div style={{ width: 7, flexShrink: 0 }} />}
                    <div style={{ fontSize: isBullet ? 9 : 9.5, color: isBullet ? "#4b5563" : "#111827", fontWeight: isBullet ? 400 : (line.includes(":") ? 700 : 400), lineHeight: 1.6 }}>
                      {line.replace(/^[•\-*]\s*/, "→ ")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PROJECTS */}
          {projectLines.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              {mainSec("Projects")}
              {projectLines.map((line, i) => {
                const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*");
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: isBullet ? 3 : 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: isBullet ? "transparent" : t.primary, flexShrink: 0, marginTop: 4 }} />
                    <div style={{ fontSize: isBullet ? 9 : 9.5, color: isBullet ? "#4b5563" : "#111827", fontWeight: isBullet ? 400 : 600, lineHeight: 1.6 }}>
                      {line.replace(/^[•\-*]\s*/, "→ ")}
                    </div>
                  </div>
                );
              })}
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
          <div style={{ flexShrink: 0 }}>{photoEl(80)}</div>
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
        {photoEl(75)}
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
  const S = { position: "absolute" as const };
  return (
    <button onClick={onSelect} className={`relative rounded-xl border-2 overflow-hidden text-left transition-all hover:scale-105 active:scale-95 ${selected ? "border-[#5B5CF6] shadow-lg shadow-violet-200" : "border-border"}`}>
      {/* Layout preview — detailed A4-like thumbnail */}
      <div style={{ height: 80, background: "#fff", position: "relative", overflow: "hidden" }}>

        {/* ── EXECUTIVE (sidebar-photo) ── */}
        {t.layout === "sidebar-photo" && (
          <>
            {/* Sidebar */}
            <div style={{ ...S, left: 0, top: 0, bottom: 0, width: "33%", background: th.primary }} />
            {/* Photo circle */}
            <div style={{ ...S, left: "7%", top: 5, width: 20, height: 20, borderRadius: "50%", background: `${th.accent}88`, border: "2.5px solid rgba(255,255,255,0.9)" }} />
            {/* Sidebar section lines */}
            <div style={{ ...S, left: "5%", top: 30, width: "22%", height: 1.5, background: "rgba(255,255,255,0.4)" }} />
            {[35,40,45,51,57].map((y, i) => <div key={i} style={{ ...S, left: "5%", top: y, width: `${18 - i * 2}%`, height: 1.5, background: "rgba(255,255,255,0.25)" }} />)}
            {/* Name block right */}
            <div style={{ ...S, left: "37%", top: 8, right: 3, height: 6, background: th.dark, borderRadius: 2 }} />
            <div style={{ ...S, left: "37%", top: 17, width: "32%", height: 3.5, background: "#9ca3af", borderRadius: 1.5 }} />
            <div style={{ ...S, left: "37%", top: 23, width: 20, height: 2, background: th.primary, borderRadius: 1 }} />
            {/* Right section headers + lines */}
            <div style={{ ...S, left: "37%", top: 30, width: "28%", height: 2, background: th.dark, borderRadius: 1 }} />
            <div style={{ ...S, left: "37%", top: 34, right: 3, height: 1, background: "#e5e7eb" }} />
            {[38,42,46].map((y, i) => <div key={i} style={{ ...S, left: "40%", top: y, width: `${35 - i * 5}%`, height: 1.5, background: "#d1d5db", borderRadius: 1 }} />)}
            <div style={{ ...S, left: "37%", top: 52, width: "25%", height: 2, background: th.dark, borderRadius: 1 }} />
            <div style={{ ...S, left: "37%", top: 56, right: 3, height: 1, background: "#e5e7eb" }} />
            {[60,65,70].map((y, i) => <div key={i} style={{ ...S, left: "40%", top: y, width: `${32 - i * 4}%`, height: 1.5, background: "#d1d5db", borderRadius: 1 }} />)}
          </>
        )}

        {/* ── CREATIVE (panel-diamond) ── */}
        {t.layout === "panel-diamond" && (
          <>
            <div style={{ ...S, left: 0, top: 0, bottom: 0, width: "34%", background: "#f1f5f9", borderRight: `2.5px solid ${th.primary}` }} />
            {/* Diamond photo */}
            <div style={{ ...S, left: "6%", top: 5, width: 18, height: 18, background: `${th.primary}22`, border: `2px solid ${th.primary}`, transform: "rotate(45deg)" }} />
            {/* Left panel lines */}
            <div style={{ ...S, left: "5%", top: 29, width: "22%", height: 2, background: th.primary, borderRadius: 1 }} />
            {[34,38,43,48,53,58,63,68].map((y, i) => <div key={i} style={{ ...S, left: "5%", top: y, width: `${20 - (i % 3) * 4}%`, height: 1.5, background: "#94a3b8", borderRadius: 1 }} />)}
            {/* Right content */}
            <div style={{ ...S, left: "38%", top: 6, right: 3, height: 5, background: th.primary, borderRadius: 1 }} />
            <div style={{ ...S, left: "38%", top: 14, width: "30%", height: 3, background: "#cbd5e1", borderRadius: 1 }} />
            {/* Skill bars */}
            {[22,30,38,46].map((y, i) => (
              <div key={i} style={{ ...S, left: "38%", top: y, right: 3, height: 4, background: "#f1f5f9", borderRadius: 2 }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: `${75 - i * 10}%`, height: 4, background: th.primary, borderRadius: 2 }} />
              </div>
            ))}
            {[55,62,69].map((y, i) => <div key={i} style={{ ...S, left: "38%", top: y, width: `${40 - i * 8}%`, height: 1.5, background: "#cbd5e1", borderRadius: 1 }} />)}
          </>
        )}

        {/* ── PROFESSIONAL (header-photo) ── */}
        {t.layout === "header-photo" && (
          <>
            <div style={{ ...S, top: 0, left: 0, right: 0, height: 26, background: th.primary }} />
            {/* Photo circle in header */}
            <div style={{ ...S, right: 5, top: 5, width: 16, height: 16, borderRadius: "50%", background: `${th.accent}99`, border: "2px solid rgba(255,255,255,0.9)" }} />
            {/* Name + role in header */}
            <div style={{ ...S, left: 5, top: 7, width: 55, height: 5, background: "rgba(255,255,255,0.9)", borderRadius: 1.5 }} />
            <div style={{ ...S, left: 5, top: 15, width: 38, height: 3, background: th.accent, borderRadius: 1, opacity: 0.85 }} />
            {/* Two-column body */}
            <div style={{ ...S, top: 30, left: 0, width: "50%", bottom: 0, borderRight: "1px solid #f3f4f6", padding: "4px 4px" }}>
              <div style={{ ...S, left: 4, top: 32, width: 30, height: 2, background: th.primary, borderRadius: 1 }} />
              {[36,40,44,48,52,56,60,65,70].map((y, i) => <div key={i} style={{ ...S, left: 4, top: y, width: `${32 - (i % 4) * 4}%`, height: 1.5, background: "#e5e7eb", borderRadius: 1 }} />)}
            </div>
            <div style={{ ...S, top: 30, right: 0, width: "50%", bottom: 0 }}>
              <div style={{ ...S, right: 4, left: "52%", top: 32, height: 2, background: th.primary, borderRadius: 1 }} />
              {[36,40,44,48,52,57,62].map((y, i) => <div key={i} style={{ ...S, left: "53%", top: y, width: `${28 - (i % 3) * 5}%`, height: 1.5, background: "#e5e7eb", borderRadius: 1 }} />)}
            </div>
          </>
        )}

        {/* ── IMPACT (bold-graphic) ── */}
        {t.layout === "bold-graphic" && (
          <>
            <div style={{ ...S, top: 0, left: 0, right: 0, height: 28, background: th.primary }} />
            {/* Diagonal graphic accents */}
            {[0,1,2,3].map(i => <div key={i} style={{ ...S, right: 8 + i * 9, top: -4, width: 4, height: 36, background: th.accent, opacity: 0.15 + i * 0.1, transform: "rotate(12deg)" }} />)}
            {/* Name */}
            <div style={{ ...S, left: 5, top: 7, width: 60, height: 6, background: "rgba(255,255,255,0.95)", borderRadius: 2 }} />
            <div style={{ ...S, left: 5, top: 16, width: 40, height: 3.5, background: th.accent, borderRadius: 1.5, opacity: 0.9 }} />
            {/* Accent divider band */}
            <div style={{ ...S, top: 28, left: 0, right: 0, height: 6, background: `${th.accent}22` }} />
            {/* Two column content */}
            {[37,42,47,52,57,62,67,72].map((y, i) => (
              <div key={i} style={{ ...S, left: i % 2 === 0 ? 4 : "52%", top: y, width: i % 2 === 0 ? "44%" : "44%", height: 1.5, background: "#e5e7eb", borderRadius: 1 }} />
            ))}
            {/* Section dot accents */}
            {[37,52].map((y, i) => <div key={i} style={{ ...S, left: 4, top: y, width: 5, height: 5, borderRadius: "50%", background: th.accent }} />)}
          </>
        )}

        {/* ── ELEGANT (split-accent) ── */}
        {t.layout === "split-accent" && (
          <>
            {/* Top accent bar */}
            <div style={{ ...S, top: 0, left: 0, right: 0, height: 5, background: th.primary }} />
            {/* Photo top right */}
            <div style={{ ...S, right: 5, top: 9, width: 20, height: 20, borderRadius: "50%", background: `${th.primary}18`, border: `2px solid ${th.primary}` }} />
            {/* Name */}
            <div style={{ ...S, left: 5, top: 10, width: 58, height: 6, background: th.dark, borderRadius: 2 }} />
            <div style={{ ...S, left: 5, top: 19, width: 40, height: 3, background: th.primary, borderRadius: 1.5 }} />
            {/* Accent stripe before body */}
            <div style={{ ...S, top: 30, left: 0, right: 0, height: 5, background: th.primary }} />
            {/* Body lines */}
            {[40,45,50,55,60,65,70].map((y, i) => (
              <div key={i} style={{ ...S, left: i % 2 === 0 ? 4 : "52%", top: y, width: `${i % 3 === 0 ? 35 : 28}%`, height: 1.5, background: "#e2e8f0", borderRadius: 1 }} />
            ))}
            {/* Section labels */}
            {[38,55].map((y, i) => <div key={i} style={{ ...S, left: 4, top: y, width: 20, height: 2.5, background: th.primary, borderRadius: 1 }} />)}
          </>
        )}
      </div>
      <div className="px-2 py-1.5">
        <div className="text-[9px] font-bold truncate leading-tight">{t.name}</div>
        <div className="text-[8px] text-muted-foreground">{t.category}</div>
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
  const [selected, setSelected] = useState<TemplateConfig>(TEMPLATES[0]!);
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
