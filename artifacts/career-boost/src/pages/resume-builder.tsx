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
import { apiUrl } from "@/lib/api";
import { UpgradeModal } from "@/components/UpgradeModal";

/* ─── COLOR THEME ──────────────────────────────────────────────────────────── */
interface Theme {
  name: string;
  primary: string;
  accent: string;
  dark: string;
  light: string;
  tag: string;
  badge: string;
}

/* ─── LAYOUT TYPES (5) ─────────────────────────────────────────────────────── */
type Layout = "header-bar" | "header-split" | "sidebar-dark" | "sidebar-light" | "header-contact";

interface TemplateConfig {
  id: string;
  name: string;
  layout: Layout;
  theme: Theme;
  category: string;
  keywords: string[];
}

/* ─── 6 ORIGINAL TEMPLATES ─────────────────────────────────────────────────── */
const TEMPLATES: TemplateConfig[] = [
  {
    id: "elegant-peach",
    name: "Elegant Peach",
    layout: "header-bar",
    theme: { name: "Peach", primary: "#E8B89D", accent: "#D4956A", dark: "#1a1a2e", light: "#ffffff", tag: "🍑", badge: "#E8B89D" },
    category: "Professional",
    keywords: ["manager","executive","mba","director","business","strategy","consultant","hr","admin","marketing","lead","operations"],
  },
  {
    id: "classic-blue",
    name: "Classic Blue",
    layout: "header-split",
    theme: { name: "Sky Blue", primary: "#6BB8E0", accent: "#4A9ECE", dark: "#1a1a2e", light: "#ffffff", tag: "🔵", badge: "#6BB8E0" },
    category: "Universal",
    keywords: ["developer","engineer","software","tech","data","analyst","fresher","graduate","btech","bca","mca","python","react","java","student"],
  },
  {
    id: "sidebar-pink",
    name: "Sidebar Pink",
    layout: "sidebar-light",
    theme: { name: "Pink", primary: "#F5D5D5", accent: "#D4956A", dark: "#1a1a2e", light: "#ffffff", tag: "🌸", badge: "#1a1a2e" },
    category: "Creative",
    keywords: ["design","ui","ux","graphic","creative","brand","content","artist","social media","copywriter","photographer"],
  },
  {
    id: "sidebar-peach",
    name: "Sidebar Peach",
    layout: "sidebar-light",
    theme: { name: "Warm Peach", primary: "#E8C4A0", accent: "#D4956A", dark: "#1a1a2e", light: "#ffffff", tag: "🍑", badge: "#E8C4A0" },
    category: "Minimal",
    keywords: ["banking","finance","ca","accountant","audit","tax","chartered","insurance","investment","lawyer","legal"],
  },
  {
    id: "sidebar-blush",
    name: "Blush Pink",
    layout: "sidebar-light",
    theme: { name: "Blush", primary: "#F0D0D0", accent: "#E8A0A0", dark: "#1a1a2e", light: "#ffffff", tag: "🌹", badge: "#1a1a2e" },
    category: "Elegant",
    keywords: ["fashion","beauty","lifestyle","photography","media","writer","editor","hospitality","travel"],
  },
  {
    id: "sidebar-dark",
    name: "Dark Sidebar",
    layout: "sidebar-dark",
    theme: { name: "Charcoal", primary: "#2D2D2D", accent: "#666666", dark: "#1a1a2e", light: "#ffffff", tag: "⚫", badge: "#2D2D2D" },
    category: "Bold",
    keywords: ["sales","bde","business development","target","revenue","growth","startup","product","entrepreneur","real estate"],
  },
];

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

