import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { HelpTip } from "@/components/ui/help-tip";
import { cn } from "@/lib/utils";

export type CorpModule = { label: string; path: string; icon?: LucideIcon; color?: string };
export type CorpService = {
  id: string;
  title: string;
  overview: string;
  icon?: LucideIcon;
  color?: string;
  modules: CorpModule[];
};

export function CorpWorkspaceRail({
  heading,
  homeHref,
  services,
  pathname,
  servicesHeading = "RPM Services",
  modulesHeading = "RPM Service Modules",
  stacked = false,
  homeLabel = "Overview",
}: {
  heading: string;
  homeHref: string;
  services: CorpService[];
  pathname: string;
  servicesHeading?: string;
  modulesHeading?: string;
  stacked?: boolean;
  homeLabel?: string;
}) {
  const path = pathname.replace(/\/$/, "") || homeHref;
  const fromUrl =
    services.find((s) => s.modules.some((m) => path === m.path || path.startsWith(`${m.path}/`))) ??
    services.find((s) => path === s.overview || path.startsWith(`${s.overview}/`)) ??
    null;
  const [picked, setPicked] = useState<string | null>(fromUrl?.id ?? null);

  useEffect(() => {
    setPicked(fromUrl?.id ?? null);
  }, [fromUrl?.id]);

  const active = services.find((s) => s.id === picked) ?? null;

  return (
    <aside className="rpma-pillar-rail" aria-label={heading}>
      <section className="rpma-nav-block">
        <div className="rpma-pillar-rail-head">
          <h2>{heading}</h2>
          <HelpTip text="Same layout as Customer EcoSystem: pick a service, then a module. The form opens on the right." />
        </div>
        <div className="rpma-eco-list">
          <SpaLink
            href={homeHref}
            className={cn("rpma-eco-item", (path === homeHref || path === `${homeHref}/`) && "is-on")}
            onClick={() => setPicked(null)}
          >
            <LayoutDashboard className="rpma-nav-ico" style={{ color: "#0d9488" }} aria-hidden />
            <span className="min-w-0 flex-1">{homeLabel}</span>
          </SpaLink>
        </div>
      </section>

      <section className="rpma-nav-block">
        <div className="rpma-pillar-rail-head">
          <h2>{servicesHeading}</h2>
          <HelpTip text="Configuration services. Select one to see its modules." />
        </div>
        <div className="rpma-svc-static" role="navigation" aria-label={servicesHeading}>
          {services.map((s) => {
            const Icon = s.icon ?? LayoutDashboard;
            return (
              <SpaLink
                key={s.id}
                href={s.overview}
                title={s.title}
                className={cn("rpma-svc-row", picked === s.id && "is-on")}
                onClick={() => setPicked(s.id)}
              >
                <Icon className="rpma-svc-glyph" style={{ color: s.color ?? "#0d9488" }} aria-hidden />
                <span className="rpma-svc-row-name">{s.title}</span>
              </SpaLink>
            );
          })}
        </div>
      </section>

      {stacked ? (
        <section className="rpma-nav-block">
          <div className="rpma-pillar-rail-head">
            <h2>{active ? "RPM Service Modules" : modulesHeading}</h2>
            <HelpTip text="Pages inside the selected service. Forms and inputs open on the right." />
          </div>
          <div className="rpma-mod-static" role="navigation" aria-label={modulesHeading}>
            {active ? (
              active.modules.map((m) => {
                const selected = path === m.path || path.startsWith(`${m.path}/`);
                const Icon = m.icon ?? LayoutDashboard;
                return (
                  <SpaLink
                    key={m.path}
                    href={m.path}
                    className={cn("rpma-mod-row", selected && "is-on")}
                  >
                    <Icon className="rpma-nav-ico" style={{ color: m.color ?? active.color ?? "#0d9488" }} aria-hidden />
                    <span className="min-w-0 flex-1">{m.label}</span>
                  </SpaLink>
                );
              })
            ) : (
              <p className="rpma-list-empty">Select a service</p>
            )}
          </div>
        </section>
      ) : null}
    </aside>
  );
}

export function CorpPathTrail({
  rootLabel,
  rootHref,
  service,
  moduleLabel,
}: {
  rootLabel: string;
  rootHref: string;
  service?: string | null;
  moduleLabel?: string | null;
}) {
  return (
    <nav className="rpma-crumb" aria-label="Path">
      <SpaLink href={rootHref} className="rpma-crumb-a">
        {rootLabel}
      </SpaLink>
      {service ? (
        <>
          <span className="rpma-crumb-arr" aria-hidden>
            ›
          </span>
          <span className="rpma-crumb-a">{service}</span>
        </>
      ) : null}
      {moduleLabel ? (
        <>
          <span className="rpma-crumb-arr" aria-hidden>
            ›
          </span>
          <span className="rpma-crumb-now">{moduleLabel}</span>
        </>
      ) : null}
    </nav>
  );
}
