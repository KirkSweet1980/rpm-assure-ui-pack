import { Badge } from "@/components/ui/badge";
import type { HealthRag } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export function RagBadge({
  rag,
  className,
  title,
}: {
  rag: HealthRag;
  className?: string;
  title?: string;
}) {
  const variant = rag === "Red" ? "red" : rag === "Amber" ? "amber" : "green";
  const dot =
    rag === "Red"
      ? "bg-rag-red"
      : rag === "Amber"
        ? "bg-rag-amber"
        : "bg-rag-green";
  return (
    <Badge
      variant={variant}
      className={cn("gap-1.5 font-semibold", className)}
      title={title}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} aria-hidden />
      {rag}
    </Badge>
  );
}
