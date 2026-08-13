import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { f as Outlet, g as Link, l as useRouterState, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
import { t as Route } from "./customers._code-DMK4iK3J.mjs";
import { t as Badge } from "./badge-BccjJCAV.mjs";
import { i as warmHrefsIdle, n as SpaLink, t as RagBadge } from "./rag-badge--H4DTZx7.mjs";
import { t as NoCover } from "./no-cover-Bp-NAN5U.mjs";
import { t as useStaffProfile } from "./use-staff-profile-CtJQjgds.mjs";
import { t as Button } from "./button-rM46W5TP.mjs";
import { X as ArrowLeft } from "../_libs/lucide-react.mjs";
import { n as RequireAuth, t as AppShell } from "./app-shell-AnmkMbv2.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/customers._code-CW_K5RbF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var domains = [
	{
		id: "exec",
		label: "Customer Ecosystem",
		short: "Ecosystem",
		match: (p, base) => p === base || p === `${base}/`,
		href: (base) => base,
		pillar: null
	},
	{
		id: "syspro",
		label: "SYSPRO Deployment",
		short: "SYSPRO",
		match: (p, base) => p.startsWith(`${base}/syspro`),
		href: (base) => `${base}/syspro`,
		pillar: "syspro"
	},
	{
		id: "rmm",
		label: "RPM Remote Management",
		short: "RMM",
		match: (p, base) => p.startsWith(`${base}/rmm`),
		href: (base) => `${base}/rmm/devices`,
		pillar: "rmm"
	},
	{
		id: "cove",
		label: "RPM Cloud Backup",
		short: "Backup",
		match: (p, base) => p.startsWith(`${base}/cove`),
		href: (base) => `${base}/cove`,
		pillar: "cove"
	},
	{
		id: "epp",
		label: "RPM End Point Protection",
		short: "EPP",
		match: (p, base) => p.startsWith(`${base}/epp`),
		href: (base) => `${base}/epp`,
		pillar: "epp"
	},
	{
		id: "csp",
		label: "Microsoft 365 Tenant",
		short: "M365",
		match: (p, base) => p.startsWith(`${base}/csp`),
		href: (base) => `${base}/csp`,
		pillar: "csp"
	},
	{
		id: "ams",
		label: "AMS",
		short: "AMS",
		match: (p, base) => p.startsWith(`${base}/ams`),
		href: (base) => `${base}/ams`,
		pillar: null
	}
];
var sysproLeaves = [
	{
		label: "Overview",
		path: ""
	},
	{
		label: "FinSight",
		path: "dtr"
	},
	{
		label: "License",
		path: "license"
	},
	{
		label: "Hotfixes",
		path: "hotfixes"
	},
	{
		label: "Operators",
		path: "operators"
	},
	{
		label: "Jobs",
		path: "jobs"
	},
	{
		label: "Health",
		path: "health"
	},
	{
		label: "Security",
		path: "security"
	},
	{
		label: "SQL",
		path: "sql"
	}
];
var rmmLeaves = [
	{
		label: "Servers",
		path: "devices"
	},
	{
		label: "Workstations",
		path: "workstations"
	},
	{
		label: "Server Patch Management",
		path: "patch"
	},
	{
		label: "Server Alerts",
		path: "alerts"
	}
];
var coveLeaves = [
	{
		label: "Devices on Cloud Backup",
		path: "devices"
	},
	{
		label: "Backup Recovery Testing",
		path: "recovery"
	},
	{
		label: "Retention policies",
		path: "retention"
	}
];
var eppLeaves = [
	{
		label: "Device stats",
		path: ""
	},
	{
		label: "Incidents",
		path: "incidents"
	},
	{
		label: "Modules",
		path: "modules"
	},
	{
		label: "Quarantine",
		path: "quarantine"
	}
];
var cspLeaves = [
	{
		label: "Tenant health",
		path: ""
	},
	{
		label: "Licensed users",
		path: "users"
	},
	{
		label: "License stats",
		path: "licenses"
	}
];
var amsLeaves = [
	{
		label: "Overview",
		path: ""
	},
	{
		label: "Incidents",
		path: "incidents"
	},
	{
		label: "Risks",
		path: "risks"
	},
	{
		label: "SLA",
		path: "sla"
	}
];
function pillarCovered(cover, pillar) {
	if (!pillar) return true;
	if (!cover) return false;
	return cover[pillar] === true;
}
function CustomerWorkspaceNav({ code, cover }) {
	const router = useRouter();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const base = `/customers/${encodeURIComponent(code)}`;
	const path = pathname.replace(/\/$/, "") || "/";
	const inSyspro = path.startsWith(`${base}/syspro`);
	const inCove = path.startsWith(`${base}/cove`);
	const inRmm = path.startsWith(`${base}/rmm`);
	const inEpp = path.startsWith(`${base}/epp`);
	const inCsp = path.startsWith(`${base}/csp`);
	const inAms = path.startsWith(`${base}/ams`);
	(0, import_react.useEffect)(() => {
		const pillarHrefs = domains.filter((d) => pillarCovered(cover, d.pillar)).map((d) => d.href(base));
		let moduleHrefs = [];
		if (inSyspro) moduleHrefs = sysproLeaves.map((l) => l.path ? `${base}/syspro/${l.path}` : `${base}/syspro`);
		else if (inRmm) moduleHrefs = rmmLeaves.map((l) => l.path ? `${base}/rmm/${l.path}` : `${base}/rmm`);
		else if (inCove) moduleHrefs = coveLeaves.map((l) => l.path ? `${base}/cove/${l.path}` : `${base}/cove`);
		else if (inEpp) moduleHrefs = eppLeaves.map((l) => l.path ? `${base}/epp/${l.path}` : `${base}/epp`);
		else if (inCsp) moduleHrefs = cspLeaves.map((l) => l.path ? `${base}/csp/${l.path}` : `${base}/csp`);
		else if (inAms) moduleHrefs = amsLeaves.map((l) => l.path ? `${base}/ams/${l.path}` : `${base}/ams`);
		return warmHrefsIdle(router, [...moduleHrefs, ...pillarHrefs], {
			delayMs: 150,
			max: 10
		});
	}, [
		router,
		base,
		cover,
		inSyspro,
		inRmm,
		inCove,
		inEpp,
		inCsp,
		inAms
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rpma-workspace-nav space-y-2.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rpma-tabs-list rpma-pillar-track flex w-full flex-wrap gap-0.5 rounded-lg bg-surface-2/90 p-1",
				role: "tablist",
				"aria-label": "Customer service pillars",
				children: domains.map((d) => {
					const active = d.match(path, base);
					const covered = pillarCovered(cover, d.pillar);
					const noCover = d.pillar != null && !covered;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SpaLink, {
						href: d.href(base),
						role: "tab",
						"aria-selected": active,
						title: noCover ? `${d.label} — No Cover` : d.label,
						"data-state": active ? "active" : "inactive",
						className: cn("rpma-tabs-trigger rpma-pillar-btn inline-flex min-h-9 min-w-0 flex-1 flex-col items-center justify-center rounded-md px-1.5 py-1.5 text-center sm:px-2", "text-[11px] font-semibold leading-tight tracking-tight sm:text-[12px]", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35", active ? "is-active" : "text-muted hover:text-fg hover:bg-surface/80", noCover && !active && "opacity-55"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "max-w-full truncate",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden lg:inline",
								children: d.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "lg:hidden",
								children: d.short
							})]
						}), noCover ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("rpma-no-cover mt-0.5 text-[9px] font-extrabold uppercase tracking-wide", active ? "text-white" : "text-rag-amber"),
							children: "No Cover"
						}) : null]
					}, d.id);
				})
			}),
			inSyspro ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionRow, {
				aria: "SYSPRO Deployment modules",
				noCover: cover?.syspro !== true,
				base: `${base}/syspro`,
				path,
				leaves: sysproLeaves
			}) : null,
			inRmm ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionRow, {
				aria: "RPM Remote Management modules",
				noCover: cover?.rmm !== true,
				base: `${base}/rmm`,
				path,
				leaves: rmmLeaves
			}) : null,
			inCove ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionRow, {
				aria: "RPM Cloud Backup modules",
				noCover: cover?.cove !== true,
				base: `${base}/cove`,
				path,
				leaves: coveLeaves
			}) : null,
			inEpp ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionRow, {
				aria: "RPM End Point Protection modules",
				noCover: cover?.epp !== true,
				base: `${base}/epp`,
				path,
				leaves: eppLeaves
			}) : null,
			inCsp ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionRow, {
				aria: "Microsoft 365 Tenant modules",
				noCover: cover?.csp !== true,
				base: `${base}/csp`,
				path,
				leaves: cspLeaves
			}) : null,
			inAms ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionRow, {
				aria: "AMS pack",
				noCover: false,
				base: `${base}/ams`,
				path,
				leaves: amsLeaves
			}) : null
		]
	});
}
function SectionRow({ aria, noCover, base, path, leaves }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rpma-tabs-list rpma-module-track flex w-full flex-wrap items-center gap-0.5 rounded-lg bg-surface-2/70 p-1",
		role: "navigation",
		"aria-label": aria,
		children: [noCover ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCover, {
			title: `${aria} — not in scope`,
			className: "ml-1 mr-1"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "ml-1 mr-1 hidden shrink-0 text-[10px] font-bold uppercase tracking-wider text-subtle sm:inline",
			children: "Modules"
		}), leaves.map((l) => {
			const href = l.path ? `${base}/${l.path}` : base;
			const active = path === href || path === `${href}/` || l.path === "" && (path === base || path === `${base}/`);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubLink, {
				href,
				label: l.label,
				active
			}, l.label + l.path);
		})]
	});
}
function SubLink({ href, label, active }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpaLink, {
		href,
		"data-state": active ? "active" : "inactive",
		className: cn("rpma-tabs-trigger rpma-module-btn inline-flex items-center rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35", active ? "is-active" : "text-muted hover:text-fg hover:bg-surface/80"),
		children: label
	});
}
/**
* Single cover strip for all customer pages — must not sit under sticky pillars.
*/
function ServicesOnCoverStrip({ cover }) {
	const c = cover ?? {
		syspro: false,
		rmm: false,
		cove: false,
		epp: false,
		csp: false
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rpma-cover-strip flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-[12px]",
		"aria-label": "RPM Services on Cover",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "shrink-0 font-semibold text-fg",
				children: "RPM Services on Cover"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoverChip, {
				on: Boolean(c.syspro),
				label: "SYSPRO Deployment",
				tip: "SYSPRO Deployment not in scope for this customer"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "hidden text-subtle sm:inline",
				"aria-hidden": true,
				children: "·"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoverChip, {
				on: Boolean(c.rmm),
				label: "RPM Remote Management",
				tip: "RPM Remote Management not in scope for this customer"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "hidden text-subtle sm:inline",
				"aria-hidden": true,
				children: "·"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoverChip, {
				on: Boolean(c.cove),
				label: "RPM Cloud Backup",
				tip: "RPM Cloud Backup not in scope for this customer"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "hidden text-subtle sm:inline",
				"aria-hidden": true,
				children: "·"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoverChip, {
				on: Boolean(c.epp),
				label: "RPM End Point Protection",
				tip: "EPP not in scope for this customer"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "hidden text-subtle sm:inline",
				"aria-hidden": true,
				children: "·"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoverChip, {
				on: Boolean(c.csp),
				label: "Microsoft 365 Tenant",
				tip: "Microsoft 365 Tenant not in scope for this customer"
			})
		]
	});
}
function CoverChip({ on, label, tip }) {
	if (on) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "rounded-md bg-rag-green-bg px-2 py-0.5 font-medium text-rag-green",
		children: label
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoCover, { title: tip })]
	});
}
function CustomerLayout() {
	const data = Route.useLoaderData();
	const customer = data?.customer;
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { profile } = useStaffProfile();
	if (!customer) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Customer",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "Customer data is not available. Try refresh."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			className: "mt-4",
			variant: "secondary",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				children: "Back to Exco Insight"
			})
		})]
	}) });
	const codes = profile?.allowedCustomerCodes;
	if (codes && codes.length > 0) {
		if (!codes.some((c) => c.toUpperCase() === customer.customerCode.toUpperCase())) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
			title: "Not permitted",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"Your role does not include customer ",
					customer.customerCode,
					"."
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				className: "mt-4",
				variant: "secondary",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					children: "Back to Exco Insight"
				})
			})]
		}) });
	}
	const pathBits = pathname.replace(/\/$/, "").split("/").filter(Boolean);
	let pageTitle = "Customer Ecosystem";
	if (pathBits.length === 2) pageTitle = "Customer Ecosystem";
	else if (pathBits[2] === "syspro" && pathBits.length === 3) pageTitle = "SYSPRO Deployment";
	else if (pathBits[2] === "syspro" && pathBits[3]) pageTitle = `SYSPRO Deployment · ${{
		health: "Health",
		operators: "Operators",
		jobs: "Jobs",
		dtr: "FinSight · control recons",
		security: "Security",
		license: "License",
		hotfixes: "Hotfixes",
		sql: "SQL platform"
	}[pathBits[3]] || pathBits[3]}`;
	else if (pathBits[2] === "rmm" && pathBits.length === 3) pageTitle = "RPM Remote Management";
	else if (pathBits[2] === "rmm" && pathBits[3]) pageTitle = `RPM Remote Management · ${{
		devices: "Servers",
		workstations: "Workstations",
		patch: "Server Patch Management",
		alerts: "Server Alerts"
	}[pathBits[3]] || pathBits[3]}`;
	else if (pathBits[2] === "cove" && pathBits.length === 3) pageTitle = "RPM Cloud Backup";
	else if (pathBits[2] === "cove" && pathBits[3]) pageTitle = `RPM Cloud Backup · ${{
		overview: "Devices on Cloud Backup",
		devices: "Devices on Cloud Backup",
		recovery: "Backup Recovery Testing",
		retention: "Retention policies"
	}[pathBits[3]] || pathBits[3]}`;
	else if (pathBits[2] === "epp") pageTitle = pathBits.length === 3 ? "RPM End Point Protection · Device stats" : `RPM End Point Protection · ${{
		incidents: "Incidents",
		modules: "Installed modules",
		quarantine: "Quarantine"
	}[pathBits[3]] || pathBits[3]}`;
	else if (pathBits[2] === "csp") pageTitle = pathBits.length === 3 ? "Microsoft 365 Tenant · Tenant health" : `Microsoft 365 Tenant · ${{
		users: "Licensed users",
		licenses: "License stats"
	}[pathBits[3]] || pathBits[3]}`;
	else if (pathBits[2] === "ams" && pathBits.length === 3) pageTitle = "AMS pack";
	else if (pathBits[2] === "ams" && pathBits[3]) pageTitle = `AMS · ${{
		incidents: "Incidents & problems",
		risks: "Risks & issues",
		sla: "SLA & availability"
	}[pathBits[3]] || pathBits[3]}`;
	const missing = Boolean(data?._missing);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: customer.displayName,
		subtitle: pageTitle,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rpma-saas-customer-meta mb-3 flex flex-wrap items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						variant: "ghost",
						size: "sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" }), "Assure App"]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RagBadge, { rag: customer.healthRag }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: data.dataMode === "demo" || missing ? "amber" : "green",
						children: missing ? "Unresolved" : data.dataMode === "demo" ? "Demo data" : "Live SQL"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-[11px] text-muted",
						children: customer.customerCode
					})
				]
			}),
			missing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 rounded-xl border border-rag-amber/40 bg-rag-amber-bg/40 px-4 py-3 text-sm text-fg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-semibold",
					children: "Customer code not resolved"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-muted",
					children: [
						"URL code ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: customer.customerCode
						}),
						" was not found in Dim_Customer / portfolio. Use the customer",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "code" }),
						" (e.g. ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: "AHIC"
						}),
						"), not the display name. Confirm the row is Active on central SQL, then click Refresh in the top bar."
					]
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rpma-customer-workspace space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ServicesOnCoverStrip, { cover: data.cover ?? customer.cover }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rpma-workspace-sticky",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CustomerWorkspaceNav, {
							code: customer.customerCode,
							cover: data.cover ?? customer.cover
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rpma-saas-customer-body min-w-0",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
					})
				]
			})
		]
	}) });
}
//#endregion
export { CustomerLayout as component };
