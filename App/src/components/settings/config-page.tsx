import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { settingsPageCopy } from "@/lib/settings/page-copy";

export function ConfigPageHead({
  kicker,
  title,
  description,
  icon: Icon,
  actions,
}: {
  kicker?: string;
  title?: string;
  description?: string;
  icon: LucideIcon;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const copy = settingsPageCopy(pathname);
  const heading = title ?? copy.title;
  const blurb = description ?? copy.description;
  const section =
    kicker ??
    (pathname.startsWith("/settings/theme") ||
    pathname.startsWith("/settings/chrome") ||
    pathname.startsWith("/settings/labels") ||
    pathname.startsWith("/settings/dashboard") ||
    pathname.startsWith("/settings/alerts") ||
    pathname.startsWith("/settings/reports")
      ? "Customization"
      : "Settings");

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{section}</p>
        <h1 className="mt-1 flex items-center gap-2 text-[18px] font-extrabold tracking-tight text-fg">
          <Icon className="h-5 w-5 shrink-0 text-muted" />
          {heading}
        </h1>
        {blurb ? <p className="mt-1 max-w-2xl text-[12px] text-muted">{blurb}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
