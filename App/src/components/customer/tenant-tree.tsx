import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TenantTreeItem = {
  id: string;
  label: string;
  meta?: string;
  tone?: "green" | "amber" | "red" | "off";
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
    <div className="rpma-ttree">
      <aside className="rpma-ttree-nav" aria-label={title}>
        <h2>{title}</h2>
        <ul>
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                className={cn("rpma-ttree-item", selected === it.id && "is-on")}
                onClick={() => onSelect(it.id)}
              >
                <i data-tone={it.tone ?? "off"} />
                <span>
                  <strong>{it.label}</strong>
                  {it.meta ? <em>{it.meta}</em> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="rpma-ttree-pane">{children}</div>
    </div>
  );
}
