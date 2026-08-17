import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { NO_COVER } from "@/lib/data/cover";

/** Estate / customer "not in scope" label */
export function NoCover({
  className,
  title = "No RPM Cloud Backupr — this service is not in scope for this customer",
  text,
}: {
  className?: string;
  title?: string;
  text?: string;
}) {
  return (
    <span
      className={cn(
        "rpma-no-cover inline-flex items-center rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-muted",
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
    <div className="rpma-panel px-4 py-8 text-center">
      <p className="text-sm font-bold text-fg">{service}</p>
      <p className="mt-2">
        <NoCover className="text-[11px]" text={noCoverText} />
      </p>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-muted">
        {hint ??
          "There is no live collect for this service, so it is not scored."}
      </p>
      <p className="mt-3">
        <Link
          to="/settings/infrastructure"
          className="text-[12px] font-semibold text-[var(--bs-primary)] hover:underline"
        >
          Map this service in Configuration
        </Link>
      </p>
    </div>
  );
}