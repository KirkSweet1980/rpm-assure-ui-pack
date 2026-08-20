import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TenantTreeItem = {
  id: string;
  label: string;
  meta?: string;
  tone?: "green" | "amber" | "red" | "off";
  icon?: ReactNode;
};

export function TenantTree({
  title,
  items,
  selected,
  onSelect,
  children,
}: {
  title: string;
  items: TenantTreeItem[];
  selected: string;
  onSelect: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <StickyPickSplit title={title} items={items} selected={selected} onSelect={onSelect}>
      {children}
    </StickyPickSplit>
  );
}

export function StickyPickSplit({
  title,
  items,
  selected,
  onSelect,
  children,
}: {
  title: string;
  items: TenantTreeItem[];
  selected: string;
  onSelect: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="rpma-rmm-split">
      <aside className="rpma-rmm-list" aria-label={title}>
        <div className="rpma-rmm-list-h">
          {title} <em>{items.length}</em>
        </div>
        <ul>
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                className={cn("rpma-ttree-item", selected === it.id && "is-on")}
                onClick={() => onSelect(it.id)}
              >
                <i data-tone={it.tone ?? "off"} />
                {it.icon ? <span className="rpma-ttree-ico">{it.icon}</span> : null}
                <span>
                  <strong>{it.label}</strong>
                  {it.meta ? <em>{it.meta}</em> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="rpma-rmm-detail">{children}</div>
    </div>
  );
}
