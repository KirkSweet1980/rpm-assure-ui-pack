import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { ConfigPageHead } from "@/components/settings/config-page";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/nav-lab")({
  component: NavLabPage,
});

type Opt = "A" | "B" | "C" | "D" | "E" | "F";

const OPTIONS: {
  id: Opt;
  name: string;
  status: "shipped" | "concept";
  blurb: string;
  use: string;
}[] = [
  {
    id: "A",
    name: "Top nav",
    status: "concept",
    blurb: "Primary tabs in the header. Service pills on a second strip.",
    use: "EXCO laptop demo. Weak once a service has many modules.",
  },
  {
    id: "B",
    name: "Single rail",
    status: "concept",
    blurb: "One sidebar: customer, then every module stacked.",
    use: "Simple. Gets long. You lose which service you are in.",
  },
  {
    id: "C",
    name: "Dual rail",
    status: "shipped",
    blurb: "64px icon rail + module column + scrolling page.",
    use: "Live now. Interbrand → SYSPRO only lists that service’s modules.",
  },
  {
    id: "D",
    name: "Command center",
    status: "concept",
    blurb: "No sidebar. Customer switcher + service segments in the header.",
    use: "Maximum canvas. Weak for deep SYSPRO.",
  },
  {
    id: "E",
    name: "Rail + tabs",
    status: "concept",
    blurb: "Icon rail only. Modules become tabs under the title.",
    use: "Easiest swap from C. More width, same context.",
  },
  {
    id: "F",
    name: "Estate matrix",
    status: "concept",
    blurb: "Customers down, services across. Cell = Cover / RAG.",
    use: "Portfolio home on top of C — not in-customer chrome.",
  },
];

function Dot({ on }: { on?: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 rounded-full",
        on ? "bg-teal-400" : "bg-white/25",
      )}
    />
  );
}

function Tile({ w = "flex-1" }: { w?: string }) {
  return <div className={cn("h-5 rounded-sm bg-white/10", w)} />;
}

function MockA() {
  return (
    <div className="flex h-full flex-col bg-[#07111f] text-[8px] text-white/80">
      <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1">
        <span className="font-bold text-teal-300">RPM</span>
        {["Portfolio", "Customers", "Reporting", "Config"].map((t, i) => (
          <span key={t} className={cn("rounded px-1.5 py-0.5", i === 1 && "bg-teal-500/30 text-teal-200")}>
            {t}
          </span>
        ))}
      </div>
      <div className="flex gap-1 border-b border-white/10 px-2 py-1">
        {["SYSPRO", "RMM", "Backup", "EPP", "Tickets"].map((t, i) => (
          <span key={t} className={cn("rounded-full px-1.5 py-0.5", i === 0 && "bg-teal-500 text-[#04201c]")}>
            {t}
          </span>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-4 gap-1 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Tile key={i} />
        ))}
      </div>
    </div>
  );
}

function MockB() {
  return (
    <div className="flex h-full bg-[#07111f] text-[8px] text-white/80">
      <div className="w-[28%] border-r border-white/10 p-1.5">
        <p className="mb-1 font-bold text-teal-300">Interbrand</p>
        {["Overview", "SYSPRO", "Licence", "Companies", "Jobs", "RMM", "Backup", "EPP"].map(
          (t, i) => (
            <div
              key={t}
              className={cn("rounded px-1 py-0.5", i === 2 && "bg-teal-500/25 text-teal-100")}
            >
              {t}
            </div>
          ),
        )}
      </div>
      <div className="grid flex-1 grid-cols-3 gap-1 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Tile key={i} />
        ))}
      </div>
    </div>
  );
}

