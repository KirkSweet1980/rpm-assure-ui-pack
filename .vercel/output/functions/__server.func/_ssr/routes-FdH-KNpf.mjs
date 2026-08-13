import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { r as formatSastDateTime, t as cn } from "./utils-BpkUUAOs.mjs";
import { t as Badge } from "./badge-BccjJCAV.mjs";
import { t as RagBadge } from "./rag-badge--H4DTZx7.mjs";
import { n as useDashboardConfig } from "./use-dashboard-config-yLPMN8xO.mjs";
import { t as useStaffProfile } from "./use-staff-profile-CtJQjgds.mjs";
import { G as ChevronRight, P as Info, a as TriangleAlert } from "../_libs/lucide-react.mjs";
import { n as RequireAuth, t as AppShell } from "./app-shell-AnmkMbv2.mjs";
import { i as StatCard, r as ChartTooltip, t as CHART } from "./brand-colors-CQCBtPrR.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
import { c as Cell, l as ResponsiveContainer, s as Pie, t as PieChart, u as Tooltip } from "../_libs/recharts+[...].mjs";
import { t as Route } from "./routes-azrtqO9k.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-FdH-KNpf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Interactive help chip with CSS hover tooltip (not native title) */
function InfoTag({ title, children, className, side = "bottom" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn("rpma-tip group/tip relative inline-flex max-w-full", className),
		tabIndex: 0,
		role: "button",
		"aria-label": typeof children === "string" ? `${children}: ${title}` : title,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: cn("rpma-tip-trigger inline-flex max-w-full items-center gap-1 rounded-full border border-border/60", "bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent", "transition duration-200 ease-out", "hover:border-accent/50 hover:bg-accent hover:text-accent-fg hover:shadow-md hover:shadow-accent/20", "group-focus-visible/tip:border-accent/50 group-focus-visible/tip:bg-accent group-focus-visible/tip:text-accent-fg", "group-hover/tip:-translate-y-px"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, {
				className: "h-3 w-3 shrink-0 opacity-80 transition group-hover/tip:scale-110 group-hover/tip:opacity-100",
				"aria-hidden": true
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "truncate",
				children: children ?? "More info"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			role: "tooltip",
			className: cn("rpma-tip-bubble pointer-events-none absolute z-50 w-max max-w-[min(18rem,calc(100vw-2rem))]", "rounded-xl border border-border/90 bg-surface px-3 py-2.5 text-left text-[11px] font-normal leading-snug text-fg", "shadow-[var(--shadow-elevated)] ring-1 ring-accent/10", "opacity-0 scale-95 transition duration-200 ease-out", "group-hover/tip:pointer-events-auto group-hover/tip:opacity-100 group-hover/tip:scale-100", "group-focus-visible/tip:pointer-events-auto group-focus-visible/tip:opacity-100 group-focus-visible/tip:scale-100", side === "bottom" && "top-[calc(100%+0.45rem)] left-1/2 origin-top -translate-x-1/2", side === "top" && "bottom-[calc(100%+0.45rem)] left-1/2 origin-bottom -translate-x-1/2", side === "left" && "right-[calc(100%+0.45rem)] top-1/2 origin-right -translate-y-1/2", side === "right" && "left-[calc(100%+0.45rem)] top-1/2 origin-left -translate-y-1/2"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("pointer-events-none absolute h-2 w-2 rotate-45 border border-border/90 bg-surface", side === "bottom" && "top-[-5px] left-1/2 -translate-x-1/2 border-r-0 border-b-0", side === "top" && "bottom-[-5px] left-1/2 -translate-x-1/2 border-t-0 border-l-0", side === "left" && "right-[-5px] top-1/2 -translate-y-1/2 border-b-0 border-l-0", side === "right" && "left-[-5px] top-1/2 -translate-y-1/2 border-t-0 border-r-0"),
				"aria-hidden": true
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "relative block text-muted",
				children: title
			})]
		})]
	});
}
function CustLink({ code, name }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to: "/customers/$code",
		params: { code },
		className: "font-medium text-fg hover:text-accent",
		children: name
	});
}
function deriveExcoFromRows(rows) {
	const boards = rows.map((row) => {
		const collectAgeHours = row.lastImportAt ? Math.round((Date.now() - new Date(row.lastImportAt).getTime()) / 36e5 * 10) / 10 : null;
		const collectFresh = collectAgeHours != null && collectAgeHours <= 24;
		const cov = row.cover ?? {
			syspro: (row.operatorCount ?? 0) > 0 || Boolean(row.sqlInstanceName),
			rmm: (row.pulsewayDeviceCount ?? 0) > 0,
			cove: false
		};
		const healthScorePct = row.healthRag === "Green" ? 88 : row.healthRag === "Amber" ? 58 : 28;
		const collectPart = cov.syspro ? collectFresh ? 100 : 30 : 100;
		const jobsPart = cov.syspro ? row.sysproJobErrorCount === 0 ? 100 : 40 : 100;
		const assuranceScorePct = Math.round(healthScorePct * .55 + collectPart * .25 + jobsPart * .2);
		const attentionReasons = [];
		if (row.healthRag !== "Green") attentionReasons.push(`Health ${row.healthRag}`);
		if (cov.syspro && !collectFresh) attentionReasons.push(collectAgeHours == null ? "No SYSPRO collect" : `SYSPRO collect stale (${collectAgeHours}h)`);
		if (cov.syspro && row.sysproJobErrorCount > 0) attentionReasons.push(`${row.sysproJobErrorCount} job error(s)`);
		if (cov.syspro && row.sysproDtrVarianceLines > 0) attentionReasons.push(`${row.sysproDtrVarianceLines} FinSight Out of Balance`);
		if (cov.rmm && (row.pulsewayCriticalAlerts ?? 0) > 0) attentionReasons.push(`${row.pulsewayCriticalAlerts} RMM critical`);
		if (cov.rmm && (row.pulsewayOfflineCount ?? 0) > 0) attentionReasons.push(`${row.pulsewayOfflineCount} RMM offline`);
		if (!cov.syspro && !cov.rmm && !cov.cove) attentionReasons.push("No service cover");
		return {
			customerCode: row.customerCode,
			displayName: row.displayName,
			healthRag: row.healthRag,
			healthSummary: row.healthSummary,
			healthScorePct,
			assuranceScorePct,
			collectAgeHours,
			collectFresh,
			lastImportAt: row.lastImportAt,
			activeUserCount: row.activeUserCount,
			operatorCount: row.operatorCount,
			jobErrorCount: row.sysproJobErrorCount,
			dtrVarianceLines: row.sysproDtrVarianceLines,
			slaCompliancePct: null,
			availabilityPct: null,
			licenseExpiry: null,
			licenseProduct: null,
			licenseDaysRemaining: null,
			openRiskCount: 0,
			openIssueCount: 0,
			lastFullBackup: null,
			backupStatus: null,
			backupHealthy: null,
			sysproVersion: null,
			sysproBuild: null,
			installedHotfixCount: 0,
			lastHotfixAt: null,
			sampleHotfixCode: null,
			missingHotfixCount: null,
			missingMandatoryHotfixes: null,
			sysproCovered: cov.syspro === true,
			attentionReasons,
			pulsewayDeviceCount: row.pulsewayDeviceCount ?? 0,
			pulsewayOnlineCount: row.pulsewayOnlineCount ?? 0,
			pulsewayOfflineCount: row.pulsewayOfflineCount ?? 0,
			pulsewayCriticalAlerts: row.pulsewayCriticalAlerts ?? 0,
			pulsewayHealthRag: row.pulsewayHealthRag ?? null,
			pulsewayHealthSummary: row.pulsewayHealthSummary ?? null,
			pulsewayServerOnline: row.pulsewayServerOnline ?? 0,
			pulsewayServerOffline: row.pulsewayServerOffline ?? 0,
			pulsewayWorkstationOnline: row.pulsewayWorkstationOnline ?? 0,
			pulsewayWorkstationOffline: row.pulsewayWorkstationOffline ?? 0
		};
	});
	return {
		generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		estateAssurancePct: boards.length === 0 ? 0 : Math.round(boards.reduce((s, b) => s + b.assuranceScorePct, 0) / boards.length),
		customersNeedingAttention: boards.filter((b) => b.attentionReasons.length > 0).length,
		collectFreshCount: boards.filter((b) => b.collectFresh).length,
		collectStaleCount: boards.filter((b) => !b.collectFresh && b.collectAgeHours != null).length,
		collectMissingCount: boards.filter((b) => b.lastImportAt == null).length,
		licensesExpiringSoon: 0,
		openRisksTotal: 0,
		openIssuesTotal: 0,
		backupUnhealthyCount: 0,
		installedHotfixesTotal: 0,
		customersWithHotfixes: 0,
		customersMissingHotfixes: boards.length,
		rmmDevicesTotal: boards.reduce((s, b) => s + (b.pulsewayDeviceCount || 0), 0),
		rmmOfflineTotal: boards.reduce((s, b) => s + (b.pulsewayOfflineCount || 0), 0),
		rmmCriticalTotal: boards.reduce((s, b) => s + (b.pulsewayCriticalAlerts || 0), 0),
		rmmCustomersWithDevices: boards.filter((b) => (b.pulsewayDeviceCount || 0) > 0).length,
		rmmCustomersUnhealthy: boards.filter((b) => (b.pulsewayDeviceCount || 0) > 0 && (b.pulsewayHealthRag === "Red" || b.pulsewayHealthRag === "Amber")).length,
		rmmServerOnlineTotal: boards.reduce((s, b) => s + (b.pulsewayServerOnline || 0), 0),
		rmmServerOfflineTotal: boards.reduce((s, b) => s + (b.pulsewayServerOffline || 0), 0),
		rmmWorkstationOnlineTotal: boards.reduce((s, b) => s + (b.pulsewayWorkstationOnline || 0), 0),
		rmmWorkstationOfflineTotal: boards.reduce((s, b) => s + (b.pulsewayWorkstationOffline || 0), 0),
		boards
	};
}
function ExcoInsightPage() {
	const { portfolio, source } = Route.useLoaderData();
	const { summary, rows: rowsList, customers, exco: excoRaw } = portfolio;
	const allRows = rowsList ?? customers ?? [];
	const { profile } = useStaffProfile();
	const { dashboard: dash } = useDashboardConfig();
	const rows = (0, import_react.useMemo)(() => {
		const codes = profile?.allowedCustomerCodes;
		if (!codes || codes.length === 0) return allRows;
		const set = new Set(codes.map((c) => c.toUpperCase()));
		return allRows.filter((r) => set.has(r.customerCode.toUpperCase()));
	}, [allRows, profile?.allowedCustomerCodes]);
	const exco = (0, import_react.useMemo)(() => {
		const base = excoRaw ?? deriveExcoFromRows(rows);
		if (rows === allRows) return base;
		const set = new Set(rows.map((r) => r.customerCode.toUpperCase()));
		const boards = base.boards.filter((b) => set.has(b.customerCode.toUpperCase()));
		return {
			...base,
			boards,
			customersNeedingAttention: boards.filter((b) => b.attentionReasons.length > 0).length,
			collectFreshCount: boards.filter((b) => b.collectFresh).length,
			collectStaleCount: boards.filter((b) => !b.collectFresh && b.collectAgeHours != null).length,
			collectMissingCount: boards.filter((b) => b.lastImportAt == null).length,
			estateAssurancePct: boards.length === 0 ? 0 : Math.round(boards.reduce((s, b) => s + b.assuranceScorePct, 0) / boards.length),
			openRisksTotal: boards.reduce((s, b) => s + b.openRiskCount, 0),
			openIssuesTotal: boards.reduce((s, b) => s + b.openIssueCount, 0),
			licensesExpiringSoon: boards.filter((b) => b.licenseDaysRemaining != null && b.licenseDaysRemaining >= 0 && b.licenseDaysRemaining <= 90).length,
			backupUnhealthyCount: boards.filter((b) => b.backupHealthy === false).length,
			rmmDevicesTotal: boards.reduce((s, b) => s + (b.pulsewayDeviceCount || 0), 0),
			rmmOfflineTotal: boards.reduce((s, b) => s + (b.pulsewayOfflineCount || 0), 0),
			rmmCriticalTotal: boards.reduce((s, b) => s + (b.pulsewayCriticalAlerts || 0), 0),
			rmmServerOfflineTotal: boards.reduce((s, b) => s + (b.pulsewayServerOffline || 0), 0),
			rmmServerOnlineTotal: boards.reduce((s, b) => s + (b.pulsewayServerOnline || 0), 0)
		};
	}, [
		excoRaw,
		rows,
		allRows
	]);
	const attention = (0, import_react.useMemo)(() => [...exco.boards].filter((b) => b.attentionReasons.length > 0).sort((a, b) => (a.healthRag === "Red" ? 0 : a.healthRag === "Amber" ? 1 : 2) - (b.healthRag === "Red" ? 0 : b.healthRag === "Amber" ? 1 : 2) || b.attentionReasons.length - a.attentionReasons.length), [exco.boards]);
	const healthPie = (0, import_react.useMemo)(() => {
		let g = 0, a = 0, r = 0;
		for (const b of exco.boards) if (b.healthRag === "Green") g++;
		else if (b.healthRag === "Amber") a++;
		else r++;
		return [
			{
				name: "Healthy",
				value: g,
				fill: CHART.green
			},
			{
				name: "Watch",
				value: a,
				fill: CHART.amber
			},
			{
				name: "Critical",
				value: r,
				fill: CHART.red
			}
		].filter((d) => d.value > 0);
	}, [exco.boards]);
	const coverStats = (0, import_react.useMemo)(() => {
		let syspro = 0, rmm = 0, cove = 0, epp = 0, csp = 0;
		for (const row of rows) {
			const c = row.cover;
			if (c?.syspro) syspro++;
			if (c?.rmm || (row.pulsewayDeviceCount ?? 0) > 0) rmm++;
			if (c?.cove || (row.coveDeviceCount ?? 0) > 0) cove++;
			if (c?.epp || (row.eppDeviceCount ?? 0) > 0) epp++;
			if (c?.csp) csp++;
		}
		return {
			syspro,
			rmm,
			cove,
			epp,
			csp,
			n: rows.length
		};
	}, [rows]);
	const scoreboard = (0, import_react.useMemo)(() => {
		return [...exco.boards].map((b) => {
			const row = rows.find((r) => r.customerCode.toUpperCase() === b.customerCode.toUpperCase());
			const c = row?.cover;
			return {
				...b,
				coverSyspro: c?.syspro === true || b.sysproCovered === true,
				coverRmm: c?.rmm === true || (b.pulsewayDeviceCount || 0) > 0,
				coverCove: c?.cove === true || (row?.coveDeviceCount || 0) > 0,
				coverEpp: c?.epp === true || (row?.eppDeviceCount || 0) > 0,
				coverCsp: c?.csp === true
			};
		}).sort((a, b) => (a.healthRag === "Red" ? 0 : a.healthRag === "Amber" ? 1 : 2) - (b.healthRag === "Red" ? 0 : b.healthRag === "Amber" ? 1 : 2) || a.assuranceScorePct - b.assuranceScorePct);
	}, [exco.boards, rows]);
	const liveLabel = source.liveOk || summary.dataMode === "live" ? "Live SQL" : "Demo data";
	const estateTone = exco.estateAssurancePct >= 80 ? "green" : exco.estateAssurancePct >= 55 ? "amber" : "red";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: dash.estateTitle || "Exco Insight",
		subtitle: (dash.estateSubtitle || "").trim() || "High-Level Customer Estate View - EXCO",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rpma-exco space-y-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: summary.dataMode === "demo" ? "amber" : "green",
							children: liveLabel
						}),
						source.liveOk ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "green",
							children: "SQL connected"
						}) : source.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "red",
							children: "SQL issue"
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[11px] text-subtle",
							children: ["As of ", formatSastDateTime(exco.generatedAt || summary.generatedAt)]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[11px] text-subtle",
							children: [
								"· ",
								exco.boards.length,
								" customers"
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
							label: "Estate assurance",
							value: `${exco.estateAssurancePct}%`,
							tone: estateTone,
							tip: "Average health across all customers (0–100). Aim for 80%+."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
							label: "Need attention",
							value: exco.customersNeedingAttention,
							tone: exco.customersNeedingAttention > 0 ? "amber" : "green",
							tip: "Customers with red/amber health or other watch signals."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
							label: "Servers offline",
							value: exco.rmmServerOfflineTotal ?? 0,
							tone: (exco.rmmServerOfflineTotal ?? 0) > 0 ? "red" : "green",
							tip: "Servers not online under RPM Remote Management."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
							label: "Critical alerts",
							value: exco.rmmCriticalTotal ?? 0,
							tone: (exco.rmmCriticalTotal ?? 0) > 0 ? "red" : "green",
							tip: "Critical RMM alerts across the estate."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
							label: "Open risks",
							value: exco.openRisksTotal,
							tone: exco.openRisksTotal > 0 ? "amber" : "green",
							tip: "Open AMS risk items still needing a decision or mitigation."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4 lg:grid-cols-12",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "lg:col-span-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, {
							className: "!normal-case !tracking-normal",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[13px] font-bold text-fg",
								children: "Customer Health Mix"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoTag, {
								title: "Share of customers that look healthy (green), need watching (amber), or are critical (red).",
								children: "?"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-44",
								children: healthPie.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: "No customers loaded."
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
									width: "100%",
									height: "100%",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PieChart, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pie, {
										isAnimationActive: true,
										data: healthPie,
										dataKey: "value",
										nameKey: "name",
										innerRadius: 48,
										outerRadius: 72,
										paddingAngle: 2,
										children: healthPie.map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, {
											fill: e.fill,
											stroke: "transparent"
										}, i))
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {}) })] })
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap justify-center gap-3 text-[11px] text-muted",
								children: healthPie.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "h-2 w-2 rounded-full",
											style: { background: d.fill }
										}),
										d.name,
										" ",
										d.value
									]
								}, d.name))
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "lg:col-span-8",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
							className: "!normal-case !tracking-normal",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex w-full items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
										className: "h-4 w-4 text-rag-amber",
										"aria-hidden": true
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[13px] font-bold text-fg",
										children: "Priority | Customers Needing Attention"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "amber",
										className: "ml-auto",
										children: attention.length
									})
								]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "max-h-72 overflow-y-auto",
							children: attention.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "All customers are clear on current signals."
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "space-y-2",
								children: attention.slice(0, 12).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/customers/$code",
									params: { code: b.customerCode },
									className: "flex items-start gap-2.5 rounded-lg border border-border/80 bg-bg/40 px-2.5 py-2 transition hover:border-accent/40",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RagBadge, { rag: b.healthRag }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "block text-sm font-semibold text-fg",
												children: b.displayName
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "mt-0.5 flex flex-wrap gap-1",
												children: b.attentionReasons.slice(0, 4).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
													variant: "muted",
													children: r
												}, r))
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono text-xs font-semibold text-muted",
											children: [b.assuranceScorePct, "%"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "mt-0.5 h-4 w-4 text-subtle" })
									]
								}) }, b.customerCode))
							})
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, {
					className: "!normal-case !tracking-normal",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[13px] font-bold text-fg",
						children: "Module Cover Entire Estate"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoTag, {
						title: "How many customers are on each RPM Assure service. Covered means data or contract scope is present.",
						children: "?"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5",
					children: [
						{
							label: "SYSPRO Deployment",
							n: coverStats.syspro,
							tip: "Customers with SYSPRO cover"
						},
						{
							label: "Remote Management",
							n: coverStats.rmm,
							tip: "Customers with RMM / Pulseway devices"
						},
						{
							label: "Cloud Backup",
							n: coverStats.cove,
							tip: "Customers with Cove backup devices"
						},
						{
							label: "End Point Protection",
							n: coverStats.epp,
							tip: "Customers with Bitdefender EPP endpoints"
						},
						{
							label: "Microsoft 365",
							n: coverStats.csp,
							tip: "Customers with M365 tenant cover"
						}
					].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl border border-border bg-muted/20 px-3 py-3",
						title: s.tip,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] font-semibold text-muted",
								children: s.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 font-mono text-2xl font-bold tabular-nums text-fg",
								children: [s.n, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-sm font-medium text-muted",
									children: ["/", coverStats.n]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-0.5 text-[10px] text-subtle",
								children: [coverStats.n ? Math.round(s.n / coverStats.n * 100) : 0, "% of customers"]
							})
						]
					}, s.label))
				}) })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
							className: "border-border/80",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
								className: "space-y-1 p-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] font-bold uppercase tracking-wide text-subtle",
										children: "Remote management"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm text-fg",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono font-bold",
												children: exco.rmmServerOnlineTotal ?? 0
											}),
											" ",
											"servers online"
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs text-muted",
										children: [
											(exco.rmmServerOfflineTotal ?? 0) > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-semibold text-rag-red",
												children: [exco.rmmServerOfflineTotal, " offline"]
											}) : "No offline servers",
											" · ",
											exco.rmmCriticalTotal ?? 0,
											" critical alerts"
										]
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
							className: "border-border/80",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
								className: "space-y-1 p-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] font-bold uppercase tracking-wide text-subtle",
										children: "Cloud backup"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm text-fg",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono font-bold",
												children: exco.backupUnhealthyCount
											}),
											" ",
											"customers with backup issues"
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted",
										children: "Failed or stale backups on latest collect"
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
							className: "border-border/80",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
								className: "space-y-1 p-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] font-bold uppercase tracking-wide text-subtle",
										children: "AMS risk & issues"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm text-fg",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono font-bold",
												children: exco.openRisksTotal
											}),
											" ",
											"risks ·",
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono font-bold",
												children: exco.openIssuesTotal
											}),
											" ",
											"issues"
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted",
										children: "Open items across the estate"
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
							className: "border-border/80",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
								className: "space-y-1 p-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] font-bold uppercase tracking-wide text-subtle",
										children: "Data freshness"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm text-fg",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono font-bold text-rag-green",
												children: exco.collectFreshCount
											}),
											" ",
											"fresh",
											(exco.collectStaleCount ?? 0) > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
												" · ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono font-bold text-rag-amber",
													children: exco.collectStaleCount
												}),
												" ",
												"stale"
											] }) : null
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted",
										children: "SYSPRO / collect age within 24h where covered"
									})
								]
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, {
					className: "!normal-case !tracking-normal",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[13px] font-bold text-fg",
						children: "Customer Health Assurance"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoTag, {
						title: "One row per customer: health, assurance, which services are on cover, and whether action is needed. Click a name to open Customer Ecosystem.",
						children: "?"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "overflow-x-auto p-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full min-w-[880px] text-left text-[12px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "rpma-table-head border-b border-border bg-muted/30",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2",
									children: "Customer"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2",
									children: "Health"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 text-right",
									children: "Score"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 text-center",
									children: "SYSPRO"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 text-center",
									children: "RMM"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 text-center",
									children: "Backup"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 text-center",
									children: "EPP"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 text-center",
									children: "M365"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2",
									children: "Watch items"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [scoreboard.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "rpma-data-row border-b border-border/60",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CustLink, {
										code: b.customerCode,
										name: b.displayName
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RagBadge, { rag: b.healthRag })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-2 text-right font-mono font-semibold",
									children: [b.assuranceScorePct, "%"]
								}),
								[
									b.coverSyspro,
									b.coverRmm,
									b.coverCove,
									b.coverEpp,
									b.coverCsp
								].map((on, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-center",
									children: on ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-semibold text-rag-green",
										children: "On"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] font-bold uppercase text-amber-500",
										children: "No"
									})
								}, i)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-muted",
									children: b.attentionReasons.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-rag-green",
										children: "Clear"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "line-clamp-1",
										title: b.attentionReasons.join("; "),
										children: [b.attentionReasons.slice(0, 2).join(" · "), b.attentionReasons.length > 2 ? ` +${b.attentionReasons.length - 2}` : ""]
									})
								})
							]
						}, b.customerCode)), scoreboard.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							colSpan: 9,
							className: "px-3 py-6 text-center text-muted",
							children: "No customers in portfolio."
						}) }) : null] })]
					})
				})] })
			]
		})
	}) });
}
//#endregion
export { ExcoInsightPage as component };
