import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/brand-colors-CQCBtPrR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Shared Recharts tooltip — animated, theme-aware, en-ZA numbers */
function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter, nameMap, className }) {
	if (!active || !payload?.length) return null;
	const title = label != null && label !== "" ? labelFormatter ? labelFormatter(String(label)) : String(label) : null;
	const fmt = (v, name) => {
		if (typeof v !== "number" || !Number.isFinite(v)) return String(v ?? "—");
		if (valueFormatter) return valueFormatter(v, name);
		return v.toLocaleString("en-ZA");
	};
	const displayName = (raw) => nameMap?.[raw] ?? raw;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("rpma-chart-tip min-w-[148px] max-w-[280px] overflow-hidden rounded-xl border border-border/90", "bg-surface/95 px-0 py-0 text-xs shadow-[var(--shadow-elevated)] backdrop-blur-md", "ring-1 ring-accent/15 animate-in fade-in-0 zoom-in-95 duration-150", className),
		style: {
			background: "color-mix(in srgb, var(--color-surface) 96%, var(--color-accent) 4%)",
			borderColor: "var(--color-border)",
			color: "var(--color-fg)"
		},
		children: [title ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "border-b border-border/80 bg-surface-2/50 px-3 py-1.5 text-[11px] font-bold tracking-tight text-fg",
			children: title
		}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-1.5 px-3 py-2",
			children: payload.map((p, i) => {
				const name = displayName(String(p.name ?? p.dataKey ?? "value"));
				const val = p.value;
				const color = p.color || p.fill || "var(--color-accent)";
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between gap-3 transition-transform duration-150",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex min-w-0 items-center gap-1.5 text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-2 ring-surface",
							style: {
								background: color,
								boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 25%, transparent)`
							},
							"aria-hidden": true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate text-[11px]",
							children: name
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-[12px] font-bold tabular-nums text-fg",
						children: fmt(val, name)
					})]
				}, i);
			})
		})]
	});
}
/** Soft highlight under hovered bars / points */
var CHART_TOOLTIP_CURSOR = {
	fill: "var(--color-accent)",
	opacity: .08,
	radius: 4
};
/** Minimal SVG sparkline — no chart lib weight */
function Sparkline({ values, className, stroke = "var(--color-accent)", fill = "var(--color-accent-soft)", height = 28, width = 96 }) {
	const id = (0, import_react.useId)();
	const path = (0, import_react.useMemo)(() => {
		const pts = values.filter((v) => Number.isFinite(v));
		if (pts.length < 2) return null;
		const min = Math.min(...pts);
		const span = Math.max(...pts) - min || 1;
		const pad = 2;
		const w = width - 4;
		const h = height - 4;
		const coords = pts.map((v, i) => {
			return [pad + i / (pts.length - 1) * w, pad + h - (v - min) / span * h];
		});
		const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
		return {
			line,
			area: line + ` L${coords[coords.length - 1][0].toFixed(1)},${(height - pad).toFixed(1)} L${coords[0][0].toFixed(1)},${(height - pad).toFixed(1)} Z`
		};
	}, [
		values,
		width,
		height
	]);
	if (!path) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("inline-block opacity-40", className),
		style: {
			width,
			height
		},
		"aria-hidden": true
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		className: cn("overflow-visible", className),
		width,
		height,
		viewBox: `0 0 ${width} ${height}`,
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
				id: `${id}-g`,
				x1: "0",
				y1: "0",
				x2: "0",
				y2: "1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "0%",
					stopColor: fill,
					stopOpacity: "0.35"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "100%",
					stopColor: fill,
					stopOpacity: "0.02"
				})]
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: path.area,
				fill: `url(#${id}-g)`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: path.line,
				fill: "none",
				stroke,
				strokeWidth: "1.75",
				strokeLinejoin: "round",
				strokeLinecap: "round"
			})
		]
	});
}
/**
* shadcn-style KPI tile (Phase 1)
* Small label · large value · optional hint / trend · optional sparkline
*/
function StatCard({ label, value, hint, tone = "default", sparkline, tip, trend }) {
	const empty = value === "n/a" || value === "N/A" || value === "—" || value === "-" || value === "–" || value === "";
	const stroke = tone === "red" ? "var(--color-rag-red)" : tone === "amber" ? "var(--color-rag-amber)" : tone === "green" ? "var(--color-rag-green)" : "var(--color-accent)";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("rpma-stat-card group/stat relative flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 text-left shadow-sm", "transition-colors duration-150", "hover:border-accent/35 hover:bg-surface-2/30", "focus-within:border-accent/40"),
		title: tip || hint,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] font-medium leading-none text-muted",
					children: label
				}), trend ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums", tone === "red" && "bg-rag-red-bg text-rag-red", tone === "amber" && "bg-rag-amber-bg text-rag-amber", tone === "green" && "bg-rag-green-bg text-rag-green", tone === "default" && "bg-surface-2 text-muted"),
					children: trend
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: cn("font-mono text-2xl font-bold tabular-nums tracking-tight sm:text-[1.65rem]", empty && "text-subtle text-lg", !empty && tone === "red" && "text-rag-red", !empty && tone === "amber" && "text-rag-amber", !empty && tone === "green" && "text-rag-green", !empty && tone === "default" && "text-fg"),
				children: empty ? "n/a" : value
			}),
			sparkline && sparkline.length >= 2 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1 opacity-90",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkline, {
					values: sparkline,
					stroke,
					fill: stroke,
					width: 96,
					height: 22
				})
			}) : null,
			hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] leading-snug text-muted",
				children: hint
			}) : null,
			tip ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				role: "tooltip",
				className: cn("pointer-events-none absolute bottom-[calc(100%+0.35rem)] left-2 z-40 w-max max-w-[14rem]", "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[10px] font-normal leading-snug text-muted shadow-lg", "opacity-0 scale-95 transition duration-150 group-hover/stat:opacity-100 group-hover/stat:scale-100"),
				children: tip
			}) : null
		]
	});
}
/**
* RPM Assure brand palette — single source for charts / gauges (CSS vars for UI).
* Logo: blue → teal → lime
*/
var BRAND = {
	blue: "#2b6fae",
	blueDeep: "#1a4d7a",
	teal: "#1bb8a6",
	cyan: "#3ecfbf",
	lime: "#8fce4a",
	nav: "#1a4d7a",
	navDeep: "#12365a",
	ragGreen: "#2f9e5f",
	ragAmber: "#d4a017",
	ragRed: "#d14b4b",
	track: "#d0dde8",
	trackDark: "#243544"
};
/** Recharts series — brand-aligned */
var CHART = {
	primary: BRAND.teal,
	secondary: BRAND.blue,
	tertiary: BRAND.lime,
	operators: BRAND.teal,
	active: BRAND.lime,
	dtr: BRAND.ragAmber,
	jobs: BRAND.ragRed,
	red: BRAND.ragRed,
	amber: BRAND.ragAmber,
	green: BRAND.ragGreen,
	grid: "var(--color-border)",
	axis: "var(--color-subtle)",
	tooltipBg: "var(--color-surface)"
};
BRAND.ragGreen, BRAND.blue, BRAND.teal, BRAND.track;
//#endregion
export { StatCard as i, CHART_TOOLTIP_CURSOR as n, ChartTooltip as r, CHART as t };
