import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { n as createServerFn } from "./ssr.mjs";
import { n as formatSastDate, r as formatSastDateTime, t as cn } from "./utils-BpkUUAOs.mjs";
import { t as createSsrRpc } from "./createSsrRpc-C1p7zOu_.mjs";
import { t as Badge } from "./badge-BccjJCAV.mjs";
import { n as SpaLink, t as RagBadge } from "./rag-badge--H4DTZx7.mjs";
import { n as NoCoverPanel } from "./no-cover-Bp-NAN5U.mjs";
import { n as useDashboardConfig } from "./use-dashboard-config-yLPMN8xO.mjs";
import { A as ListTodo, F as HeartPulse, G as ChevronRight, I as HardDrive, M as Layers, U as Database, W as ClipboardList, Z as Activity, a as TriangleAlert, d as Shield, n as Users, w as Package, z as FileKey2 } from "../_libs/lucide-react.mjs";
import { n as formatProgramLabel, r as getSysproProgram } from "./syspro-programs-CuezAD_5.mjs";
import { i as StatCard, n as CHART_TOOLTIP_CURSOR, r as ChartTooltip, t as CHART } from "./brand-colors-CQCBtPrR.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
import { a as CartesianGrid, c as Cell, i as XAxis, l as ResponsiveContainer, n as BarChart, o as Bar, r as YAxis, s as Pie, t as PieChart, u as Tooltip } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/customer-sections-bLlAl5Tn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Code + friendly name; full description on hover/title */
function ProgramLabel({ code, className, showDescription = false, size = "md" }) {
	const p = getSysproProgram(code);
	if (!p) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("text-subtle", className),
		children: "—"
	});
	const known = p.name !== "SYSPRO program";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn("inline-flex min-w-0 flex-col gap-0.5", className),
		title: p.description,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("inline-flex shrink-0 items-center rounded-md border border-accent/25 bg-accent-soft font-mono font-semibold text-accent", size === "sm" ? "px-1 py-0 text-[10px]" : "px-1.5 py-0.5 text-[11px]"),
				children: p.code
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("font-medium text-fg", size === "sm" ? "text-[11px]" : "text-xs sm:text-sm", !known && "text-muted"),
				children: known ? p.name : "SYSPRO program"
			})]
		}), showDescription && known ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-[10px] leading-snug text-muted sm:text-[11px]",
			children: p.description
		}) : null]
	});
}
function classifyRmmDevice(d) {
	const type = (d.deviceType || "").toLowerCase();
	const blob = `${type} ${(d.osName || "").toLowerCase()} ${(d.name || "").toLowerCase()}`;
	if (type === "server" || type.includes("server") || type.includes("domain controller")) return "server";
	if (type === "workstation" || type.includes("workstation") || type.includes("desktop") || type.includes("laptop") || type.includes("notebook")) return "workstation";
	if (blob.includes("windows server") || blob.includes("server 201") || blob.includes("server 202") || blob.includes("domain controller") || /\b(hyper-v|esxi|vcenter|sql|dc\d*|prod|srv)\b/.test(blob)) return "server";
	if (blob.includes("windows 11") || blob.includes("windows 10") || blob.includes("windows 8") || blob.includes("windows 7") || blob.includes("macos") || blob.includes("mac os") || blob.includes("laptop") || blob.includes("notebook") || blob.includes("surface") || blob.includes("desktop") || blob.includes("pro (") || blob.includes("home (") || blob.includes("business (")) return "workstation";
	if (type === "windows" || type === "pc" || type.includes("computer")) {
		if (!blob.includes("server")) return "workstation";
	}
	return "other";
}
function isRmmServer(d) {
	return classifyRmmDevice(d) === "server";
}
function isRmmWorkstation(d) {
	return classifyRmmDevice(d) === "workstation";
}
/** What each FinSight module row means */
var FINSIGHT_CONTROL_WHAT = "Each FinSight module is a control account recon: does the sub-ledger (or module balance) agree with the GL control at L1?";
var FINSIGHT_INTEGRATION_WHAT = "Sub-ledger integration: movements should post from the module into GL. Unexplained L1 variance often means incomplete integration, timing, or unposted journals.";
/** Module codes → plain-English control description */
var FINSIGHT_CONTROL_HINTS = {
	INV: "Inventory sub-ledger vs GL inventory control",
	AP: "Accounts payable (creditors) vs GL AP control",
	AR: "Accounts receivable (debtors) vs GL AR control",
	WIP: "Work in progress vs GL WIP control",
	WPI: "WIP inspection vs GL",
	CB: "Cashbook vs GL bank / cash controls",
	ASS: "Assets sub-ledger vs GL asset controls",
	DN: "Dispatch notes / goods issues vs GL",
	GIT: "Goods in transit vs GL",
	GRN: "GRN suspense vs GL"
};
function finsightControlHint(code) {
	return FINSIGHT_CONTROL_HINTS[(code || "").toUpperCase()] || "Sub-ledger / module balance vs GL control account";
}
/** Canonical UI labels for module codes (never show bare codes alone) */
var FINSIGHT_MODULE_NAMES = {
	AP: "Accounts Payable",
	AR: "Accounts Receivable",
	ASS: "Assets",
	CB: "Cashbook",
	DN: "Dispatch Notes",
	GIT: "Goods In Transit",
	GRN: "GRN Suspense",
	INV: "Inventory",
	WIP: "Work In Progress",
	WPI: "WIP Inspection"
};
function finsightModuleName(code, fallback) {
	const c = (code || "").toUpperCase();
	if (FINSIGHT_MODULE_NAMES[c]) return FINSIGHT_MODULE_NAMES[c];
	if (fallback && fallback.trim()) return fallback.trim();
	return c || "Module";
}
/**
* FinSight automated recon workflow — server functions.
* Requires Fact_FinSight_ReconCase (312_FinSight_L23_Workflow.sql).
*/
/** Open one recon case per L1 control with Out of Balance lines (idempotent for open statuses). */
var autoOpenFinSightReconCases = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("31de077490a143daa407bfd50a63a2452ad840d7898a3da7f16dd3706ddc4d2b"));
var updateFinSightReconCase = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("a6394aca4eeedea65039d675a02630943d508d22266faa7e9918d0c449aab017"));
/**
* Live AMS incident + SLA tracking API (Fact_Incident).
*/
var upsertAmsIncident = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("c074baa98ff82b2ab90b9b124fbd06f844335e280343557d55653b014240b5a5"));
var transitionAmsIncident = createServerFn({ method: "POST" }).validator((data) => data).handler(createSsrRpc("f84543eac9beee0944a5e994928628eff4a1d87a7956b529582f6a208b258961"));
function formatZar(n) {
	if (n == null || Number.isNaN(n)) return "—";
	return n.toLocaleString("en-ZA", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});
}
function ChartCaption({ title, why }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm font-bold leading-tight text-fg sm:text-[0.95rem]",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-0.5 text-[12px] leading-snug text-muted",
			children: why
		})]
	});
}
function DrillCard({ to, title, blurb, icon: Icon, badge }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SpaLink, {
		href: to,
		className: "rpma-focus group flex items-start gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm transition hover:border-accent/40 hover:shadow-md",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-semibold text-fg group-hover:text-accent",
						children: title
					}), badge]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-0.5 block text-[12px] text-muted",
					children: blurb
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "mt-1 h-4 w-4 shrink-0 text-subtle group-hover:text-accent" })
		]
	});
}
function licenseFallback(data) {
	return data.license?.productName ?? null;
}
/** EXCO default — board language, charts first, less clutter */
/**
* Effective cover for UI: cover flags from loader + live payload evidence.
* Rule (all customers, all modules): has data → Covered; no data → No Cover.
* SYSPRO hard-off (PillarSyspro=false) is already applied server-side (payload cleared).
*/
function effectiveCover(data) {
	const base = data.cover ?? data.customer?.cover ?? {
		syspro: false,
		rmm: false,
		cove: false,
		epp: false,
		csp: false
	};
	const rmm = data.rmm;
	const cove = data.cove;
	const epp = data.epp;
	const rmmData = (rmm?.devices?.length ?? 0) > 0 || (rmm?.summary?.deviceCount ?? 0) > 0 || (rmm?.mapping?.length ?? 0) > 0 || Boolean(rmm?.pulsewayOrgName && String(rmm.pulsewayOrgName).trim()) || (data.customer?.pulsewayDeviceCount ?? 0) > 0;
	const coveData = (cove?.devices?.length ?? 0) > 0 || (cove?.summary?.deviceCount ?? 0) > 0 || (cove?.mapping?.length ?? 0) > 0 || (data.customer?.coveDeviceCount ?? 0) > 0;
	const eppData = (epp?.devices?.length ?? 0) > 0 || (epp?.summary?.deviceCount ?? 0) > 0 || epp?.enabled === true || (data.customer?.eppDeviceCount ?? 0) > 0;
	return {
		syspro: base.syspro === true,
		rmm: base.rmm === true || rmmData,
		cove: base.cove === true || coveData,
		epp: base.epp === true || eppData,
		csp: base.csp === true
	};
}
function ExecBriefSection({ data }) {
	const { customer, risks, issues, priorities, incidents, dtrLevel1, operationalAssurance, operators, sysproVersion, sysproHotfixes } = data;
	const { dashboard: dash } = useDashboardConfig();
	const base = `/customers/${customer.customerCode}`;
	const openRisks = risks.filter((r) => (r.status || "").toLowerCase() !== "closed");
	const openIssues = issues.filter((i) => (i.status || "").toLowerCase() !== "closed");
	const major = incidents.filter((i) => i.isMajor && (i.status || "").toLowerCase() !== "closed");
	const oa = operationalAssurance;
	const score = oa?.scorePct ?? (customer.healthRag === "Green" ? 90 : customer.healthRag === "Amber" ? 65 : 40);
	const activeOps = customer.activeUserCount;
	const totalOps = Math.max(customer.operatorCount, operators.length, 1);
	const idleOps = Math.max(0, totalOps - activeOps);
	const userPie = (0, import_react.useMemo)(() => [{
		name: "Active (logged in ≤30d)",
		value: activeOps,
		fill: CHART.active
	}, {
		name: "Not recently active",
		value: idleOps,
		fill: CHART.secondary
	}], [activeOps, idleOps]);
	const signalBars = (0, import_react.useMemo)(() => [
		{
			name: "Job errors",
			value: customer.sysproJobErrorCount,
			fill: CHART.jobs
		},
		{
			name: "FinSight Out of Balance",
			value: customer.sysproDtrVarianceLines,
			fill: CHART.dtr
		},
		{
			name: "Open risks",
			value: openRisks.length,
			fill: CHART.amber
		},
		{
			name: "Major incidents",
			value: major.length,
			fill: CHART.red
		}
	].filter((d) => d.value > 0 || true), [
		customer.sysproJobErrorCount,
		customer.sysproDtrVarianceLines,
		openRisks.length,
		major.length
	]);
	const dtrBars = (0, import_react.useMemo)(() => {
		return (dtrLevel1 ?? []).filter((d) => d.varianceLineCount > 0).map((d) => {
			const label = finsightModuleName(d.balanceTypeCode, d.balanceTypeName);
			return {
				name: label,
				oob: d.varianceLineCount,
				label
			};
		}).sort((a, b) => b.oob - a.oob).slice(0, 6);
	}, [dtrLevel1]);
	const topPriorities = priorities.slice(0, 3);
	const topRisks = openRisks.slice(0, 3);
	const cover = effectiveCover(data);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-sm backdrop-blur-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RagBadge, { rag: customer.healthRag }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-lg font-semibold tracking-tight text-fg",
								children: customer.displayName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: data.dataMode === "demo" ? "amber" : "green",
								children: data.dataMode === "demo" ? "Demo" : "Live"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-2xl text-sm leading-relaxed text-muted",
						children: cover.syspro ? customer.healthSummary || "Overall health for this managed customer." : (customer.healthSummary || "").replace(/No SYSPRO operator snapshot yet\.?\s*·?\s*/gi, "").replace(/SYSPRO[^·]*·\s*/gi, "").trim() || "SYSPRO Deployment is No Cover for this customer. Health reflects covered services only (RMM / Backup)."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-[11px] text-subtle",
						children: [
							"Last collect ",
							formatSastDateTime(customer.lastImportAt),
							oa?.collectAgeHours != null ? ` · ${oa.collectAgeHours}h ago` : ""
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, { children: ["Modules overview", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "ml-2 text-[11px] font-normal normal-case tracking-normal text-muted",
				children: "All services and modules for this customer"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "space-y-4 p-4",
				children: [
					{
						id: "syspro",
						title: "SYSPRO Deployment",
						covered: cover.syspro,
						modules: [
							{
								label: "Overview",
								href: `${base}/syspro`
							},
							{
								label: "FinSight",
								href: `${base}/syspro/dtr`
							},
							{
								label: "License",
								href: `${base}/syspro/license`
							},
							{
								label: "Hotfixes",
								href: `${base}/syspro/hotfixes`
							},
							{
								label: "Operators",
								href: `${base}/syspro/operators`
							},
							{
								label: "Jobs",
								href: `${base}/syspro/jobs`
							},
							{
								label: "Health",
								href: `${base}/syspro/health`
							},
							{
								label: "Security",
								href: `${base}/syspro/security`
							},
							{
								label: "SQL",
								href: `${base}/syspro/sql`
							}
						]
					},
					{
						id: "rmm",
						title: "RPM Remote Management",
						covered: cover.rmm,
						modules: [
							{
								label: "Servers",
								href: `${base}/rmm/devices`
							},
							{
								label: "Workstations",
								href: `${base}/rmm/workstations`
							},
							{
								label: "Server Patch Management",
								href: `${base}/rmm/patch`
							},
							{
								label: "Server Alerts",
								href: `${base}/rmm/alerts`
							}
						]
					},
					{
						id: "cove",
						title: "RPM Cloud Backup",
						covered: cover.cove,
						modules: [
							{
								label: "Devices on Cloud Backup",
								href: `${base}/cove/devices`
							},
							{
								label: "Backup Recovery Testing",
								href: `${base}/cove/recovery`
							},
							{
								label: "Retention policies",
								href: `${base}/cove/retention`
							}
						]
					},
					{
						id: "epp",
						title: "RPM End Point Protection",
						covered: cover.epp,
						modules: [
							{
								label: "Device stats",
								href: `${base}/epp`
							},
							{
								label: "Incidents",
								href: `${base}/epp/incidents`
							},
							{
								label: "Modules",
								href: `${base}/epp/modules`
							},
							{
								label: "Quarantine",
								href: `${base}/epp/quarantine`
							}
						]
					},
					{
						id: "csp",
						title: "Microsoft 365 Tenant",
						covered: cover.csp,
						modules: [
							{
								label: "Tenant health",
								href: `${base}/csp`
							},
							{
								label: "Licensed users",
								href: `${base}/csp/users`
							},
							{
								label: "License stats",
								href: `${base}/csp/licenses`
							}
						]
					},
					{
						id: "ams",
						title: "AMS",
						covered: true,
						modules: [
							{
								label: "Overview",
								href: `${base}/ams`
							},
							{
								label: "Incidents",
								href: `${base}/ams/incidents`
							},
							{
								label: "Risks",
								href: `${base}/ams/risks`
							},
							{
								label: "SLA",
								href: `${base}/ams/sla`
							}
						]
					}
				].map((pillar) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: cn("rounded-xl border px-3 py-3 transition-colors", pillar.covered ? "border-border/80 bg-muted/20" : "border-dashed border-border/70 bg-surface/40"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold text-fg",
							children: pillar.title
						}), pillar.covered ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "green",
							className: "text-[10px]",
							children: "Covered"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[11px] font-bold uppercase tracking-wide text-amber-500",
							children: "No Cover"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-1.5",
						children: pillar.modules.map((m) => pillar.covered ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SpaLink, {
							href: m.href,
							className: "inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-fg transition-colors hover:border-accent/50 hover:bg-accent/10 hover:text-accent",
							children: [m.label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-3 w-3 opacity-60" })]
						}, m.href) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "inline-flex cursor-not-allowed items-center rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 text-[12px] text-muted",
							title: "No Cover for this service",
							children: m.label
						}, m.href))
					})]
				}, pillar.id))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 lg:grid-cols-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Assurance score",
					value: `${score}%`,
					tone: score >= 80 ? "green" : score >= 55 ? "amber" : "red",
					hint: "Higher is healthier"
				}), cover.syspro ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Active users",
						value: activeOps,
						hint: `of ${totalOps} operators`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Job errors",
						value: customer.sysproJobErrorCount,
						tone: customer.sysproJobErrorCount > 0 ? "amber" : "green",
						hint: "SYSPRO batch problems"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "FinSight Out of Balance",
						value: customer.sysproDtrVarianceLines,
						tone: customer.sysproDtrVarianceLines > 0 ? "amber" : "green",
						hint: "Finance sub-ledger vs GL"
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "SYSPRO Deployment",
						value: "—",
						hint: "No Cover — not in scope",
						tip: "This customer does not include SYSPRO Deployment. Active users, jobs, and FinSight are not scored."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Job errors",
						value: "—",
						hint: "No Cover"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "FinSight Out of Balance",
						value: "—",
						hint: "No Cover"
					})
				] })]
			}),
			cover.syspro ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 lg:grid-cols-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "lg:col-span-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "SYSPRO version & build" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "space-y-2 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-subtle",
								children: "Product "
							}), sysproVersion?.productName ?? licenseFallback(data) ?? "—"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-subtle",
								children: "Version "
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold text-fg",
								children: sysproVersion?.productVersion ?? "—"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-subtle",
								children: "Build / DB "
							}), sysproVersion?.buildNumber ?? "—"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-subtle",
								children: "Server "
							}), sysproVersion?.serverName ?? customer.sqlInstanceName ?? "—"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SpaLink, {
								href: `${base}/syspro/license`,
								className: "inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline",
								children: ["Full license detail", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-3.5 w-3.5" })]
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "lg:col-span-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, { children: ["Installed hotfixes", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: "muted",
						className: "ml-2",
						children: (sysproHotfixes ?? []).length
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "max-h-40 space-y-1 overflow-auto text-[12px]",
						children: [(sysproHotfixes ?? []).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-muted",
							children: "No deployment hotfixes collected yet. Run catalogue collect on the customer server."
						}) : (sysproHotfixes ?? []).slice(0, 12).map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-t border-border py-1 first:border-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold text-fg",
									children: h.hotfixCode
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-muted",
									children: [
										" ",
										"· ",
										h.hotfixName ?? h.description ?? "—"
									]
								}),
								h.installedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "ml-1 text-subtle",
									children: ["· ", formatSastDateTime(h.installedAt)]
								}) : null
							]
						}, i)), (sysproHotfixes ?? []).length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SpaLink, {
							href: `${base}/syspro/hotfixes`,
							className: "mt-1 inline-block text-xs font-medium text-accent hover:underline",
							children: ["Hotfix Information — all ", (sysproHotfixes ?? []).length]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpaLink, {
							href: `${base}/syspro/hotfixes`,
							className: "mt-1 inline-block text-xs font-medium text-accent hover:underline",
							children: "Open Hotfix Information"
						})]
					})]
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-dashed border-border bg-surface/50 px-4 py-5 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-fg",
					children: "SYSPRO Deployment"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-[12px] text-muted",
					children: "No Cover — version, build, and hotfixes are not shown for this customer."
				})]
			}),
			cover.syspro && dash.customerShowCharts ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					className: "overflow-hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
								title: "Who is using SYSPRO?",
								why: "Active = logged in within the last 30 days. Quiet operators may need a license review."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-48",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
									width: "100%",
									height: "100%",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PieChart, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pie, {
										isAnimationActive: false,
										data: userPie,
										dataKey: "value",
										nameKey: "name",
										innerRadius: 48,
										outerRadius: 72,
										paddingAngle: 2,
										children: userPie.map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, {
											fill: e.fill,
											stroke: "transparent"
										}, i))
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {}) })] })
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 flex flex-wrap justify-center gap-3 text-[11px] text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "h-2 w-2 rounded-full",
											style: { background: CHART.active }
										}),
										"Active ",
										activeOps
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "h-2 w-2 rounded-full",
											style: { background: CHART.secondary }
										}),
										"Quiet ",
										idleOps
									]
								})]
							})
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					className: "overflow-hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
							title: "What needs attention?",
							why: "Counts that drive the RAG. Zero is good. Bars above zero are watch items for this customer."
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-48",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
									data: signalBars,
									margin: {
										top: 4,
										right: 8,
										left: 0,
										bottom: 0
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
											strokeDasharray: "3 3",
											stroke: CHART.grid,
											vertical: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
											dataKey: "name",
											tick: {
												fill: CHART.axis,
												fontSize: 10
											},
											axisLine: false,
											tickLine: false,
											interval: 0
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
											allowDecimals: false,
											width: 28,
											tick: {
												fill: CHART.axis,
												fontSize: 10
											},
											axisLine: false,
											tickLine: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
											content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {}),
											cursor: CHART_TOOLTIP_CURSOR
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
											isAnimationActive: false,
											dataKey: "value",
											radius: [
												6,
												6,
												0,
												0
											],
											maxBarSize: 36,
											children: signalBars.map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { fill: e.fill }, i))
										})
									]
								})
							})
						})]
					})
				})]
			}) : null,
			dash.customerShowDtr && dtrBars.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
							title: "Control accounts out of balance (FinSight)",
							why: "Each bar is a control-account recon failure (sub-ledger vs GL). Start with the tallest bar."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-44",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
									data: dtrBars,
									layout: "vertical",
									margin: {
										top: 0,
										right: 12,
										left: 8,
										bottom: 0
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
											strokeDasharray: "3 3",
											stroke: CHART.grid,
											horizontal: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
											type: "number",
											allowDecimals: false,
											tick: {
												fill: CHART.axis,
												fontSize: 10
											}
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
											type: "category",
											dataKey: "name",
											width: 40,
											tick: {
												fill: CHART.axis,
												fontSize: 11,
												fontWeight: 600
											},
											axisLine: false,
											tickLine: false
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
											content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {}),
											cursor: CHART_TOOLTIP_CURSOR,
											formatter: (v, _n, item) => [`${v} Out of Balance line(s)`, (item?.payload)?.label ?? "Module"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
											isAnimationActive: false,
											dataKey: "oob",
											name: "Out of Balance",
											fill: CHART.dtr,
											radius: [
												0,
												6,
												6,
												0
											],
											maxBarSize: 18
										})
									]
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SpaLink, {
							href: `${base}/syspro/dtr`,
							className: "mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline",
							children: ["Open FinSight detail ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-3 w-3" })]
						})
					]
				})
			}) : dash.customerShowDtr ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-dashed",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
							title: "RPM Assure FinSight",
							why: "Control account recons and sub-ledger integration to GL. Empty when FinSight balances are not available."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: (customer.sysproDtrVarianceLines ?? 0) === 0 && (dtrLevel1?.length ?? 0) === 0 ? "No FinSight balance rows for this customer. Ops, jobs, license and security still apply — FinSight modules appear only when balance tables exist on the company DB and collect has run." : "All collected FinSight modules are in balance (0 Out of Balance lines)."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SpaLink, {
							href: `${base}/syspro/dtr`,
							className: "mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline",
							children: ["Open FinSight page ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-3 w-3" })]
						})
					]
				})
			}) : null,
			dash.customerShowLists ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
					className: "!py-2.5",
					children: "Next priorities"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "space-y-2 pt-0",
					children: topPriorities.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: "No priorities listed."
					}) : topPriorities.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-t border-border/70 py-2 first:border-0 first:pt-0",
						children: [
							p.programCode ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mb-1",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgramLabel, {
									code: p.programCode,
									showDescription: true,
									size: "sm"
								})
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-fg",
								children: p.title
							}),
							p.detail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-0.5 text-[12px] text-muted line-clamp-2",
								children: p.detail
							}) : null
						]
					}, i))
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
					className: "!py-2.5",
					children: "Open risks"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-2 pt-0",
					children: [topRisks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: "No open risks on the register."
					}) : topRisks.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2 border-t border-border/70 py-2 first:border-0 first:pt-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: cn("mt-0.5 h-3.5 w-3.5 shrink-0", r.rag === "Red" ? "text-rag-red" : r.rag === "Green" ? "text-rag-green" : "text-rag-amber") }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-fg",
								children: r.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-muted",
								children: [r.rag, r.ownerName ? ` · ${r.ownerName}` : ""]
							})]
						})]
					}, i)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SpaLink, {
						href: `${base}/ams/risks`,
						className: "inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline",
						children: ["Full risk register ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-3 w-3" })]
					})]
				})] })]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle",
				children: "Go deeper"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
						to: `${base}/syspro`,
						title: "SYSPRO",
						blurb: "Operators, jobs, FinSight, security, SQL",
						icon: Layers,
						badge: customer.sysproJobErrorCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "amber",
							children: customer.sysproJobErrorCount
						}) : null
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
						to: `${base}/ams`,
						title: "AMS pack",
						blurb: "Incidents, SLA, change, CSAT",
						icon: ClipboardList,
						badge: openRisks.length + openIssues.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "muted",
							children: openRisks.length + openIssues.length
						}) : null
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
						to: `${base}/syspro/sql`,
						title: "SQL & backups",
						blurb: "Backup health and platform checks",
						icon: HardDrive
					})
				]
			})] })
		]
	});
}
function SysproHubSection({ data }) {
	const c = data.customer;
	const cover = effectiveCover(data);
	const base = `/customers/${c.customerCode}/syspro`;
	if (!cover.syspro) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "SYSPRO Deployment",
		hint: "No cover — no SYSPRO data for this customer (no instance map / operators / collect). Deferred customers stay No Cover until enabled."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-sm text-muted",
			children: [
				"Technical SYSPRO estate for ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
					className: "text-fg",
					children: c.displayName
				}),
				". Start at Health, then open the area you need."
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-2 sm:grid-cols-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
					to: `${base}/health`,
					title: "Health",
					blurb: "RAG, logs, assurance",
					icon: HeartPulse
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
					to: `${base}/operators`,
					title: "Operators",
					blurb: "Users & last login",
					icon: Users
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
					to: `${base}/jobs`,
					title: "Jobs",
					blurb: "Job logging errors",
					icon: Activity,
					badge: c.sysproJobErrorCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: "red",
						children: c.sysproJobErrorCount
					}) : void 0
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
					to: `${base}/dtr`,
					title: "RPM Assure FinSight",
					blurb: "Control recons · sub-ledger → GL",
					icon: Database,
					badge: c.sysproDtrVarianceLines > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
						variant: "amber",
						children: [c.sysproDtrVarianceLines, " Out of Balance"]
					}) : void 0
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
					to: `${base}/security`,
					title: "Security",
					blurb: "Groups & amends",
					icon: Shield
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
					to: `${base}/license`,
					title: "License",
					blurb: "Product, seats, expiry",
					icon: FileKey2
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
					to: `${base}/hotfixes`,
					title: "Hotfix Information",
					blurb: "Installed KBs & gap",
					icon: Package
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
					to: `${base}/sql`,
					title: "SQL platform",
					blurb: "Backups & SQL health",
					icon: HardDrive
				})
			]
		})]
	});
}
function RmmPatchSection({ data }) {
	const rmm = data.rmm;
	const s = rmm?.summary;
	if (!effectiveCover(data).rmm) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "RPM Remote Management · Server Patch Management",
		hint: "No cover — no RMM data for this customer."
	});
	const devices = [...rmm?.devices ?? []].filter((d) => isRmmServer(d)).sort((a, b) => {
		const am = a.patchMissing ?? -1;
		const bm = b.patchMissing ?? -1;
		if (bm !== am) return bm - am;
		return (a.name || "").localeCompare(b.name || "");
	});
	const reporting = devices.filter((d) => d.patchInstalled != null || d.patchMissing != null || d.patchPending != null);
	const withMissing = reporting.filter((d) => (d.patchMissing ?? 0) > 0);
	const isServer = (t) => {
		const x = (t || "").toLowerCase();
		return x.includes("server") || x.includes("domain controller");
	};
	const isWorkstation = (t) => {
		const x = (t || "").toLowerCase();
		return x.includes("workstation") || x.includes("desktop") || x.includes("laptop") || x.includes("notebook") || x.includes("pc");
	};
	const bucketOf = (n) => {
		if (n <= 0) return "clean";
		if (n <= 5) return "light";
		if (n <= 20) return "medium";
		return "heavy";
	};
	const bucketMeta = {
		clean: {
			label: "Up to date",
			range: "0 missing",
			tone: "green"
		},
		light: {
			label: "Light backlog",
			range: "1–5 missing",
			tone: "default"
		},
		medium: {
			label: "Moderate",
			range: "6–20 missing",
			tone: "amber"
		},
		heavy: {
			label: "Heavy backlog",
			range: "21+ missing",
			tone: "red"
		}
	};
	const byType = {
		server: {
			devices: 0,
			missing: 0,
			withMissing: 0
		},
		workstation: {
			devices: 0,
			missing: 0,
			withMissing: 0
		},
		other: {
			devices: 0,
			missing: 0,
			withMissing: 0
		}
	};
	const byBucket = {
		clean: {
			devices: 0,
			missing: 0
		},
		light: {
			devices: 0,
			missing: 0
		},
		medium: {
			devices: 0,
			missing: 0
		},
		heavy: {
			devices: 0,
			missing: 0
		}
	};
	let onlineMissing = 0;
	let offlineMissing = 0;
	let onlineWithMissing = 0;
	let offlineWithMissing = 0;
	for (const d of reporting) {
		const miss = Number(d.patchMissing) || 0;
		const bucket = bucketOf(miss);
		byBucket[bucket].devices += 1;
		byBucket[bucket].missing += miss;
		const typeKey = isServer(d.deviceType) ? "server" : isWorkstation(d.deviceType) ? "workstation" : "other";
		byType[typeKey].devices += 1;
		byType[typeKey].missing += miss;
		if (miss > 0) byType[typeKey].withMissing += 1;
		if (d.isOnline === false) {
			offlineMissing += miss;
			if (miss > 0) offlineWithMissing += 1;
		} else {
			onlineMissing += miss;
			if (miss > 0) onlineWithMissing += 1;
		}
	}
	const totalMissingSum = s?.patchMissing ?? reporting.reduce((acc, d) => acc + (Number(d.patchMissing) || 0), 0);
	const maxBucketDevices = Math.max(1, ...Object.values(byBucket).map((b) => b.devices));
	const topOffenders = withMissing.slice(0, 8);
	const topMax = Math.max(1, ...topOffenders.map((d) => Number(d.patchMissing) || 0), 1);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "Customer Patches - Not Deployed",
				why: "Outstanding Windows / OS updates per agent from Pulseway (Critical + Important + Unspecified). Installed history is not exposed by the API. Not SYSPRO hotfixes — those stay under SYSPRO → Hotfix Information."
			}),
			rmm?.message ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: rmm.message
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Devices reporting",
						value: s?.patchDevicesReporting ?? reporting.length,
						hint: "Agents that sent Updates counters"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Outstanding updates",
						value: s?.patchMissing ?? totalMissingSum ?? "—",
						tone: (s?.patchMissing ?? totalMissingSum ?? 0) > 0 ? "amber" : "default",
						hint: "Critical + Important + Unspecified (Pulseway)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Agents with backlog",
						value: withMissing.length,
						tone: withMissing.length > 0 ? "amber" : "green",
						hint: "At least one outstanding update"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Pending / reboot",
						value: s?.patchPending ?? "—",
						hint: "Only when agent reports pending"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Clean (0 outstanding)",
						value: reporting.filter((d) => (d.patchMissing ?? 0) === 0).length,
						tone: "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Devices total",
						value: devices.length
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Not reporting",
						value: Math.max(0, devices.length - reporting.length),
						hint: "No Updates object from agent"
					})
				]
			}),
			reporting.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
						title: "Missing patch count breakdown",
						why: "How the missing total is distributed: severity buckets, device role, and online vs offline. Bars scale to device count in each bucket."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 lg:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-border bg-surface/40 p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-2 text-[11px] font-bold uppercase tracking-wide text-muted",
								children: "By severity (devices)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-2",
								children: Object.keys(bucketMeta).map((key) => {
									const b = byBucket[key];
									const meta = bucketMeta[key];
									const pct = Math.round(b.devices / maxBucketDevices * 100);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mb-0.5 flex items-baseline justify-between gap-2 text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-medium text-fg",
											children: [
												meta.label,
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-normal text-muted",
													children: [
														"(",
														meta.range,
														")"
													]
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono tabular-nums text-muted",
											children: [
												b.devices,
												" dev · ",
												b.missing,
												" miss"
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "h-2 overflow-hidden rounded-full bg-muted/50",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "h-full rounded-full transition-all " + (meta.tone === "green" ? "bg-rag-green" : meta.tone === "amber" ? "bg-rag-amber" : meta.tone === "red" ? "bg-rag-red" : "bg-accent"),
											style: {
												width: `${pct}%`,
												minWidth: b.devices > 0 ? 4 : 0
											}
										})
									})] }, key);
								})
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl border border-border bg-surface/40 p-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mb-2 text-[11px] font-bold uppercase tracking-wide text-muted",
									children: "By device role"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid grid-cols-3 gap-2",
									children: [
										["Servers", byType.server],
										["Workstations", byType.workstation],
										["Other", byType.other]
									].map(([label, row]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg border border-border/70 bg-card px-2 py-2 text-center",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[10px] font-semibold uppercase tracking-wide text-muted",
												children: label
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-1 font-mono text-lg font-bold tabular-nums text-fg",
												children: row.missing
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-[10px] text-muted",
												children: [
													"missing · ",
													row.withMissing,
													"/",
													row.devices,
													" devices"
												]
											})
										]
									}, label))
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl border border-border bg-surface/40 p-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mb-2 text-[11px] font-bold uppercase tracking-wide text-muted",
									children: "Online vs offline (missing patches)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg border border-border/70 bg-card px-3 py-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[10px] font-semibold uppercase text-muted",
												children: "Online"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "font-mono text-xl font-bold tabular-nums text-fg",
												children: onlineMissing
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-[10px] text-muted",
												children: [
													onlineWithMissing,
													" device",
													onlineWithMissing === 1 ? "" : "s",
													" with backlog"
												]
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg border border-border/70 bg-card px-3 py-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[10px] font-semibold uppercase text-muted",
												children: "Offline"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "font-mono text-xl font-bold tabular-nums " + (offlineMissing > 0 ? "text-rag-amber" : "text-fg"),
												children: offlineMissing
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-[10px] text-muted",
												children: [
													offlineWithMissing,
													" device",
													offlineWithMissing === 1 ? "" : "s",
													" with backlog"
												]
											})
										]
									})]
								})]
							})]
						})]
					}),
					topOffenders.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl border border-border bg-surface/40 p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-2 text-[11px] font-bold uppercase tracking-wide text-muted",
								children: "Top devices by missing count"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-2",
								children: topOffenders.map((d) => {
									const miss = Number(d.patchMissing) || 0;
									const pct = Math.round(miss / topMax * 100);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mb-0.5 flex items-baseline justify-between gap-2 text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "truncate font-medium text-fg",
											children: [d.name ?? d.deviceId, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "ml-1.5 font-normal text-muted",
												children: [d.deviceType ?? "—", d.isOnline === false ? " · offline" : ""]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "shrink-0 font-mono font-semibold tabular-nums text-rag-amber",
											children: miss
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "h-1.5 overflow-hidden rounded-full bg-muted/50",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "h-full rounded-full bg-rag-amber",
											style: {
												width: `${pct}%`,
												minWidth: 4
											}
										})
									})] }, d.deviceId);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 text-[11px] text-muted",
								children: [
									"Estate total missing:",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono font-semibold text-fg",
										children: totalMissingSum
									}),
									withMissing.length > topOffenders.length ? ` · showing top ${topOffenders.length} of ${withMissing.length}` : null
								]
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted",
						children: "All reporting devices show 0 missing patches."
					})
				]
			}) : null,
			devices.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "No RMM devices on latest snapshot. Map Pulseway org and re-run collect."
			}) : reporting.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-medium text-fg",
						children: [devices.length, " device(s) loaded, but patch counters are empty on the latest snapshot."]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Pulseway does not put missing/installed update counts on the base device record. The collect script must call OS Updates endpoints (devices/…/updates, windowsupdates, osupdates, …) and store PatchMissingCount / PatchInstalledCount / PatchPendingCount." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
						className: "list-decimal space-y-1 pl-5 text-[13px]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								"On central: run",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs",
									children: "Probe-Pulseway-Patch.ps1"
								}),
								" ",
								"— look for lines marked ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono",
									children: "**PATCH-LIKE**"
								}),
								" and paste that log if still empty."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								"Apply SQL",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs",
									children: "457_Ensure_Rmm_Devices_Latest_Patch.sql"
								}),
								" ",
								"then re-run",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs",
									children: "Collect-Pulseway-To-RPMAssure.ps1"
								}),
								"."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Confirm in SQL that agents are reporting patch counts on the latest snapshot (ReportingPatch greater than zero)." })
						]
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-xl border border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[720px] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Device"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Type"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Online"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 text-right",
								children: "Outstanding"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 text-right",
								children: "Pending"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Band"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: devices.map((d) => {
						const reports = d.patchInstalled != null || d.patchMissing != null || d.patchPending != null;
						const miss = reports ? Number(d.patchMissing) || 0 : null;
						const band = miss == null ? null : bucketMeta[bucketOf(miss)];
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-border/70",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-medium",
									children: d.name ?? d.deviceId
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-muted text-xs",
									children: d.deviceType ?? "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-xs",
									children: d.isOnline == null ? "—" : d.isOnline ? "Online" : "Offline"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-right font-mono tabular-nums " + ((d.patchMissing ?? 0) > 0 ? "font-semibold text-rag-amber" : ""),
									children: reports ? d.patchMissing ?? "—" : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-right font-mono tabular-nums",
									children: reports ? d.patchPending ?? "—" : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-[11px] text-muted",
									children: band ? band.label : "—"
								})
							]
						}, d.deviceId);
					}) })]
				})
			})
		]
	});
}
function RmmDevicesSection({ data, mode = "servers" }) {
	const allDevices = data.rmm?.devices ?? [];
	const devices = (0, import_react.useMemo)(() => {
		return [...allDevices.filter((d) => mode === "workstations" ? isRmmWorkstation(d) : isRmmServer(d))].sort((a, b) => {
			const ao = a.isOnline === false ? 0 : 1;
			const bo = b.isOnline === false ? 0 : 1;
			if (ao !== bo) return ao - bo;
			return String(a.name || a.deviceId).localeCompare(String(b.name || b.deviceId));
		});
	}, [allDevices, mode]);
	const [selectedId, setSelectedId] = (0, import_react.useState)(null);
	const title = mode === "workstations" ? "Workstations" : "Servers";
	const estateLabel = mode === "workstations" ? "Workstations" : "Servers";
	(0, import_react.useEffect)(() => {
		if (devices.length === 0) {
			setSelectedId(null);
			return;
		}
		setSelectedId((prev) => {
			if (prev && devices.some((d) => d.deviceId === prev)) return prev;
			return (devices.find((d) => d.isOnline === false) ?? devices[0]).deviceId;
		});
	}, [devices]);
	const selected = (0, import_react.useMemo)(() => devices.find((d) => d.deviceId === selectedId) ?? null, [devices, selectedId]);
	if (!effectiveCover(data).rmm) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: `RPM Remote Management · ${title}`,
		hint: "No cover — no RMM data for this customer."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
			title,
			why: mode === "workstations" ? "Client devices only (desktops, laptops, notebooks). Servers are under the Servers module." : "Server-class devices only. Workstations and laptops are under the Workstations module. Offline devices listed first."
		}), devices.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: mode === "workstations" ? "No workstations on the latest snapshot for this customer." : "No servers on the latest snapshot for this customer. Laptops and PCs appear under Workstations."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-4 lg:grid-cols-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "overflow-hidden rounded-xl border border-border lg:col-span-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted",
					children: [
						estateLabel,
						" (",
						devices.length,
						")"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "max-h-[28rem] divide-y divide-border/70 overflow-y-auto",
					children: devices.map((d) => {
						const active = d.deviceId === selectedId;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setSelectedId(d.deviceId),
							className: "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition hover:bg-surface-2/60 " + (active ? "bg-accent-soft/30" : ""),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "truncate text-sm font-semibold text-fg",
										children: d.name ?? d.deviceId
									}), d.isOnline == null ? null : d.isOnline ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										className: "shrink-0 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
										children: "Online"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "amber",
										className: "shrink-0",
										children: "Offline"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "truncate text-[11px] text-muted",
									children: [d.deviceType ?? "Device", d.osName ? ` · ${d.osName}` : ""]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-[10px] text-subtle",
									children: [
										"CPU ",
										d.cpuPct != null ? `${Math.round(d.cpuPct)}%` : "—",
										" · ",
										"Mem ",
										d.memoryPct != null ? `${Math.round(d.memoryPct)}%` : "—",
										" · ",
										d.ipAddress ?? "no IP"
									]
								})
							]
						}) }, d.deviceId);
					})
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-xl border border-border bg-surface p-4 lg:col-span-3",
				children: !selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Select a device to view stats."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-start justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-lg font-bold tracking-tight text-fg",
								children: selected.name ?? selected.deviceId
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-0.5 font-mono text-[11px] text-muted",
								children: [selected.deviceId, selected.organizationName ? ` · ${selected.organizationName}` : ""]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center gap-2",
								children: [selected.isOnline == null ? null : selected.isOnline ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
									children: "Online"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "amber",
									children: "Offline"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "muted",
									children: selected.deviceType ?? "Device"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									label: "Operating system",
									value: selected.osName?.trim() || "Not reported by agent"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									label: "IP address",
									value: selected.ipAddress?.trim() || "Not reported by agent",
									mono: true
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
									label: "Days since reboot",
									value: selected.daysSinceReboot != null ? selected.daysSinceReboot : "Not reported",
									hint: selected.lastBootAt ? `Boot ${formatSastDateTime(selected.lastBootAt)}` : "Pulseway uptime / last boot",
									tone: selected.daysSinceReboot != null && selected.daysSinceReboot >= 60 ? "amber" : "default"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
									label: "Outstanding updates",
									value: selected.patchMissing != null ? selected.patchMissing : "Not reported",
									tone: (selected.patchMissing ?? 0) > 0 ? "amber" : "default",
									hint: "Critical + Important + Unspecified from Pulseway"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
									label: "Patch status",
									value: selected.patchMissing != null ? (selected.patchMissing ?? 0) === 0 ? "Up to date" : "Backlog" : "Not reported",
									hint: "Installed totals are not provided by the Pulseway API"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
									label: "Disk used",
									value: selected.diskUsedGb != null ? `${selected.diskUsedGb.toLocaleString("en-ZA")} GB` : selected.diskFreeGb != null && selected.diskTotalGb == null ? "Partial data" : "Not reported",
									hint: selected.diskTotalGb != null ? `of ${selected.diskTotalGb.toLocaleString("en-ZA")} GB total` : "Sum of volume used"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
									label: "Disk free",
									value: selected.diskFreeGb != null ? `${selected.diskFreeGb.toLocaleString("en-ZA")} GB` : "Not reported",
									hint: "Sum of free space on volumes"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									label: "Online %",
									value: selected.onlinePct != null ? `${Math.round(selected.onlinePct)}%` : selected.isOnline == null ? selected.lastSeenOnline ? "From last seen" : "Not reported" : selected.isOnline ? "100% (online now)" : "0% (offline)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									label: "CPU usage",
									value: selected.cpuPct != null ? `${Math.round(selected.cpuPct)}%` : "Not reported by agent",
									bar: selected.cpuPct
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									label: "Memory usage",
									value: selected.memoryPct != null ? `${Math.round(selected.memoryPct)}%` : "Not reported by agent",
									bar: selected.memoryPct
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									label: "Alerts",
									value: `Critical ${selected.criticalNotifications} · Elevated ${selected.elevatedNotifications}`
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatTile, {
									label: "Last seen online",
									value: selected.lastSeenOnline ? formatSastDateTime(selected.lastSeenOnline) : "—",
									className: "sm:col-span-2 lg:col-span-3"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-2 text-[11px] font-bold uppercase tracking-wide text-subtle",
							children: "Disks"
						}), (selected.disks?.length ?? 0) === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted",
							children: "No disk inventory from Pulseway for this device. Collect tries devices, systems, assets, and disk/metric API paths. Media type (SSD / NVMe / SAS / HDD) appears when the agent reports it."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-2",
							children: selected.disks.map((disk) => {
								const media = normalizeMediaType(disk.mediaType);
								const usedLabel = disk.usedGb != null ? `${disk.usedGb.toLocaleString("en-ZA")} GB used` : disk.usedPct != null ? `${disk.usedPct}% used` : null;
								const freeLabel = disk.freeGb != null ? `${disk.freeGb.toLocaleString("en-ZA")} GB free` : null;
								const summary = [
									usedLabel,
									freeLabel,
									disk.totalGb != null ? `${disk.totalGb.toLocaleString("en-ZA")} GB total` : null
								].filter(Boolean).join(" · ");
								const barPct = disk.usedPct != null ? disk.usedPct : disk.totalGb != null && disk.usedGb != null && disk.totalGb > 0 ? disk.usedGb / disk.totalGb * 100 : null;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-lg border border-border px-3 py-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center justify-between gap-2 text-sm",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono font-bold text-fg",
													children: disk.driveLetter || "?"
												}), media ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
													variant: "muted",
													className: "font-mono text-[10px] uppercase tracking-wide",
													children: media
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[10px] text-subtle",
													children: "Media type not reported"
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-right text-muted",
												children: summary || "Size not fully reported by agent"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-2 h-2 overflow-hidden rounded-full bg-muted",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "h-full rounded-full " + ((barPct ?? 0) >= 90 ? "bg-rag-red" : (barPct ?? 0) >= 80 ? "bg-rag-amber" : barPct != null ? "bg-rag-green" : "bg-muted"),
												style: { width: barPct != null ? `${Math.min(100, Math.max(0, barPct))}%` : "0%" }
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-1 text-[11px] text-muted",
											children: [
												"Used",
												" ",
												barPct != null ? `${barPct.toFixed(1)}%` : freeLabel && !usedLabel ? "— (only free space collected)" : "—"
											]
										})
									]
								}, disk.driveLetter);
							})
						})] })
					]
				})
			})]
		})]
	});
}
function normalizeMediaType(raw) {
	if (!raw) return null;
	const s = raw.trim();
	if (!s) return null;
	const u = s.toUpperCase();
	if (u.includes("NVME") || u.includes("NVME")) return "NVMe";
	if (u.includes("SSD") || u.includes("SOLID")) return "SSD";
	if (u.includes("SAS")) return "SAS";
	if (u.includes("SCSI")) return "SCSI";
	if (u.includes("SATA")) return "SATA";
	if (u.includes("HDD") || u.includes("HARD") || u.includes("ROTAT")) return "HDD";
	if (u.length > 24) return s.slice(0, 24);
	return s;
}
function StatTile({ label, value, mono, bar, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-border px-3 py-2 " + (className ?? ""),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[10px] font-bold uppercase tracking-wide text-subtle",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 text-sm font-semibold text-fg " + (mono ? "font-mono" : ""),
				children: value
			}),
			bar != null && Number.isFinite(bar) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 h-1.5 overflow-hidden rounded-full bg-muted",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-full rounded-full " + (bar >= 90 ? "bg-rag-red" : bar >= 75 ? "bg-rag-amber" : "bg-accent"),
					style: { width: `${Math.min(100, Math.max(0, bar))}%` }
				})
			}) : null
		]
	});
}
function RmmAlertsSection({ data }) {
	if (!effectiveCover(data).rmm) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "RMM alerts",
		hint: "No cover — no RMM data for this customer."
	});
	const alerts = data.rmm?.alerts ?? [];
	const devices = data.rmm?.devices ?? [];
	const byDevice = /* @__PURE__ */ new Map();
	for (const a of alerts) {
		const k = a.deviceName || a.deviceId || "Unknown";
		byDevice.set(k, (byDevice.get(k) ?? 0) + 1);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "Server Alerts",
				why: "Pulseway notifications for this customer (latest day). Critical first. Pair with Devices for CPU, disk, and reboot age."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Alert rows",
						value: alerts.length
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Devices with alerts",
						value: byDevice.size
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Devices in estate",
						value: devices.length,
						hint: "Latest RMM snapshot"
					})
				]
			}),
			byDevice.size > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-1.5",
				children: [...byDevice.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, n]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-fg",
					children: [
						name,
						" · ",
						n
					]
				}, name))
			}) : null,
			alerts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "No notifications on latest snapshot."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2",
				children: alerts.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-surface p-3 shadow-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: (a.severity || "").toLowerCase() === "critical" ? "red" : (a.severity || "").toLowerCase() === "elevated" ? "amber" : "muted",
									children: a.severity ?? "Alert"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-semibold text-fg",
									children: a.title ?? "Notification"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-muted",
									children: a.deviceName ?? a.deviceId ?? ""
								})
							]
						}),
						a.message ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted",
							children: a.message
						}) : null,
						a.raisedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[11px] text-muted",
							children: formatSastDateTime(a.raisedAt)
						}) : null
					]
				}, a.notificationId))
			})
		]
	});
}
function RmmMappingSection({ data }) {
	if (!effectiveCover(data).rmm) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "RMM mapping",
		hint: "No cover — no RMM data for this customer."
	});
	const rmm = data.rmm;
	const maps = rmm?.mapping ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "Org mapping",
				why: "Maps external Pulseway organization → this CustomerCode (like SqlInstanceName for SYSPRO). Without a map, devices never land on the right customer."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-surface p-4 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted",
						children: "Dim_Customer.PulsewayOrgName:"
					}),
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono",
						children: rmm?.pulsewayOrgName ?? "—"
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted",
							children: "PillarPulseway:"
						}),
						" ",
						rmm?.pillarOn ? "On" : "Off"
					]
				})]
			}),
			maps.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "No rows in Dim_Pulseway_OrgMap for this customer. Insert OrganizationName → CustomerCode, then collect."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-xl border border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[480px] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Organization"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Org Id"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Active"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Notes"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: maps.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-border/70 last:border-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-medium",
								children: m.organizationName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-mono text-xs text-muted",
								children: m.organizationId ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2",
								children: m.active ? "Yes" : "No"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs text-muted",
								children: m.notes ?? "—"
							})
						]
					}, m.organizationName)) })]
				})
			})
		]
	});
}
function AmsHubSection({ data }) {
	const c = data.customer;
	const base = `/customers/${c.customerCode}/ams`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-sm text-muted",
			children: [
				"Managed service pack for ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
					className: "text-fg",
					children: c.displayName
				}),
				"."
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-2 sm:grid-cols-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
					to: `${base}/incidents`,
					title: "Incidents & problems",
					blurb: "Service desk signals",
					icon: TriangleAlert
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
					to: `${base}/risks`,
					title: "Risks & issues",
					blurb: "Register and owners",
					icon: ListTodo
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DrillCard, {
					to: `${base}/sla`,
					title: "SLA & availability",
					blurb: "Targets and compliance",
					icon: HeartPulse
				})
			]
		})]
	});
}
function OperatorsSection({ data }) {
	if (!effectiveCover(data).syspro) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "SYSPRO operators",
		hint: "No cover — no SYSPRO data for this customer."
	});
	const ops = data.operators ?? [];
	const logins = data.recentLogins ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-2 gap-2 lg:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Operators",
					value: ops.length || data.customer.operatorCount
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Active users",
					value: data.customer.activeUserCount,
					hint: "Login ≤ 30 days"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "With last login",
					value: ops.filter((o) => o.lastLoginDate).length
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Recent login rows",
					value: logins.length
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Operators" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "overflow-x-auto p-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-left text-[12px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "rpma-table-head",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2",
							children: "Code"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2",
							children: "Name"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2",
							children: "Status"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2",
							children: "Last login"
						})
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: ops.slice(0, 80).map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-1.5 font-mono text-[11px]",
							children: o.operatorCode
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-1.5",
							children: o.operatorName ?? "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-1.5",
							children: o.operatorStatus ?? "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-1.5 text-muted",
							children: formatSastDateTime(o.lastLoginDate)
						})
					]
				}, o.operatorCode)) })]
			})
		})] })]
	});
}
function JobsSection({ data }) {
	if (!effectiveCover(data).syspro) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "SYSPRO jobs",
		hint: "No cover — no SYSPRO data for this customer."
	});
	const jobs = data.jobErrors ?? [];
	const byProg = (0, import_react.useMemo)(() => {
		const m = /* @__PURE__ */ new Map();
		for (const j of jobs) {
			const k = j.programName || "Unknown";
			m.set(k, (m.get(k) ?? 0) + 1);
		}
		return [...m.entries()].map(([name, count]) => {
			return {
				name,
				count,
				label: formatProgramLabel(name),
				tick: name
			};
		}).sort((a, b) => b.count - a.count).slice(0, 8);
	}, [jobs]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "Job errors by program",
				why: "Which SYSPRO programs failed most on the latest snapshot. Hover for friendly names."
			}),
			byProg.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "h-52 p-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
						data: byProg,
						margin: {
							top: 4,
							right: 8,
							left: 0,
							bottom: 0
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
								strokeDasharray: "3 3",
								stroke: CHART.grid,
								vertical: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "name",
								tick: {
									fill: CHART.axis,
									fontSize: 10
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								allowDecimals: false,
								width: 28,
								tick: {
									fill: CHART.axis,
									fontSize: 10
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {}),
								formatter: (v, _n, item) => [v, (item?.payload)?.label ?? "Program"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
								isAnimationActive: false,
								dataKey: "count",
								fill: CHART.jobs,
								radius: [
									6,
									6,
									0,
									0
								],
								maxBarSize: 32
							})
						]
					})
				})
			}) }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, { children: [
				"Latest job errors (",
				jobs.length,
				")"
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "space-y-2",
				children: jobs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: "No job errors on the latest snapshot."
				}) : jobs.slice(0, 40).map((j, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md border border-border px-3 py-2 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgramLabel, {
							code: j.programName,
							showDescription: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[12px] text-muted line-clamp-2",
							children: j.message
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-0.5 text-[11px] text-subtle",
							children: [
								j.operator ?? "—",
								" · ",
								formatSastDateTime(j.progRunDate),
								j.progErrorCode != null ? ` · error code ${j.progErrorCode}` : "",
								j.errorStatusCode ? ` · status ${j.errorStatusCode}` : ""
							]
						})
					]
				}, i))
			})] })
		]
	});
}
function DtrSection({ data }) {
	if (!effectiveCover(data).syspro) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "RPM Assure FinSight",
		hint: "No cover — no SYSPRO data for this customer."
	});
	const rows = data.dtrLevel1 ?? [];
	const detailAll = data.dtrDetailLines ?? [];
	const [selectedMod, setSelectedMod] = (0, import_react.useState)(() => rows.find((r) => (r.varianceLineCount || 0) > 0)?.balanceTypeCode ?? rows[0]?.balanceTypeCode ?? null);
	const [selectedL2Key, setSelectedL2Key] = (0, import_react.useState)(null);
	const [cases, setCases] = (0, import_react.useState)(data.finsightReconCases ?? []);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [msg, setMsg] = (0, import_react.useState)(null);
	const chart = (0, import_react.useMemo)(() => rows.map((r) => {
		const label = finsightModuleName(r.balanceTypeCode, r.balanceTypeName);
		return {
			name: label,
			oob: r.varianceLineCount,
			abs: r.absVariance ?? 0,
			label
		};
	}), [rows]);
	const modules = rows.length;
	const modulesOob = rows.filter((r) => (r.varianceLineCount || 0) > 0).length;
	const modulesClean = Math.max(0, modules - modulesOob);
	const oobLines = rows.reduce((s, r) => s + (r.varianceLineCount || 0), 0);
	const absVar = rows.reduce((s, r) => s + Math.abs(Number(r.absVariance ?? r.totalVariance) || 0), 0);
	const integrationOk = modules > 0 && modulesOob === 0;
	const modDetail = (0, import_react.useMemo)(() => detailAll.filter((d) => d.balanceTypeCode === selectedMod), [detailAll, selectedMod]);
	const l1Lines = (0, import_react.useMemo)(() => modDetail.filter((d) => d.informationLevel === 1), [modDetail]);
	const l2Lines = (0, import_react.useMemo)(() => modDetail.filter((d) => d.informationLevel === 2), [modDetail]);
	const l3Lines = (0, import_react.useMemo)(() => {
		const l3 = modDetail.filter((d) => d.informationLevel === 3);
		if (!selectedL2Key) return l3;
		return l3.filter((d) => d.parentLevelKey === selectedL2Key || !d.parentLevelKey && true);
	}, [modDetail, selectedL2Key]);
	const hasL23 = detailAll.some((d) => d.informationLevel === 2 || d.informationLevel === 3);
	async function runAutoOpen() {
		setBusy(true);
		setMsg(null);
		try {
			const res = await autoOpenFinSightReconCases({ data: { customerCode: data.customer.customerCode } });
			if (res.cases?.length) setCases(res.cases);
			setMsg(res.message ?? (res.ok ? "Done" : "Failed"));
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	async function advanceCase(c, status) {
		setBusy(true);
		setMsg(null);
		try {
			const res = await updateFinSightReconCase({ data: {
				reconCaseId: c.reconCaseId,
				status,
				actorName: "Staff",
				stepNote: `Status to ${status}`
			} });
			if (res.case) {
				const updated = res.case;
				setCases((prev) => prev.map((x) => x.reconCaseId === updated.reconCaseId ? updated : x));
			}
			setMsg(`Case ${c.balanceTypeCode} → ${status}`);
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	function LevelTable({ title, lines, onRowClick, activeKey }) {
		if (lines.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			className: "border-dashed",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "p-3 text-[12px] text-muted",
				children: [title, ": no rows on latest snapshot. Run collect for L2/L3 (217c) if this stays empty."]
			})
		});
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, { children: [
			title,
			" · ",
			lines.length,
			" row(s)"
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "overflow-x-auto p-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full min-w-[640px] text-left text-[12px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "border-b border-border bg-surface-2/50 text-[10px] uppercase tracking-wide text-subtle",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2",
							children: "Key / GL"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2",
							children: "Description"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 text-right",
							children: "Sub close"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 text-right",
							children: "GL close"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 text-right",
							children: "Variance"
						})
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: lines.map((line, i) => {
					const key = line.levelKey || line.glCode || String(i);
					const v = Number(line.variance) || 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-border/80 " + (onRowClick ? "cursor-pointer hover:bg-surface-2/60 " : "") + (activeKey && key === activeKey ? "bg-primary/10 " : "") + (Math.abs(v) > .005 ? "" : "opacity-80"),
						onClick: () => onRowClick?.(line),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
								className: "px-3 py-2 font-mono text-[11px]",
								children: [line.glCode || "—", line.dimension1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-muted",
									children: line.dimension1
								}) : null]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2",
								children: line.description || line.levelKey || "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-right tabular-nums",
								children: formatZar(line.subCloseBalance)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-right tabular-nums",
								children: formatZar(line.glCloseBalance)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-right tabular-nums font-semibold " + (Math.abs(v) > .005 ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"),
								children: formatZar(line.variance)
							})
						]
					}, `${key}-${i}`);
				}) })]
			})
		})] });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "Control account recons · L1 → L2 → L3 · workflow",
				why: "L3 detail rolls into L2 mid-level into L1 control totals. Variance = sub-ledger vs GL. Open recon cases to track clear-down."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-primary/20 bg-primary/5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-2 p-4 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold text-fg",
							children: "FinSight control stack"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "list-inside list-disc space-y-1 text-[13px] text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "L1"
								}), " — control account total (recon status)"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "L2"
								}), " — mid rollup (warehouse, branch, bank, group)"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "L3"
								}), " — detail lines driving the variance"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "Workflow"
								}), " — auto-open cases for Out of Balance L1 controls; track to Cleared / Accepted"] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[12px] text-subtle",
							children: [
								FINSIGHT_CONTROL_WHAT,
								" ",
								FINSIGHT_INTEGRATION_WHAT
							]
						}),
						!hasL23 && modules > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-200",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-semibold",
									children: "L2 / L3 detail not on central yet"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 text-[11px] leading-relaxed opacity-95",
									children: [
										"L1 control totals are present, but mid-level (L2) and detail (L3) rows have not been collected for this customer. On the ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "customer SYSPRO SQL host" }),
										" run the DTR all-levels collect (e.g.",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
											className: "rounded bg-black/10 px-1",
											children: "217c_Collect_*_DtrAllLevels.sql"
										}),
										"), then hard-refresh this page."
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 text-[11px] opacity-90",
									children: [
										"AHIC:",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
											className: "rounded bg-black/10 px-1",
											children: "C:\\RPM-Assure\\Sql\\collect\\217c_Collect_AHIC_DtrAllLevels.sql"
										}),
										" ",
										"· UVSS/RSR/RSS: use that customer's 217c / DTR collect under",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
											className: "rounded bg-black/10 px-1",
											children: "Sql/customers/<CODE>"
										}),
										"."
									]
								})
							]
						}) : null
					]
				})
			}),
			modules > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 lg:grid-cols-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Controls (L1)",
						value: modules
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "In balance",
						value: modulesClean,
						tone: "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Out of balance",
						value: modulesOob,
						tone: modulesOob > 0 ? "red" : "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Out of Balance lines",
						value: oobLines,
						tone: oobLines > 0 ? "amber" : "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "|Variance|",
						value: formatZar(absVar),
						tone: absVar > 0 ? "amber" : "green"
					})
				]
			}) : null,
			modules > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Sub-ledger → GL integration (L1)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "p-4 text-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: integrationOk ? "font-semibold text-emerald-700 dark:text-emerald-400" : "font-semibold text-amber-800 dark:text-amber-300",
					children: integrationOk ? "Holding — all collected L1 control accounts reconcile." : `${modulesOob} L1 control(s) out of balance — drill L2/L3 and open recon cases.`
				})
			})] }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Automated recon workflow" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-3 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[13px] text-muted",
						children: "Opens one active case per L1 control with out-of-balance lines. Advance status as AMS and finance clear the recon: Open → Investigating → Waiting finance → Cleared / Accepted."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: busy || modulesOob === 0,
							onClick: () => void runAutoOpen(),
							className: "rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-fg disabled:opacity-50",
							children: busy ? "Working…" : "Auto-open cases from L1 Out of Balance"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[12px] text-subtle",
							children: [cases.length, " active case(s)"]
						})]
					}),
					msg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[12px] text-muted",
						children: msg
					}) : null,
					cases.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[12px] text-muted",
						children: "No open recon cases. Run auto-open when L1 Out of Balance is greater than zero."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-2",
						children: cases.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-2 rounded-lg border border-border bg-surface-2/40 p-3 sm:flex-row sm:items-center sm:justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm font-semibold text-fg",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "text-left hover:underline",
												onClick: () => {
													setSelectedMod(c.balanceTypeCode);
													setSelectedL2Key(null);
												},
												children: finsightModuleName(c.balanceTypeCode)
											}),
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-normal text-muted",
												children: ["· ", c.status]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate text-[12px] text-muted",
										children: c.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-[11px] text-subtle",
										children: [
											"Out of Balance ",
											c.oobLines,
											" · |Var| ",
											formatZar(c.absVariance),
											" · Owner ",
											c.ownerName || "—"
										]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-1",
								children: [
									["Investigating", "Investigate"],
									["WaitingFinance", "Wait finance"],
									["Cleared", "Cleared"],
									["Accepted", "Accept"],
									["Closed", "Close"]
								].map(([st, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy || c.status === st,
									onClick: () => void advanceCase(c, st),
									className: "rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-surface disabled:opacity-40",
									children: label
								}, st))
							})]
						}, c.reconCaseId))
					})
				]
			})] }),
			chart.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Out-of-balance lines by L1 control" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "h-56 p-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
						data: chart,
						margin: {
							top: 4,
							right: 8,
							left: 0,
							bottom: 0
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
								strokeDasharray: "3 3",
								stroke: CHART.grid,
								vertical: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "name",
								tick: {
									fill: CHART.axis,
									fontSize: 10
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								allowDecimals: false,
								width: 28,
								tick: {
									fill: CHART.axis,
									fontSize: 10
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartTooltip, {}),
								formatter: (v, name) => [name === "oob" ? `${v} lines` : formatZar(v), name === "oob" ? "Out of Balance" : "|Variance|"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
								isAnimationActive: false,
								dataKey: "oob",
								name: "Out of Balance",
								fill: CHART.dtr,
								radius: [
									6,
									6,
									0,
									0
								],
								maxBarSize: 28
							})
						]
					})
				})
			})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-dashed",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-2 p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-semibold text-fg",
						children: "No FinSight recon data yet"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Control account recons appear when balance extracts exist and collect has written rows to central."
					})]
				})
			}),
			rows.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "L1 control account recon matrix — select to drill" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "overflow-x-auto p-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[640px] text-left text-[12px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "border-b border-border bg-surface-2/50 text-[10px] uppercase tracking-wide text-subtle",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-semibold",
								children: "Control"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-semibold",
								children: "Module"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-semibold",
								children: "What we recon"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-semibold text-right",
								children: "Close (L1)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-semibold text-right",
								children: "|Variance|"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-semibold text-right",
								children: "Out of Balance"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2 font-semibold",
								children: "Status"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((r) => {
						const oob = r.varianceLineCount || 0;
						const ok = oob === 0;
						const sel = selectedMod === r.balanceTypeCode;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "cursor-pointer border-b border-border/80 hover:bg-surface-2/50 " + (sel ? "bg-primary/10" : ""),
							onClick: () => {
								setSelectedMod(r.balanceTypeCode);
								setSelectedL2Key(null);
							},
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono font-semibold text-fg",
									children: r.balanceTypeCode
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-fg",
									children: finsightModuleName(r.balanceTypeCode, r.balanceTypeName)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "max-w-[14rem] px-3 py-2 text-muted",
									children: finsightControlHint(r.balanceTypeCode)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-right tabular-nums",
									children: formatZar(r.totalCloseBalance ?? r.closeBalance)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-right tabular-nums",
									children: formatZar(r.absVariance)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-right tabular-nums font-semibold " + (ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"),
									children: oob
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " + (ok ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" : "bg-red-500/15 text-red-800 dark:text-red-300"),
										children: ok ? "In balance" : "Out of balance"
									})
								})
							]
						}, r.balanceTypeCode);
					}) })]
				})
			})] }) : null,
			selectedMod ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm font-semibold text-fg",
						children: [
							"Drill-down · ",
							selectedMod,
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-normal text-muted",
								children: [
									"— ",
									finsightControlHint(selectedMod),
									" · click L2 row to filter L3"
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelTable, {
						title: `L1 · ${selectedMod}`,
						lines: l1Lines.length ? l1Lines : []
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelTable, {
						title: `L2 · ${selectedMod}`,
						lines: l2Lines,
						activeKey: selectedL2Key,
						onRowClick: (line) => setSelectedL2Key(line.levelKey || line.glCode || null)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelTable, {
						title: selectedL2Key ? `L3 · ${selectedMod} (under ${selectedL2Key})` : `L3 · ${selectedMod} (all detail)`,
						lines: l3Lines
					}),
					selectedL2Key ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "text-[12px] font-medium text-primary hover:underline",
						onClick: () => setSelectedL2Key(null),
						children: "Clear L2 filter — show all L3"
					}) : null
				]
			}) : null
		]
	});
}
function HealthSection({ data }) {
	if (!effectiveCover(data).syspro) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "SYSPRO health log",
		hint: "No cover — no SYSPRO data for this customer."
	});
	const { customer, healthLogs, operationalAssurance, diagSummaries, sqlHealthRows } = data;
	const score = operationalAssurance?.scorePct ?? 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Health",
						value: customer.healthRag,
						tone: customer.healthRag === "Red" ? "red" : customer.healthRag === "Amber" ? "amber" : "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Assurance",
						value: `${score}%`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Job errors",
						value: customer.sysproJobErrorCount
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "FinSight Out of Balance",
						value: customer.sysproDtrVarianceLines
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: customer.healthSummary
			}),
			operationalAssurance?.summary ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[12px] text-subtle",
				children: operationalAssurance.summary
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Health log" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "space-y-2",
				children: (healthLogs ?? []).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: "No detailed health-log lines yet — operational assurance above still applies."
				}) : healthLogs.slice(0, 20).map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border py-2 text-sm first:border-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium",
							children: h.healthFunction ?? "Check"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[12px] text-muted",
							children: h.message ?? h.description
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[11px] text-subtle",
							children: [
								formatSastDateTime(h.runDateTime),
								" · ",
								h.statusFlag ?? ""
							]
						})
					]
				}, i))
			})] }),
			(diagSummaries?.length ?? 0) > 0 || (sqlHealthRows?.length ?? 0) > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Diagnostics" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "space-y-1 text-[12px]",
					children: (diagSummaries ?? []).slice(0, 12).map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-t border-border py-1 first:border-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium",
							children: d.diagName ?? d.diagCode
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted",
							children: [" · ", d.statusText ?? d.severity]
						})]
					}, i))
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "SQL health" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "space-y-1 text-[12px]",
					children: (sqlHealthRows ?? []).slice(0, 12).map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-t border-border py-1 first:border-0",
						children: [
							s.companyDb,
							" · ",
							s.healthKey ?? s.description,
							" · ",
							s.statusText
						]
					}, i))
				})] })]
			}) : null
		]
	});
}
function SecuritySection({ data }) {
	if (!effectiveCover(data).syspro) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "SYSPRO security",
		hint: "No cover — no SYSPRO data for this customer."
	});
	const { securitySummary, operGroups, operAmends, auditEvents } = data;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-2 gap-2 lg:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Group links",
					value: securitySummary.groupMemberships
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Operators in groups",
					value: securitySummary.distinctOperatorsInGroups
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Distinct groups",
					value: securitySummary.distinctGroups
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Amends (90d)",
					value: securitySummary.amendCount90d
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-3 lg:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Operator groups" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "max-h-64 overflow-auto text-[12px]",
				children: (operGroups ?? []).slice(0, 40).map((g, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border py-1 first:border-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono",
						children: g.operatorCode
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted",
						children: [
							" ",
							"→ ",
							g.groupName ?? g.groupCode
						]
					})]
				}, i))
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Recent amends / audit" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "max-h-64 overflow-auto text-[12px]",
				children: [(operAmends ?? []).slice(0, 15).map((a, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border py-1 first:border-0",
					children: [
						a.operatorCode,
						" · ",
						a.amendType ?? "Amend",
						" · ",
						formatSastDateTime(a.amendDate)
					]
				}, `a${i}`)), (auditEvents ?? []).slice(0, 10).map((e, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border py-1.5 first:border-0",
					children: [e.programName ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgramLabel, {
						code: e.programName,
						size: "sm"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted",
						children: e.actionCode ?? "Audit"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-0.5 text-[11px] text-subtle",
						children: [
							e.operatorCode ?? "—",
							" · ",
							formatSastDateTime(e.eventAt),
							e.detail ? ` · ${e.detail.slice(0, 80)}` : ""
						]
					})]
				}, `e${i}`))]
			})] })]
		})]
	});
}
function LicenseSection({ data }) {
	if (!effectiveCover(data).syspro) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "SYSPRO license",
		hint: "No cover — no SYSPRO data for this customer."
	});
	const { license, sysproVersion } = data;
	const code = data.customer.customerCode;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "License & version",
				why: "Product, license type, user seats, companies, and expiry from SYSPRO. Hotfix lists live under Hotfix Information."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 lg:grid-cols-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Product",
						value: license?.productName ?? sysproVersion?.productName ?? "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Version",
						value: license?.productVersion ?? sysproVersion?.productVersion ?? "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Build",
						value: sysproVersion?.buildNumber ?? "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Users",
						value: license?.users ?? sysproVersion?.users ?? "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Companies",
						value: sysproVersion?.companyCount ?? "—"
					})
				]
			}),
			sysproVersion || license ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "License detail" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: "Product "
					}), sysproVersion?.productName ?? license?.productName ?? "—"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: "Version "
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold",
						children: sysproVersion?.productVersion ?? license?.productVersion ?? "—"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: "Build / DB "
					}), sysproVersion?.buildNumber ?? "—"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: "License type "
					}), sysproVersion?.licenseType ?? license?.licenseType ?? "—"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: "Users "
					}), sysproVersion?.users ?? license?.users ?? "—"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: "Companies "
					}), sysproVersion?.companyCount ?? "—"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: "Server "
					}), sysproVersion?.serverName ?? data.customer.sqlInstanceName ?? "—"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: "Customer name "
					}), sysproVersion?.customerName ?? license?.customerName ?? "—"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: "Expiry "
					}), license?.licenseExpiry || sysproVersion?.licenseExpiry ? formatSastDate(license?.licenseExpiry ?? sysproVersion?.licenseExpiry) : "—"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: "Last import "
					}), sysproVersion?.importDate ? formatSastDateTime(sysproVersion.importDate) : license?.importDate ? formatSastDateTime(license.importDate) : "—"] })
				]
			})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "No license/version row yet — run SystemLicense / version collect on the customer server."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"Installed hotfixes and gap analysis:",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpaLink, {
						href: `/customers/${encodeURIComponent(code)}/syspro/hotfixes`,
						className: "font-medium text-accent hover:underline",
						children: "Hotfix Information"
					})
				]
			})
		]
	});
}
function HotfixSection({ data }) {
	if (!effectiveCover(data).syspro) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "SYSPRO hotfixes",
		hint: "No cover — no SYSPRO data for this customer."
	});
	const { sysproHotfixes, hotfixGap, hotfixGapSummary, sysproVersion, customer } = data;
	const hfCount = (sysproHotfixes ?? []).length;
	const missingMandatory = hotfixGapSummary?.missingMandatory ?? 0;
	const missingCount = hotfixGapSummary?.missingCount ?? 0;
	const baselineCount = hotfixGapSummary?.baselineCount ?? 0;
	const installedMatch = hotfixGapSummary?.installedMatchCount ?? 0;
	const gapRows = hotfixGap ?? [];
	const missingRows = gapRows.filter((h) => h.isMissing);
	const installedGapRows = gapRows.filter((h) => !h.isMissing);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "Hotfix information",
				why: "Installed KBs from SYSPRO Deployment CustomerHotfixes. Gap compares the real catalogue baseline (KB codes, Sample titles excluded) to what is installed on this customer server."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 lg:grid-cols-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Installed HFs",
						value: hfCount,
						tone: hfCount > 0 ? "green" : "amber",
						hint: "CustomerHotfixes"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Baseline (real)",
						value: baselineCount || "—",
						hint: "KB codes, no samples"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Matched",
						value: installedMatch || "—",
						tone: "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Missing total",
						value: missingCount || (baselineCount ? 0 : "—"),
						tone: missingCount > 0 ? "amber" : "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Missing mandatory",
						value: missingMandatory || (baselineCount ? 0 : "—"),
						tone: missingMandatory > 0 ? "red" : "green",
						hint: sysproVersion?.productVersion ? `SYSPRO ${sysproVersion.productVersion}` : customer.displayName
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, { children: ["Installed hotfixes", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					variant: "muted",
					className: "ml-2",
					children: hfCount
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "max-h-[28rem] overflow-auto p-0",
					children: hfCount === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "p-3 text-muted",
						children: "No installed hotfix rows yet. Run 241 Deployment catalogue (or 227) on the customer server."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left text-[12px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "rpma-table-head sticky top-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2",
									children: "KB / code"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2",
									children: "Description"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2",
									children: "Installed"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: sysproHotfixes.map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-border",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-1.5 font-semibold whitespace-nowrap",
									children: h.hotfixCode
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-1.5 text-muted",
									children: h.hotfixName ?? h.description ?? "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-1.5 text-subtle whitespace-nowrap",
									children: h.installedAt ? formatSastDateTime(h.installedAt) : "—"
								})
							]
						}, i)) })]
					})
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, { children: ["Hotfix gap", hotfixGapSummary ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
					variant: missingMandatory > 0 ? "amber" : "muted",
					className: "ml-2",
					children: [
						missingCount,
						" missing",
						missingMandatory > 0 ? ` · ${missingMandatory} mandatory` : ""
					]
				}) : null] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "max-h-[28rem] space-y-1 overflow-auto text-[12px]",
					children: gapRows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted",
						children: "No gap rows. Run central 371 + customer 241 catalogue collect, then refresh."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						missingRows.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[11px] font-semibold uppercase tracking-wide text-subtle",
							children: [
								"Not installed (",
								missingRows.length,
								")"
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-muted",
							children: "All listed baseline hotfixes appear installed."
						}),
						missingRows.map((h, i) => {
							const mand = (h.severity ?? "").toLowerCase().includes("mandat");
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "border-t border-border py-1.5 first:border-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold",
											children: h.hotfixCode
										}),
										mand ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: "amber",
											children: "Mandatory"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: "muted",
											children: "Optional"
										}),
										h.releaseLabel ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-subtle",
											children: ["rel ", h.releaseLabel]
										}) : null
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-muted",
									children: h.title ?? "—"
								})]
							}, `m-${i}`);
						}),
						installedGapRows.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-[11px] font-semibold uppercase tracking-wide text-subtle",
							children: "Installed matches (preview)"
						}), installedGapRows.slice(0, 30).map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-t border-border py-1 text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium text-fg",
									children: h.hotfixCode
								}),
								" · ",
								h.title ?? "—",
								h.installedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-subtle",
									children: [
										" ",
										"· ",
										formatSastDateTime(h.installedAt)
									]
								}) : null
							]
						}, `i-${i}`))] }) : null
					] })
				})] })]
			})
		]
	});
}
function SqlSection({ data }) {
	if (!effectiveCover(data).syspro) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "SQL backups (SYSPRO host)",
		hint: "No cover — no SYSPRO data for this customer."
	});
	const { sqlBackups, sqlBackupFailures, sqlHealthRows } = data;
	const failCount = (sqlBackupFailures ?? []).length;
	const stale = (sqlBackups ?? []).filter((b) => b.fullAgeHours != null && b.fullAgeHours > 36).length;
	const failedStatus = (sqlBackups ?? []).filter((b) => /fail|error|cancel/i.test(String(b.lastBackupStatus ?? ""))).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "SQL backup status",
				why: "Last full / differential / log backup times per database (SAST). Failures and overdue fulls need ops attention."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Databases",
						value: (sqlBackups ?? []).length || "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Full > 36h",
						value: stale,
						tone: stale > 0 ? "amber" : "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Failed status",
						value: failedStatus,
						tone: failedStatus > 0 ? "red" : "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Job failures",
						value: failCount,
						tone: failCount > 0 ? "red" : "green",
						hint: "msdb history"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Backup status by database" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "overflow-x-auto p-0",
				children: (sqlBackups ?? []).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "p-3 text-sm text-muted",
					children: "No backup rows yet. Run SQL backups collect (224) on the customer server. If job failures are empty, grant Rpm_collect SELECT on msdb backup tables."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-left text-[12px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "rpma-table-head",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Database"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Last full"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Last diff"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Last log"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Status"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Full age (h)"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: (sqlBackups ?? []).map((b, i) => {
						const bad = /fail|error|cancel/i.test(String(b.lastBackupStatus ?? ""));
						const old = b.fullAgeHours != null && b.fullAgeHours > 36;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-border",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-1.5 font-medium",
									children: b.databaseName
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-1.5 text-muted whitespace-nowrap",
									children: formatSastDateTime(b.lastFullBackup)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-1.5 text-muted whitespace-nowrap",
									children: formatSastDateTime(b.lastDiffBackup)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-1.5 text-muted whitespace-nowrap",
									children: formatSastDateTime(b.lastLogBackup)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-1.5",
									children: bad ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "red",
										children: b.lastBackupStatus
									}) : b.lastBackupStatus ?? "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: old ? "px-3 py-1.5 font-mono text-amber-600 dark:text-amber-400" : "px-3 py-1.5 font-mono",
									children: b.fullAgeHours ?? "—"
								})
							]
						}, i);
					}) })]
				})
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, { children: ["Backup failures", failCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
				variant: "red",
				className: "ml-2",
				children: failCount
			}) : null] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "space-y-1 text-[12px]",
				children: failCount === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: "No backup job failures on the latest snapshot. (Requires msdb read for sysjobhistory — run grant script if collect skipped job history.)"
				}) : sqlBackupFailures.slice(0, 40).map((f, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md border border-red-500/25 bg-red-500/5 px-2 py-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-baseline gap-x-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium text-fg",
								children: f.jobName ?? "Job"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-[11px] text-subtle",
								children: formatSastDateTime(f.failureAt)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-muted",
							children: [f.databaseName ?? "—", f.stepName ? ` · step ${f.stepName}` : ""]
						}),
						f.message ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-0.5 line-clamp-3 text-[11px] text-subtle",
							children: f.message
						}) : null
					]
				}, i))
			})] }),
			(sqlHealthRows?.length ?? 0) > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "SQL health checks" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "text-[12px]",
				children: sqlHealthRows.slice(0, 20).map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border py-1 first:border-0",
					children: [
						s.companyDb,
						" · ",
						s.description ?? s.healthKey,
						" · ",
						s.statusText
					]
				}, i))
			})] }) : null
		]
	});
}
function IncidentsSection({ data }) {
	const [incidents, setIncidents] = (0, import_react.useState)(data.incidents ?? []);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [msg, setMsg] = (0, import_react.useState)(null);
	const [title, setTitle] = (0, import_react.useState)("");
	const [severity, setSeverity] = (0, import_react.useState)("Medium");
	const [isMajor, setIsMajor] = (0, import_react.useState)(false);
	const summary = data.amsSlaSummary;
	const open = incidents.filter((i) => !/closed|cancelled/i.test(i.status));
	const recentClosed = incidents.filter((i) => /closed|resolved/i.test(i.status));
	async function createIncident() {
		if (title.trim().length < 3) {
			setMsg("Title needs at least 3 characters");
			return;
		}
		setBusy(true);
		setMsg(null);
		try {
			const res = await upsertAmsIncident({ data: {
				customerCode: data.customer.customerCode,
				title: title.trim(),
				severity,
				status: "New",
				isMajor,
				sourceSystem: "AMS",
				ownerName: "AMS Ops"
			} });
			if (!res.ok || !res.incident) setMsg(res.error || "Create failed — deploy 313 SQL and ensure Fact_Incident exists");
			else {
				setIncidents((prev) => [res.incident, ...prev]);
				setTitle("");
				setIsMajor(false);
				setMsg("Incident opened — SLA clock started");
			}
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	async function act(inc, action) {
		if (!inc.incidentId) {
			setMsg("This incident has no id (demo/legacy row) — cannot transition");
			return;
		}
		setBusy(true);
		setMsg(null);
		try {
			const res = await transitionAmsIncident({ data: {
				incidentId: inc.incidentId,
				action,
				actorName: "Staff"
			} });
			if (!res.ok || !res.incident) setMsg(res.error || "Transition failed");
			else {
				setIncidents((prev) => prev.map((x) => x.incidentId === res.incident.incidentId ? res.incident : x));
				setMsg(`Incident ${action} recorded — SLA flags updated`);
			}
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	function slaBadge(met, label) {
		if (met === true) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300",
			children: [label, " met"]
		});
		if (met === false) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-800 dark:text-red-300",
			children: [label, " breach"]
		});
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted",
			children: [label, " open"]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "AMS incidents — live feed + SLA clocks",
				why: "Open and recent incidents from Fact_Incident. Response/resolve times checked against Dim_SlaPolicy. Log first response and resolve to score SLA."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Open",
						value: open.length,
						tone: open.length > 0 ? "amber" : "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Major open",
						value: summary?.majorOpenCount ?? open.filter((i) => i.isMajor).length,
						tone: (summary?.majorOpenCount ?? 0) > 0 ? "red" : "default"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Response breach (30d)",
						value: summary?.responseBreach ?? incidents.filter((i) => i.responseSlaMet === false).length,
						tone: (summary?.responseBreach ?? 0) > 0 ? "red" : "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Resolve breach (30d)",
						value: summary?.resolveBreach ?? incidents.filter((i) => i.resolveSlaMet === false).length,
						tone: (summary?.resolveBreach ?? 0) > 0 ? "red" : "green"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Log incident (starts SLA clock)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-2 p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-2 sm:flex-row",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: "min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm",
							placeholder: "Incident title",
							value: title,
							onChange: (e) => setTitle(e.target.value)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: "rounded-lg border border-border bg-surface px-2 py-2 text-sm",
							value: severity,
							onChange: (e) => setSeverity(e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "Critical",
									children: "Critical"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "High",
									children: "High"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "Medium",
									children: "Medium"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "Low",
									children: "Low"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-1.5 text-[12px] text-muted",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: isMajor,
								onChange: (e) => setIsMajor(e.target.checked)
							}), "Major"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: busy,
							onClick: () => void createIncident(),
							className: "rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-fg disabled:opacity-50",
							children: "Open"
						})
					]
				}), msg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[12px] text-muted",
					children: msg
				}) : null]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Open / active incidents" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "space-y-2 p-3",
					children: open.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[12px] text-muted",
						children: "No open incidents on the live feed."
					}) : open.map((inc, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-lg border border-border px-3 py-2 text-sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-start justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-medium text-fg",
										children: inc.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-[11px] text-muted",
										children: [
											inc.severity,
											inc.priority && inc.priority !== inc.severity ? ` · P ${inc.priority}` : "",
											" ·",
											" ",
											inc.status,
											inc.isMajor ? " · Major" : "",
											inc.ownerName ? ` · ${inc.ownerName}` : "",
											inc.sourceSystem ? ` · ${inc.sourceSystem}` : ""
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-0.5 text-[11px] text-subtle",
										children: [
											"Opened ",
											formatSastDateTime(inc.openedAt),
											inc.responseMinsElapsed != null ? ` · resp ${inc.responseMinsElapsed}m / ${inc.respondMins ?? "—"}m` : "",
											inc.resolveMinsElapsed != null ? ` · res ${inc.resolveMinsElapsed}m / ${inc.resolveMins ?? "—"}m` : ""
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-1 flex flex-wrap gap-1",
										children: [slaBadge(inc.responseSlaMet, "Response"), slaBadge(inc.resolveSlaMet, "Resolve")]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap gap-1",
								children: [
									!inc.firstResponseAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: busy,
										className: "rounded border border-border px-2 py-1 text-[11px] font-semibold hover:bg-surface-2",
										onClick: () => void act(inc, "respond"),
										children: "Log response"
									}) : null,
									!/resolved|closed/i.test(inc.status) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: busy,
										className: "rounded border border-border px-2 py-1 text-[11px] font-semibold hover:bg-surface-2",
										onClick: () => void act(inc, "resolve"),
										children: "Resolve"
									}) : null,
									!/closed/i.test(inc.status) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: busy,
										className: "rounded border border-border px-2 py-1 text-[11px] font-semibold hover:bg-surface-2",
										onClick: () => void act(inc, "close"),
										children: "Close"
									}) : null
								]
							})]
						})
					}, inc.incidentId ?? i))
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Problems" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-2 p-3",
					children: [(data.problems ?? []).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[12px] text-muted",
						children: "No open problems on Fact_Problem."
					}) : (data.problems ?? []).map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md border border-border px-3 py-2 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium",
							children: p.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[11px] text-muted",
							children: [
								p.severity,
								" · ",
								p.status,
								" · ",
								p.ownerName ?? ""
							]
						})]
					}, i)), recentClosed.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-t border-border pt-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-1 text-[10px] font-bold uppercase tracking-wide text-subtle",
							children: "Recent resolved / closed (SLA history)"
						}), recentClosed.slice(0, 8).map((inc, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-t border-border/60 py-1.5 text-[12px] first:border-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium text-fg",
								children: inc.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-0.5 flex flex-wrap gap-1",
								children: [slaBadge(inc.responseSlaMet, "Response"), slaBadge(inc.resolveSlaMet, "Resolve")]
							})]
						}, inc.incidentId ?? `c${i}`))]
					}) : null]
				})] })]
			})
		]
	});
}
function RisksSection({ data }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3 lg:grid-cols-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Risks" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "space-y-2",
			children: (data.risks ?? []).map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-md border border-border px-3 py-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RagBadge, { rag: r.rag || "Amber" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: r.title
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[11px] text-muted",
					children: [
						r.status,
						" · ",
						r.ownerName ?? "—",
						" · target ",
						formatSastDate(r.targetDate)
					]
				})]
			}, i))
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Issues & priorities" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-2",
			children: [(data.issues ?? []).map((iss, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-medium",
					children: iss.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] text-muted",
					children: iss.status
				})]
			}, `i${i}`)), (data.priorities ?? []).map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-md border border-border px-2 py-1.5 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-medium",
					children: p.title
				}), p.detail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] text-muted",
					children: p.detail
				}) : null]
			}, `p${i}`))]
		})] })]
	});
}
function SlaSection({ data }) {
	{
		const c = effectiveCover(data);
		if (!c.syspro && !c.rmm && !c.cove && !c.epp) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
			service: "SLA & availability",
			hint: "No cover — no managed services with data for this customer. SLA is not scored until at least one pillar has cover."
		});
	}
	const { slaPolicies, availabilitySla, operationalAssurance } = data;
	const a = availabilitySla;
	const source = a?.source ?? "stub";
	const isMeasured = source === "snapshot" || source === "sla-period" || source === "live-incident";
	const isDerived = source === "derived";
	const isLiveIncident = source === "live-incident";
	const isSlaPeriod = source === "sla-period";
	const fmt = (n, suffix = "%") => n != null && !Number.isNaN(n) ? `${n}${suffix}` : "—";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "Availability & SLA",
				why: isLiveIncident ? "Response/resolve % from Fact_Incident clocks vs Dim_SlaPolicy (rolling 30 days)." : isSlaPeriod ? "Measured from Fact_SlaPeriod (desk or period feed)." : source === "snapshot" ? "Measured from Fact_DashboardSnapshot." : isDerived ? "Estimated from collect health — RMM leg uses servers only (workstations excluded from SLA). Not a ticket stopwatch." : "No SLA feed yet. Policy table shows targets only."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("rounded-xl border px-3 py-2 text-[12px] leading-relaxed", isMeasured ? "border-rag-green/30 bg-rag-green/10 text-fg" : isDerived ? "border-rag-amber/35 bg-rag-amber/10 text-fg" : "border-border bg-surface-2 text-muted"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold",
						children: isLiveIncident ? "Live incident SLA (30d clocks)" : isSlaPeriod ? "Period SLA measurement feed" : source === "snapshot" ? "Measured SLA snapshot" : isDerived ? "Derived estimate (not ticket SLA)" : "Targets only"
					}),
					a?.note ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted",
						children: [" — ", a.note]
					}) : null,
					!a?.note && isDerived ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted",
						children: [
							" ",
							"— Assurance score ",
							operationalAssurance?.scorePct ?? "—",
							"% used as the basis for estimates."
						]
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: isMeasured ? "Availability" : "Est. availability",
						value: fmt(a?.availabilityPct),
						tone: isMeasured ? "green" : "default",
						hint: isMeasured ? "From SLA snapshot" : "Not a formal measurement"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Agreed target",
						value: fmt(a?.availabilitySlaPct ?? 99.5),
						hint: "Contract / AMS target"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: isMeasured ? "Response met" : "Est. response",
						value: fmt(a?.slaResponsePct),
						hint: isMeasured ? "% within respond SLA" : "Derived — no stopwatch"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: isMeasured ? "Compliance" : "Est. compliance",
						value: fmt(a?.slaCompliancePct),
						tone: a?.slaCompliancePct != null && a.slaCompliancePct < 95 ? "amber" : isMeasured ? "green" : "default",
						hint: isMeasured ? "Overall SLA compliance" : "Based on health signals"
					})
				]
			}),
			data.amsSlaSummary || a?.incidentCount30d != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Incidents (30d)",
						value: data.amsSlaSummary?.incidentCount30d ?? a?.incidentCount30d ?? "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Response met %",
						value: data.amsSlaSummary?.responsePct != null ? `${data.amsSlaSummary.responsePct}%` : a?.slaResponsePct != null ? `${a.slaResponsePct}%` : "—",
						tone: (data.amsSlaSummary?.responsePct ?? a?.slaResponsePct ?? 100) < 90 ? "amber" : "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Resolve met %",
						value: data.amsSlaSummary?.resolvePct != null ? `${data.amsSlaSummary.resolvePct}%` : a?.slaResolvePct != null ? `${a.slaResolvePct}%` : "—",
						tone: (data.amsSlaSummary?.resolvePct ?? a?.slaResolvePct ?? 100) < 90 ? "amber" : "green"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Open now",
						value: data.amsSlaSummary?.openCount ?? "—",
						tone: (data.amsSlaSummary?.openCount ?? 0) > 0 ? "amber" : "green"
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, { children: ["SLA policies — response / resolve targets", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "ml-2 text-[11px] font-normal text-muted",
				children: "(agreed times, not live ticket clocks)"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "overflow-x-auto",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-left text-[12px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "rpma-table-head",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1.5",
								children: "Priority"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1.5",
								children: "Respond (min)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1.5",
								children: "Resolve (min)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1.5",
								children: "Availability target"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: slaPolicies.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-1.5 font-medium",
								children: s.priority
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-1.5 font-mono",
								children: s.respondMins ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-1.5 font-mono",
								children: s.resolveMins ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-1.5 font-mono",
								children: s.availabilityPct != null ? `${s.availabilityPct}%` : "—"
							})
						]
					}, i)) })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-[11px] text-subtle",
					children: "Critical = respond in 60 min / resolve in 4 hours (defaults). Override via AMS SLA policy tables when your service desk feed is connected."
				})]
			})] })
		]
	});
}
function ChangeSection({ data }) {
	const success = data.changes.length === 0 ? null : Math.round(data.changes.filter((c) => /success|completed|ok/i.test(`${c.outcome ?? ""} ${c.status}`)).length / data.changes.length * 100);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3 lg:grid-cols-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, { children: ["Change management", success != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
			variant: "green",
			className: "ml-2",
			children: [success, "% success"]
		}) : null] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "space-y-2 text-sm",
			children: data.changes.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-md border border-border px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-medium text-fg",
					children: c.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[11px] text-muted",
					children: [
						c.status,
						c.outcome ? ` · ${c.outcome}` : "",
						c.completedAt ? ` · ${formatSastDateTime(c.completedAt)}` : ""
					]
				})]
			}, i))
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Customer satisfaction (CSAT)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: data.csat ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-2 gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Score",
					value: data.csat.score,
					tone: "green",
					hint: "/ 5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Responses",
					value: data.csat.responseCount ?? "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "col-span-2 text-[12px] text-muted",
					children: [
						"Period ",
						formatSastDate(data.csat.periodFrom),
						" –",
						" ",
						formatSastDate(data.csat.periodTo),
						data.csat.source ? ` · Source: ${data.csat.source}` : ""
					]
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-muted",
			children: "CSAT will appear when survey feed is linked."
		}) })] })]
	});
}
function CoveRecentDaysPanel({ days, title = "Last 7 days", why = "Daily collect snapshots for backup health and recovery testing (not latest-only)." }) {
	const rows = days ?? [];
	if (rows.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-dashed border-border bg-surface/40 px-3 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
			title,
			why
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "No multi-day Cove snapshots yet. After daily Cove collect runs, the last 7 days of backups and recovery tests appear here."
		})]
	});
	const maxDev = Math.max(1, ...rows.map((d) => d.deviceCount || 0));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-surface/50 p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title,
				why
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex h-24 items-end gap-1.5 sm:gap-2",
				children: [...rows].reverse().map((d) => {
					const ok = d.okCount || 0;
					const stale = d.staleCount || 0;
					const failed = d.failedCount || 0;
					const total = Math.max(1, ok + stale + failed);
					const h = Math.max(12, Math.round((d.deviceCount || total) / maxDev * 88));
					const okH = Math.round(ok / total * h);
					const stH = Math.round(stale / total * h);
					const flH = Math.max(0, h - okH - stH);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex min-w-0 flex-1 flex-col items-center gap-1",
						title: `${d.snapshotDate}: OK ${ok} · Stale ${stale} · Failed ${failed}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex w-full max-w-[2.25rem] flex-col justify-end overflow-hidden rounded-t-md",
							style: { height: h },
							children: [
								flH > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-full bg-rag-red",
									style: { height: flH }
								}) : null,
								stH > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-full bg-rag-amber",
									style: { height: stH }
								}) : null,
								okH > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-full bg-rag-green",
									style: { height: okH }
								}) : null
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate text-[9px] tabular-nums text-muted",
							children: formatSastDate(d.snapshotDate).slice(0, 5)
						})]
					}, `bar-${d.snapshotDate}`);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-[10px] text-muted",
				children: "Bars = share of OK (green) / stale (amber) / failed (red) per collect day. Age rules: older than 36h stale, older than 72h failed when status blank."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 overflow-x-auto rounded-lg border border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[800px] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Day"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Devices"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "OK"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Stale"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Failed"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "RT plan"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Standby"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Tests OK"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Tests fail"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Last success"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-border/70",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-medium tabular-nums",
								children: formatSastDate(d.snapshotDate)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 tabular-nums",
								children: d.deviceCount
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 tabular-nums text-rag-green",
								children: d.okCount
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 tabular-nums text-rag-amber",
								children: d.staleCount
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: d.failedCount > 0 ? "px-3 py-2 tabular-nums font-semibold text-rag-red" : "px-3 py-2 tabular-nums",
								children: d.failedCount
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 tabular-nums",
								children: d.recoveryTestingCount
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 tabular-nums",
								children: d.standbyImageCount
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 tabular-nums text-rag-green",
								children: d.testSuccessCount
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: d.testFailedCount > 0 ? "px-3 py-2 tabular-nums font-semibold text-rag-red" : "px-3 py-2 tabular-nums",
								children: d.testFailedCount
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs text-muted",
								children: d.lastSuccessAny ? formatSastDateTime(d.lastSuccessAny) : d.lastRecoveryTestAt ? formatSastDateTime(d.lastRecoveryTestAt) : "—"
							})
						]
					}, d.snapshotDate)) })]
				})
			}),
			rows.length < 7 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-[11px] text-muted",
				children: [
					"Showing ",
					rows.length,
					" collect day(s) of the last 7 — more appear as daily Cove collect stores snapshots."
				]
			}) : null
		]
	});
}
function formatCoveBytes(bytes) {
	if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
	if (bytes === 0) return "0 B";
	const units = [
		"B",
		"KB",
		"MB",
		"GB",
		"TB",
		"PB"
	];
	let v = bytes;
	let i = 0;
	while (v >= 1024 && i < units.length - 1) {
		v /= 1024;
		i++;
	}
	const digits = i >= 3 ? 2 : i >= 2 ? 1 : 0;
	return `${v.toFixed(digits)} ${units[i]}`;
}
function formatRecoveryTestStatus(status, lastTest) {
	const s = (status || "").trim();
	if (!s || s === "Unknown") return lastTest ? "Unknown" : "No test yet";
	if (s === "NotStarted") return "No test yet";
	if (s === "InProgress") return "In progress";
	return s;
}
function CoveDevicesSection({ data }) {
	const devices = data.cove?.devices ?? [];
	const totalUsed = devices.reduce((sum, d) => sum + (d.usedBytes != null && Number.isFinite(d.usedBytes) ? d.usedBytes : 0), 0);
	const sizedCount = devices.filter((d) => d.usedBytes != null && d.usedBytes > 0).length;
	if (!effectiveCover(data).cove) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "Devices on Cloud Backup",
		hint: "No cover — no Cove data for this customer."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "Devices on Cloud Backup",
				why: "Devices protected by RPM Cloud Backup — health, last success, and backup size from the latest Cove collect."
			}),
			devices.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Devices",
						value: devices.length
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Total backup size",
						value: formatCoveBytes(totalUsed)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "With size reported",
						value: sizedCount
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Failed / overdue",
						value: devices.filter((d) => {
							const st = (d.lastBackupStatus || "").toLowerCase();
							return st.includes("fail") || st.includes("error") || st.includes("overdue");
						}).length,
						tone: "red"
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoveRecentDaysPanel, {
				days: data.cove?.recentDays,
				title: "Recent backups (last 7 days)",
				why: "Daily backup OK / stale / failed counts from Cove collect snapshots."
			}),
			devices.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: data.cove?.message || "No Cove devices on latest snapshot. Map the N-Able partner to this CustomerCode and re-collect."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-xl border border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[960px] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Device"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Partner"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Backup health"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Backup size"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Retention policy"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Last success"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Recovery plan"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Test status"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Last recovery test"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Verification"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: devices.map((d, i) => {
						const st = (d.lastBackupStatus || "").toLowerCase();
						let health = "ok";
						if (st.includes("fail") || st.includes("error") || st.includes("overdue") || st.includes("abort")) health = "failed";
						else if (st.includes("stale") || st.includes("warn") || st.includes("miss")) health = "stale";
						else if (d.lastSuccessTime) {
							const ageH = (Date.now() - Date.parse(d.lastSuccessTime)) / 36e5;
							if (ageH > 72) health = "failed";
							else if (ageH > 36) health = "stale";
						} else if (!d.lastSuccessTime) health = "failed";
						const healthLabel = health === "failed" ? "Failed / overdue" : health === "stale" ? "Stale" : d.lastBackupStatus || "OK";
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-border/70",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-medium",
									children: d.deviceName ?? d.machineName ?? "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-muted",
									children: d.partnerName ?? "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: health === "failed" ? "font-semibold text-rag-red" : health === "stale" ? "font-semibold text-rag-amber" : "font-semibold text-rag-green",
										children: healthLabel
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-xs tabular-nums text-muted",
									children: formatCoveBytes(d.usedBytes)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-xs text-muted",
									title: d.profileName || void 0,
									children: d.retentionPolicy || "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-xs text-muted",
									children: d.lastSuccessTime ? formatSastDateTime(d.lastSuccessTime) : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-xs text-muted",
									children: d.recoveryPlanLabel || (d.recoveryPlanType === 1 ? "Recovery Testing" : d.recoveryPlanType === 2 ? "Standby Image" : "—")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-xs",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: d.recoveryTestStatus === "Success" ? "font-semibold text-rag-green" : d.recoveryTestStatus === "Failed" ? "font-semibold text-rag-red" : d.recoveryTestStatus === "InProgress" ? "font-semibold text-rag-amber" : "text-muted",
										children: formatRecoveryTestStatus(d.recoveryTestStatus, d.lastRecoveryTestAt)
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 text-xs text-muted",
									children: d.lastRecoveryTestAt ? formatSastDateTime(d.lastRecoveryTestAt) : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "max-w-[200px] truncate px-3 py-2 text-xs text-muted",
									title: d.recoveryVerification || void 0,
									children: d.recoveryVerification || "—"
								})
							]
						}, `${d.accountId}-${i}`);
					}) })]
				})
			})
		]
	});
}
function CoveRecoverySection({ data }) {
	if (!effectiveCover(data).cove) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "Backup Recovery Testing",
		hint: "No cover — no Cove data for this customer."
	});
	const rec = data.cove?.recovery ?? data.cove?.summary?.recovery ?? null;
	const recentDays = data.cove?.recentDays ?? [];
	const history = data.cove?.recoveryHistory ?? [];
	const devicesLatest = (data.cove?.devices ?? []).filter((d) => {
		const plan = d.recoveryPlanType ?? 0;
		const st = (d.recoveryTestStatus || "").toLowerCase();
		if (st === "notinplan") return false;
		return plan > 0 || Boolean(d.lastRecoveryTestAt) || st && st !== "notinplan";
	});
	const devices = (history.length > 0 ? history : devicesLatest).filter((d) => {
		if ((d.recoveryTestStatus || "").toLowerCase() === "notinplan" && (d.recoveryPlanType ?? 0) === 0 && !d.lastRecoveryTestAt) return false;
		return true;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "Backup Recovery Testing",
				why: "Cove automated recovery testing (VDR boot/restore). Plan type I80 (1=Recovery Testing, 2=Standby Image); result from RV0/RVK/RVO/RVL. Last 7 days of plan membership and test outcomes below."
			}),
			rec ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Recovery Testing plan",
						value: rec.recoveryTestingCount
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Standby Image plan",
						value: rec.standbyImageCount
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Verification success",
						value: rec.testSuccessCount,
						tone: rec.testSuccessCount > 0 ? "green" : "default"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Verification failed",
						value: rec.testFailedCount,
						tone: rec.testFailedCount > 0 ? "red" : "default"
					})
				]
			}), rec.lastRecoveryTestAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-[12px] text-muted",
				children: [
					"Most recent VDR restore session:",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium text-fg",
						children: formatSastDateTime(rec.lastRecoveryTestAt)
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[12px] text-muted",
				children: "No VDR restore session timestamp yet (RVO/RVL empty). Re-run Cove collect after the RV* columns pack; plan membership still comes from I80."
			})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "No recovery summary yet. Apply SQL 436 and re-run Cove collect so I80 + RV* are stored."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoveRecentDaysPanel, {
				days: recentDays,
				title: "Backup Recovery Testing — last 7 days",
				why: "Daily totals for Recovery Testing / Standby Image plans and verification success vs fail across collect snapshots."
			}),
			devices.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted",
				children: "No devices with a Recovery Testing or Standby Image plan in the last 7 days (or latest snapshot). Enable Recovery Testing in Cove Continuity for Windows devices, then re-collect daily."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-xl border border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[860px] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Day"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Device"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Plan"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Test status"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Last test"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Physicality"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Verification detail"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: devices.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-border/70",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs tabular-nums text-muted",
								children: d.snapshotDate ? formatSastDate(d.snapshotDate) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-medium",
								children: d.deviceName ?? d.machineName ?? d.accountId ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-muted",
								children: d.recoveryPlanLabel || "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: d.recoveryTestStatus === "Success" ? "font-semibold text-rag-green" : d.recoveryTestStatus === "Failed" ? "font-semibold text-rag-red" : d.recoveryTestStatus === "InProgress" ? "font-semibold text-rag-amber" : "text-muted",
									children: formatRecoveryTestStatus(d.recoveryTestStatus, d.lastRecoveryTestAt)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs text-muted",
								children: d.lastRecoveryTestAt ? formatSastDateTime(d.lastRecoveryTestAt) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-muted",
								children: d.physicality || "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "max-w-[280px] truncate px-3 py-2 text-xs text-muted",
								title: d.recoveryVerification || void 0,
								children: d.recoveryVerification || ((d.recoveryPlanType ?? 0) > 0 && !d.lastRecoveryTestAt ? "Awaiting first automated restore" : "—")
							})
						]
					}, `rt-${d.snapshotDate ?? ""}-${d.accountId}-${i}`)) })]
				})
			})
		]
	});
}
function formatRetentionPeriod(v) {
	if (v == null || String(v).trim() === "") return "—";
	const s = String(v).trim();
	const n = Number(s);
	if (Number.isFinite(n) && String(n) === s) {
		if (n <= 0) return "—";
		if (n % 365 === 0) return `${n / 365} year${n / 365 === 1 ? "" : "s"}`;
		if (n % 30 === 0 && n >= 30) return `${n / 30} month${n / 30 === 1 ? "" : "s"}`;
		return `${n} day${n === 1 ? "" : "s"}`;
	}
	return s;
}
function CoveRetentionSection({ data }) {
	if (!effectiveCover(data).cove) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "Retention policies",
		hint: "No cover — no Cove / Cloud Backup data for this customer."
	});
	const devices = data.cove?.devices ?? [];
	const policyCounts = /* @__PURE__ */ new Map();
	for (const d of devices) {
		const k = (d.retentionPolicy || "").trim() || "(not reported)";
		policyCounts.set(k, (policyCounts.get(k) || 0) + 1);
	}
	const policies = [...policyCounts.entries()].sort((a, b) => b[1] - a[1]);
	const withPolicy = devices.filter((d) => (d.retentionPolicy || "").trim()).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "Retention policies",
				why: "Cove Retention Policy (PN) and Profile (OP) per device, plus per-source retention periods (files, system state, Hyper-V, SQL, VMware, network)."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Devices",
						value: devices.length
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "With policy name",
						value: withPolicy
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Distinct policies",
						value: policies.filter(([k]) => k !== "(not reported)").length
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Total backup size",
						value: formatCoveBytes(devices.reduce((s, d) => s + (d.usedBytes != null && Number.isFinite(d.usedBytes) ? d.usedBytes : 0), 0))
					})
				]
			}),
			policies.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-surface/50 p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted",
					children: "Policy distribution"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-2",
					children: policies.map(([name, cnt]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-fg",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium",
							children: name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "ml-1.5 text-muted",
							children: ["×", cnt]
						})]
					}, name))
				})]
			}) : null,
			devices.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: data.cove?.message || "No Cove devices on latest snapshot. Run Cove collect after applying SQL 438."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-xl border border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[1100px] text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Device"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Retention policy"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Profile"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Files"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "System state"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Hyper-V"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "SQL"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "VMware"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Network"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-2",
								children: "Backup size"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: devices.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-border/70",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 font-medium",
								children: d.deviceName ?? d.machineName ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs",
								children: d.retentionPolicy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold text-fg",
									children: d.retentionPolicy
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted",
									children: "Not reported"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs text-muted",
								children: d.profileName || "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs tabular-nums text-muted",
								children: formatRetentionPeriod(d.retentionFiles)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs tabular-nums text-muted",
								children: formatRetentionPeriod(d.retentionSystemState)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs tabular-nums text-muted",
								children: formatRetentionPeriod(d.retentionHyperV)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs tabular-nums text-muted",
								children: formatRetentionPeriod(d.retentionSql)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs tabular-nums text-muted",
								children: formatRetentionPeriod(d.retentionVmware)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs tabular-nums text-muted",
								children: formatRetentionPeriod(d.retentionNetwork)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-3 py-2 text-xs tabular-nums text-muted",
								children: formatCoveBytes(d.usedBytes)
							})
						]
					}, `ret-${d.accountId}-${i}`)) })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[12px] text-muted",
				children: "Values come from Cove EnumerateAccountStatistics (PN / OP / FR / SR / HR / ZR / WR / NR). Re-run Cove collect after SQL 438 so columns populate. Blank cells mean that data source is not in use or the API did not return a period for the device."
			})
		]
	});
}
function CoveMappingSection({ data }) {
	if (!effectiveCover(data).cove) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCoverPanel, {
		service: "RPM Cloud Backup mapping",
		hint: "No cover — no Cove / Cyber Backup data for this customer."
	});
	const maps = data.cove?.mapping ?? [];
	const unmapped = data.cove?.unmapped ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCaption, {
				title: "Cove partner mapping",
				why: "Maps Cove partner → CustomerCode so devices land on the right estate row. Estate-wide unmapped partners (need alias) listed below."
			}),
			unmapped.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg border border-rag-amber/40 bg-rag-amber/10 px-3 py-2 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-semibold text-fg",
						children: [unmapped.length, " unmapped partner(s) on latest estate snap"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-1 max-h-28 list-inside list-disc overflow-y-auto text-[12px] text-muted",
						children: unmapped.slice(0, 20).map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [u.partnerName, u.deviceCount ? ` · ${u.deviceCount} device(s)` : ""] }, u.partnerName))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[11px] text-muted",
						children: "Run EnumeratePartners auto-map or add Dim_Cove_PartnerAlias then re-collect."
					})
				]
			}) : null,
			maps.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "No partner map rows for this customer."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-1 text-sm",
				children: maps.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-lg border border-border px-3 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium",
						children: m.partnerName
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-2 text-muted",
						children: m.active ? "Active" : "Inactive"
					})]
				}, m.partnerName))
			})
		]
	});
}
//#endregion
export { SysproHubSection as C, SqlSection as S, RmmDevicesSection as _, CoveRecoverySection as a, SecuritySection as b, ExecBriefSection as c, IncidentsSection as d, JobsSection as f, RmmAlertsSection as g, RisksSection as h, CoveMappingSection as i, HealthSection as l, OperatorsSection as m, ChangeSection as n, CoveRetentionSection as o, LicenseSection as p, CoveDevicesSection as r, DtrSection as s, AmsHubSection as t, HotfixSection as u, RmmMappingSection as v, SlaSection as x, RmmPatchSection as y };
