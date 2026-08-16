import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { settingsPageCopy } from "@/lib/settings/page-copy";

export function ConfigPageHead({
  description,
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
  const blurb = description ?? copy.description;
  return (
    <div className="rpma-settings-toolbar">
      {blurb ? <p className="rpma-settings-blurb">{blurb}</p> : null}
      {actions ? <div className="rpma-settings-actions">{actions}</div> : null}
    </div>
  );
}
