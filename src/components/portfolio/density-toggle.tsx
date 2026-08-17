import { useDensity } from "@/lib/density";
import { cn } from "@/lib/utils";

export function DensityToggle({
  className,
  compact = false,
}: {
  className?: string;
  /** Nav: icon-only segmented control */
  compact?: boolean;
}) {
  const { density, setDensity } = useDensity();

  if (compact) {
    return (
      <div
        className={cn("rpma-nav-seg", className)}
        role="group"
        aria-label="Layout density"
      >
        <button
          type="button"
          onClick={() => setDensity("comfortable")}
          aria-pressed={density === "comfortable"}
          className={cn(
            "rpma-nav-seg-btn",
            density === "comfortable" && "rpma-nav-seg-btn-active",
          )}
        >
          Comfortable
        </button>
        <button
          type="button"
          onClick={() => setDensity("compact")}
          aria-pressed={density === "compact"}
          className={cn(
            "rpma-nav-seg-btn",
            density === "compact" && "rpma-nav-seg-btn-active",
          )}
        >
          Compact
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-bg/80 p-0.5 text-xs shadow-sm",
        className,
      )}
      role="group"
      aria-label="Layout density"
    >
      <button
        type="button"
        onClick={() => setDensity("comfortable")}
        className={cn(
          "rounded-md px-2.5 py-1 font-medium transition-colors duration-150",
          density === "comfortable"
            ? "bg-surface text-fg shadow-sm"
            : "text-muted hover:text-fg",
        )}
      >
        Comfortable
      </button>
      <button
        type="button"
        onClick={() => setDensity("compact")}
        className={cn(
          "rounded-md px-2.5 py-1 font-medium transition-colors duration-150",
          density === "compact" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
        )}
      >
        Compact
      </button>
    </div>
  );
}
