import type { ReactNode } from "react";
import { ChevronRight, Search } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { cn } from "@/lib/utils";

/** Shared list chrome: head + search + scroll body */
export function ListPanel({
  title,
  count,
  query,
  onQuery,
  placeholder,
  children,
  className,
}: {
  title: string;
  count?: number;
  query?: string;
  onQuery?: (q: string) => void;
  placeholder?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn("rpma-list", className)}>
      <div className="rpma-list-head">
        <h2 className="rpma-list-title">
          {title}
          {count != null ? <span className="rpma-list-count">{count}</span> : null}
        </h2>
        {onQuery ? (
          <label className="rpma-list-search">
            <Search className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
            <input
              type="search"
              value={query ?? ""}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={placeholder ?? "Search…"}
              autoComplete="off"
            />
          </label>
        ) : null}
      </div>
      <div className="rpma-list-body" role="list">
        {children}
      </div>
    </aside>
  );
}

/** 4-slot row: lead | title+meta | trail | chevron */
export function ListRow({
  href,
  active,
  lead,
  title,
  meta,
  trail,
  onClick,
}: {
  href: string;
  active?: boolean;
  lead?: ReactNode;
  title: string;
  meta?: ReactNode;
  trail?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <SpaLink
      href={href}
      className={cn("rpma-list-row", active && "is-active")}
      aria-current={active ? "page" : undefined}
      title={title}
      onClick={onClick}
    >
      <span className="rpma-list-lead">{lead}</span>
      <span className="rpma-list-copy">
        <span className="rpma-list-name">{title}</span>
        {meta ? <span className="rpma-list-meta">{meta}</span> : null}
      </span>
      {trail ? <span className="rpma-list-trail">{trail}</span> : <span />}
      <ChevronRight className="rpma-list-chev" aria-hidden />
    </SpaLink>
  );
}
