import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { g as Link, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
import { t as RagBadge } from "./rag-badge--H4DTZx7.mjs";
import { t as Button } from "./button-rM46W5TP.mjs";
import { D as Mail, J as Building2, R as FileSpreadsheet, k as LoaderCircle, p as Send, v as RefreshCw, y as Printer } from "../_libs/lucide-react.mjs";
import { n as RequireAuth, t as AppShell } from "./app-shell-AnmkMbv2.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
import { t as Route } from "./reports-C-ApQtys.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-CT26zeMq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PACKS = [
	{
		id: "day-end",
		title: "Day end · FinSight",
		when: "Daily",
		blurb: "Daily close: collect OK, FinSight control matrix (sub-ledger vs GL), exception register, SQL backups.",
		needsCustomer: true,
		icon: "day"
	},
	{
		id: "period-end",
		title: "Period end · FinSight",
		when: "Month-end",
		blurb: "Close readiness: modules in balance, material Out of Balance exposure, ops gates, AMS + finance actions.",
		needsCustomer: true,
		icon: "day"
	},
	{
		id: "ams-weekly",
		title: "Weekly AMS digest",
		when: "Weekly",
		blurb: "Ops + FinSight: health, jobs, Out of Balance lines, backups, licence, risks — is the service and control story green?",
		needsCustomer: true,
		icon: "ams"
	},
	{
		id: "ams-monthly",
		title: "Monthly AMS board pack",
		when: "Monthly",
		blurb: "ExCo deck: uptime and incidents plus FinSight financial integrity, risks, priorities, hotfixes.",
		needsCustomer: true,
		icon: "ams"
	},
	{
		id: "ams-full",
		title: "Applications AMS Report",
		when: "On demand",
		blurb: "Full AMS pack anytime — same board structure as monthly.",
		needsCustomer: true,
		icon: "ams"
	},
	{
		id: "estate",
		title: "Estate overview",
		when: "Anytime",
		blurb: "All customers — health, attention list, FinSight Out of Balance roll-up for ExCo.",
		needsCustomer: false,
		icon: "estate"
	},
	{
		id: "custom-pack",
		title: "Custom report",
		when: "On demand",
		blurb: "Build your own pack — sections, customer, print.",
		needsCustomer: true,
		icon: "ams"
	}
];
function ReportsPage() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/reports" });
	const rows = data?.rows ?? [];
	const [format, setFormat] = (0, import_react.useState)(search.format || "ams-full");
	const [customerCode, setCustomerCode] = (0, import_react.useState)(search.customer || rows[0]?.customerCode || "");
	const [emailTo, setEmailTo] = (0, import_react.useState)("");
	const [previewHtml, setPreviewHtml] = (0, import_react.useState)(null);
	const [previewSubject, setPreviewSubject] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [msg, setMsg] = (0, import_react.useState)(null);
	const pack = PACKS.find((p) => p.id === format) ?? PACKS[1];
	const needsCustomer = pack.needsCustomer;
	(0, import_react.useEffect)(() => {
		if (search.format === "day-end" || search.format === "period-end" || search.format === "ams-full" || search.format === "ams-weekly" || search.format === "ams-monthly" || search.format === "estate" || search.format === "custom-pack") setFormat(search.format);
		if (search.customer) setCustomerCode(search.customer);
	}, [search.format, search.customer]);
	(0, import_react.useEffect)(() => {
		if (!customerCode && rows[0]?.customerCode) setCustomerCode(rows[0].customerCode);
	}, [rows, customerCode]);
	const loadPreview = (0, import_react.useCallback)(async () => {
		if (needsCustomer && !customerCode) {
			setPreviewHtml(null);
			setPreviewSubject("");
			setMsg("Select a customer to preview this pack.");
			return;
		}
		setBusy(true);
		setMsg(null);
		try {
			const qs = new URLSearchParams({ format });
			if (needsCustomer && customerCode) qs.set("customer", customerCode);
			const res = await fetch(`/api/report-preview?${qs.toString()}`, {
				method: "GET",
				credentials: "same-origin",
				headers: { Accept: "application/json" }
			});
			const text = await res.text();
			let r = null;
			try {
				r = text ? JSON.parse(text) : null;
			} catch {
				setPreviewHtml(null);
				setPreviewSubject("");
				setMsg(`Preview failed — server returned non-JSON (HTTP ${res.status}): ` + text.slice(0, 180).replace(/\s+/g, " "));
				return;
			}
			if (r && r.ok && r.html) {
				setPreviewHtml(String(r.html));
				setPreviewSubject(String(r.subject ?? ""));
				if (r.warning) setMsg(`Preview ready (${r.source || "ok"}). Note: ${r.warning}`);
				else if (r.source === "demo" || r.source === "portfolio") setMsg(`Preview ready from ${r.source} data — check SQL if you expected live collect.`);
				else setMsg(null);
			} else {
				setPreviewHtml(null);
				setPreviewSubject("");
				setMsg(r?.error || `Preview failed — empty response (HTTP ${res.status}).`);
			}
		} catch (e) {
			setPreviewHtml(null);
			setPreviewSubject("");
			const m = e instanceof Error ? e.message : String(e);
			setMsg(m.includes("Failed to fetch") || m.includes("NetworkError") ? "Preview request failed (network / server restart). Wait a few seconds and click Refresh preview." : m);
		} finally {
			setBusy(false);
		}
	}, [
		format,
		customerCode,
		needsCustomer
	]);
	(0, import_react.useEffect)(() => {
		const t = window.setTimeout(() => void loadPreview(), 300);
		return () => window.clearTimeout(t);
	}, [loadPreview]);
	const [previewUrl, setPreviewUrl] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!previewHtml) {
			setPreviewUrl(null);
			return;
		}
		const blob = new Blob([previewHtml], { type: "text/html;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [previewHtml]);
	function selectFormat(id) {
		setFormat(id);
		navigate({ search: {
			format: id,
			customer: customerCode || void 0
		} });
	}
	function openPrint() {
		if (!previewHtml) return;
		const w = window.open("", "_blank");
		if (!w) {
			setMsg("Allow pop-ups to print.");
			return;
		}
		w.document.open();
		w.document.write(previewHtml);
		w.document.close();
		w.focus();
		setTimeout(() => {
			try {
				w.print();
			} catch {}
		}, 350);
	}
	async function onEmail() {
		setMsg("Outbound email is disabled in this release. Use Preview / Print.");
	}
	const periodBanner = (() => {
		const now = /* @__PURE__ */ new Date();
		if (format === "ams-weekly") {
			const day = now.getDay();
			const monOffset = day === 0 ? -6 : 1 - day;
			const mon = new Date(now);
			mon.setDate(now.getDate() + monOffset);
			mon.setHours(0, 0, 0, 0);
			const sun = new Date(mon);
			sun.setDate(mon.getDate() + 6);
			const fmt = (d) => d.toLocaleDateString("en-ZA", {
				day: "2-digit",
				month: "short",
				year: "numeric"
			});
			return `Weekly period: ${fmt(mon)} – ${fmt(sun)} (SAST week)`;
		}
		if (format === "ams-monthly" || format === "ams-full") return `Monthly board pack · ${now.toLocaleDateString("en-ZA", {
			month: "long",
			year: "numeric"
		})}`;
		if (format === "day-end") return `Day end · ${now.toLocaleDateString("en-ZA", {
			day: "2-digit",
			month: "short",
			year: "numeric"
		})} (SAST)`;
		if (format === "period-end") return `Period end · FinSight readiness · ${now.toLocaleDateString("en-ZA", {
			month: "long",
			year: "numeric"
		})}`;
		if (format === "estate") return "Estate overview · all active customers";
		return "On-demand pack";
	})();
	const attention = rows.filter((r) => r.healthRag === "Red" || r.healthRag === "Amber");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Reports",
		subtitle: "Day end · period end · AMS packs — preview and print (email off)",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mb-2 text-sm font-bold text-fg",
						children: "1. Choose pack"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-3 text-xs text-muted",
						children: [
							"Weekly and monthly board packs are first. Schedule email delivery from the app host with",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "rounded bg-surface px-1 text-[11px]",
								children: "Install-Weekly-Report-Task.ps1"
							}),
							" ",
							"(and monthly variant). Preview and print in the browser."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid gap-3 sm:grid-cols-3",
						children: PACKS.map((p) => {
							const active = format === p.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => selectFormat(p.id),
								className: cn("rounded-xl border p-4 text-left transition", active ? "border-accent bg-accent-soft ring-2 ring-accent/30" : "border-border bg-surface hover:border-accent/40"),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mb-2 flex items-center gap-2",
										children: [p.icon === "day" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileSpreadsheet, { className: "h-5 w-5 text-accent" }) : p.icon === "ams" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-5 w-5 text-accent" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-5 w-5 text-accent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-bold text-fg",
											children: p.title
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] font-semibold uppercase tracking-wide text-muted",
										children: p.when
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1.5 text-[13px] leading-snug text-muted",
										children: p.blurb
									})
								]
							}, p.id);
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-5 rounded-xl border border-accent/25 bg-accent-soft/50 px-4 py-3 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-semibold text-fg",
						children: ["Reporting period · ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-normal text-muted",
							children: periodBanner
						})]
					}),
					format === "day-end" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[13px] text-muted",
						children: [
							"Daily operational close: collect, FinSight sub-ledger vs GL controls, backups. AMS: SYSPRO operating ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "and" }),
							" financial exceptions visible."
						]
					}),
					format === "period-end" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[13px] text-muted",
						children: "Month-end readiness: which control accounts balance, material |variance|, actions for finance and AMS before close."
					}),
					format === "ams-weekly" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-[11px] text-subtle",
						children: [
							"Weekly AMS: health, job errors (friendly names), FinSight Out of Balance, SQL backups, license, open risks. Schedule:",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "rounded bg-surface px-1",
								children: "Install-Weekly-Report-Task.ps1"
							}),
							" on the app host if you re-enable schedules later."
						]
					}),
					format === "ams-monthly" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[11px] text-subtle",
						children: "Monthly board pack: full AMS narrative for ExCo. Print or email from this page; automate from the Reports page (email off)."
					}),
					(format === "ams-full" || format === "day-end" || format === "estate") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[11px] text-subtle",
						children: "On-demand pack — preview and print (email disabled)."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-2 text-sm font-bold text-fg",
					children: "2. Options & send"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-3 pt-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-end gap-3",
							children: [needsCustomer ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "min-w-[14rem] flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mb-1 block text-xs font-bold text-fg",
									children: "Customer"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									className: "field w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-fg",
									value: customerCode,
									onChange: (e) => {
										setCustomerCode(e.target.value);
										navigate({ search: {
											format,
											customer: e.target.value
										} });
									},
									children: rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: r.customerCode,
										children: r.displayName
									}, r.customerCode))
								})]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "flex-1 text-sm text-muted",
								children: "Estate pack covers all customers — no single customer needed."
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "min-w-[16rem] flex-[1.2]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mb-1 block text-xs font-bold text-fg",
									children: "Email to (optional)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "field w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg",
									placeholder: "Email disabled",
									value: emailTo,
									onChange: (e) => setEmailTo(e.target.value)
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "button",
									size: "sm",
									disabled: busy,
									onClick: () => void loadPreview(),
									children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-1.5 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "mr-1.5 h-4 w-4" }), "Refresh preview"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "button",
									variant: "secondary",
									size: "sm",
									disabled: busy || !previewHtml,
									onClick: openPrint,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "mr-1.5 h-4 w-4" }), "Print / PDF"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "button",
									size: "sm",
									disabled: busy,
									onClick: () => void onEmail(),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "mr-1.5 h-4 w-4" }), "Print pack"]
								})
							]
						}),
						msg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg",
							children: msg
						}) : null,
						previewSubject ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-bold text-fg",
								children: "Subject: "
							}), previewSubject]
						}) : null
					]
				}) })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-2 text-sm font-bold text-fg",
					children: "3. Preview"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "overflow-hidden",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, { children: [pack.title, busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-2 text-xs font-normal normal-case text-muted",
						children: "Generating…"
					}) : null] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
						className: "p-0",
						children: previewUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
							title: "Report preview",
							className: "min-h-[min(75vh,720px)] w-full border-0 bg-white",
							src: previewUrl,
							sandbox: "allow-same-origin allow-modals allow-popups allow-scripts"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "p-6 text-sm text-muted",
							children: busy ? "Generating preview…" : msg ? "Preview could not be generated — see message above." : "Preview will appear here. Print from the browser when ready."
						})
					})]
				})]
			}),
			attention.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-2 text-sm font-bold text-fg",
				children: "Customers needing attention"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-1.5",
				children: attention.slice(0, 8).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RagBadge, { rag: r.healthRag }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-bold text-fg",
							children: r.displayName
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted",
							children: r.healthSummary
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "secondary",
							size: "sm",
							className: "ml-auto",
							onClick: () => {
								setCustomerCode(r.customerCode);
								selectFormat("ams-full");
								navigate({ search: {
									format: "ams-full",
									customer: r.customerCode
								} });
							},
							children: "AMS pack"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/customers/$code",
							params: { code: r.customerCode },
							className: "text-xs font-semibold text-accent underline-offset-2 hover:underline",
							children: "Open"
						})
					]
				}, r.customerCode))
			})] }) : null
		]
	}) });
}
//#endregion
export { ReportsPage as component };
