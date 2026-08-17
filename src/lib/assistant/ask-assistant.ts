import { createServerFn } from "@tanstack/react-start";
import { answerLocally } from "./engine";
import type { AssistantContext, AssistantReply } from "./types";

type Payload = {
  question: string;
  context: AssistantContext;
};

async function tryModel(question: string, ctx: AssistantContext): Promise<AssistantReply | null> {
  const key = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!key) return null;
  const system = `You are Jarvis, the RPM Assure in-app assistant. Always address the user as Avenger. Open or reopen with: "Hi Avenger, how can I help?" when they greet you or ask for help.
Be concise. Use Title Case for product names (Customer Assurance, Patch Compliance, Secure Score).
Cover = in scope and collected. No Cover is not scored. Microsoft 365 CSP is posture, not SLA.
Current path: ${ctx.pathname}
Tenant: ${ctx.customerName ?? "none"} ${ctx.customerCode ?? ""} RAG ${ctx.healthRag ?? "—"}
Do not invent collect numbers. If you suggest a screen, name it clearly.`;
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-fast",
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          { role: "system", content: system },
          { role: "user", content: question },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return { text, source: "model", links: answerLocally(question, ctx).links };
  } catch {
    return null;
  }
}

export const askAssistant = createServerFn({ method: "POST" })
  .validator((d: Payload) => d)
  .handler(async ({ data }) => {
    const question = String(data.question ?? "").slice(0, 2000);
    const ctx = data.context ?? { pathname: "/" };
    if (!question.trim()) {
      return answerLocally("help", ctx);
    }
    const model = await tryModel(question, ctx);
    return model ?? answerLocally(question, ctx);
  });
