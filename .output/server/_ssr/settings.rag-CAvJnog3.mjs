import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { i as DEFAULT_RAG } from "./types-Dk-h6nx5.mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
import { f as saveRagSettings, h as suggestRagFromLive, o as fetchSettingsBundle } from "./settings-api-7fPZgfQ4.mjs";
import { t as Button } from "./button-rM46W5TP.mjs";
import { h as Save, u as Sparkles } from "../_libs/lucide-react.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.rag-CAvJnog3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ragClass(r) {
	if (r === "Red") return "text-red-700 dark:text-red-300";
	if (r === "Amber") return "text-amber-800 dark:text-amber-200";
	return "text-emerald-800 dark:text-emerald-200";
}
function RagSettingsPage() {
	const [rag, setRag] = (0, import_react.useState)({ ...DEFAULT_RAG });
	const [msg, setMsg] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [rationale, setRationale] = (0, import_react.useState)([]);
	const [samples, setSamples] = (0, import_react.useState)([]);
	const [estateLine, setEstateLine] = (0, import_react.useState)(null);
	const load = (0, import_react.useCallback)(async () => {
		const b = await fetchSettingsBundle();
		setRag({
			...DEFAULT_RAG,
			...b.rag ?? {}
		});
	}, []);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	async function onSave() {
		setBusy(true);
		setMsg(null);
		try {
			const r = await saveRagSettings({ data: { rag } });
			setMsg("RAG thresholds saved — portfolio health uses these immediately (cache cleared).");
			if (r.rag) setRag(r.rag);
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	async function onSuggest() {
		setBusy(true);
		setMsg(null);
		try {
			const r = await suggestRagFromLive();
			if (!r.ok || !r.result) {
				setMsg(r.message || "Could not load live estate metrics.");
				setRationale([]);
				setSamples([]);
				setEstateLine(null);
				return;
			}
			setRag(r.result.suggested);
			setRationale(r.result.rationale);
			setSamples(r.result.samples);
			const e = r.result.estate;
			setEstateLine(`Active ${e.activeCount} · with collect ${e.withCollect} · max job errors ${e.maxJobErrors} (p75 ${e.p75JobErrors}) · max FinSight Out of Balance ${e.maxDtr}` + (e.maxHoursSinceOps != null ? ` · max collect age ${e.maxHoursSinceOps}h` : ""));
			setMsg(r.message + " — review suggested values and customer RAG preview, then Save thresholds.");
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	function num(key, label, help, min = 0) {
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "block text-xs",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mb-1 block font-medium text-fg",
					children: label
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "field",
					type: "number",
					min,
					value: Number(rag[key]) || 0,
					onChange: (e) => setRag((s) => ({
						...s,
						[key]: Number(e.target.value)
					}))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mt-1 block text-[11px] text-muted",
					children: help
				})
			]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "RAG thresholds" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted",
					children: [
						"Tune estate Red / Amber / Green without redeploying code. Use",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Suggest from live estate"
						}),
						" to set thresholds from current job errors, FinSight variance, and collect age (AHIC, UVSS, …). Then Save."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						disabled: busy,
						onClick: () => void onSuggest(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-4" }), "Suggest from live estate"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						disabled: busy,
						onClick: () => void onSave(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-4" }), "Save thresholds"]
					})]
				}),
				estateLine && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "rounded-md border border-border bg-surface-2 px-3 py-2 text-[11px] text-fg",
					children: estateLine
				}),
				rationale.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "list-disc space-y-1 pl-5 text-xs text-muted",
					children: rationale.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: line }, line))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-3 sm:grid-cols-2",
					children: [
						num("jobErrorsRedAt", "Job errors → Red (at or above)", "Material job-error volume. Suggest uses live max / p75.", 1),
						num("jobErrorsAmberFrom", "Job errors → Amber (from)", "Usually 1. Raised only if every site has a noise floor.", 0),
						num("dtrVarianceRedAt", "FinSight variance lines → Red (0 = off)", "Hard Red for extreme Out of Balance; 0 keeps Out of Balance as Amber-only.", 0),
						num("collectStaleHours", "Collect stale after (hours)", "Feeds assurance score + Collect inventory + alerts.", 1)
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-start gap-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						className: "mt-1",
						checked: rag.dtrVarianceIsAmber,
						onChange: (e) => setRag((s) => ({
							...s,
							dtrVarianceIsAmber: e.target.checked
						}))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium text-fg",
						children: "FinSight variance is Amber"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-0.5 block text-xs text-muted",
						children: "When jobs are clean but any FinSight L1 line has Variance ≠ 0 → Amber."
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-start gap-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						className: "mt-1",
						checked: rag.noOperatorsIsAmber,
						onChange: (e) => setRag((s) => ({
							...s,
							noOperatorsIsAmber: e.target.checked
						}))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium text-fg",
						children: "No operators → Amber"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-0.5 block text-xs text-muted",
						children: "Missing operator snapshot treated as Amber (not Green)."
					})] })]
				}),
				msg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-fg",
					children: msg
				})
			]
		})] }), samples.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Live preview — current vs suggested RAG" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-x-auto rounded-lg border border-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full min-w-[640px] text-left text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "bg-surface-2 text-[11px] uppercase tracking-wide text-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2",
							children: "Customer"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2",
							children: "Jobs err"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2",
							children: "FinSight Out of Balance"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2",
							children: "Ops"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2",
							children: "Age (h)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2",
							children: "Now"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-2 py-2",
							children: "Suggested"
						})
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: samples.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border/80",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: "px-2 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium text-fg",
								children: s.displayName
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] text-muted",
								children: s.customerCode
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-2",
							children: s.jobErrors
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-2",
							children: s.dtrVarLines
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-2",
							children: s.opsCount
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-2",
							children: s.hoursSinceOps == null ? "—" : s.hoursSinceOps
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: cn("px-2 py-2 font-semibold", ragClass(s.currentRag)),
							children: s.currentRag
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: cn("px-2 py-2 font-semibold", ragClass(s.suggestedRag)),
							children: [s.suggestedRag, s.currentRag !== s.suggestedRag ? " *" : ""]
						})
					]
				}, s.customerCode)) })]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-[11px] text-muted",
			children: "* = RAG would change after Save."
		})] })] })]
	});
}
//#endregion
export { RagSettingsPage as component };
