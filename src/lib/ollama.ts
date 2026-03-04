import { readCache, writeCache } from "./data-store";
import crypto from "crypto";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://ollama.railway.internal:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "phi3:mini";
const TIMEOUT_MS = 120_000;

function hashPrompt(prompt: string): string {
  return crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

export async function generateAnalysis(prompt: string): Promise<string | null> {
  const cacheKey = `ai-analysis-${hashPrompt(prompt)}`;

  const cached = await readCache<string>(cacheKey);
  if (cached !== null) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[ollama] HTTP ${res.status}: ${res.statusText}`);
      return null;
    }

    const json = await res.json();
    const response = json.response as string;

    if (response) {
      await writeCache(cacheKey, response);
    }

    return response || null;
  } catch (err) {
    console.error("[ollama] Failed to generate analysis:", err instanceof Error ? err.message : err);
    return null;
  }
}
