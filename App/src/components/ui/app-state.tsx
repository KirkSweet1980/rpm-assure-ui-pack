import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Canvas loading. Neutral — not RAG. */
export function AppLoading({
  label = "Loading…",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn("rpma-app-state is-loading", compact && "is-compact")}
      role="status"
      aria-live="polite"
    >
      <span className="rpma-app-state-mark" aria-hidden />
      <p>{label}</p>
    </div>
  );
}

/** No data. Not a failure and not No Cover. */
export function AppEmpty({
  title,
  detail,
  action,
  compact = false,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("rpma-app-state is-empty", compact && "is-compact")} role="status">
      <h2>{title}</h2>
      {detail ? <p>{detail}</p> : null}
      {action ? <div className="rpma-app-state-action">{action}</div> : null}
    </div>
  );
}

/** Runtime/UI error. Slate treatment — not Red service posture. */
export function AppError({
  title,
  detail,
  onRetry,
  retryLabel = "Retry",
  children,
}: {
  title: string;
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rpma-app-state is-error" role="alert">
      <h2>{title}</h2>
      {detail ? <p>{detail}</p> : null}
      {onRetry ? (
        <div className="rpma-app-state-action">
          <button type="button" className="rpma-app-state-btn" onClick={onRetry}>
            {retryLabel}
          </button>
        </div>
      ) : null}
      {children ? <div className="rpma-app-state-action">{children}</div> : null}
    </div>
  );
}