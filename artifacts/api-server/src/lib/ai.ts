const POLLINATIONS_URL = "https://text.pollinations.ai/";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function askAI(messages: Message[], jsonMode = false, timeoutMs = 20000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body: Record<string, unknown> = {
      messages,
      model: "openai",
      seed: Math.floor(Math.random() * 9999),
    };
    if (jsonMode) body.jsonMode = true;

    const res = await fetch(POLLINATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Pollinations error ${res.status}`);
    const text = await res.text();
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

export function safeParseJSON<T>(raw: string, fallback: T): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/g, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]) as T; } catch { /* fall through */ }
    }
    return fallback;
  }
}
