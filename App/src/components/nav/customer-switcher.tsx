import { Building2, ChevronDown, Pin, Search, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RagBadge } from "@/components/portfolio/rag-badge";
import type { HealthRag } from "@/lib/data/types";
import { useSpaNavigate } from "@/components/nav/spa-link";
import { useDashboardConfig } from "@/lib/settings/use-dashboard-config";
import { cn } from "@/lib/utils";

export type SwitcherCustomer = {
  code: string;
  name: string;
  healthRag: HealthRag;
  needsAttention?: boolean;
  collectFresh?: boolean;
};

const RECENT_KEY = "rpma.recentCustomers";
const PIN_KEY = "rpma.pinnedCustomers";

function loadList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const j = JSON.parse(raw) as unknown;
    return Array.isArray(j) ? j.map(String) : [];
  } catch {
    return [];
  }
}

function saveList(key: string, codes: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(codes.slice(0, 12)));
  } catch {
    /* ignore */
  }
}

export function rememberRecentCustomer(code: string) {
  const cur = loadList(RECENT_KEY).filter((c) => c.toUpperCase() !== code.toUpperCase());
  saveList(RECENT_KEY, [code, ...cur]);
}

export function CustomerSwitcher({
  customers,
  currentCode,
  variant = "nav",
  label = "Customer Ecosystem",
}: {
  customers: SwitcherCustomer[];
  currentCode?: string | null;
  /** nav = top bar; inline = compact; ecosystem = Exco Insight page panel */
  variant?: "nav" | "inline" | "ecosystem";
  /** Button / field label (ecosystem + inline) */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pins, setPins] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "attention" | "red" | "amber">("all");
  const rootRef = useRef<HTMLDivElement>(null);
  const spaNav = useSpaNavigate();
  const { dashboard } = useDashboardConfig();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPins(loadList(PIN_KEY));
    setRecents(loadList(RECENT_KEY));
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = customers.find(
    (c) => c.code.toUpperCase() === (currentCode ?? "").toUpperCase(),
  );

  const filtered = useMemo(() => {
    let list = [...customers];
    if (filter === "attention") list = list.filter((c) => c.needsAttention);
    if (filter === "red") list = list.filter((c) => c.healthRag === "Red");
    if (filter === "amber") list = list.filter((c) => c.healthRag === "Amber");
    const qq = q.trim().toLowerCase();
    if (qq) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(qq) || c.code.toLowerCase().includes(qq),
      );
    }
    const pinSet = new Set(pins.map((p) => p.toUpperCase()));
    list.sort((a, b) => {
      const ap = pinSet.has(a.code.toUpperCase()) ? 0 : 1;
      const bp = pinSet.has(b.code.toUpperCase()) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      const ar = a.healthRag === "Red" ? 0 : a.healthRag === "Amber" ? 1 : 2;
      const br = b.healthRag === "Red" ? 0 : b.healthRag === "Amber" ? 1 : 2;
      if (ar !== br) return ar - br;
      return a.name.localeCompare(b.name, "en-ZA");
    });
    return list;
  }, [customers, q, filter, pins]);

  const recentRows = useMemo(() => {
    return recents
      .map((code) => customers.find((c) => c.code.toUpperCase() === code.toUpperCase()))
      .filter(Boolean) as SwitcherCustomer[];
  }, [recents, customers]);

  function go(code: string) {
    rememberRecentCustomer(code);
    setOpen(false);
    setQ("");
    const base = `/customers/${encodeURIComponent(code)}`;
    const landing =
      dashboard.customerLanding === "syspro"
        ? `${base}/syspro`
        : dashboard.customerLanding === "ams"
          ? `${base}/ams`
          : base;
    spaNav(landing);
  }

  function togglePin(code: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPins((prev) => {
      const up = code.toUpperCase();
      const next = prev.some((p) => p.toUpperCase() === up)
        ? prev.filter((p) => p.toUpperCase() !== up)
        : [code, ...prev];
      saveList(PIN_KEY, next);
      return next;
    });
  }

  const isEcosystem = variant === "ecosystem";

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative",
        variant === "inline" && "w-full max-w-md",
        isEcosystem && "w-full",
      )}
    >
      {isEcosystem ? (
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent" aria-hidden />
            <span className="text-sm font-bold tracking-tight text-fg">{label}</span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted">
              {customers.length}
            </span>
          </div>
          <span className="text-[11px] text-subtle">
            Jump to a customer workspace
          </span>
        </div>
      ) : null}

      <button
        type="button"
        className={cn(
          variant === "nav" &&
            "dk-link max-w-[16rem] " + (currentCode || open ? "is-active" : ""),
          variant === "inline" && "rpma-switcher-inline rpma-saas-switcher",
          isEcosystem &&
            "rpma-ecosystem-dd-trigger flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-left shadow-sm transition hover:border-accent/40 hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          open && variant === "nav" && "rpma-top-link-active",
          open && isEcosystem && "border-accent/50 ring-2 ring-accent/20",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={isEcosystem ? `${label}: select customer` : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {!isEcosystem ? (
          <Building2 className={cn("shrink-0", variant === "nav" ? "dk-ico" : "h-3.5 w-3.5 opacity-90")} />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        )}
        <span className={cn("min-w-0 flex-1 truncate", isEcosystem && "text-sm font-medium")}>
          {current
            ? current.name
            : isEcosystem
              ? "Customer Tenant"
              : "Customer Tenant"}
        </span>
        {current ? (
          <span className={cn(!isEcosystem && "hidden sm:inline")}>
            <RagBadge rag={current.healthRag} />
          </span>
        ) : isEcosystem ? (
          <span className="hidden text-[11px] text-subtle sm:inline">
            Search or browse
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 opacity-80 transition",
            isEcosystem && "h-4 w-4 text-muted",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          className={cn(
            "rpma-glass-dropdown absolute z-50 mt-1.5 overflow-hidden",
            variant === "nav" && "left-0 top-full w-[min(92vw,22rem)]",
            variant === "inline" && "left-0 top-full w-[min(92vw,22rem)]",
            isEcosystem && "left-0 right-0 top-full w-full max-w-none sm:max-w-xl",
          )}
          role="listbox"
        >
          <div className="border-b border-border/70 p-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg/80 px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search customers…"
                className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
                aria-label="Search customers"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(
                [
                  ["all", "All"],
                  ["attention", "Attention"],
                  ["red", "Red"],
                  ["amber", "Amber"],
                ] as const
              ).map(([k, lab]) => (
                <button
                  key={k}
                  type="button"
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition",
                    filter === k
                      ? "bg-accent text-accent-fg"
                      : "bg-surface-2 text-muted hover:bg-accent-soft hover:text-accent",
                  )}
                  onClick={() => setFilter(k)}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>

          {recentRows.length > 0 && !q ? (
            <div className="border-b border-border/60 px-2 py-1.5">
              <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-subtle">
                Recent
              </p>
              <div className="flex flex-wrap gap-1">
                {recentRows.slice(0, 5).map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-fg transition hover:border-accent/40"
                    onClick={() => go(c.code)}
                  >
                    {c.name.length > 18 ? c.code : c.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <ul className="max-h-[min(50vh,18rem)] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-muted">No matching customers.</li>
            ) : (
              filtered.map((c) => {
                const pinned = pins.some((p) => p.toUpperCase() === c.code.toUpperCase());
                const active =
                  currentCode?.toUpperCase() === c.code.toUpperCase();
                return (
                  <li key={c.code}>
                    <div
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5",
                        active && "bg-accent-soft",
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left transition hover:bg-accent-soft"
                        onClick={() => go(c.code)}
                      >
                        <span className="flex items-center gap-2">
                          <RagBadge rag={c.healthRag} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-fg">
                              {c.name}
                            </span>
                            <span className="block text-[10px] text-subtle">
                              {c.code}
                              {c.collectFresh === false
                                ? " · Collect stale / missing"
                                : c.needsAttention
                                  ? " · Needs attention"
                                  : ""}
                            </span>
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="rounded p-1.5 text-subtle transition hover:bg-surface-2 hover:text-accent"
                        aria-label={pinned ? "Unpin" : "Pin"}
                        onClick={(e) => togglePin(c.code, e)}
                      >
                        {pinned ? (
                          <Star className="h-3.5 w-3.5 fill-current text-rag-amber" />
                        ) : (
                          <Pin className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          <div className="border-t border-border/70 px-3 py-2 text-[10px] text-subtle">
            Opens Customer Ecosystem for the selected customer.
          </div>
        </div>
      ) : null}
    </div>
  );
}
