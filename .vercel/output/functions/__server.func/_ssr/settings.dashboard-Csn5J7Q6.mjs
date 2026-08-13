import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { r as DEFAULT_DASHBOARD, t as DASHBOARD_PRESETS } from "./types-Dk-h6nx5.mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
import { d as saveDashboardSettings, o as fetchSettingsBundle } from "./settings-api-7fPZgfQ4.mjs";
import { t as clearDashboardConfigCache } from "./use-dashboard-config-yLPMN8xO.mjs";
import { t as Button } from "./button-rM46W5TP.mjs";
import { H as ExternalLink, _ as RotateCcw, h as Save, j as LayoutDashboard } from "../_libs/lucide-react.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.dashboard-Csn5J7Q6.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Toggle({ label, help, checked, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg/40 px-3 py-2.5 transition hover:border-accent/30",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "checkbox",
			className: "mt-1 h-4 w-4 accent-[var(--color-accent)]",
			checked,
			onChange: (e) => onChange(e.target.checked)
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block text-sm font-semibold text-fg",
				children: label
			}), help ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-0.5 block text-[11px] text-muted",
				children: help
			}) : null]
		})]
	});
}
function countOn(d) {
	return {
		kpis: [
			d.kpiCustomers,
			d.kpiAttention,
			d.kpiAssurance,
			d.kpiRefresh,
			d.kpiRisks,
			d.kpiLicenses,
			d.kpiRmm,
			d.kpiHotfixes
		].filter(Boolean).length,
		panels: [
			d.panelPortfolioTable,
			d.panelRmmHealth,
			d.panelDataRefresh,
			d.panelAttention,
			d.panelAssuranceChart,
			d.panelHealthChart,
			d.panelSla,
			d.panelLicenses,
			d.panelRisks,
			d.panelBackups
		].filter(Boolean).length
	};
}
function DashboardSettingsPage() {
	const [dash, setDash] = (0, import_react.useState)({ ...DEFAULT_DASHBOARD });
	const [msg, setMsg] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [presetHint, setPresetHint] = (0, import_react.useState)(null);
	const [dirty, setDirty] = (0, import_react.useState)(false);
	const load = (0, import_react.useCallback)(async () => {
		const b = await fetchSettingsBundle();
		setDash({
			...DEFAULT_DASHBOARD,
			...b.dashboard ?? {}
		});
		setDirty(false);
	}, []);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	function set(key, value) {
		setDash((s) => ({
			...s,
			[key]: value
		}));
		setPresetHint(null);
		setDirty(true);
	}
	async function onSave() {
		setBusy(true);
		setMsg(null);
		try {
			const r = await saveDashboardSettings({ data: { dashboard: dash } });
			if (r.dashboard) setDash(r.dashboard);
			clearDashboardConfigCache();
			setDirty(false);
			setMsg("Saved. Open Exco Insight (or refresh it) to see the new layout.");
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	function onReset() {
		setDash({ ...DEFAULT_DASHBOARD });
		setPresetHint("full");
		setDirty(true);
		setMsg("Full operations defaults loaded in the form — click Save to store them.");
	}
	function applyPreset(key) {
		const p = DASHBOARD_PRESETS[key];
		if (!p) return;
		setDash((s) => ({
			...s,
			...p.patch
		}));
		setPresetHint(key);
		setDirty(true);
		setMsg(`Preset “${p.label}” applied in the form only — click Save, then open Exco Insight.`);
	}
	const counts = (0, import_react.useMemo)(() => countOn(dash), [dash]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutDashboard, { className: "h-5 w-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-base font-bold text-fg",
						children: "Dashboard Configuration"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-0.5 max-w-xl text-[13px] text-muted",
						children: [
							"Controls what appears on ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Exco Insight"
							}),
							" ",
							"(home / estate view). Form shows",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-medium text-fg",
								children: [
									counts.kpis,
									" KPIs · ",
									counts.panels,
									" panels"
								]
							}),
							dirty ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-rag-amber",
								children: " · unsaved changes"
							}) : null,
							"."
						]
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/",
							className: "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-fg hover:border-accent/40",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-4 w-4" }), "Open Exco Insight"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							variant: "secondary",
							disabled: busy,
							onClick: onReset,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-4 w-4" }), "Reset defaults"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							disabled: busy,
							onClick: () => void onSave(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), "Save"]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "border-accent/25 bg-accent-soft/20",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "How to use" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-2 text-[13px] leading-relaxed text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
						className: "list-decimal space-y-1.5 pl-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Pick a preset"
							}), " (optional) for a starting layout — ExCo board, RMM focus, SYSPRO AMS, or full ops."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Fine-tune"
							}), " title, subtitle, KPI cards, and panels with the toggles below."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								"Click ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "Save"
								}),
								" — nothing is stored until you save (presets alone do not persist)."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								"Open ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-fg",
									children: "Exco Insight"
								}),
								" (button above or home in the left menu). Refresh if it was already open."
							] })
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[12px]",
						children: "Who can change this: staff with access to Settings (Platform Admin). Layout is shared for all users — not per person. Customer drill-down pages are separate; only the estate home layout is controlled here."
					})]
				})]
			}),
			msg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: cn("rounded-lg border px-3 py-2 text-sm", msg.toLowerCase().includes("saved") ? "border-rag-green/30 bg-rag-green-bg text-rag-green" : "border-border bg-surface text-muted"),
				children: msg
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "1 · Quick presets" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-[12px] text-muted",
					children: [
						"One click fills the form. Still click ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Save"
						}),
						" ",
						"afterward."
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-4",
					children: Object.entries(DASHBOARD_PRESETS).map(([key, p]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => applyPreset(key),
						className: cn("rounded-xl border px-3 py-2.5 text-left transition hover:border-accent/40", presetHint === key ? "border-accent bg-accent-soft/40" : "border-border bg-bg/40"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-sm font-semibold text-fg",
							children: p.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-0.5 block text-[11px] text-muted",
							children: p.help
						})]
					}, key))
				})]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "2 · Estate page chrome" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mb-1 block font-medium text-fg",
								children: "Page title"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "field w-full",
								value: dash.estateTitle,
								onChange: (e) => set("estateTitle", e.target.value),
								maxLength: 80,
								placeholder: "Exco Insight"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-1 block text-[11px] text-muted",
								children: "Large heading on the estate home page (default: Exco Insight)."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mb-1 block font-medium text-fg",
								children: "Page subtitle"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "field w-full",
								value: dash.estateSubtitle,
								onChange: (e) => set("estateSubtitle", e.target.value),
								maxLength: 240
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-1 block text-[11px] text-muted",
								children: "One line under the title — e.g. what the board should focus on."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mb-1 block font-medium text-fg",
									children: "Collect “Fresh” window (hours)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "field",
									type: "number",
									min: 1,
									max: 168,
									value: dash.collectFreshHours,
									onChange: (e) => set("collectFreshHours", Number(e.target.value))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-1 block text-[11px] text-muted",
									children: "How recent a collect must be to show as Fresh on Exco Insight. Does not change RAG math (that is Settings → RAG)."
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mb-1 block font-medium text-fg",
									children: "License “expiring soon” (days)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "field",
									type: "number",
									min: 1,
									max: 365,
									value: dash.licenseExpiringDays,
									onChange: (e) => set("licenseExpiringDays", Number(e.target.value))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-1 block text-[11px] text-muted",
									children: "KPI and license panel use this window (e.g. 90 = next 90 days)."
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
						label: "Show multitenant help banner",
						help: "Short tip on estate vs customer switcher — usually off after training.",
						checked: dash.showMultitenantHint,
						onChange: (v) => set("showMultitenantHint", v)
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "3 · KPI strip (top cards)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[12px] text-muted",
					children: "Top summary numbers. Off = card hidden (layout reflows)."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2 sm:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "Customer Ecosystem",
							help: "Count of customers on the estate board.",
							checked: dash.kpiCustomers,
							onChange: (v) => set("kpiCustomers", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "Customers Needing Attention",
							help: "How many have attention reasons (health, RMM, collect, etc.).",
							checked: dash.kpiAttention,
							onChange: (v) => set("kpiAttention", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "Ecosystem Assurance",
							help: "Average assurance score across customers.",
							checked: dash.kpiAssurance,
							onChange: (v) => set("kpiAssurance", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "Customer Data Refresh",
							help: "Fresh collects vs total (uses Fresh window above).",
							checked: dash.kpiRefresh,
							onChange: (v) => set("kpiRefresh", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "Ecosystem Open Risks",
							help: "Sum of open risks on the board.",
							checked: dash.kpiRisks,
							onChange: (v) => set("kpiRisks", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "Licenses Expiring",
							help: "Count in the license days window.",
							checked: dash.kpiLicenses,
							onChange: (v) => set("kpiLicenses", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "RMM Devices",
							help: "Pulseway devices / offline / critical rollup.",
							checked: dash.kpiRmm,
							onChange: (v) => set("kpiRmm", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "SYSPRO Hotfixes (charts)",
							help: "Estate charts: installed by customer, gaps, coverage pie — not a single total KPI.",
							checked: dash.kpiHotfixes,
							onChange: (v) => set("kpiHotfixes", v)
						})
					]
				})]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "4 · Estate panels (main body)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[12px] text-muted",
					children: "Larger sections under the KPI strip. Off = panel not rendered."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2 sm:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "Customer portfolio table",
							help: "Searchable list: health, ops, jobs, FinSight, RMM, Cove.",
							checked: dash.panelPortfolioTable,
							onChange: (v) => set("panelPortfolioTable", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "RMM Customer Health",
							help: "Per-customer Pulseway devices, offline, critical.",
							checked: dash.panelRmmHealth,
							onChange: (v) => set("panelRmmHealth", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "Customer Data Refresh list",
							help: "Last import time and Fresh/Stale per customer.",
							checked: dash.panelDataRefresh,
							onChange: (v) => set("panelDataRefresh", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "Customers Needing Attention",
							help: "Clickable list of attention reasons.",
							checked: dash.panelAttention,
							onChange: (v) => set("panelAttention", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "Ecosystem Assurance chart",
							help: "Bar chart of assurance % by customer.",
							checked: dash.panelAssuranceChart,
							onChange: (v) => set("panelAssuranceChart", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "Health Score chart",
							help: "Horizontal health score by customer.",
							checked: dash.panelHealthChart,
							onChange: (v) => set("panelHealthChart", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "SLA Stats table",
							help: "SLA / availability when snapshot data exists.",
							checked: dash.panelSla,
							onChange: (v) => set("panelSla", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "Licenses Expiring table",
							help: "Detail rows for the license KPI window.",
							checked: dash.panelLicenses,
							onChange: (v) => set("panelLicenses", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "Open Risks table",
							help: "Risk and issue counts by customer.",
							checked: dash.panelRisks,
							onChange: (v) => set("panelRisks", v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							label: "SQL Script Backup Status table",
							help: "SQL backup health when collect is in place.",
							checked: dash.panelBackups,
							onChange: (v) => set("panelBackups", v)
						})
					]
				})]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "5 · Customer workspace defaults" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[12px] text-muted",
						children: "Applies when you open a single customer from the switcher — not the estate home layout."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mb-1 block font-medium text-fg",
							children: "Open customer on"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: "field",
							value: dash.customerLanding,
							onChange: (e) => set("customerLanding", e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "exec",
									children: "Customer Ecosystem"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "syspro",
									children: "SYSPRO hub"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "ams",
									children: "AMS pack hub"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
								label: "Charts on Customer Ecosystem",
								help: "Operator / signal charts on the customer exec page.",
								checked: dash.customerShowCharts,
								onChange: (v) => set("customerShowCharts", v)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
								label: "FinSight Out of Balance strip",
								checked: dash.customerShowDtr,
								onChange: (v) => set("customerShowDtr", v)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
								label: "Priorities & risks lists",
								checked: dash.customerShowLists,
								onChange: (v) => set("customerShowLists", v)
							})
						]
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[12px] text-muted",
					children: dirty ? "You have unsaved changes." : "Form matches last saved settings."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					disabled: busy || !dirty,
					onClick: () => void onSave(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), "Save configuration"]
				})]
			})
		]
	});
}
//#endregion
export { DashboardSettingsPage as component };
