import { MessageSquare, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { askAssistant } from "@/lib/assistant/ask-assistant";
import type { AssistantContext, AssistantLink, AssistantReply } from "@/lib/assistant/types";
import {
  JarvisAvatar,
  isJarvisWalkOff,
  isJarvisWalkOn,
  type JarvisStage,
} from "@/components/assistant/jarvis-avatar";
import { useCustomerList } from "@/lib/nav/customer-list-context";
import { cn } from "@/lib/utils";

type ChatTurn = { role: "user" | "assist"; text: string; links?: AssistantLink[] };

const STARTERS = [
  "Come here Jarvis",
  "What is Cover?",
  "Why is this tenant Amber?",
  "What is FinSight?",
  "How do I print the Monthly Pack?",
  "That will be all",
];

export function RpmAssistant({
  pageTitle,
  customerCode,
}: {
  pageTitle?: string;
  customerCode?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<JarvisStage>("off");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: "assist",
      text: "Hi Avenger, how can I help?",
    },
  ]);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const list = useCustomerList();
  const scroller = useRef<HTMLDivElement>(null);

  const tenant = list.customers.find(
    (c) => c.code.toUpperCase() === String(customerCode ?? "").toUpperCase(),
  );

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns, open]);

  function walkOn() {
    setStage("entering");
    setOpen(true);
    window.setTimeout(() => setStage("waving"), 1550);
    window.setTimeout(() => setStage("idle"), 3200);
  }

  function walkOff() {
    setStage("leaving");
    setOpen(false);
    window.setTimeout(() => setStage("off"), 1600);
  }

  function context(): AssistantContext {
    return {
      pathname: path,
      pageTitle,
      customerCode: customerCode ?? null,
      customerName: tenant?.name ?? null,
      healthRag: tenant?.healthRag ?? null,
      cover: tenant?.cover ?? null,
      jobErrors: tenant?.jobErrorCount ?? null,
      finsightOob: tenant?.dtrVarianceLines ?? null,
      rmmOffline: tenant?.pulsewayOfflineCount ?? null,
    };
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", text: question }]);
    if (isJarvisWalkOff(question)) {
      setTurns((t) => [
        ...t,
        { role: "assist", text: "Very good, Avenger. Standing down." },
      ]);
      walkOff();
      return;
    }
    if (isJarvisWalkOn(question) && stage === "off") {
      walkOn();
      setTurns((t) => [
        ...t,
        { role: "assist", text: "Hi Avenger, how can I help?" },
      ]);
      return;
    }
    if (/\bwave\b/i.test(question) && stage !== "off") {
      setStage("waving");
      window.setTimeout(() => setStage("idle"), 1600);
      setTurns((t) => [...t, { role: "assist", text: "Hi Avenger, how can I help?" }]);
      return;
    }
    setBusy(true);
    try {
      const reply = (await askAssistant({ data: { question, context: context() } })) as AssistantReply;
      setTurns((t) => [...t, { role: "assist", text: reply.text, links: reply.links }]);
      const first = reply.links?.[0];
      if (first && /^opening /i.test(reply.text)) {
        void router.navigate({ to: first.href });
      }
    } catch {
      setTurns((t) => [
        ...t,
        { role: "assist", text: "I could not reach the assistant service. Try again, or use the rail: Customer › Ecosystem › RPM Services › Service Modules." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <JarvisAvatar stage={stage} />
      <button
        type="button"
        className={cn("rpma-assist-fab", open && "is-open")}
        aria-label={open ? "Close Jarvis" : "Open Jarvis"}
        onClick={() => (open || stage !== "off" ? walkOff() : walkOn())}
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {open ? (
        <section className="rpma-assist-panel" aria-label="Jarvis">
          <header className="rpma-assist-head">
            <MessageSquare className="h-4 w-4" />
            <div>
              <p>Jarvis</p>
              <span>
                {tenant ? `${tenant.name} · ${tenant.healthRag}` : "Estate"}
              </span>
            </div>
          </header>
          <div ref={scroller} className="rpma-assist-body">
            {turns.map((t, i) => (
              <div key={i} className={cn("rpma-assist-msg", t.role === "user" ? "is-user" : "is-bot")}>
                <p>{t.text}</p>
                {t.links?.length ? (
                  <div className="rpma-assist-links">
                    {t.links.slice(0, 6).map((l) => (
                      <button
                        key={l.href}
                        type="button"
                        onClick={() => {
                          void router.navigate({ to: l.href });
                          setOpen(false);
                        }}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {busy ? <p className="rpma-assist-wait">Thinking…</p> : null}
          </div>
          <div className="rpma-assist-chips">
            {STARTERS.map((s) => (
              <button key={s} type="button" onClick={() => void send(s)}>
                {s}
              </button>
            ))}
          </div>
          <form
            className="rpma-assist-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Jarvis…"
              aria-label="Ask Jarvis"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}
