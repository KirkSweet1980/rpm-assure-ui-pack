import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { InfoTag } from "@/components/portfolio/info-tag";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "rpma.exco.panelOpen.v1";

type OpenMap = Record<string, boolean>;

function readMap(): OpenMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const j = JSON.parse(raw) as unknown;
    return j && typeof j === "object" ? (j as OpenMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: OpenMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Persist open/closed per panel id across reloads */
export function useExcoPanelOpen(id: string, defaultOpen = true): [boolean, () => void] {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return defaultOpen;
    const m = readMap();
    return id in m ? Boolean(m[id]) : defaultOpen;
  });

  useEffect(() => {
    const m = readMap();
    if (id in m) setOpen(Boolean(m[id]));
  }, [id]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      const m = readMap();
      m[id] = next;
      writeMap(m);
      return next;
    });
  }, [id]);

  return [open, toggle];
}

export function ExcoCollapsible({
  id,
  title,
  blurb,
  accent,
  defaultOpen = true,
  children,
  className,
  headerExtra,
  dense = true,
}: {
  id: string;
  title: string;
  blurb?: string;
  accent?: "accent" | "amber" | "red" | "green";
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  /** Extra content on the right of the title (before toggle) */
  headerExtra?: ReactNode;
  dense?: boolean;
}) {
  const [open, toggle] = useExcoPanelOpen(id, defaultOpen);
  const tip = (blurb || "").trim();

  return (
    <Card className={cn("rpma-exco-panel", !open && "rpma-exco-panel-collapsed", className)}>
      <CardHead className="!normal-case !tracking-normal">
        <div className="flex w-full items-center gap-2 pr-0.5">
          <button
            type="button"
            className="rpma-exco-panel-toggle flex min-w-0 flex-1 items-center gap-2 rounded-md text-left transition hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            aria-expanded={open}
            onClick={toggle}
          >
            {accent ? (
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  accent === "amber" && "bg-rag-amber",
                  accent === "red" && "bg-rag-red",
                  accent === "green" && "bg-rag-green",
                  accent === "accent" && "bg-accent",
                )}
                aria-hidden
              />
            ) : null}
            <span className="min-w-0 flex-1 truncate text-[13px] font-bold leading-tight tracking-tight text-fg">
              {title}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
                open ? "rotate-0" : "-rotate-90",
              )}
              aria-hidden
            />
          </button>
          {tip ? (
            <InfoTag title={tip} className="shrink-0">
              ?
            </InfoTag>
          ) : null}
          {headerExtra}
          <button
            type="button"
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition",
              open
                ? "bg-surface-2 text-muted hover:bg-accent-soft hover:text-accent"
                : "bg-accent-soft text-accent hover:bg-accent hover:text-accent-fg",
            )}
            onClick={toggle}
            aria-label={open ? `Hide ${title}` : `Show ${title}`}
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </CardHead>
      {open ? (
        <CardContent className={cn(dense && "rpma-exco-panel-body")}>{children}</CardContent>
      ) : null}
    </Card>
  );
}

/** Chart/body height helper for compact Exco layout */
export const EXCO_CHART_H = {
  compact: 140,
  normal: 160,
} as const;
