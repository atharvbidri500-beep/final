const POLLINATIONS_URL = "https://text.pollinations.ai/openai";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function askAI(
  messages: Message[],
  _jsonMode = false,   // jsonMode param kept for compatibility but NOT sent to Pollinations
  timeoutMs = 20000,
  retries = 1,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const body: Record<string, unknown> = {
        messages,
        model: "openai",
        seed: Math.floor(Math.random() * 99999),
      };

      const res = await fetch(POLLINATIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Pollinations error ${res.status}`);
      const text = await res.text();
      if (!text || text.trim().length === 0) throw new Error("Empty response from AI");
      return text.trim();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
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
