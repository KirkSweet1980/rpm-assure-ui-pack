import { Rows3, Rows4 } from "lucide-react";
import { useDensity } from "@/lib/density";
import { cn } from "@/lib/utils";

export function DensityToggle({ className }: { className?: string }) {
  const { density, setDensity } = useDensity();

  return (
    <div className={cn("rpma-nav-seg", className)} role="group" aria-label="Layout density">
      <button
        type="button"
        onClick={() => setDensity("comfortable")}
        aria-pressed={density === "comfortable"}
        title="Comfortable"
        aria-label="Comfortable layout"
        className={cn("rpma-nav-seg-btn", density === "comfortable" && "rpma-nav-seg-btn-active")}
      >
        <Rows3 size={14} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        onClick={() => setDensity("compact")}
        aria-pressed={density === "compact"}
        title="Compact"
        aria-label="Compact layout"
        className={cn("rpma-nav-seg-btn", density === "compact" && "rpma-nav-seg-btn-active")}
      >
        <Rows4 size={14} strokeWidth={2.2} />
      </button>
    </div>
  );
}
