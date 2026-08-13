import { cn } from "@/lib/utils";
import { NO_COVER } from "@/lib/data/cover";

/** Estate / customer "not in scope" label — yellow + bold site-wide */
export function NoCover({
  className,
  title = "No Cover — this service is not in scope for this customer",
  text,
}: {
  className?: string;
  title?: string;
  /** Override display text (Settings → Labels) */
  text?: string;
}) {
  return (
    <span
      className={cn(
        "rpma-no-cover inline-flex items-center rounded-md border border-rag-amber/50 bg-rag-amber-bg px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-rag-amber",
        className,
      )}
      title={title}
    >
      {text ?? NO_COVER}
    </span>
  );
}

export function NoCoverPanel({
  service,
  hint,
  noCoverText,
}: {
  service: string;
  hint?: string;
  noCoverText?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-rag-amber/40 bg-rag-amber-bg/30 px-4 py-8 text-center">
      <p className="text-sm font-bold text-fg">{service}</p>
      <p className="mt-2">
        <NoCover className="text-[11px]" text={noCoverText} />
      </p>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-muted">
        {hint ??
          "This customer does not include this service in their managed scope. Health and KPIs for this pillar are not scored."}
      </p>
    </div>
  );
}
