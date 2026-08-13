import { useEffect, useMemo, useRef, useState } from "react";
import d3 from "@/vendor/d3.js";
import type { DtrDetailLine } from "@/lib/data/types";
import {
  finsightCleanDescription,
  finsightLevelLabel,
  finsightModuleName,
  finsightModuleTitle,
} from "@/lib/brand/finsight";
import { BRAND } from "@/lib/brand-colors";
import { cn } from "@/lib/utils";

export type HierarchyNode = {
  name: string;
  key: string;
  level: 0 | 1 | 2 | 3;
  variance: number;
  absVariance: number;
  subClose: number;
  glClose: number;
  moduleCode?: string;
  description?: string;
  children?: HierarchyNode[];
};

function formatZar(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R${(abs / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `${sign}R${(abs / 1_000).toFixed(0)}k`;
  return `${sign}R${abs.toFixed(0)}`;
}

function formatZarFull(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Build L0 root → L1 modules → L2 mid → L3 detail tree from FinSight lines */
export function buildFinSightHierarchy(
  lines: DtrDetailLine[],
  focusModule?: string | null,
): HierarchyNode {
  const filtered = focusModule
    ? lines.filter((l) => l.balanceTypeCode === focusModule)
    : lines;

  const byMod = d3.group(filtered, (d) => d.balanceTypeCode || "UNK");

  const modules: HierarchyNode[] = [];
  for (const [mod, modLines] of byMod) {
    const l1 = modLines.filter((d) => Number(d.informationLevel) === 1);
    const l2 = modLines.filter((d) => Number(d.informationLevel) === 2);
    const l3 = modLines.filter((d) => Number(d.informationLevel) === 3);

    const midNodes: HierarchyNode[] = [];
    if (l2.length > 0) {
      for (const row of l2) {
        const midKey = row.levelKey || row.glCode || row.dimension1 || `L2-${midNodes.length}`;
        const children = l3
          .filter(
            (d) =>
              d.parentLevelKey === midKey ||
              d.parentLevelKey === row.levelKey ||
              d.parentLevelKey === row.glCode ||
              (!d.parentLevelKey && l2.length === 1),
          )
          .map((d, i) => lineToNode(d, 3, i));
        // If no parent links, attach all L3 under first mid only once
        const l3ForMid =
          children.length > 0
            ? children
            : l2.indexOf(row) === 0 && l3.every((x) => !x.parentLevelKey)
              ? l3.map((d, i) => lineToNode(d, 3, i))
              : [];
        midNodes.push({
          name: shortLabel(row),
          key: midKey,
          level: 2,
          variance: Number(row.variance) || 0,
          absVariance: Math.abs(Number(row.variance) || 0),
          subClose: Number(row.subCloseBalance) || 0,
          glClose: Number(row.glCloseBalance) || 0,
          moduleCode: mod,
          description: finsightCleanDescription(row.description, {
            moduleCode: mod,
            levelKey: row.levelKey,
            glCode: row.glCode,
          }),
          children: l3ForMid.length ? l3ForMid : undefined,
        });
      }
    } else if (l3.length > 0) {
      midNodes.push({
        name: "Detail",
        key: `${mod}-mid`,
        level: 2,
        variance: d3.sum(l3, (d) => Number(d.variance) || 0),
        absVariance: d3.sum(l3, (d) => Math.abs(Number(d.variance) || 0)),
        subClose: d3.sum(l3, (d) => Number(d.subCloseBalance) || 0),
        glClose: d3.sum(l3, (d) => Number(d.glCloseBalance) || 0),
        moduleCode: mod,
        description: "Ungrouped detail lines",
        children: l3.map((d, i) => lineToNode(d, 3, i)),
      });
    }

    const l1Var =
      l1.length > 0
        ? d3.sum(l1, (d) => Number(d.variance) || 0)
        : d3.sum(modLines, (d) =>
            Number(d.informationLevel) === 1 ? Number(d.variance) || 0 : 0,
          );
    const absFromChildren =
      midNodes.length > 0
        ? d3.sum(midNodes, (d) => d.absVariance)
        : Math.abs(l1Var) ||
          d3.sum(modLines, (d) => Math.abs(Number(d.variance) || 0));

    modules.push({
      name: finsightModuleName(mod),
      key: mod,
      level: 1,
      variance: l1Var || d3.sum(midNodes, (d) => d.variance),
      absVariance: absFromChildren || Math.abs(l1Var),
      subClose:
        l1.length > 0
          ? d3.sum(l1, (d) => Number(d.subCloseBalance) || 0)
          : d3.sum(midNodes, (d) => d.subClose),
      glClose:
        l1.length > 0
          ? d3.sum(l1, (d) => Number(d.glCloseBalance) || 0)
          : d3.sum(midNodes, (d) => d.glClose),
      moduleCode: mod,
      description: finsightModuleTitle(mod),
      children: midNodes.length ? midNodes : undefined,
    });
  }

  modules.sort((a, b) => b.absVariance - a.absVariance);

  return {
    name: focusModule ? finsightModuleTitle(focusModule) : "FinSight controls",
    key: "root",
    level: 0,
    variance: d3.sum(modules, (d) => d.variance),
    absVariance: d3.sum(modules, (d) => d.absVariance),
    subClose: d3.sum(modules, (d) => d.subClose),
    glClose: d3.sum(modules, (d) => d.glClose),
    description: "Control account hierarchy · L1 → L2 → L3",
    children: modules,
  };
}

function shortLabel(row: DtrDetailLine): string {
  const d = finsightCleanDescription(row.description, {
    moduleCode: row.balanceTypeCode,
    levelKey: row.levelKey,
    glCode: row.glCode,
  });
  if (d && d !== "—") return d.length > 42 ? `${d.slice(0, 40)}…` : d;
  return row.dimension1 || row.levelKey || row.glCode || "Line";
}

function lineToNode(row: DtrDetailLine, level: 1 | 2 | 3, i: number): HierarchyNode {
  const v = Number(row.variance) || 0;
  return {
    name: shortLabel(row),
    key: row.levelKey || row.glCode || row.dimension1 || `n-${level}-${i}`,
    level,
    variance: v,
    absVariance: Math.abs(v),
    subClose: Number(row.subCloseBalance) || 0,
    glClose: Number(row.glCloseBalance) || 0,
    moduleCode: row.balanceTypeCode,
    description: finsightCleanDescription(row.description, {
      moduleCode: row.balanceTypeCode,
      levelKey: row.levelKey,
      glCode: row.glCode,
    }),
  };
}

type ViewMode = "treemap" | "icicle";

type Props = {
  lines: DtrDetailLine[];
  focusModule?: string | null;
  onSelectModule?: (code: string | null) => void;
  onSelectL2?: (key: string | null) => void;
  className?: string;
};

export function FinSightD3Hierarchy({
  lines,
  focusModule,
  onSelectModule,
  onSelectL2,
  className,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [mode, setMode] = useState<ViewMode>("treemap");
  const [hover, setHover] = useState<HierarchyNode | null>(null);
  const [width, setWidth] = useState(720);

  const rootData = useMemo(
    () => buildFinSightHierarchy(lines, focusModule),
    [lines, focusModule],
  );

  const hasDepth = useMemo(() => {
    const walk = (n: HierarchyNode, d: number): number => {
      if (!n.children?.length) return d;
      return Math.max(...n.children.map((c) => walk(c, d + 1)));
    };
    return walk(rootData, 0);
  }, [rootData]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 720;
      setWidth(Math.max(280, Math.floor(w)));
    });
    ro.observe(el);
    setWidth(Math.max(280, Math.floor(el.clientWidth)));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const height = mode === "treemap" ? Math.min(420, Math.max(280, width * 0.52)) : 280;
    const margin = { top: 8, right: 8, bottom: 8, left: 8 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const hierarchy = d3
      .hierarchy(rootData)
      .sum((d) => Math.max(d.absVariance, d.children?.length ? 0 : 1))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const color = d3
      .scaleLinear<string>()
      .domain([0, hierarchy.value ? hierarchy.value * 0.15 : 1, hierarchy.value || 1])
      .range([BRAND.ragGreen, BRAND.ragAmber, BRAND.ragRed])
      .clamp(true);

    const tip = (d: d3.HierarchyRectangularNode<HierarchyNode>) => {
      setHover(d.data);
    };

    const clickNode = (d: d3.HierarchyRectangularNode<HierarchyNode>) => {
      if (d.data.level === 1 && d.data.moduleCode) {
        onSelectModule?.(d.data.moduleCode);
        onSelectL2?.(null);
      } else if (d.data.level === 2) {
        if (d.data.moduleCode) onSelectModule?.(d.data.moduleCode);
        onSelectL2?.(d.data.key);
      } else if (d.data.level === 3) {
        if (d.data.moduleCode) onSelectModule?.(d.data.moduleCode);
      }
    };

    if (mode === "treemap") {
      const root = d3.treemap<HierarchyNode>().size([innerW, innerH]).paddingInner(3).paddingOuter(4).round(true)(
        hierarchy as d3.HierarchyNode<HierarchyNode>,
      ) as d3.HierarchyRectangularNode<HierarchyNode>;

      const leaf = g
        .selectAll("g")
        .data(root.leaves())
        .join("g")
        .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
        .style("cursor", "pointer")
        .on("mouseenter", (_, d) => tip(d))
        .on("mouseleave", () => setHover(null))
        .on("click", (_, d) => clickNode(d));

      leaf
        .append("rect")
        .attr("width", (d) => Math.max(0, d.x1 - d.x0))
        .attr("height", (d) => Math.max(0, d.y1 - d.y0))
        .attr("rx", 6)
        .attr("fill", (d) => color(d.data.absVariance))
        .attr("stroke", "var(--color-surface)")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.92);

      leaf
        .append("text")
        .attr("x", 6)
        .attr("y", 16)
        .attr("fill", "#0b1220")
        .attr("font-size", 11)
        .attr("font-weight", 700)
        .text((d) => {
          const w = d.x1 - d.x0;
          if (w < 48 || d.y1 - d.y0 < 22) return "";
          const n = d.data.name;
          return n.length > Math.floor(w / 7) ? `${n.slice(0, Math.max(3, Math.floor(w / 7) - 1))}…` : n;
        });

      leaf
        .append("text")
        .attr("x", 6)
        .attr("y", 30)
        .attr("fill", "#0b1220")
        .attr("font-size", 10)
        .attr("opacity", 0.85)
        .text((d) => {
          if (d.x1 - d.x0 < 56 || d.y1 - d.y0 < 36) return "";
          return formatZar(d.data.variance);
        });
    } else {
      const root = d3
        .partition<HierarchyNode>()
        .size([innerW, innerH])
        .padding(1)(hierarchy as d3.HierarchyNode<HierarchyNode>) as d3.HierarchyRectangularNode<HierarchyNode>;

      const nodes = root.descendants().filter((d) => d.depth > 0);

      const cell = g
        .selectAll("g")
        .data(nodes)
        .join("g")
        .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
        .style("cursor", "pointer")
        .on("mouseenter", (_, d) => tip(d))
        .on("mouseleave", () => setHover(null))
        .on("click", (_, d) => clickNode(d));

      cell
        .append("rect")
        .attr("width", (d) => Math.max(0, d.x1 - d.x0))
        .attr("height", (d) => Math.max(0, d.y1 - d.y0))
        .attr("rx", 3)
        .attr("fill", (d) => color(d.data.absVariance))
        .attr("stroke", "var(--color-surface)")
        .attr("opacity", (d) => 0.55 + d.depth * 0.12);

      cell
        .append("text")
        .attr("x", 4)
        .attr("y", 14)
        .attr("fill", "#0b1220")
        .attr("font-size", 10)
        .attr("font-weight", 600)
        .text((d) => {
          const w = d.x1 - d.x0;
          if (w < 40 || d.y1 - d.y0 < 16) return "";
          const n = d.data.name;
          return n.length > Math.floor(w / 6.5)
            ? `${n.slice(0, Math.max(2, Math.floor(w / 6.5) - 1))}…`
            : n;
        });
    }
  }, [rootData, width, mode, onSelectModule, onSelectL2]);

  if (!lines.length || hasDepth === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border bg-surface-2/40 px-4 py-8 text-center",
          className,
        )}
      >
        <p className="text-sm font-semibold text-fg">D3 hierarchy — no detail lines yet</p>
        <p className="mt-1 text-xs text-muted">
          Collect FinSight L2/L3 (or open AHIC in demo) to explore control → mid → detail variance.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-fg">
            D3 · Detail hierarchy{" "}
            <span className="font-normal text-muted">
              ({finsightLevelLabel(1)} → {finsightLevelLabel(2)} → {finsightLevelLabel(3)})
            </span>
          </p>
          <p className="text-xs text-muted">
            Tile size = absolute variance. Click a tile to drill the tables below. Green = small / clear;
            red = material out-of-balance.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface-2/60 p-0.5">
          {(
            [
              ["treemap", "Treemap"],
              ["icicle", "Icicle"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                mode === id
                  ? "bg-primary text-primary-fg"
                  : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={wrapRef}
        className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
      >
        <svg ref={svgRef} className="block w-full" role="img" aria-label="FinSight D3 variance hierarchy" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetaChip
          label="Focus"
          value={
            hover
              ? hover.name
              : focusModule
                ? finsightModuleTitle(focusModule)
                : "All modules"
          }
        />
        <MetaChip
          label="Variance"
          value={formatZarFull(hover?.variance ?? rootData.variance)}
          tone={
            Math.abs(hover?.variance ?? rootData.variance) > 0.005 ? "amber" : "green"
          }
        />
        <MetaChip
          label="Sub-ledger close"
          value={formatZarFull(hover?.subClose ?? rootData.subClose)}
        />
        <MetaChip
          label="GL control close"
          value={formatZarFull(hover?.glClose ?? rootData.glClose)}
        />
      </div>
    </div>
  );
}

function MetaChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "amber" | "green";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">{label}</p>
      <p
        className={cn(
          "truncate text-sm font-semibold tabular-nums",
          tone === "amber" && "text-amber-800 dark:text-amber-300",
          tone === "green" && "text-emerald-700 dark:text-emerald-400",
          !tone && "text-fg",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
