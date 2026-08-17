import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import type { LiveTone } from "@/lib/data/live-status";
import { cn } from "@/lib/utils";

export type EmpTool = {
  label: string;
  href: string;
  icon: LucideIcon;
  rag?: LiveTone;
  active?: boolean;
};

export type EmpGroup = {
  id: string;
  title: string;
  on?: boolean;
  items: EmpTool[];
};

export function EmpWindow({
  title,
  subtitle = "Enterprise Management Platform",
  menu,
  groups,
  flush,
  children,
}: {
  title: string;
  subtitle?: string;
  menu: { label: string; href: string; on?: boolean }[];
  groups: EmpGroup[];
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rpma-amx-workspace">
      <div className="rpma-emp">
        <div className="rpma-emp-title">
          <span className="rpma-emp-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <strong>{title}</strong>
          <em>{subtitle}</em>
        </div>
        <nav className="rpma-emp-menu" aria-label="Application">
          {menu.map((m) => (
            <SpaLink key={m.label} href={m.href} className={m.on ? "is-on" : undefined}>
              {m.label}
            </SpaLink>
          ))}
        </nav>
        <div className="rpma-emp-ribbon" role="toolbar">
          {groups.map((g) => (
            <div key={g.id} className={cn("rpma-emp-group", g.on && "is-on")}>
              <div className="rpma-emp-gtitle">{g.title}</div>
              <div className="rpma-emp-tools">
                {g.items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <SpaLink
                      key={it.href + it.label}
                      href={it.href}
                      className={cn("rpma-emp-tool", it.active && "is-on")}
                      data-rag={it.rag ?? "Off"}
                      title={it.label}
                    >
                      <span className="rpma-emp-ico">
                        <Icon className="size-5" />
                      </span>
                      <span>{it.label}</span>
                    </SpaLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className={cn("rpma-emp-body", !flush && "is-pad")}>{children}</div>
      </div>
    </div>
  );
}
