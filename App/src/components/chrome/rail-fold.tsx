import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const DESKTOP = "(min-width: 1024px)";

/** Collapsible rail on small viewports; always expanded on desktop. */
export function RailFold({
  className,
  label,
  children,
}: {
  className?: string;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const mq = window.matchMedia(DESKTOP);
    const sync = () => {
      if (mq.matches) el.open = true;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <details ref={ref} className={cn("rpma-rail-fold", className)} open>
      <summary className="rpma-rail-summary">{label}</summary>
      {children}
    </details>
  );
}