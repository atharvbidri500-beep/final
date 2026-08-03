import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FolderKanban, Loader2, Globe, Plus, Trash2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiFetch, isUpgradeError } from "@/lib/premiumApi";

interface Project { name: string; description: string; link?: string; tags?: string[]; }

export default function PortfolioBuilder() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProject, setNewProject] = useState<Project>({ name: "", description: "", link: "" });
  const [achievements, setAchievements] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  useEffect(() => {
    apiFetch<any>("/api/portfolio").then(p => {
      if (p) {
        setPortfolio(p);
        setTitle(p.title ?? "");
        setHeadline(p.headline ?? "");
        setAbout(p.about ?? "");
        setProjects(p.projects ?? []);
        setAchievements((p.achievements ?? []).join("\n"));
        setContactEmail(p.contactEmail ?? "");
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    try {
      let p = portfolio;
      if (!p) {
        p = await apiFetch<any>("/api/portfolio", { method: "POST", body: JSON.stringify({ title: title || "My Portfolio", headline }) });
        setPortfolio(p);
      }
      const updated = await apiFetch<any>("/api/portfolio", {
        method: "PUT",
        body: JSON.stringify({
          title, headline, about,
          projects,
          achievements: achievements.split("\n").map(s => s.trim()).filter(Boolean),
          contactEmail: contactEmail.trim() || undefined,
        }),
      });
      setPortfolio(updated);
    } catch (err: any) {
      setError(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (!portfolio) return;
    try {
      const updated = await apiFetch<any>("/api/portfolio/publish", { method: "POST", body: JSON.stringify({ published: !portfolio.published }) });
      setPortfolio(updated);
    } catch (err: any) {
      if (isUpgradeError(err)) { setUpgradeMsg(err.message); setUpgradeOpen(true); }
      else setError(err.message ?? "Failed");
    }
  }

  function addProject() {
    if (!newProject.name.trim()) return;
    setProjects([...projects, { ...newProject, name: newProject.name.trim() }]);
    setNewProject({ name: "", description: "", link: "" });
  }

  if (loading) {
    return <PageShell title="Portfolio Builder" subtitle="Create your public portfolio page" icon={<FolderKanban className="w-6 h-6" />}><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#5B5CF6]" /></div></PageShell>;
  }

  const publicUrl = portfolio ? `${window.location.origin}/p/${portfolio.slug}` : "";

  return (
    <PageShell title="Portfolio Builder" subtitle="Create your public portfolio page" icon={<FolderKanban className="w-6 h-6" />} upgradeOpen={upgradeOpen} upgradeMsg={upgradeMsg} onUpgradeClose={() => setUpgradeOpen(false)}>
      {error && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>}

      <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
        {portfolio?.slug && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50 border border-violet-100">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Your public page</div>
              <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-violet-700 truncate block">{publicUrl}</a>
            </div>
            <Button size="sm" variant="outline" onClick={togglePublish} className="gap-1 flex-shrink-0 ml-3">
              <Globe className="w-3.5 h-3.5" /> {portfolio.published ? "Unpublish" : "Publish"}
            </Button>
          </div>
        )}

        <div><Label>Portfolio title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Rohan Sharma — Portfolio" /></div>
        <div><Label>Headline</Label><Input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Full Stack Developer building products people love" /></div>
        <div><Label>About</Label><Textarea value={about} onChange={e => setAbout(e.target.value)} rows={3} placeholder="Short bio…" /></div>

        <div>
          <Label>Projects</Label>
          <div className="space-y-2 mt-1.5">
            {projects.map((p, i) => (
              <div key={i} className="flex items-start justify-between p-3 rounded-xl bg-muted/40">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.description}</div>
                </div>
                <button onClick={() => setProjects(projects.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-rose-600 ml-2 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <div className="space-y-2 p-3 rounded-xl bg-muted/20">
              <Input value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} placeholder="Project name" />
              <Textarea value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} rows={2} placeholder="Short description" />
              <Input value={newProject.link ?? ""} onChange={e => setNewProject({ ...newProject, link: e.target.value })} placeholder="Project link (optional)" />
              <Button size="sm" variant="outline" onClick={addProject} className="gap-1"><Plus className="w-3.5 h-3.5" /> Add project</Button>
            </div>
          </div>
        </div>

        <div><Label>Achievements (one per line)</Label><Textarea value={achievements} onChange={e => setAchievements(e.target.value)} rows={3} placeholder={"Awarded best intern 2024\nWon hackathon 2023"} /></div>
        <div><Label>Contact email</Label><Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="public@email.com" /></div>

        <Button onClick={save} disabled={saving} className="w-full bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white border-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Portfolio"}
        </Button>
      </div>
    </PageShell>
  );
}
