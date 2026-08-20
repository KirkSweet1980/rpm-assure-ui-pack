import type { ReactNode } from "react";
import { CUSTOMER_PILLARS, ECOSYSTEM_MODULES } from "@/components/nav/customer-modules-panel";
import { SpaLink } from "@/components/nav/spa-link";
import { CoverTag, StatusRobot } from "@/components/ui/status-robot";
import { isDormantCover } from "@/lib/data/cover";
import type { CustomerCover } from "@/lib/data/types";
import type { LiveFlag } from "@/lib/data/live-status";
import { cn } from "@/lib/utils";
import { useRouterState } from "@tanstack/react-router";
import { ChevronDown, CornerDownRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function pillarFromPath(path: string, base: string) {
  const rest = path.slice(base.length).replace(/^\//, "");
  const first = rest.split("/")[0];
  if (!first || first === "ams") return "eco";
  return CUSTOMER_PILLARS.some((p) => p.id === first || p.overview.replace(/^\//, "") === first)
    ? CUSTOMER_PILLARS.find((p) => p.id === first || p.overview.replace(/^\//, "") === first)!.id
    : "eco";
}

function Row({
  href,
  label,
  Icon,
  color,
  on,
  rag,
  hint,
  selected,
  tree,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  color: string;
  on: boolean;
  rag: LiveFlag["rag"];
  hint?: string;
  selected: boolean;
  tree?: "service" | "module" | "leaf";
}) {
  return (
    <SpaLink
      href={href}
      title={hint ?? label}
      className={cn("rpma-classic-row", selected && "is-on", tree && `is-${tree}`)}
    >
      <span className="rpma-classic-tree" aria-hidden>
        {tree === "service" && selected ? <ChevronDown strokeWidth={2.4} /> : null}
        {tree === "module" && selected ? <CornerDownRight strokeWidth={2.4} /> : null}
        {tree === "leaf" ? <i /> : null}
      </span>
      <Icon className="rpma-classic-ico" style={{ color }} aria-hidden />
      <span>{label}</span>
      <CoverTag on={on} />
      <StatusRobot rag={rag} title={hint} size={16} />
    </SpaLink>
  );
}

export function ClassicTenantNav({
  code,
  cover,
  live,
}: {
  code: string;
  cover?: CustomerCover | null;
  live?: { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> };
}) {
  const path = useRouterState({ select: (s) => s.location.pathname }).replace(/\/$/, "");
  const base = `/customers/${encodeURIComponent(code)}`;
  const picked = pillarFromPath(path, base);
  const pillar = CUSTOMER_PILLARS.find((p) => p.id === picked);
  const modules = picked === "eco" ? ECOSYSTEM_MODULES : pillar?.modules ?? ECOSYSTEM_MODULES;
  const heading = picked === "eco" ? "RPM Service Modules" : pillar?.modulesHeading ?? "RPM Service Modules";
  const dormant = isDormantCover(cover);

  return (
    <aside className="rpma-classic-nav" aria-label="Customer navigation">
      <section>
        <h2>Customer Ecosystem</h2>
        {ECOSYSTEM_MODULES.map((m) => {
          const href = m.path ? `${base}${m.path}` : base;
          const selected = path === href || path === `${href}/`;
          const flag = live?.modules[m.path] ?? live?.pillars.eco;
          return (
            <Row
              key={href}
              href={href}
              label={m.label}
              Icon={m.icon}
              color={m.color}
              on={!dormant}
              rag={flag?.rag ?? "Green"}
              hint={flag?.hint}
              selected={selected}
            />
          );
        })}
      </section>
      <section className="is-svc">
        <h2>RPM Services</h2>
        {CUSTOMER_PILLARS.map((p) => {
          const href = `${base}${p.overview}`;
          const on = p.covered(cover);
          const flag = live?.pillars[p.id];
          const selected = picked === p.id;
          return (
            <Row
              key={p.id}
              href={href}
              label={p.title}
              Icon={p.icon}
              color={p.color}
              on={on}
              rag={flag?.rag ?? (on ? "Green" : "Off")}
              hint={flag?.hint}
              selected={selected}
              tree="service"
            />
          );
        })}
      </section>
      <section className="is-mods">
        <h2>{heading}</h2>
        {modules.map((m) => {
          const href = m.path ? `${base}${m.path}` : base;
          const selected = path === href || path === `${href}/`;
          const flag = live?.modules[m.path];
          const on = picked === "eco" ? !dormant : Boolean(pillar?.covered(cover));
          return (
            <Row
              key={href}
              href={href}
              label={m.label}
              Icon={m.icon}
              color={m.color}
              on={on}
              rag={flag?.rag ?? (on ? "Green" : "Off")}
              hint={flag?.hint}
              selected={selected}
              tree={selected ? "module" : "leaf"}
            />
          );
        })}
      </section>
    </aside>
  );
}

export function ClassicTenantShell({
  code,
  cover,
  live,
  children,
}: {
  code: string;
  cover?: CustomerCover | null;
  live?: { pillars: Record<string, LiveFlag>; modules: Record<string, LiveFlag> };
  children: ReactNode;
}) {
  return (
    <div className="rpma-classic">
      <ClassicTenantNav code={code} cover={cover} live={live} />
      <div className="rpma-classic-main">{children}</div>
    </div>
  );
}
