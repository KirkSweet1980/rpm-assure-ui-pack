import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function ConfigPageHead({
  kicker = "Customization",
  title,
  icon: Icon,
  actions,
}: {
  kicker?: string;
  title: string;
  icon: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{kicker}</p>
        <h1 className="mt-1 flex items-center gap-2 text-[18px] font-extrabold tracking-tight text-fg">
          <Icon className="h-5 w-5 text-muted" />
          {title}
        </h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
