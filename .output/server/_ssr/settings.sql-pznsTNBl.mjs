import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { s as emptySqlConnection } from "./types-Dk-h6nx5.mjs";
import { t as Badge } from "./badge-BccjJCAV.mjs";
import { g as testSqlConnection, o as fetchSettingsBundle, p as saveSqlConnections } from "./settings-api-7fPZgfQ4.mjs";
import { t as Button } from "./button-rM46W5TP.mjs";
import { h as Save, o as Trash2, t as Zap, x as Plus } from "../_libs/lucide-react.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.sql-pznsTNBl.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SqlSettingsPage() {
	const [rows, setRows] = (0, import_react.useState)([]);
	const [runtime, setRuntime] = (0, import_react.useState)(null);
	const [msg, setMsg] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const load = (0, import_react.useCallback)(async () => {
		const b = await fetchSettingsBundle();
		setRows(b.sqlConnections.length ? b.sqlConnections.map((c) => ({
			...c,
			password: ""
		})) : [emptySqlConnection({
			name: "Primary central",
			server: "102.222.21.220",
			port: 14333,
			database: "RPMAssure_App",
			user: "Rpm_collect",
			encrypt: false,
			trustServerCertificate: true
		})]);
		setRuntime(b.runtime);
	}, []);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	function update(i, patch) {
		setRows((prev) => prev.map((r, idx) => idx === i ? {
			...r,
			...patch
		} : r));
	}
	function setPrimary(i) {
		setRows((prev) => prev.map((r, idx) => ({
			...r,
			isPrimary: idx === i
		})));
	}
	async function onSave() {
		setBusy(true);
		setMsg(null);
		try {
			const primary = rows.find((r) => r.isPrimary) ?? rows[0];
			if (primary && !primary.password?.trim() && !primary.passwordConfigured) {
				setMsg("Type the full SQL password in the Password field before Save (field is blank on purpose so a mask is never re-saved).");
				setBusy(false);
				return;
			}
			const res = await saveSqlConnections({ data: { connections: rows } });
			setMsg(res.passwordSaved ? "Saved. Password saved to data/rpma-settings.json. Pool reset — page should stay up." : "Saved (kept previous password). Pool reset — page should stay up.");
			await load();
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	async function onTest(i) {
		setBusy(true);
		setMsg(null);
		try {
			const r = await testSqlConnection({ data: { connection: rows[i] } });
			setMsg(r.message);
			if (r.ok) await load();
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "SQL Server configuration" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs leading-relaxed text-muted",
						children: [
							"Primary connection feeds Global Overview and customer dashboards. Stored in",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono",
								children: "data/rpma-settings.json"
							}),
							". On Save, settings are also synced to ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono",
								children: ".env.local"
							}),
							" so both stay aligned."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-fg",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Password tip:" }),
							" the password box is always empty when the page loads (security). Type the full password, then ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Save" }),
							" or ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Test" }),
							". Leave blank on later saves only if a password is already stored."
						]
					}),
					runtime ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2 text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: runtime.liveTest.ok ? "green" : "amber",
								children: runtime.liveTest.ok ? "Live OK" : "Live issue"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: runtime.liveTest.ok ? "text-muted" : "text-rag-red",
								children: runtime.liveTest.message
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-subtle",
								children: ["· mode ", runtime.dataMode]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-subtle",
								children: ["· effective ", runtime.debug.effectiveSource ?? runtime.debug.source]
							}),
							runtime.debug.server ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-subtle",
								children: [
									"· ",
									runtime.debug.user,
									"@",
									runtime.debug.server,
									":",
									runtime.debug.port,
									"/",
									runtime.debug.database
								]
							}) : null
						]
					}) : null,
					msg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: `rounded-md px-3 py-2 text-xs ${msg.startsWith("OK") || msg.startsWith("Saved") ? "bg-rag-green-bg text-rag-green" : "bg-rag-red-bg text-rag-red"}`,
						children: msg
					}) : null
				]
			})] }),
			rows.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "inline-flex flex-wrap items-center gap-2",
				children: [
					c.name || `Connection ${i + 1}`,
					c.isPrimary ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: "green",
						children: "Primary"
					}) : null,
					c.passwordConfigured ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: "muted",
						children: "Password on file"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: "amber",
						children: "No password saved yet"
					})
				]
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2 sm:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Display name",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "field",
								value: c.name,
								onChange: (e) => update(i, { name: e.target.value })
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Data mode",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: "field",
								value: c.dataMode,
								onChange: (e) => update(i, { dataMode: e.target.value }),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "auto",
										children: "auto"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "live",
										children: "live"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "demo",
										children: "demo"
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Server host (no port here)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "field font-mono",
								value: c.server,
								onChange: (e) => update(i, { server: e.target.value }),
								placeholder: "102.222.21.220",
								autoComplete: "off"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Port",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "field font-mono",
								type: "number",
								value: c.port,
								onChange: (e) => update(i, { port: Number(e.target.value) || 1433 })
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Database",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "field font-mono",
								value: c.database,
								onChange: (e) => update(i, { database: e.target.value }),
								autoComplete: "off"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "User",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "field font-mono",
								value: c.user,
								onChange: (e) => update(i, { user: e.target.value }),
								autoComplete: "username"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Password (type full password to set / change)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "field font-mono",
								type: "password",
								value: c.password,
								onChange: (e) => update(i, { password: e.target.value }),
								placeholder: c.passwordConfigured ? "Leave blank to keep saved password — or type a new one" : "Type SQL password, then Save",
								autoComplete: "new-password"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-end gap-3 pb-1 text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: c.trustServerCertificate,
										onChange: (e) => update(i, { trustServerCertificate: e.target.checked })
									}), "Trust server certificate"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: c.encrypt,
										onChange: (e) => update(i, { encrypt: e.target.checked })
									}), "Encrypt (off for most on-prem)"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "radio",
										name: "primarySql",
										checked: c.isPrimary,
										onChange: () => setPrimary(i)
									}), "Primary for dashboard"]
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						size: "sm",
						variant: "secondary",
						disabled: busy,
						onClick: () => void onTest(i),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-3.5 w-3.5" }), " Test connection"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						size: "sm",
						variant: "ghost",
						disabled: rows.length <= 1,
						onClick: () => setRows((prev) => prev.filter((_, idx) => idx !== i)),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" }), " Remove"]
					})]
				})]
			})] }, c.id)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "secondary",
					onClick: () => setRows((prev) => [...prev, emptySqlConnection({
						name: `Connection ${prev.length + 1}`,
						isPrimary: false,
						encrypt: false
					})]),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " Add SQL server"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					disabled: busy,
					onClick: () => void onSave(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), " Save SQL settings"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
        .field {
          width: 100%;
          height: var(--control-h);
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          padding: 0 0.65rem;
          font-size: 0.8125rem;
          color: var(--color-fg);
        }
      ` })
		]
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block text-xs",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-1 block font-medium text-muted",
			children: label
		}), children]
	});
}
//#endregion
export { SqlSettingsPage as component };
