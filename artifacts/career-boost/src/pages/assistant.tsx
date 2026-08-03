import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Loader2, Send, User } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, isUpgradeError } from "@/lib/premiumApi";

interface Message { role: "user" | "bot"; text: string; }

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState<any>(null);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<any>("/api/assistant/context").then(setContext).catch(() => {});
    setMessages([{ role: "bot", text: "Hi! I'm your Career Copilot assistant. I can see your career score, skills, goals and activity — ask me anything about your career." }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setError("");
    setMessages(m => [...m, { role: "user", text }]);
    setTyping(true);
    try {
      const data = await apiFetch<any>("/api/assistant/chat", { method: "POST", body: JSON.stringify({ message: text }) });
      setMessages(m => [...m, { role: "bot", text: data.reply }]);
    } catch (err: any) {
      if (isUpgradeError(err)) { setUpgradeMsg(err.message); setUpgradeOpen(true); }
      else setError(err.message ?? "Failed");
    } finally {
      setTyping(false);
    }
  }

  return (
    <PageShell title="AI Career Assistant" subtitle="Context-aware career coach" icon={<Bot className="w-6 h-6" />} upgradeOpen={upgradeOpen} upgradeMsg={upgradeMsg} onUpgradeClose={() => setUpgradeOpen(false)}>
      {error && <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}</div>}

      {context && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-xl bg-card border border-border">
            <div className="text-lg font-black text-[#5B5CF6]">{context.careerScore}</div>
            <div className="text-[10px] text-muted-foreground">CAREER SCORE</div>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border">
            <div className="text-lg font-black text-emerald-600">{context.topSkills?.length ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">SKILLS</div>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border">
            <div className="text-lg font-black text-amber-600">{context.goals?.length ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">GOALS</div>
          </div>
        </div>
      )}

      <div className="p-5 rounded-2xl bg-card border border-border space-y-3 min-h-64 max-h-[420px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${m.role === "user" ? "bg-violet-100 text-violet-600" : "bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6] text-white"}`}>
                {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${m.role === "user" ? "bg-[#5B5CF6] text-white rounded-tr-sm" : "bg-muted/50 rounded-tl-sm"}`}>
                {m.text}
              </div>
            </motion.div>
          ))}
          {typing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5B5CF6] to-[#8B5CF6] text-white flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4" /></div>
              <div className="p-3 rounded-2xl bg-muted/50 rounded-tl-sm flex items-center gap-1">
                <Loader2 className="w-4 h-4 animate-spin text-[#5B5CF6]" />
                <span className="text-xs text-muted-foreground">thinking…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={2}
          placeholder="Ask about resumes, interviews, jobs, salary…"
        />
        <button onClick={send} disabled={!input.trim() || typing} className="w-11 h-11 rounded-xl bg-gradient-to-r from-[#5B5CF6] to-[#8B5CF6] text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0 self-end">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </PageShell>
  );
}
