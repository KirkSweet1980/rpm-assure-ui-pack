import { useEffect, useState } from "react";
import { SpaLink } from "@/components/nav/spa-link";
import { cn } from "@/lib/utils";

export type CorpModule = { label: string; path: string };
export type CorpService = {
  id: string;
  title: string;
  overview: string;
  modules: CorpModule[];
};

export function CorpWorkspaceRail({
  heading,
  homeHref,
  services,
  pathname,
  servicesHeading = "Settings",
  modulesHeading = "Service Modules",
  stacked = false,
}: {
  heading: string;
  homeHref: string;
  services: CorpService[];
  pathname: string;
  servicesHeading?: string;
  modulesHeading?: string;
  stacked?: boolean;
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
    <>
      <aside className="rpma-pillar-rail" aria-label={heading}>
        <section className="rpma-nav-block">
          <div className="rpma-pillar-rail-head">
            <h2>{heading}</h2>
          </div>
          <div className="rpma-pillar-mods is-eco">
            <SpaLink
              href={homeHref}
              className={cn("rpma-modbtn", (path === homeHref || path === `${homeHref}/`) && "is-on")}
              onClick={() => setPicked(null)}
            >
              Overview
            </SpaLink>
          </div>
        </section>

        <section className="rpma-nav-block">
          <div className="rpma-pillar-rail-head">
            <h2>{servicesHeading}</h2>
          </div>
          <div className="rpma-svc-static" role="navigation" aria-label={servicesHeading}>
            {services.map((s) => (
              <SpaLink
                key={s.id}
                href={s.overview}
                className={cn("rpma-svc-row is-cover", picked === s.id && "is-on")}
                onClick={() => setPicked(s.id)}
              >
                <span className="rpma-svc-row-name">{s.title}</span>
              </SpaLink>
            ))}
          </div>
        </section>

        {stacked && active ? (
          <section className="rpma-nav-block">
            <div className="rpma-pillar-rail-head">
              <h2>{modulesHeading}</h2>
            </div>
            <div className="rpma-mod-static" role="navigation" aria-label={modulesHeading}>
              {active.modules.map((m) => {
                const selected = path === m.path || path.startsWith(`${m.path}/`);
                return (
                  <SpaLink
                    key={m.path}
                    href={m.path}
                    className={cn("rpma-mod-row", selected && "is-on")}
                  >
                    {m.label}
                  </SpaLink>
                );
              })}
            </div>
          </section>
        ) : null}
      </aside>

      {!stacked && active ? (
        <aside className="rpma-pillar-rail" aria-label={modulesHeading}>
          <section className="rpma-nav-block">
            <div className="rpma-pillar-rail-head">
              <h2>{modulesHeading}</h2>
            </div>
            <div className="rpma-mod-static" role="navigation" aria-label={modulesHeading}>
              {active.modules.map((m) => {
                const selected = path === m.path || path.startsWith(`${m.path}/`);
                return (
                  <SpaLink
                    key={m.path}
                    href={m.path}
                    className={cn("rpma-mod-row", selected && "is-on")}
                  >
                    {m.label}
                  </SpaLink>
                );
              })}
            </div>
          </section>
        </aside>
      ) : null}
    </>
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
