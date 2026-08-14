import { SlidersHorizontal, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import {
  ECO_WIDGETS,
  persistEcoWidgetLayout,
  type EcoWidgetId,
  type EcoWidgetLayout,
} from "@/lib/eco-widgets";
import { cn } from "@/lib/utils";

export function EcoCustomizeButton({ onClick, open }: { onClick: () => void; open: boolean }) {
  return (
    <button type="button" className={cn("rpma-viewbar-btn", open && "is-on")} onClick={onClick}>
      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
      Customize
    </button>
  );
}

export function EcoCustomizePanel({
  layout,
  onChange,
  onClose,
}: {
  layout: EcoWidgetLayout;
  onChange: (next: EcoWidgetLayout) => void;
  onClose: () => void;
}) {
  function commit(next: EcoWidgetLayout) {
    const clean = {
      order: next.order,
      hidden: next.hidden.filter((id) => next.order.includes(id)),
    };
    persistEcoWidgetLayout(clean);
    onChange(clean);
  }

  function toggle(id: EcoWidgetId) {
    const hidden = layout.hidden.includes(id)
      ? layout.hidden.filter((x) => x !== id)
      : [...layout.hidden, id];
    commit({ ...layout, hidden });
  }

  function move(id: EcoWidgetId, dir: -1 | 1) {
    const i = layout.order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= layout.order.length) return;
    const order = [...layout.order];
    [order[i], order[j]] = [order[j], order[i]];
    commit({ ...layout, order });
  }

  function reset() {
    commit({
      order: ECO_WIDGETS.map((w) => w.id),
      hidden: ["epp", "incidents", "risks", "license", "dayend", "jobs", "patch"],
    });
  }

  return (
    <aside className="rpma-wgt-panel" aria-label="Customize EcoSystem widgets">
      <div className="rpma-wgt-panel-head">
        <h3>EcoSystem widgets</h3>
        <button type="button" className="rpma-wgt-ghost" onClick={onClose}>
          Done
        </button>
      </div>
      <p className="rpma-wgt-help">Show, hide or reorder panes for this customer view. Saved in this browser.</p>
      <ul className="rpma-wgt-list">
        {layout.order.map((id, i) => {
          const meta = ECO_WIDGETS.find((w) => w.id === id);
          if (!meta) return null;
          const on = !layout.hidden.includes(id);
          return (
            <li key={id} className={cn("rpma-wgt-row", !on && "is-off")}>
              <label>
                <input type="checkbox" checked={on} onChange={() => toggle(id)} />
                <span>
                  {meta.label}
                  <em className="ml-1.5 font-normal not-italic text-muted">· {meta.hint}</em>
                </span>
              </label>
              <span className="rpma-wgt-move">
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(id, -1)}>
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === layout.order.length - 1}
                  onClick={() => move(id, 1)}
                >
                  <ChevronDown size={14} />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <button type="button" className="rpma-wgt-reset" onClick={reset}>
        <RotateCcw size={13} /> Reset layout
      </button>
    </aside>
  );
}
