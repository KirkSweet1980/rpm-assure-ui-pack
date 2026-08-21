import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import type { LiveTone } from "@/lib/data/live-status";
import { RagLamps } from "@/components/chrome/rag-lamps";
import { RailFold } from "@/components/chrome/rail-fold";
import { cn } from "@/lib/utils";

export type EmpTool = {
  label: string;
  href: string;
  icon?: LucideIcon;
  rag?: LiveTone;
  active?: boolean;
};

export type EmpGroup = {
  id: string;
  title: string;
  on?: boolean;
  color?: string;
  icon?: LucideIcon;
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
  const group = groups.find((g) => g.on) ?? groups[0];
  const item = group?.items.find((i) => i.active) ?? group?.items[0];
  return (
    <div className="rpma-amx-workspace">
      <div className="rpma-emp is-side is-triple">
        <div className="rpma-emp-title">
          <span className="rpma-emp-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <strong>{title}</strong>
          <em>{subtitle}</em>
          <span className="ml-auto flex flex-wrap gap-2">
            {menu.map((m) => (
              <SpaLink
                key={m.label}
                href={m.href}
                className={cn("text-[11px] font-semibold text-white/80 hover:text-white", m.on && "underline")}
              >
                {m.label}
              </SpaLink>
            ))}
          </span>
        </div>
        <div className="rpma-emp-bodyrow">
          <RailFold className="rpma-rail rpma-rail-svc" label={`RPM Services · ${group?.title ?? title}`}>
            <nav aria-label="RPM Services">
            <p className="rpma-rail-kicker">RPM Services</p>
            <div className="rpma-rail-list">
              {groups.map((g) => {
                const tone =
                  g.items.find((i) => i.rag === "Red")?.rag ??
                  g.items.find((i) => i.rag === "Amber")?.rag ??
                  g.items.find((i) => i.rag === "Green")?.rag ??
                  "Off";
                const Icon = g.icon;
                return (
                  <SpaLink
                    key={g.id}
                    href={g.items[0]?.href ?? "#"}
                    className={cn("rpma-rail-item", g.on && "is-on")}
                    data-rag={tone}
                    title={`${g.title} · ${tone}`}
                  >
                    {Icon ? <Icon className="rpma-rail-ico" style={{ color: g.color }} aria-hidden /> : null}
                    <span className="rpma-rail-name">{g.title}</span>
                    <RagLamps tone={tone} />
                  </SpaLink>
                );
              })}
            </div>
            </nav>
          </RailFold>
          <RailFold className="rpma-rail rpma-rail-mod" label={`${group?.title ?? "Modules"} · ${item?.label ?? title}`}>
            <nav aria-label="RPM Service Modules">
            <p className="rpma-rail-kicker">{group?.title ?? "Modules"}</p>
            <p className="rpma-rail-sec">RPM Service Modules</p>
            <div className="rpma-rail-list">
              {(group?.items ?? []).map((it) => {
                const Icon = it.icon;
                return (
                  <SpaLink
                    key={it.href + it.label}
                    href={it.href}
                    className={cn("rpma-rail-item", it.active && "is-on")}
                    data-rag={it.rag ?? "Off"}
                    title={it.label}
                  >
                    <span className="rpma-rail-ico">{Icon ? <Icon className="size-4" /> : null}</span>
                    <span className="rpma-rail-name">{it.label}</span>
                  </SpaLink>
                );
              })}
            </div>
            </nav>
          </RailFold>
          <div className="rpma-emp-work">
            <section className="rpma-win is-fill rpma-work-window">
              <header className="rpma-win-head">
                <h2>{item?.label ?? title}</h2>
                <p>{group?.title ?? subtitle}</p>
              </header>
              <div className={cn("rpma-emp-body rpma-work-scroll", !flush && "is-pad")}>{children}</div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
