import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FolderKanban, Loader2, Mail, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/premiumApi";

export default function PublicPortfolio({ slug }: { slug: string }) {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<any>(`/api/portfolio/${slug}`).then(setPortfolio).catch((e: any) => setError(e.message ?? "Portfolio not found")).finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#5B5CF6]" /></div>;
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <FolderKanban className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <h1 className="font-bold text-lg">{error || "Not found"}</h1>
          <p className="text-sm text-muted-foreground mt-1">This portfolio is private or doesn't exist.</p>
        </div>
      </div>
    );
  }

  const themes: Record<string, string> = {
    modern: "from-[#5B5CF6] to-[#8B5CF6]",
    dark: "from-slate-800 to-slate-950",
    ocean: "from-cyan-600 to-blue-700",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className={`bg-gradient-to-br ${themes[portfolio.theme] ?? themes.modern} text-white pb-12`}>
        <div className="max-w-3xl mx-auto px-4 pt-16">
          <h1 className="text-3xl font-black">{portfolio.title}</h1>
          {portfolio.headline && <p className="text-white/85 mt-2">{portfolio.headline}</p>}
          {portfolio.contactEmail && (
            <div className="flex items-center gap-1.5 text-sm text-white/80 mt-3">
              <Mail className="w-4 h-4" /> {portfolio.contactEmail}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-8 space-y-4 pb-16">
        {portfolio.about && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-card border border-border shadow-sm">
            <div className="font-bold mb-2">About</div>
            <p className="text-sm leading-relaxed text-muted-foreground">{portfolio.about}</p>
          </motion.div>
        )}

        {(portfolio.projects ?? []).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-card border border-border shadow-sm">
            <div className="font-bold mb-4">Projects</div>
            <div className="space-y-3">
              {portfolio.projects.map((p: any, i: number) => (
                <div key={i} className="p-4 rounded-xl bg-muted/40">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{p.name}</div>
                    {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="text-xs text-[#5B5CF6] flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View</a>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                  {(p.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.tags.map((t: string, j: number) => (
                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {(portfolio.achievements ?? []).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-card border border-border shadow-sm">
            <div className="font-bold mb-3">Achievements</div>
            <ul className="space-y-2">
              {portfolio.achievements.map((a: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-500">🏆</span> {a}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        <div className="text-center text-xs text-muted-foreground pt-4">Made with Hire Pilot</div>
      </div>
    </div>
  );
}
