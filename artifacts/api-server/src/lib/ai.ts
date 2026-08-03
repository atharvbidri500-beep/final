const POLLINATIONS_URL = "https://text.pollinations.ai/openai";
const AI_HORDE_URL = "https://aihorde.net/api/v2";
const AI_HORDE_ANON_KEY = "0000000000";
const KILO_URL = "https://api.kilo.ai/api/gateway/v1/chat/completions";
const KILO_MODELS = [
  "inclusionai/ling-3.0-flash:free",
  "poolside/laguna-s-2.1:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
];

/** Pollinations models to try in order — 402/empty often only hit one model. */
const POLLINATIONS_MODELS = ["openai", "mistral", "deepseek"];

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

function buildPrompt(messages: Message[]): string {
  return messages
    .map((m) => {
      const role = m.role === "assistant" ? "Assistant" : m.role === "system" ? "System" : "User";
      return `[${role}]\n${m.content}`;
    })
    .join("\n\n");
}

async function callPollinations(messages: Message[], timeoutMs: number, model: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(POLLINATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        model,
        seed: Math.floor(Math.random() * 99999),
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Pollinations error ${res.status}`);
    const text = await res.text();
    if (!text || text.trim().length === 0) throw new Error("Empty response from Pollinations");
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

/** Try several Pollinations models within the remaining deadline. */
async function callPollinationsChain(messages: Message[], deadline: number): Promise<string> {
  let lastErr: unknown;
  for (const model of POLLINATIONS_MODELS) {
    const remaining = deadline - Date.now();
    if (remaining <= 1000) break;
    try {
      return await callPollinations(messages, Math.min(remaining, 12000), model);
    } catch (err) {
      lastErr = err;
      console.log(`[ai] pollinations (${model}) failed:`, (err as Error)?.message ?? err);
    }
  }
  throw lastErr ?? new Error("Pollinations failed");
}

async function callAIHorde(messages: Message[], timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    "Content-Type": "application/json",
    apikey: AI_HORDE_ANON_KEY,
    "User-Agent": "HirePilotCareerBoost/1.0 (career assistant)",
  };
  try {
    const create = await fetch(`${AI_HORDE_URL}/generate/text/async`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: buildPrompt(messages),
        params: { max_length: 600, temperature: 0.7, top_p: 1 },
        models: [
          "google/gemma-4-31b",
          "koboldcpp/mini-magnum-12b-v1.1",
          "aphrodite/SicariusSicariiStuff/Impish_Bloodmoon_12B",
          "koboldcpp/Ministral-3-14B-Reasoning-2512-UD-IQ3_XXS",
        ],
      }),
      signal: controller.signal,
    });
    if (!create.ok) throw new Error(`AI Horde submit error ${create.status}`);
    const { id } = (await create.json()) as { id?: string };
    if (!id) throw new Error("AI Horde: no job id");

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const status = await fetch(`${AI_HORDE_URL}/generate/text/status/${id}`, {
        headers,
        signal: controller.signal,
      });
      if (!status.ok) throw new Error(`AI Horde status error ${status.status}`);
      const state = (await status.json()) as { done?: boolean; generations?: { text?: string }[] };
      if (state.done) {
        const text = state.generations?.[0]?.text?.trim();
        if (text && text.length > 0) return text;
        throw new Error("AI Horde: empty generation");
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error("AI Horde timed out");
  } finally {
    clearTimeout(timer);
  }
}

async function callDeepInfra(messages: Message[], timeoutMs: number): Promise<string> {
  const key = process.env.DEEPINFRA_API_KEY;
  if (!key) throw new Error("DEEPINFRA_API_KEY not set");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.DEEPINFRA_MODEL ?? "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages,
        max_tokens: 512,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`DeepInfra error ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("DeepInfra: empty response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function callKilo(messages: Message[], timeoutMs: number, model: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(KILO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 600,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Kilo error ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text || text.length === 0) throw new Error("Kilo: empty response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Try several Kilo gateway models within the remaining deadline. */
async function callKiloChain(messages: Message[], deadline: number): Promise<string> {
  let lastErr: unknown;
  for (const model of KILO_MODELS) {
    const remaining = deadline - Date.now();
    if (remaining <= 1000) break;
    try {
      return await callKilo(messages, Math.min(remaining, 15000), model);
    } catch (err) {
      lastErr = err;
      console.log(`[ai] kilo (${model}) failed:`, (err as Error)?.message ?? err);
    }
  }
  throw lastErr ?? new Error("Kilo failed");
}

/** Resolve with the first valid non-empty response; reject only when every provider failed. */
async function raceSuccess(calls: { name: string; call: () => Promise<string> }[]): Promise<string> {
  let pending = calls.length;
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const done = () => {
      pending -= 1;
      if (!settled && pending <= 0) reject(new Error("All AI providers failed"));
    };
    for (const c of calls) {
      c.call()
        .then((text) => {
          if (!settled && text && text.trim().length > 0) {
            settled = true;
            resolve(text.trim());
          } else {
            done();
          }
        })
        .catch((err) => {
          console.log(`[ai] ${c.name} failed:`, (err as Error)?.message ?? err);
          done();
        });
    }
  });
}

/**
 * Reliable free multi-provider AI with parallel racing:
 *   Pollinations (keyless, 3 model fallbacks) ∥ Kilo Gateway (keyless free routes) ∥ AI Horde (keyless) ∥ DeepInfra (optional key)
 * All providers run at once; the first valid response wins, so a slow or failing
 * provider never holds the request hostage. The whole race runs twice (fresh
 * quotas/timeouts) before giving up. Callers fall back to rule-based replies
 * if everything fails.
 */
export async function askAI(
  messages: Message[],
  _jsonMode = false,
  timeoutMs = 20000,
  _retries = 1,
): Promise<string> {
  const buildRace = (): { name: string; call: () => Promise<string> }[] => {
    const deadline = Date.now() + Math.max(timeoutMs, 12000);
    const calls: { name: string; call: () => Promise<string> }[] = [
      { name: "pollinations", call: () => callPollinationsChain(messages, deadline) },
      { name: "kilo", call: () => callKiloChain(messages, deadline) },
      { name: "aihorde", call: () => callAIHorde(messages, Math.min(30000, Math.max(deadline - Date.now(), 12000))) },
    ];
    if (process.env.DEEPINFRA_API_KEY) {
      calls.push({ name: "deepinfra", call: () => callDeepInfra(messages, Math.min(25000, Math.max(deadline - Date.now(), 5000))) });
    }
    return calls;
  };

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await raceSuccess(buildRace());
    } catch (err) {
      lastErr = err;
      console.log(`[ai] race attempt ${attempt}/2 failed:`, (err as Error)?.message ?? err);
      if (attempt === 1) await new Promise((r) => setTimeout(r, 2500));
    }
  }
  throw lastErr ?? new Error("All AI providers failed");
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