function MockC() {
  return (
    <div className="flex h-full bg-[#07111f] text-[8px] text-white/80">
      <div className="flex w-5 flex-col items-center gap-1.5 border-r border-white/10 py-1.5">
        {[1, 0, 1, 0, 0, 0].map((on, i) => (
          <Dot key={i} on={!!on && i === 2} />
        ))}
      </div>
      <div className="w-[26%] border-r border-white/10 p-1.5">
        <p className="mb-1 font-bold text-teal-300">SYSPRO</p>
        {["Overview", "Licence", "Companies", "Jobs"].map((t, i) => (
          <div
            key={t}
            className={cn("rounded px-1 py-0.5", i === 1 && "bg-teal-500/25 text-teal-100")}
          >
            {t}
          </div>
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
        <p className="text-[9px] font-bold text-white">Licence</p>
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Tile key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MockD() {
  return (
    <div className="flex h-full flex-col bg-[#07111f] text-[8px] text-white/80">
      <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1">
        <span className="font-bold text-teal-300">RPM</span>
        <span className="rounded bg-white/10 px-2 py-0.5">Interbrand ▾</span>
        <div className="ml-auto flex overflow-hidden rounded">
          {["SYSPRO", "RMM", "Backup", "EPP"].map((t, i) => (
            <span key={t} className={cn("px-1.5 py-0.5", i === 0 ? "bg-teal-500 text-[#04201c]" : "bg-white/10")}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="grid flex-1 grid-cols-4 gap-1 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Tile key={i} />
        ))}
      </div>
    </div>
  );
}

function MockE() {
  return (
    <div className="flex h-full bg-[#07111f] text-[8px] text-white/80">
      <div className="flex w-5 flex-col items-center gap-1.5 border-r border-white/10 py-1.5">
        {[1, 1, 0, 0].map((on, i) => (
          <Dot key={i} on={i === 1} />
        ))}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex gap-1 border-b border-white/10 px-2 py-1">
          {["Overview", "Licence", "Companies", "Jobs"].map((t, i) => (
            <span
              key={t}
              className={cn("px-1.5 py-0.5", i === 1 && "border-b-2 border-teal-400 text-teal-200")}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-3 gap-1 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Tile key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MockF() {
  const cells = [
    ["G", "G", "A", "G", "G"],
    ["G", "G", "G", "A", "G"],
    ["G", "A", "G", "G", "—"],
    ["A", "G", "G", "G", "G"],
  ];
  const tone: Record<string, string> = {
    G: "bg-teal-500/80",
    A: "bg-amber-400/80",
    "—": "bg-white/10",
  };
  return (
    <div className="flex h-full bg-[#07111f] text-[8px] text-white/80">
      <div className="w-[22%] border-r border-white/10 p-1.5">
        {["AHIC", "IB", "RSR", "UVSS"].map((c, i) => (
          <div key={c} className={cn("flex items-center gap-1 rounded px-1 py-0.5", i === 1 && "bg-white/10")}>
            <Dot on={i !== 2} />
            {c}
          </div>
        ))}
      </div>
      <div className="flex-1 p-2">
        <div className="mb-1 grid grid-cols-5 gap-1 text-center text-white/40">
          {["SY", "RM", "BK", "EP", "TK"].map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
        {cells.map((row, ri) => (
          <div key={ri} className="mb-1 grid grid-cols-5 gap-1">
            {row.map((c, ci) => (
              <div key={ci} className={cn("h-4 rounded-sm", tone[c])} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const MOCK: Record<Opt, () => ReactNode> = {
  A: MockA,
  B: MockB,
  C: MockC,
  D: MockD,
  E: MockE,
  F: MockF,
};

function NavLabPage() {
  const [on, setOn] = useState<Opt>("C");
  const meta = OPTIONS.find((o) => o.id === on)!;
  const Frame = MOCK[on];

  return (
    <div className="space-y-4">
      <ConfigPageHead
        title="Navigation mockups"
        blurb="Six chrome options. C is live. Click a card to enlarge."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {OPTIONS.map((o) => {
          const Mini = MOCK[o.id];
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setOn(o.id)}
              className={cn(
                "rounded-lg border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md",
                on === o.id
                  ? "border-teal-500 ring-1 ring-teal-500/40"
                  : "border-[var(--color-border-strong)]",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold">
                  {o.id} · {o.name}
                </span>
                {o.status === "shipped" ? (
                  <span className="inline-flex items-center gap-0.5 rounded bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-700 dark:text-teal-300">
                    <Check className="size-3" /> Live
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wide text-muted">Concept</span>
                )}
              </div>
              <div className="aspect-[16/9] overflow-hidden rounded-md border border-white/10">
                <Mini />
              </div>
              <p className="mt-2 text-[11px] text-muted">{o.blurb}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-[var(--color-border-strong)] p-3">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold">
            {meta.id} · {meta.name}
          </h2>
          <p className="text-[11px] text-muted">{meta.use}</p>
        </div>
        <div className="aspect-[21/9] overflow-hidden rounded-md border border-white/10">
          <Frame />
        </div>
      </div>
    </div>
  );
}
