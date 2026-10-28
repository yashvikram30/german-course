import { eq } from "drizzle-orm";
import { chapters, db } from "@/db";

// Server-side proxy to TokenHarbor (OpenAI-compatible). The key never reaches the browser.
// Env: TOKEN_API_KEY (required). Optional: TOKENHARBOR_BASE_URL, TOKENHARBOR_MODEL (see https://tokenharbor.ai/v1/models).
export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are a friendly German tutor inside a beginner's German course (CEFR level A1, preparing for Goethe-Zertifikat A1: Start Deutsch 1).
- Explain in English; give German examples with English translations.
- Keep to A1 vocabulary and grammar. If something is above A1, say so briefly and give the simple version.
- Be short (usually under 150 words). Correct the learner's German gently and explain why.
- Nouns always with article and plural. Prefer the book's explanations when a chapter is provided.
- Use Markdown. A table must have the header row, the |---| row and every body row each on its own line.
- Do not answer unrelated questions; steer back to learning German.`;

export async function POST(req: Request) {
  const key = process.env.TOKEN_API_KEY;
  const base = process.env.TOKENHARBOR_BASE_URL ?? "https://tokenharbor.ai/v1";
  const model = process.env.TOKENHARBOR_MODEL ?? "deepseek-v4-flash:free";
  if (!key) {
    return Response.json({ error: "The tutor is not configured yet. Set TOKEN_API_KEY in app/.env and restart." }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { messages?: Msg[]; chapterId?: string } | null;
  const messages = (body?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "No question." }, { status: 400 });
  }

  let system = SYSTEM;
  if (body?.chapterId && /^k\d+$/.test(body.chapterId)) {
    const c = db.select().from(chapters).where(eq(chapters.id, body.chapterId)).get();
    if (c) system += `\n\nThe learner is reading chapter ${c.order}, "${c.title}". Chapter text (for reference):\n${c.body.slice(0, 7000)}`;
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...messages], temperature: 0.4, max_tokens: 500 }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return Response.json({ error: `The tutor service answered with ${res.status}.` }, { status: 502 });
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string") return Response.json({ error: "Unexpected response from the tutor service." }, { status: 502 });
    return Response.json({ reply });
  } catch {
    return Response.json({ error: "Could not reach the tutor service." }, { status: 502 });
  }
}
