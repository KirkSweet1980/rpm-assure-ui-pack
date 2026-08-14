import { SlidersHorizontal, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import {
  EXCO_WIDGETS,
  persistExcoWidgetLayout,
  type ExcoWidgetId,
  type ExcoWidgetLayout,
} from "@/lib/exco-widgets";
import { cn } from "@/lib/utils";

export function CustomizeWidgetsButton({ onClick, open }: { onClick: () => void; open: boolean }) {
  return (
    <button type="button" className={cn("rpma-viewbar-btn", open && "is-on")} onClick={onClick}>
      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
      Customize
    </button>
  );
}

export function CustomizeWidgetsPanel({
  layout,
  onChange,
  onClose,
}: {
  layout: ExcoWidgetLayout;
  onChange: (next: ExcoWidgetLayout) => void;
  onClose: () => void;
}) {
  function commit(next: ExcoWidgetLayout) {
    const clean = {
      order: next.order,
      hidden: next.hidden.filter((id) => next.order.includes(id)),
    };
    persistExcoWidgetLayout(clean);
    onChange(clean);
  }

  function toggle(id: ExcoWidgetId) {
    const hidden = layout.hidden.includes(id)
      ? layout.hidden.filter((x) => x !== id)
      : [...layout.hidden, id];
    commit({ ...layout, hidden });
  }

  function move(id: ExcoWidgetId, dir: -1 | 1) {
    const i = layout.order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= layout.order.length) return;
    const order = [...layout.order];
    [order[i], order[j]] = [order[j], order[i]];
    commit({ ...layout, order });
  }

  function reset() {
    commit({ order: EXCO_WIDGETS.map((w) => w.id), hidden: [] });
  }

  return (
    <aside className="rpma-wgt-panel" aria-label="Customize widgets">
      <div className="rpma-wgt-panel-head">
        <h3>Dashboard widgets</h3>
        <button type="button" className="rpma-wgt-ghost" onClick={onClose}>
          Done
        </button>
      </div>
      <p className="rpma-wgt-help">Show, hide, or reorder panes. Saved in this browser.</p>
      <ul className="rpma-wgt-list">
        {layout.order.map((id, i) => {
          const meta = EXCO_WIDGETS.find((w) => w.id === id);
          if (!meta) return null;
          const on = !layout.hidden.includes(id);
          return (
            <li key={id} className={cn("rpma-wgt-row", !on && "is-off")}>
              <label>
                <input type="checkbox" checked={on} onChange={() => toggle(id)} />
                <span>{meta.label}</span>
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
