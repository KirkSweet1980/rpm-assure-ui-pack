import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SpaLink } from "@/components/nav/spa-link";
import { cn } from "@/lib/utils";

export type CorpModule = { label: string; path: string };
export type CorpService = {
  id: string;
  title: string;
  overview: string;
  modules: CorpModule[];
};

function Drop({
  title,
  value,
  placeholder,
  open,
  onToggle,
  children,
}: {
  title: string;
  value: string | null;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rpma-nav-block">
      <div className="rpma-pillar-rail-head">
        <h2>{title}</h2>
      </div>
      <div className="rpma-dd">
        <button
          type="button"
          className={cn("rpma-dd-trigger", open && "is-open")}
          aria-expanded={open}
          onClick={onToggle}
        >
          <i className="rpma-dd-pip is-cover" aria-hidden />
          <span className={cn("truncate", !value && "is-ph")}>{value ?? placeholder}</span>
          <ChevronDown className={cn("rpma-dd-chev", open && "rot")} />
        </button>
        {open ? (
          <div className="rpma-dd-menu" role="listbox">
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function CorpWorkspaceRail({
  heading,
  homeHref,
  services,
  pathname,
}: {
  heading: string;
  homeHref: string;
  services: CorpService[];
  pathname: string;
}) {
  const path = pathname.replace(/\/$/, "") || homeHref;
  const fromUrl =
    services.find((s) => s.modules.some((m) => path === m.path || path.startsWith(`${m.path}/`))) ??
    services.find((s) => path === s.overview || path.startsWith(`${s.overview}/`)) ??
    null;
  const [picked, setPicked] = useState<string | null>(fromUrl?.id ?? null);
  const [open, setOpen] = useState<"svc" | "mod" | null>(fromUrl ? "mod" : "svc");
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setPicked(fromUrl?.id ?? null);
    setOpen(fromUrl ? "mod" : "svc");
  }, [fromUrl?.id]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const active = services.find((s) => s.id === picked) ?? null;
  const currentMod =
    active?.modules.find((m) => path === m.path || path.startsWith(`${m.path}/`)) ?? null;

  return (
    <aside ref={rootRef} className="rpma-pillar-rail" aria-label={heading}>
      <section className="rpma-nav-block">
        <div className="rpma-pillar-rail-head">
          <h2>{heading}</h2>
        </div>
        <div className="rpma-pillar-mods is-eco">
          <SpaLink
            href={homeHref}
            className={cn("rpma-modbtn", (path === homeHref || path === `${homeHref}/`) && "is-on")}
            onClick={() => {
              setPicked(null);
              setOpen("svc");
            }}
          >
            Overview
          </SpaLink>
        </div>
      </section>

      <Drop
        title="Service"
        value={active?.title ?? null}
        placeholder="Select a service"
        open={open === "svc"}
        onToggle={() => setOpen((v) => (v === "svc" ? null : "svc"))}
      >
        {services.map((s) => (
          <SpaLink
            key={s.id}
            href={s.overview}
            role="option"
            aria-selected={picked === s.id}
            className={cn("rpma-dd-item", picked === s.id && "is-on")}
            onClick={() => {
              setPicked(s.id);
              setOpen("mod");
            }}
          >
            <span className="rpma-dd-name">{s.title}</span>
            <span className="rpma-dd-meta">
              {picked === s.id ? <Check className="rpma-dd-check" /> : null}
            </span>
          </SpaLink>
        ))}
      </Drop>

      <Drop
        title="Service Modules"
        value={currentMod?.label ?? null}
        placeholder={active ? "Select a service module" : "Select a service first"}
        open={open === "mod"}
        onToggle={() => active && setOpen((v) => (v === "mod" ? null : "mod"))}
      >
        {active ? (
          active.modules.map((m) => {
            const selected = path === m.path || path.startsWith(`${m.path}/`);
            return (
              <SpaLink
                key={m.path}
                href={m.path}
                role="option"
                aria-selected={selected}
                className={cn("rpma-dd-item", selected && "is-on")}
                onClick={() => setOpen(null)}
              >
                <span className="rpma-dd-name">{m.label}</span>
                <span className="rpma-dd-meta">
                  {selected ? <Check className="rpma-dd-check" /> : null}
                </span>
              </SpaLink>
            );
          })
        ) : (
          <p className="rpma-list-empty">Select a service</p>
        )}
      </Drop>
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
      <span className="rpma-crumb-arr" aria-hidden>
        ›
      </span>
      {service ? (
        <span className="rpma-crumb-a">{service}</span>
      ) : (
        <span className="rpma-crumb-muted">Service</span>
      )}
      <span className="rpma-crumb-arr" aria-hidden>
        ›
      </span>
      {moduleLabel ? (
        <span className="rpma-crumb-now">{moduleLabel}</span>
      ) : (
        <span className="rpma-crumb-muted">Service module</span>
      )}
    </nav>
  );
}
