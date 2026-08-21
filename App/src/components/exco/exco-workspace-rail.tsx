/** QUARANTINED: not mounted by production routes. Canonical chrome is AppShell + EmpChrome + EmpWindow. */
import { AlertTriangle, Gauge, LayoutDashboard, Scale, Timer, Users } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { HelpTip } from "@/components/ui/help-tip";
import { RagBadge } from "@/components/portfolio/rag-badge";
import { cn } from "@/lib/utils";
import type { EstateView } from "@/lib/estate-views";
import type { ExcoCustomerBoard, HealthRag } from "@/lib/data/types";

const VIEW_ICON: Record<string, typeof Users> = {
  all: Users,
  attention: AlertTriangle,
  finsight: Scale,
  sla: Gauge,
  stale: Timer,
};

export function ExcoWorkspaceRail({
  views,
  viewCounts,
  activeView,
  onView,
  onRemoveView,
  boards,
  slaAvg,
  estateRag,
}: {
  views: EstateView[];
  viewCounts: Record<string, number>;
  activeView: string;
  onView: (v: EstateView) => void;
  onRemoveView: (id: string) => void;
  boards: ExcoCustomerBoard[];
  slaAvg: number;
  estateRag: HealthRag;
}) {
  const sorted = [...boards].sort((a, b) => {
    const rank = (r: HealthRag) => (r === "Red" ? 0 : r === "Amber" ? 1 : 2);
    return rank(a.healthRag) - rank(b.healthRag) || a.displayName.localeCompare(b.displayName);
  });

  function jump(id: string) {
    document.getElementById(`exco-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <aside className="rpma-pillar-rail" aria-label="Exco Insight">
      <section className="rpma-nav-block">
        <div className="rpma-pillar-rail-head">
          <h2>Exco Insight</h2>
          <HelpTip text="Estate views and tenants. The dashboard on the right scrolls — this rail stays put." />
        </div>
        <div className="rpma-eco-list">
          <button
            type="button"
            className={cn("rpma-eco-item", activeView === "all" && "is-on")}
            onClick={() => {
              const all = views.find((v) => v.id === "all");
              if (all) onView(all);
              jump("brief");
            }}
          >
            <LayoutDashboard className="rpma-nav-ico" style={{ color: "#0d9488" }} aria-hidden />
            <span className="min-w-0 flex-1 truncate">Estate Overview</span>
            <RagBadge rag={estateRag} />
          </button>
        </div>
      </section>

      <section className="rpma-nav-block">
        <div className="rpma-pillar-rail-head">
          <h2>Estate Views</h2>
          <HelpTip text="Filter the dashboard. Counts are live from the estate." />
        </div>
        <div className="rpma-svc-static" role="navigation" aria-label="Estate views">
          {views.map((v) => {
            const Icon = VIEW_ICON[v.id] ?? LayoutDashboard;
            const n = viewCounts[v.id];
            return (
              <div key={v.id} className="flex items-center gap-0.5">
                <button
                  type="button"
                  className={cn("rpma-svc-row min-w-0 flex-1", activeView === v.id && "is-on")}
                  onClick={() => onView(v)}
                >
                  <Icon className="rpma-svc-glyph" style={{ color: v.id === "attention" ? "#d97706" : "#0d9488" }} aria-hidden />
                  <span className="rpma-svc-row-name">{v.label}</span>
                  {n != null ? (
                    <span className="font-mono text-[10px] font-bold text-muted">{n}</span>
                  ) : null}
                </button>
                {!v.builtin ? (
                  <button
                    type="button"
                    className="px-1 text-[11px] text-muted hover:text-rag-red"
                    title="Remove view"
                    onClick={() => onRemoveView(v.id)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rpma-nav-block">
        <div className="rpma-pillar-rail-head">
          <h2>Dashboard</h2>
          <HelpTip text="Jump to a pane on the scrolling board." />
        </div>
        <div className="rpma-mod-static">
          {[
            { id: "brief", label: "Executive Brief" },
            { id: "cover", label: "Cover" },
            { id: "sla", label: `SLA · ${slaAvg}%` },
            { id: "decisions", label: "Who Needs A Decision" },
          ].map((j) => (
            <button
              key={j.id}
              type="button"
              className="rpma-mod-row w-full text-left"
              onClick={() => jump(j.id)}
            >
              <span className="min-w-0 flex-1 truncate">{j.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rpma-nav-block">
        <div className="rpma-pillar-rail-head">
          <h2>Tenants</h2>
          <HelpTip text="Red and amber first. Click a name to open that customer." />
        </div>
        <div className="rpma-mod-static" role="navigation" aria-label="Tenants">
          {sorted.map((b) => (
            <SpaLink
              key={b.customerCode}
              href={`/customers/${encodeURIComponent(b.customerCode)}`}
              className="rpma-mod-row"
              title={b.healthSummary || b.displayName}
            >
              <RagBadge rag={b.healthRag} />
              <span className="min-w-0 flex-1 truncate">{b.displayName}</span>
              <span className="font-mono text-[10px] text-muted">
                {b.slaOverallPct != null ? `${Math.round(b.slaOverallPct)}%` : "—"}
              </span>
            </SpaLink>
          ))}
        </div>
      </section>
    </aside>
  );
}