/* ─── MAIN RESUME RENDERER ──────────────────────────────────────────────── */
function ResumePreview({ form, photo, tmpl }: { form: FormData; photo: string | null; tmpl: TemplateConfig }) {
  const { theme: t } = tmpl;
  const skills = form.skills.split(/[,，\n]/).map(s => s.trim()).filter(Boolean);
  const certs = form.certifications ? form.certifications.split(/[,，\n]/).map(s => s.trim()).filter(Boolean) : [];
  const langs = form.languages ? form.languages.split(/[,，\n]/).map(s => s.trim()).filter(Boolean) : [];
  const name = form.fullName || "Your Name";
  const role = form.jobRole || "Your Job Role";
  const workLines = form.workExperience ? form.workExperience.split("\n").filter(Boolean) : [];
  const projectLines = form.projects ? form.projects.split("\n").filter(Boolean) : [];

  const photoEl = (size: number, shape: "circle" | "rect" = "circle") => photo ? (
    <img src={photo} style={{ width: size, height: size, borderRadius: shape === "circle" ? "50%" : 6, objectFit: "cover" as const, border: `3px solid ${t.accent}`, display: "block" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: shape === "circle" ? "50%" : 6, background: `${t.primary}18`, border: `3px dashed ${t.accent}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill={t.accent}>
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    </div>
  );

  /* Standard underline section header */
  const sectionHeader = (title: string, color?: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, paddingBottom: 4, borderBottom: `2px solid ${color || t.primary}` }}>
      <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: 2, color: color || t.primary }}>{title}</span>
    </div>
  );

  /* Card badge header (for sidebar templates with dark navy/colored cards) */
  const badgeHeader = (title: string, bg?: string, fg?: string) => (
    <div style={{ background: bg || t.badge, color: fg || t.light, padding: "6px 10px", borderRadius: 4, fontSize: 9, fontWeight: 800, textAlign: "center" as const, marginBottom: 10, letterSpacing: 1 }}>{title}</div>
  );

  /* Thin accent bar header */
  const barHeader = (title: string, color?: string) => (
    <div style={{ marginBottom: 8, paddingBottom: 4, borderBottom: `2px solid ${color || t.primary}` }}>
      <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: 2, color: color || t.dark }}>{title}</span>
    </div>
  );

  const contactItem = (icon: string, text: string) => text ? (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, fontSize: 8.5, color: t.dark }}>
      <span style={{ fontSize: 9 }}>{icon}</span>
      <span>{text}</span>
    </div>
  ) : null;

  const skillBar = (name: string, pct: number, color?: string) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, marginBottom: 2, color: t.dark }}>
        <span style={{ fontWeight: 600 }}>{name}</span><span style={{ color: color || t.accent }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2 }}>
        <div style={{ height: 4, width: `${pct}%`, background: `linear-gradient(90deg, ${color || t.primary}, ${color || t.accent})`, borderRadius: 2 }} />
      </div>
    </div>
  );

  const contactItemSidebar = (icon: string, text: string, color?: string) => text ? (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, fontSize: 8.5, color: color || "rgba(255,255,255,0.9)" }}>
      <span style={{ fontSize: 9 }}>{icon}</span>
      <span>{text}</span>
    </div>
  ) : null;

  const socialItem = (icon: string, text: string) => text ? (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontSize: 8, color: t.dark }}>
      <span style={{ fontSize: 9 }}>{icon}</span>
      <span>{text}</span>
    </div>
  ) : null;

  /* ── TEMPLATE 1: dc1c — Elegant Peach (header-bar) ── */
  if (tmpl.id === "elegant-peach") {
    return (
      <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", width: "100%", minHeight: 820, background: "#fff" }}>
        {/* Peach header bar */}
        <div style={{ display: "flex", alignItems: "center", background: t.primary, padding: "20px 28px", gap: 20 }}>
          <div style={{ flexShrink: 0 }}>{photoEl(72, "rect")}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: t.dark, letterSpacing: 1 }}>{name.toUpperCase()}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.dark, letterSpacing: 2, textTransform: "uppercase" as const, marginTop: 2, opacity: 0.7 }}>{role}</div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
              {form.city && <span style={{ fontSize: 8, color: t.dark }}>📍 {form.city}</span>}
              {form.email && <span style={{ fontSize: 8, color: t.dark }}>✉️ {form.email}</span>}
              {form.mobile && <span style={{ fontSize: 8, color: t.dark }}>📞 +91 {form.mobile}</span>}
              {form.linkedin && <span style={{ fontSize: 8, color: t.dark }}>🔗 {form.linkedin}</span>}
            </div>
          </div>
        </div>

        {/* Two-column body */}
        <div style={{ display: "flex", padding: "14px 28px", gap: 24 }}>
          {/* Left column */}
          <div style={{ flex: 1 }}>
            {form.profile && (
              <div style={{ marginBottom: 14 }}>
                {sectionHeader("About Me")}
                <div style={{ fontSize: 8.5, color: "#444", lineHeight: 1.6 }}>{form.profile}</div>
              </div>
            )}

            {sectionHeader("Skills & Expertise")}
            {skills.map((s, i) => skillBar(s, Math.max(50, 95 - i * 8)))}

            {langs.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {sectionHeader("Language")}
                {langs.map((l, i) => <div key={i} style={{ fontSize: 8.5, marginBottom: 4, color: "#333" }}>• {l}</div>)}
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ flex: 1.2 }}>
            {sectionHeader("Work Experience")}
            {workLines.length > 0 ? workLines.map((line, i) => (
              <div key={i} style={{ fontSize: 8.5, color: "#333", marginBottom: 5, lineHeight: 1.5, paddingLeft: 8, borderLeft: `2px solid ${t.accent}` }}>
                {line.startsWith("•") ? line : `• ${line}`}
              </div>
            )) : <div style={{ fontSize: 8.5, color: "#999", fontStyle: "italic" }}>Add your work experience</div>}

            <div style={{ marginTop: 14 }}>
              {sectionHeader("Education")}
              <div style={{ fontSize: 8.5, color: "#333", lineHeight: 1.6, whiteSpace: "pre-line" }}>{form.education || "Add your education details"}</div>
              {form.college && <div style={{ fontSize: 8, color: t.primary, fontWeight: 700, marginTop: 3 }}>{form.college}</div>}
            </div>

            <div style={{ marginTop: 14 }}>
              {sectionHeader("Social")}
              {form.linkedin && <div style={{ fontSize: 8, marginBottom: 3, color: "#333" }}>🔗 {form.linkedin}</div>}
              {form.email && <div style={{ fontSize: 8, marginBottom: 3, color: "#333" }}>✉️ yourwebsite.com</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── TEMPLATE 2: b4de — Classic Blue (header-split) ── */
  if (tmpl.id === "classic-blue") {
    return (
      <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", width: "100%", minHeight: 820, background: "#fff" }}>
        {/* Blue header */}
        <div style={{ display: "flex", background: t.primary, padding: "22px 28px", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: t.light, letterSpacing: 1 }}>{name.toUpperCase()}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.light, letterSpacing: 2, textTransform: "uppercase" as const, marginTop: 3, opacity: 0.8 }}>{role}</div>
          </div>
          <div style={{ flexShrink: 0 }}>{photoEl(76, "rect")}</div>
        </div>

        {/* About Me full width */}
        {form.profile && (
          <div style={{ padding: "14px 28px", background: `${t.primary}15` }}>
            {sectionHeader("About Me", t.primary)}
            <div style={{ fontSize: 8.5, color: "#444", lineHeight: 1.6 }}>{form.profile}</div>
          </div>
        )}

        {/* Two-column body */}
        <div style={{ display: "flex", padding: "14px 28px", gap: 24 }}>
          <div style={{ flex: 1.2 }}>
            {sectionHeader("Work Experience", t.primary)}
            {workLines.length > 0 ? workLines.map((line, i) => (
              <div key={i} style={{ fontSize: 8.5, color: "#333", marginBottom: 5, lineHeight: 1.5, paddingLeft: 8, borderLeft: `2px solid ${t.accent}` }}>
                {line.startsWith("•") ? line : `• ${line}`}
              </div>
            )) : <div style={{ fontSize: 8.5, color: "#999", fontStyle: "italic" }}>Add your work experience</div>}

            <div style={{ marginTop: 14 }}>
              {sectionHeader("Education", t.primary)}
              <div style={{ fontSize: 8.5, color: "#333", lineHeight: 1.6, whiteSpace: "pre-line" }}>{form.education || "Add your education details"}</div>
              {form.college && <div style={{ fontSize: 8, color: t.primary, fontWeight: 700, marginTop: 3 }}>{form.college}</div>}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            {sectionHeader("Skills", t.primary)}
            {skills.map((s, i) => skillBar(s, Math.max(50, 95 - i * 8)))}

            <div style={{ marginTop: 14 }}>
              {sectionHeader("References", t.primary)}
              <div style={{ fontSize: 8.5, color: "#333", lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700 }}>Paul Anderson</div>
                <div>Web Developing LTD</div>
                <div>Phone: +000-000-0000</div>
                <div>Email: www.example.com</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom contact bar */}
        <div style={{ display: "flex", justifyContent: "space-around", background: t.primary, padding: "10px 28px", marginTop: 8, gap: 20 }}>
          <div style={{ fontSize: 8, color: t.light }}><span style={{ fontWeight: 700 }}>CONTACT INFO :</span></div>
          {form.mobile && <span style={{ fontSize: 8, color: t.light }}>📞 +91 {form.mobile}</span>}
          {form.email && <span style={{ fontSize: 8, color: t.light }}>✉️ {form.email}</span>}
          {form.city && <span style={{ fontSize: 8, color: t.light }}>📍 {form.city}, State,00000</span>}
        </div>
      </div>
    );
  }

  /* ── TEMPLATE 6: 34f4 — Dark Sidebar ── */
  if (tmpl.id === "sidebar-dark") {
    return (
      <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", width: "100%", minHeight: 820, background: "#fff" }}>
        {/* Full-width dark About Me */}
        <div style={{ background: t.primary, color: t.light, padding: "18px 28px" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0 }}>{photoEl(60, "rect")}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1, marginBottom: 2 }}>{name.toUpperCase()}</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" as const, opacity: 0.7, marginBottom: 8 }}>{role}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, paddingBottom: 4, borderBottom: `2px solid ${t.light}` }}>
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: 2 }}>ABOUT ME</span>
              </div>
              <div style={{ fontSize: 8.5, lineHeight: 1.6, opacity: 0.9 }}>{form.profile || "Add your professional summary"}</div>
            </div>
          </div>
        </div>

        {/* Two-column body */}
        <div style={{ display: "flex", minHeight: 600 }}>
          {/* Dark sidebar */}
          <div style={{ width: "32%", background: t.primary, color: t.light, padding: "18px 16px" }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: 2, marginBottom: 8, paddingBottom: 4, borderBottom: `2px solid ${t.light}` }}>CONTACT INFO</div>
              {contactItemSidebar("📞", form.mobile ? `+91 ${form.mobile}` : "")}
              {contactItemSidebar("✉️", form.email)}
              {contactItemSidebar("📍", form.city)}
            </div>

            {langs.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: 2, marginBottom: 8, paddingBottom: 4, borderBottom: `2px solid ${t.light}` }}>LANGUAGE</div>
                {langs.map((l, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.9)", marginBottom: 2 }}>{l}</div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
                      <div style={{ height: 3, width: `${85 - i * 10}%`, background: "rgba(255,255,255,0.7)", borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right content */}
          <div style={{ flex: 1, padding: "18px 24px" }}>
            {sectionHeader("Work Experience")}
            {workLines.length > 0 ? workLines.map((line, i) => (
              <div key={i} style={{ fontSize: 8.5, color: "#333", marginBottom: 5, lineHeight: 1.5, paddingLeft: 8, borderLeft: `2px solid ${t.accent}` }}>
                {line.startsWith("•") ? line : `• ${line}`}
              </div>
            )) : <div style={{ fontSize: 8.5, color: "#999", fontStyle: "italic" }}>Add your work experience</div>}

            <div style={{ marginTop: 14 }}>
              {sectionHeader("Education")}
              <div style={{ fontSize: 8.5, color: "#333", lineHeight: 1.6, whiteSpace: "pre-line" }}>{form.education || "Add your education details"}</div>
              {form.college && <div style={{ fontSize: 8, color: t.primary, fontWeight: 700, marginTop: 3 }}>{form.college}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── SIDEBAR LIGHT TEMPLATES: 8c45, 8b52, 5884 ── */
  if (tmpl.layout === "sidebar-light") {
    /* 8c45 — Sidebar Pink: photo, CONTACT INFO (navy card), SOCIAL (navy card) in sidebar */
    if (tmpl.id === "sidebar-pink") {
      return (
        <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", display: "flex", width: "100%", minHeight: 820, background: "#fff" }}>
          {/* Sidebar */}
          <div style={{ width: "32%", background: `${t.primary}40`, padding: "22px 16px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>{photoEl(72, "circle")}</div>

            {badgeHeader("CONTACT INFO", t.badge, t.light)}
            <div style={{ marginBottom: 14 }}>
              {contactItem("📍", form.city ? `${form.city}` : "")}
              {contactItem("✉️", form.email)}
              {contactItem("📞", form.mobile ? `+91 ${form.mobile}` : "")}
            </div>

            {badgeHeader("SOCIAL", t.badge, t.light)}
            {form.linkedin && socialItem("🔗", form.linkedin)}
            {form.email && socialItem("✉️", "yourwebsite.com")}
          </div>

          {/* Right content */}
          <div style={{ flex: 1, padding: "22px 24px" }}>
            {form.profile && (
              <div style={{ marginBottom: 14 }}>
                {sectionHeader("About Me")}
                <div style={{ fontSize: 8.5, color: "#444", lineHeight: 1.6 }}>{form.profile}</div>
              </div>
            )}

            {sectionHeader("Work Experience")}
            {workLines.length > 0 ? workLines.map((line, i) => (
              <div key={i} style={{ fontSize: 8.5, color: "#333", marginBottom: 5, lineHeight: 1.5, paddingLeft: 8, borderLeft: `2px solid ${t.accent}` }}>
                {line.startsWith("•") ? line : `• ${line}`}
              </div>
            )) : <div style={{ fontSize: 8.5, color: "#999", fontStyle: "italic" }}>Add your work experience</div>}

            <div style={{ marginTop: 14 }}>
              {sectionHeader("Education")}
              <div style={{ fontSize: 8.5, color: "#333", lineHeight: 1.6, whiteSpace: "pre-line" }}>{form.education || "Add your education details"}</div>
              {form.college && <div style={{ fontSize: 8, color: t.primary, fontWeight: 700, marginTop: 3 }}>{form.college}</div>}
            </div>

            <div style={{ marginTop: 14 }}>
              {sectionHeader("Skills & Expertise")}
              {skills.map((s, i) => skillBar(s, Math.max(50, 95 - i * 8)))}
            </div>
          </div>
        </div>
      );
    }

    /* 8b52 — Sidebar Peach: sidebar with ABOUT ME, CONTACT INFO, SKILLS */
    if (tmpl.id === "sidebar-peach") {
      return (
        <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", display: "flex", width: "100%", minHeight: 820, background: "#fff" }}>
          {/* Sidebar */}
          <div style={{ width: "32%", background: `${t.primary}40`, padding: "22px 16px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>{photoEl(72, "circle")}</div>

            {barHeader("ABOUT ME", t.primary)}
            {form.profile && <div style={{ fontSize: 8, color: "#444", lineHeight: 1.5, marginBottom: 14 }}>{form.profile.slice(0, 200)}{form.profile.length > 200 ? "..." : ""}</div>}

            {barHeader("CONTACT INFO", t.primary)}
            <div style={{ marginBottom: 14 }}>
              {contactItem("📍", form.city ? `${form.city}` : "")}
              {contactItem("✉️", form.email)}
              {contactItem("📞", form.mobile ? `+91 ${form.mobile}` : "")}
            </div>

            {barHeader("SKILLS & EXPERTISE", t.primary)}
            {skills.slice(0, 3).map((s, i) => skillBar(s, Math.max(50, 95 - i * 8)))}
          </div>

          {/* Right content */}
          <div style={{ flex: 1, padding: "22px 24px" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: t.dark, letterSpacing: 1 }}>{name.toUpperCase()}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.primary, letterSpacing: 2, textTransform: "uppercase" as const, marginTop: 2, marginBottom: 10 }}>{role}</div>

            {sectionHeader("Work Experience")}
            {workLines.length > 0 ? workLines.map((line, i) => (
              <div key={i} style={{ fontSize: 8.5, color: "#333", marginBottom: 5, lineHeight: 1.5, paddingLeft: 8, borderLeft: `2px solid ${t.accent}` }}>
                {line.startsWith("•") ? line : `• ${line}`}
              </div>
            )) : <div style={{ fontSize: 8.5, color: "#999", fontStyle: "italic" }}>Add your work experience</div>}

            <div style={{ marginTop: 14 }}>
              {sectionHeader("Education")}
              <div style={{ fontSize: 8.5, color: "#333", lineHeight: 1.6, whiteSpace: "pre-line" }}>{form.education || "Add your education details"}</div>
              {form.college && <div style={{ fontSize: 8, color: t.primary, fontWeight: 700, marginTop: 3 }}>{form.college}</div>}
            </div>
          </div>
        </div>
      );
    }

    /* 5884 — Sidebar Blush: sidebar with ABOUT ME, CONTACT INFO, SOCIAL (navy badges) */
    return (
      <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", display: "flex", width: "100%", minHeight: 820, background: "#fff" }}>
        {/* Sidebar */}
        <div style={{ width: "32%", background: `${t.primary}40`, padding: "22px 16px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>{photoEl(72, "rect")}</div>

          {badgeHeader("ABOUT ME", t.badge, t.light)}
          {form.profile && <div style={{ fontSize: 8, color: "#444", lineHeight: 1.5, marginBottom: 14 }}>{form.profile.slice(0, 200)}{form.profile.length > 200 ? "..." : ""}</div>}

          {badgeHeader("CONTACT INFO", t.badge, t.light)}
          <div style={{ marginBottom: 14 }}>
            {contactItem("📍", form.city ? `${form.city}` : "")}
            {contactItem("✉️", form.email)}
            {contactItem("📞", form.mobile ? `+91 ${form.mobile}` : "")}
          </div>

          {badgeHeader("SOCIAL", t.badge, t.light)}
          {form.linkedin && socialItem("🔗", form.linkedin)}
          {form.linkedin && socialItem("🐦", "yourtwitter.com")}
          {form.linkedin && socialItem("🔗", "yourskype.com")}
        </div>

        {/* Right content */}
        <div style={{ flex: 1, padding: "22px 24px" }}>
          {sectionHeader("Work Experience")}
          {workLines.length > 0 ? workLines.map((line, i) => (
            <div key={i} style={{ fontSize: 8.5, color: "#333", marginBottom: 5, lineHeight: 1.5, paddingLeft: 8, borderLeft: `2px solid ${t.accent}` }}>
              {line.startsWith("•") ? line : `• ${line}`}
            </div>
          )) : <div style={{ fontSize: 8.5, color: "#999", fontStyle: "italic" }}>Add your work experience</div>}

          <div style={{ marginTop: 14 }}>
            {sectionHeader("Education")}
            <div style={{ fontSize: 8.5, color: "#333", lineHeight: 1.6, whiteSpace: "pre-line" }}>{form.education || "Add your education details"}</div>
            {form.college && <div style={{ fontSize: 8, color: t.primary, fontWeight: 700, marginTop: 3 }}>{form.college}</div>}
          </div>

          <div style={{ marginTop: 14 }}>
            {sectionHeader("Skills & Expertise")}
            {skills.map((s, i) => skillBar(s, Math.max(50, 95 - i * 8)))}
          </div>
        </div>
      </div>
    );
  }

  /* ── LAYOUT 5: header-contact — fallback ── */
  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", width: "100%", minHeight: 820, background: "#fff" }}>
      <div style={{ display: "flex", background: t.primary, padding: "20px 28px", alignItems: "center", gap: 20 }}>
        <div style={{ flexShrink: 0 }}>{photoEl(72, "rect")}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: t.light, letterSpacing: 1 }}>{name.toUpperCase()}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, letterSpacing: 2, textTransform: "uppercase" as const, marginTop: 2 }}>{role}</div>
        </div>
        <div style={{ textAlign: "right" as const }}>
          {form.city && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.85)", marginBottom: 3 }}>📍 {form.city}</div>}
          {form.email && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.85)", marginBottom: 3, wordBreak: "break-all" }}>✉️ {form.email}</div>}
          {form.mobile && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.85)", marginBottom: 3 }}>📞 +91 {form.mobile}</div>}
        </div>
      </div>
      <div style={{ display: "flex", padding: "16px 28px", gap: 24 }}>
        <div style={{ flex: 1 }}>
          {form.profile && (<div style={{ marginBottom: 14 }}>{sectionHeader("About Me")}<div style={{ fontSize: 8.5, color: "#444", lineHeight: 1.6 }}>{form.profile}</div></div>)}
          {sectionHeader("Skills")}
          {skills.map((s, i) => skillBar(s, Math.max(50, 95 - i * 8)))}
        </div>
        <div style={{ flex: 1.2 }}>
          {sectionHeader("Work Experience")}
          {workLines.length > 0 ? workLines.map((line, i) => (<div key={i} style={{ fontSize: 8.5, color: "#333", marginBottom: 5, lineHeight: 1.5, paddingLeft: 8, borderLeft: `2px solid ${t.accent}` }}>{line.startsWith("•") ? line : `• ${line}`}</div>)) : <div style={{ fontSize: 8.5, color: "#999", fontStyle: "italic" }}>Add your work experience</div>}
          <div style={{ marginTop: 14 }}>{sectionHeader("Education")}<div style={{ fontSize: 8.5, color: "#333", lineHeight: 1.6, whiteSpace: "pre-line" }}>{form.education || "Add your education details"}</div></div>
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
      <div style={{ height: 80, background: "#fff", position: "relative", overflow: "hidden" }}>

        {/* header-bar preview */}
        {t.layout === "header-bar" && (
          <>
            <div style={{ ...S, top: 0, left: 0, right: 0, height: 24, background: th.primary }} />
            <div style={{ ...S, left: 4, top: 5, width: 14, height: 14, borderRadius: 3, background: `${th.accent}66`, border: "1.5px solid rgba(255,255,255,0.8)" }} />
            <div style={{ ...S, left: 22, top: 7, width: 45, height: 4, background: "rgba(255,255,255,0.85)", borderRadius: 1.5 }} />
            <div style={{ ...S, left: 22, top: 14, width: 30, height: 2.5, background: th.accent, borderRadius: 1, opacity: 0.8 }} />
            <div style={{ ...S, top: 28, left: 0, width: "48%", bottom: 0, borderRight: "1px solid #f3f4f6", padding: "3px 4px" }}>
              <div style={{ width: 20, height: 2, background: th.primary, borderRadius: 1, marginBottom: 4 }} />
              {[0,1,2,3].map(i => <div key={i} style={{ width: `${70 - i * 10}%`, height: 1.5, background: "#e5e7eb", borderRadius: 1, marginBottom: 3 }} />)}
            </div>
            <div style={{ ...S, top: 28, right: 0, width: "50%", bottom: 0, padding: "3px 4px" }}>
              <div style={{ width: 22, height: 2, background: th.primary, borderRadius: 1, marginBottom: 4 }} />
              {[0,1,2,3].map(i => <div key={i} style={{ width: `${65 - i * 8}%`, height: 1.5, background: "#e5e7eb", borderRadius: 1, marginBottom: 3 }} />)}
            </div>
          </>
        )}

        {/* header-split preview */}
        {t.layout === "header-split" && (
          <>
            <div style={{ ...S, top: 0, left: 0, right: 0, height: 26, background: th.primary }} />
            <div style={{ ...S, left: 4, top: 6, width: 40, height: 4.5, background: "rgba(255,255,255,0.9)", borderRadius: 1.5 }} />
            <div style={{ ...S, left: 4, top: 14, width: 28, height: 2.5, background: th.accent, borderRadius: 1 }} />
            <div style={{ ...S, right: 4, top: 5, width: 16, height: 16, borderRadius: 3, background: `${th.accent}77`, border: "1.5px solid rgba(255,255,255,0.8)" }} />
            <div style={{ ...S, top: 30, left: 0, width: "48%", bottom: 0, borderRight: "1px solid #f3f4f6", padding: "3px 4px" }}>
              <div style={{ width: 22, height: 2, background: th.primary, borderRadius: 1, marginBottom: 4 }} />
              {[0,1,2,3].map(i => <div key={i} style={{ width: `${68 - i * 9}%`, height: 1.5, background: "#e5e7eb", borderRadius: 1, marginBottom: 3 }} />)}
            </div>
            <div style={{ ...S, top: 30, right: 0, width: "50%", bottom: 0, padding: "3px 4px" }}>
              <div style={{ width: 18, height: 2, background: th.primary, borderRadius: 1, marginBottom: 4 }} />
              {[0,1,2,3].map(i => <div key={i} style={{ width: `${60 - i * 7}%`, height: 1.5, background: "#e5e7eb", borderRadius: 1, marginBottom: 3 }} />)}
            </div>
            <div style={{ ...S, bottom: 0, left: 0, right: 0, height: 6, background: th.primary }} />
          </>
        )}

        {/* sidebar-dark preview */}
        {t.layout === "sidebar-dark" && (
          <>
            <div style={{ ...S, left: 0, top: 0, bottom: 0, width: "32%", background: th.primary }} />
            <div style={{ ...S, left: "8%", top: 6, width: 16, height: 16, borderRadius: "50%", background: `${th.accent}88`, border: "2px solid rgba(255,255,255,0.9)" }} />
            {[28,33,38,43,48,53,58,63,68].map((y, i) => <div key={i} style={{ ...S, left: "5%", top: y, width: `${20 - (i % 3) * 3}%`, height: 1.5, background: "rgba(255,255,255,0.3)", borderRadius: 1 }} />)}
            <div style={{ ...S, left: "36%", top: 6, width: 50, height: 5, background: th.dark, borderRadius: 2 }} />
            <div style={{ ...S, left: "36%", top: 14, width: 35, height: 2.5, background: th.primary, borderRadius: 1 }} />
            <div style={{ ...S, left: "36%", top: 22, width: "58%", height: 1.5, background: th.accent, borderRadius: 1 }} />
            {[28,33,38,43,48,54,60,66].map((y, i) => <div key={i} style={{ ...S, left: "36%", top: y, width: `${50 - (i % 4) * 6}%`, height: 1.5, background: "#e5e7eb", borderRadius: 1 }} />)}
          </>
        )}

        {/* sidebar-light preview */}
        {t.layout === "sidebar-light" && (
          <>
            <div style={{ ...S, left: 0, top: 0, bottom: 0, width: "32%", background: `${th.primary}12`, borderRight: `2px solid ${th.primary}` }} />
            <div style={{ ...S, left: "7%", top: 6, width: 18, height: 18, borderRadius: "50%", background: `${th.primary}22`, border: `2px solid ${th.primary}` }} />
            <div style={{ ...S, left: "5%", top: 30, width: "22%", height: 5, background: th.primary, borderRadius: 2 }} />
            {[38,43,48,53,58,63,68].map((y, i) => <div key={i} style={{ ...S, left: "5%", top: y, width: `${18 - (i % 3) * 3}%`, height: 1.5, background: "#94a3b8", borderRadius: 1 }} />)}
            <div style={{ ...S, left: "36%", top: 6, width: 50, height: 5, background: th.dark, borderRadius: 2 }} />
            <div style={{ ...S, left: "36%", top: 14, width: 35, height: 2.5, background: th.primary, borderRadius: 1 }} />
            {[22,28,34,40,46,52,58,64].map((y, i) => <div key={i} style={{ ...S, left: "36%", top: y, width: `${48 - (i % 4) * 5}%`, height: 1.5, background: "#e5e7eb", borderRadius: 1 }} />)}
          </>
        )}

        {/* header-contact preview */}
        {t.layout === "header-contact" && (
          <>
            <div style={{ ...S, top: 0, left: 0, right: 0, height: 26, background: th.primary }} />
            <div style={{ ...S, left: 4, top: 5, width: 14, height: 14, borderRadius: 3, background: `${th.accent}66`, border: "1.5px solid rgba(255,255,255,0.8)" }} />
            <div style={{ ...S, left: 22, top: 6, width: 42, height: 4.5, background: "rgba(255,255,255,0.9)", borderRadius: 1.5 }} />
            <div style={{ ...S, left: 22, top: 14, width: 30, height: 2.5, background: th.accent, borderRadius: 1 }} />
            <div style={{ ...S, right: 4, top: 5, width: 30, height: 3, background: "rgba(255,255,255,0.5)", borderRadius: 1 }} />
            <div style={{ ...S, right: 4, top: 10, width: 25, height: 2.5, background: "rgba(255,255,255,0.4)", borderRadius: 1 }} />
            <div style={{ ...S, top: 30, left: 0, width: "48%", bottom: 0, borderRight: "1px solid #f3f4f6", padding: "3px 4px" }}>
              <div style={{ width: 18, height: 2, background: th.primary, borderRadius: 1, marginBottom: 4 }} />
              {[0,1,2,3].map(i => <div key={i} style={{ width: `${65 - i * 8}%`, height: 1.5, background: "#e5e7eb", borderRadius: 1, marginBottom: 3 }} />)}
            </div>
            <div style={{ ...S, top: 30, right: 0, width: "50%", bottom: 0, padding: "3px 4px" }}>
              <div style={{ width: 22, height: 2, background: th.primary, borderRadius: 1, marginBottom: 4 }} />
              {[0,1,2,3].map(i => <div key={i} style={{ width: `${60 - i * 7}%`, height: 1.5, background: "#e5e7eb", borderRadius: 1, marginBottom: 3 }} />)}
            </div>
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
  "header-bar": "Elegant",
  "header-split": "Classic",
  "sidebar-dark": "Bold",
  "sidebar-light": "Modern",
  "header-contact": "Professional",
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
  const [photo, setPhoto] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    jobRole: "", fullName: "", email: "", mobile: "", city: "", linkedin: "",
    profile: "", education: "", college: "",
    skills: "", workExperience: "", projects: "", certifications: "", languages: "",
  });
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | undefined>();

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

  async function handleBuild() {
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(apiUrl("/api/resumes"), {
        method: "POST",
        headers,
        body: JSON.stringify({ ...form, title: form.jobRole || "My Resume", template: selected.id }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setUpgradeMsg(data.message);
        setUpgradeOpen(true);
        setSaving(false);
        return;
      }
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
              <p className="text-sm text-muted-foreground">6 templates · Photo upload · Print as PDF</p>
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

                {/* Template gallery */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Choose Template</span>
                    <span className="text-xs text-muted-foreground ml-auto">{TEMPLATES.length} templates</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                    {TEMPLATES.map(t => (
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
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} message={upgradeMsg} />
    </div>
  );
}
