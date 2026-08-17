import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { askVision, VISION_GREETING } from "@/lib/vision/ask-vision";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Msg = { role: "vision" | "you"; text: string };

export function VisionAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "vision", text: VISION_GREETING }]);
  const end = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  useEffect(() => {
    if (!open) return;
    const code = pathname.match(/\/customers\/([^/]+)/)?.[1];
    if (!code) return;
    let live = true;
    void askVision({ data: { message: "", path: pathname, customer: code } }).then((r) => {
      if (!live || !r.text) return;
      setMsgs((m) => {
        if (m.length === 1 && m[0]?.role === "vision") return [{ role: "vision", text: r.text }];
        return m;
      });
    });
    return () => {
      live = false;
    };
  }, [open, pathname]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "you", text }]);
    setBusy(true);
    const code = pathname.match(/\/customers\/([^/]+)/)?.[1];
    const res = await askVision({ data: { message: text, path: pathname, customer: code } });
    setBusy(false);
    setMsgs((m) => [...m, { role: "vision", text: res.text }]);
  }

  return (
    <>
      <button
        type="button"
        className={cn("rpma-vision-fab", open && "is-open")}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Vision assistant"
      >
        <Sparkles size={18} />
        <span>Vision</span>
      </button>
      {open ? (
        <section className="rpma-vision" aria-label="Vision assistant">
          <header>
            <strong>Vision</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Vision">
              <X size={16} />
            </button>
          </header>
          <div className="rpma-vision-log">
            {msgs.map((m, i) => (
              <p key={i} className={cn("rpma-vision-bubble", m.role === "you" && "is-you")}>
                {m.text}
              </p>
            ))}
            {busy ? <p className="rpma-vision-bubble">Thinking…</p> : null}
            <div ref={end} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Vision…"
              aria-label="Message Vision"
            />
            <button type="submit" disabled={busy}>
              Send
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}
