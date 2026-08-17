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

type ViewMode = "bars" | "sunburst" | "icicle" | "treemap";

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
  const [mode, setMode] = useState<ViewMode>("bars");
  const [hover, setHover] = useState<HierarchyNode | null>(null);
  const [width, setWidth] = useState(720);

  const rootData = useMemo(
    () => buildFinSightHierarchy(lines, focusModule),
    [lines, focusModule],
  );

  const modules = rootData.children ?? [];

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
    if (!svgEl || !modules.length) return;
    if (!d3?.hierarchy) return;

    const height =
      mode === "bars"
        ? Math.max(160, Math.min(360, 28 + modules.length * 28))
        : mode === "sunburst"
          ? Math.min(440, Math.max(300, width * 0.62))
          : mode === "treemap"
            ? Math.min(420, Math.max(280, width * 0.52))
            : 280;
    const margin = { top: 8, right: 12, bottom: 8, left: mode === "bars" ? 92 : 8 };
    const innerW = Math.max(40, width - margin.left - margin.right);
    const innerH = Math.max(40, height - margin.top - margin.bottom);

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const hierarchy = d3
      .hierarchy(rootData)
      .sum((d: HierarchyNode) => {
        const leaf = !d.children?.length;
        return leaf ? Math.max(d.absVariance, 1) : 0;
      })
      .sort((a: { value?: number }, b: { value?: number }) => (b.value ?? 0) - (a.value ?? 0));

    const maxAbs = Math.max(1, ...modules.map((m) => m.absVariance));
    const color = d3
      .scaleLinear<string>()
      .domain([0, maxAbs * 0.2, maxAbs])
      .range([BRAND.ragGreen, BRAND.ragAmber, BRAND.ragRed])
      .clamp(true);

    const tip = (n: HierarchyNode) => setHover(n);
    const clickNode = (n: HierarchyNode) => {
      if (n.level === 1 && n.moduleCode) {
        onSelectModule?.(n.moduleCode);
        onSelectL2?.(null);
      } else if (n.level === 2) {
        if (n.moduleCode) onSelectModule?.(n.moduleCode);
        onSelectL2?.(n.key);
      } else if (n.level === 3 && n.moduleCode) {
        onSelectModule?.(n.moduleCode);
      }
    };

    if (mode === "bars") {
      const y = d3
        .scaleBand()
        .domain(modules.map((m) => m.key))
        .range([0, innerH])
        .padding(0.18);
      const x = d3.scaleLinear().domain([0, maxAbs]).range([0, innerW]);
      g.selectAll("rect.bar")
        .data(modules)
        .join("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", (d: HierarchyNode) => y(d.key) ?? 0)
        .attr("height", y.bandwidth())
        .attr("width", (d: HierarchyNode) => Math.max(2, x(d.absVariance)))
        .attr("rx", 5)
        .attr("fill", (d: HierarchyNode) => color(d.absVariance))
        .style("cursor", "pointer")
        .on("mouseenter", (_: unknown, d: HierarchyNode) => tip(d))
        .on("mouseleave", () => setHover(null))
        .on("click", (_: unknown, d: HierarchyNode) => clickNode(d));
      g.selectAll("text.lbl")
        .data(modules)
        .join("text")
        .attr("class", "lbl")
        .attr("x", -8)
        .attr("y", (d: HierarchyNode) => (y(d.key) ?? 0) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("fill", "currentColor")
        .attr("font-size", 11)
        .attr("font-weight", 700)
        .text((d: HierarchyNode) => (d.name.length > 12 ? `${d.name.slice(0, 11)}…` : d.name));
      g.selectAll("text.val")
        .data(modules)
        .join("text")
        .attr("class", "val")
        .attr("x", (d: HierarchyNode) => Math.max(6, x(d.absVariance) - 6))
        .attr("y", (d: HierarchyNode) => (y(d.key) ?? 0) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", (d: HierarchyNode) => (x(d.absVariance) > 72 ? "end" : "start"))
        .attr("fill", (d: HierarchyNode) => (x(d.absVariance) > 72 ? "#0b1220" : "currentColor"))
        .attr("font-size", 10)
        .attr("font-weight", 700)
        .text((d: HierarchyNode) => formatZar(d.variance));
      return;
    }

    if (mode === "sunburst" && typeof d3.partition === "function" && typeof d3.arc === "function") {
      const radius = Math.min(innerW, innerH) / 2;
      g.attr("transform", `translate(${margin.left + innerW / 2},${margin.top + innerH / 2})`);
      const root = d3.partition<HierarchyNode>().size([2 * Math.PI, radius])(
        hierarchy as never,
      ) as d3.HierarchyRectangularNode<HierarchyNode>;
      const arc = d3
        .arc<d3.HierarchyRectangularNode<HierarchyNode>>()
        .startAngle((d) => d.x0)
        .endAngle((d) => d.x1)
        .innerRadius((d) => d.y0)
        .outerRadius((d) => d.y1 - 1);
      const nodes = root.descendants().filter((d) => d.depth > 0);
      g.selectAll("path")
        .data(nodes)
        .join("path")
        .attr("d", (d) => arc(d) ?? "")
        .attr("fill", (d) => color(d.data.absVariance))
        .attr("stroke", "var(--color-surface)")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseenter", (_: unknown, d: d3.HierarchyRectangularNode<HierarchyNode>) => tip(d.data))
        .on("mouseleave", () => setHover(null))
        .on("click", (_: unknown, d: d3.HierarchyRectangularNode<HierarchyNode>) => clickNode(d.data));
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", "currentColor")
        .attr("font-size", 12)
        .attr("font-weight", 800)
        .text(formatZar(rootData.variance));
      return;
    }

    if (mode === "treemap" && typeof d3.treemap === "function") {
      const root = d3
        .treemap<HierarchyNode>()
        .size([innerW, innerH])
        .paddingInner(3)
        .paddingOuter(4)
        .round(true)(hierarchy as never) as d3.HierarchyRectangularNode<HierarchyNode>;
      const leaf = g
        .selectAll("g")
        .data(root.leaves())
        .join("g")
        .attr("transform", (d: d3.HierarchyRectangularNode<HierarchyNode>) => `translate(${d.x0},${d.y0})`)
        .style("cursor", "pointer")
        .on("mouseenter", (_: unknown, d: d3.HierarchyRectangularNode<HierarchyNode>) => tip(d.data))
        .on("mouseleave", () => setHover(null))
        .on("click", (_: unknown, d: d3.HierarchyRectangularNode<HierarchyNode>) => clickNode(d.data));
      leaf
        .append("rect")
        .attr("width", (d: d3.HierarchyRectangularNode<HierarchyNode>) => Math.max(0, d.x1 - d.x0))
        .attr("height", (d: d3.HierarchyRectangularNode<HierarchyNode>) => Math.max(0, d.y1 - d.y0))
        .attr("rx", 6)
        .attr("fill", (d: d3.HierarchyRectangularNode<HierarchyNode>) => color(d.data.absVariance))
        .attr("stroke", "var(--color-surface)")
        .attr("stroke-width", 1.5);
      leaf
        .append("text")
        .attr("x", 6)
        .attr("y", 16)
        .attr("fill", "#0b1220")
        .attr("font-size", 11)
        .attr("font-weight", 700)
        .text((d: d3.HierarchyRectangularNode<HierarchyNode>) => {
          const w = d.x1 - d.x0;
          if (w < 48 || d.y1 - d.y0 < 22) return "";
          const n = d.data.name;
          return n.length > Math.floor(w / 7) ? `${n.slice(0, Math.max(3, Math.floor(w / 7) - 1))}…` : n;
        });
      return;
    }

    if (typeof d3.partition === "function") {
      const root = d3
        .partition<HierarchyNode>()
        .size([innerW, innerH])
        .padding(1)(hierarchy as never) as d3.HierarchyRectangularNode<HierarchyNode>;
      const nodes = root.descendants().filter((d) => d.depth > 0);
      const cell = g
        .selectAll("g")
        .data(nodes)
        .join("g")
        .attr("transform", (d: d3.HierarchyRectangularNode<HierarchyNode>) => `translate(${d.x0},${d.y0})`)
        .style("cursor", "pointer")
        .on("mouseenter", (_: unknown, d: d3.HierarchyRectangularNode<HierarchyNode>) => tip(d.data))
        .on("mouseleave", () => setHover(null))
        .on("click", (_: unknown, d: d3.HierarchyRectangularNode<HierarchyNode>) => clickNode(d.data));
      cell
        .append("rect")
        .attr("width", (d: d3.HierarchyRectangularNode<HierarchyNode>) => Math.max(0, d.x1 - d.x0))
        .attr("height", (d: d3.HierarchyRectangularNode<HierarchyNode>) => Math.max(0, d.y1 - d.y0))
        .attr("rx", 3)
        .attr("fill", (d: d3.HierarchyRectangularNode<HierarchyNode>) => color(d.data.absVariance))
        .attr("stroke", "var(--color-surface)");
      cell
        .append("text")
        .attr("x", 4)
        .attr("y", 14)
        .attr("fill", "#0b1220")
        .attr("font-size", 10)
        .attr("font-weight", 600)
        .text((d: d3.HierarchyRectangularNode<HierarchyNode>) => {
          const w = d.x1 - d.x0;
          if (w < 40 || d.y1 - d.y0 < 16) return "";
          const n = d.data.name;
          return n.length > Math.floor(w / 6.5) ? `${n.slice(0, Math.max(2, Math.floor(w / 6.5) - 1))}…` : n;
        });
    }
  }, [rootData, modules, width, mode, onSelectModule, onSelectL2]);

  if (!lines.length || !modules.length) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border bg-surface-2/40 px-4 py-8 text-center",
          className,
        )}
      >
        <p className="text-sm font-semibold text-fg">FinSight map — no control lines yet</p>
        <p className="mt-1 text-xs text-muted">
          Collect FinSight on the SYSPRO host. L1 module totals are enough for the bar map.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-fg">FinSight map</p>
          <p className="text-xs text-muted">
            Bar = module out-of-balance (always readable). Sunburst / icicle show L1 → L2 → L3 when
            detail exists. Click a slice to filter the tables.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface-2/60 p-0.5">
          {(
            [
              ["bars", "Bars"],
              ["sunburst", "Sunburst"],
              ["icicle", "Icicle"],
              ["treemap", "Treemap"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                mode === id ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={wrapRef}
        className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm text-fg"
      >
        <svg ref={svgRef} className="block w-full" role="img" aria-label="FinSight variance map" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetaChip
          label="Focus"
          value={hover ? hover.name : focusModule ? finsightModuleTitle(focusModule) : "All modules"}
        />
        <MetaChip
          label="Variance"
          value={formatZarFull(hover?.variance ?? rootData.variance)}
          tone={Math.abs(hover?.variance ?? rootData.variance) > 0.005 ? "amber" : "green"}
        />
        <MetaChip label="Sub-ledger close" value={formatZarFull(hover?.subClose ?? rootData.subClose)} />
        <MetaChip label="GL control close" value={formatZarFull(hover?.glClose ?? rootData.glClose)} />
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
