import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { o as DEFAULT_SSL } from "./types-Dk-h6nx5.mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
import { _ as uploadSslCertificate, m as saveSslSettings, n as clearSslCertificate, s as fetchSslSettings, t as applySslConfig } from "./settings-api-7fPZgfQ4.mjs";
import { t as Button } from "./button-rM46W5TP.mjs";
import { N as KeyRound, d as Shield, h as Save, i as Upload, o as Trash2 } from "../_libs/lucide-react.mjs";
import { n as CardContent, r as CardHead, t as Card } from "./card-xTYX9pTS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.ssl-CvXYkKiG.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SslSettingsPage() {
	const [ssl, setSsl] = (0, import_react.useState)({ ...DEFAULT_SSL });
	const [status, setStatus] = (0, import_react.useState)(null);
	const [caddyPreview, setCaddyPreview] = (0, import_react.useState)("");
	const [certPem, setCertPem] = (0, import_react.useState)("");
	const [keyPem, setKeyPem] = (0, import_react.useState)("");
	const [certFileName, setCertFileName] = (0, import_react.useState)("");
	const [keyFileName, setKeyFileName] = (0, import_react.useState)("");
	const [msg, setMsg] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const load = (0, import_react.useCallback)(async () => {
		const b = await fetchSslSettings();
		setSsl({
			...DEFAULT_SSL,
			...b.ssl
		});
		setStatus(b.status);
		setCaddyPreview(b.caddyPreview || "");
	}, []);
	(0, import_react.useEffect)(() => {
		load();
	}, [load]);
	async function onSave() {
		setBusy(true);
		setMsg(null);
		try {
			const r = await saveSslSettings({ data: { ssl } });
			setSsl({
				...DEFAULT_SSL,
				...r.ssl
			});
			setCaddyPreview(r.caddyPreview || "");
			setMsg("SSL settings saved (not applied to Caddy yet).");
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	async function onUpload() {
		setBusy(true);
		setMsg(null);
		try {
			const r = await uploadSslCertificate({ data: {
				certPem,
				keyPem,
				certFileName: certFileName || void 0,
				keyFileName: keyFileName || void 0
			} });
			if (!r.ok) {
				setMsg("Upload failed: " + ("error" in r && r.error || "unknown"));
				return;
			}
			setStatus(r.status);
			setSsl({
				...DEFAULT_SSL,
				...r.ssl
			});
			setCaddyPreview(r.caddyPreview || "");
			setCertPem("");
			setKeyPem("");
			setMsg("Certificate and key stored. Mode set to Custom. Click Apply Caddyfile, then restart Caddy.");
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	async function onClearCert() {
		if (!confirm("Remove stored certificate and private key from the app host?")) return;
		setBusy(true);
		setMsg(null);
		try {
			const r = await clearSslCertificate();
			setStatus(r.status);
			setSsl({
				...DEFAULT_SSL,
				...r.ssl
			});
			setMsg("Certificate files cleared.");
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	async function onApply() {
		setBusy(true);
		setMsg(null);
		try {
			await saveSslSettings({ data: { ssl } });
			const r = await applySslConfig({ data: { ssl } });
			if (!r.ok) {
				setMsg("Apply failed: " + (r.error || "unknown"));
				setCaddyPreview(r.preview || r.caddyfile || "");
				return;
			}
			setStatus(r.status);
			setCaddyPreview(r.preview || r.caddyfile || "");
			const authNote = r.auth?.message ? ` · ${r.auth.message}` : "";
			setMsg(`Caddyfile written to ${r.caddyPath}.${authNote} Restart Caddy and the app if auth URLs changed.`);
			await load();
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}
	function readFileAsText(file) {
		return new Promise((resolve, reject) => {
			const fr = new FileReader();
			fr.onload = () => resolve(String(fr.result || ""));
			fr.onerror = () => reject(/* @__PURE__ */ new Error("Could not read file"));
			fr.readAsText(file);
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4 text-accent" }), "SSL / HTTPS"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							"Configure public ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "HTTPS only" }),
							" for this host (TCP ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "443" }),
							"). Port ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "80 is not used" }),
							". Caddy terminates TLS and proxies to the app. Choose ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Let's Encrypt" }),
							" (TLS-ALPN on 443) or upload your",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "own certificate" }),
							" (PEM fullchain + private key)."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl border border-border bg-bg/40 p-3 text-[12px] text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-semibold text-fg",
								children: "Go-live checklist — assure.rpmresources.co.za"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
								className: "mt-2 list-decimal space-y-1 pl-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "DNS A-record points to this server's public IP" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										"Firewall / NSG allows inbound TCP ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "443" }),
										" only (not 80)"
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "App listening on 127.0.0.1:8081 (or the port below)" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Mode = Let's Encrypt, hostname = assure.rpmresources.co.za → Save → Apply Caddyfile" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Run install scripts on the host (Administrator) if Caddy is not installed yet" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Open https://assure.rpmresources.co.za and sign in" })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-[11px] text-subtle",
								children: "Host scripts: C:\\RPM-Assure\\deploy\\Preflight-SSL.ps1 then Install-SSL-All.ps1 (from SSL pack). After HTTPS works, restart Node so auth cookies use the HTTPS URL."
							})
						]
					}),
					msg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("rounded-lg border px-3 py-2 text-sm", msg.toLowerCase().includes("fail") ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100" : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"),
						children: msg
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
							className: "text-xs font-bold uppercase tracking-wide text-muted",
							children: "Mode"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid gap-2 sm:grid-cols-3",
							children: [
								[
									"letsencrypt",
									"Let's Encrypt",
									"Free auto cert on TCP 443 only (TLS-ALPN; no port 80)"
								],
								[
									"custom",
									"Own certificate",
									"Upload PEM cert + private key (HTTPS only)"
								],
								[
									"disabled",
									"Disabled",
									"No Caddy HTTPS block"
								]
							].map(([mode, label, hint]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: cn("cursor-pointer rounded-xl border p-3 text-sm transition", ssl.mode === mode ? "border-accent bg-accent-soft shadow-sm" : "border-border bg-surface hover:border-accent/40"),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "radio",
										className: "mr-2",
										name: "ssl-mode",
										checked: ssl.mode === mode,
										onChange: () => setSsl((s) => ({
											...s,
											mode
										}))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-semibold text-fg",
										children: label
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-1 block text-[11px] text-muted",
										children: hint
									})
								]
							}, mode))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mb-1 block font-medium text-muted",
									children: "Public hostname"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "field",
									value: ssl.hostname,
									placeholder: "assure.rpmresources.co.za",
									onChange: (e) => setSsl((s) => ({
										...s,
										hostname: e.target.value
									}))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mb-1 block font-medium text-muted",
									children: "Let's Encrypt email (optional)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "field",
									type: "email",
									value: ssl.letsEncryptEmail,
									placeholder: "ops@rpmresources.co.za",
									onChange: (e) => setSsl((s) => ({
										...s,
										letsEncryptEmail: e.target.value
									}))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mb-1 block font-medium text-muted",
									children: "App host (upstream)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "field",
									value: ssl.appHost,
									onChange: (e) => setSsl((s) => ({
										...s,
										appHost: e.target.value
									}))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "block text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mb-1 block font-medium text-muted",
									children: "App port"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "field",
									type: "number",
									min: 1,
									max: 65535,
									value: ssl.appPort,
									onChange: (e) => setSsl((s) => ({
										...s,
										appPort: Number(e.target.value) || 8081
									}))
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-4 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: ssl.hsts,
								onChange: (e) => setSsl((s) => ({
									...s,
									hsts: e.target.checked
								}))
							}), "HSTS header"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: ssl.patchAuthUrls,
								onChange: (e) => setSsl((s) => ({
									...s,
									patchAuthUrls: e.target.checked
								}))
							}), "Patch auth URLs to https://hostname on Apply"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							disabled: busy,
							onClick: () => void onSave(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "mr-1.5 h-4 w-4" }), "Save settings"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							variant: "secondary",
							disabled: busy,
							onClick: () => void onApply(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "mr-1.5 h-4 w-4" }), "Apply Caddyfile"]
						})]
					}),
					ssl.lastAppliedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[11px] text-muted",
						children: ["Last applied: ", new Date(ssl.lastAppliedAt).toLocaleString("en-ZA")]
					}) : null
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHead, {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4 text-accent" }), "Own certificate (PEM)"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							"Upload ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "full chain" }),
							" (certificate + intermediates) and the matching",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "private key" }),
							" as PEM text. PFX/P12 is not accepted here — convert first:",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "mx-1 rounded bg-surface-2 px-1",
								children: "openssl pkcs12 -in site.pfx -out fullchain.pem -clcerts -nokeys"
							}),
							"and",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "mx-1 rounded bg-surface-2 px-1",
								children: "openssl pkcs12 -in site.pfx -out privkey.pem -nocerts -nodes"
							}),
							". Keys are stored only on the app host and never shown again."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-border bg-surface-2/50 px-3 py-2 text-xs text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-semibold text-fg",
							children: "On disk"
						}), status ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-1 space-y-0.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
									"Certificate:",
									" ",
									status.certPresent ? `present (${status.certBytes} bytes)` : "missing",
									ssl.certFileName ? ` · ${ssl.certFileName}` : ""
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
									"Private key:",
									" ",
									status.keyPresent ? `present (${status.keyBytes} bytes)` : "missing",
									ssl.keyFileName ? ` · ${ssl.keyFileName}` : ""
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "truncate",
									title: status.localCertPath,
									children: ["Path: ", status.localCertPath]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "truncate",
									title: status.deployCertPath,
									children: ["Caddy path: ", status.deployCertPath]
								})
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Loading…" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 md:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "mb-1 block text-xs font-medium text-muted",
								children: "Certificate file (.pem / .crt)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "file",
								accept: ".pem,.crt,.cer,.txt",
								className: "mb-2 block w-full text-xs",
								onChange: (e) => {
									const f = e.target.files?.[0];
									if (!f) return;
									setCertFileName(f.name);
									readFileAsText(f).then(setCertPem).catch((err) => setMsg(String(err)));
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								className: "field min-h-[140px] font-mono text-[11px]",
								placeholder: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
								value: certPem,
								onChange: (e) => setCertPem(e.target.value),
								spellCheck: false
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "mb-1 block text-xs font-medium text-muted",
								children: "Private key file (.pem / .key)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "file",
								accept: ".pem,.key,.txt",
								className: "mb-2 block w-full text-xs",
								onChange: (e) => {
									const f = e.target.files?.[0];
									if (!f) return;
									setKeyFileName(f.name);
									readFileAsText(f).then(setKeyPem).catch((err) => setMsg(String(err)));
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								className: "field min-h-[140px] font-mono text-[11px]",
								placeholder: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
								value: keyPem,
								onChange: (e) => setKeyPem(e.target.value),
								spellCheck: false
							})
						] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							disabled: busy || !certPem.trim() || !keyPem.trim(),
							onClick: () => void onUpload(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "mr-1.5 h-4 w-4" }), "Upload certificate"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							variant: "secondary",
							disabled: busy || !(status?.certPresent || status?.keyPresent),
							onClick: () => void onClearCert(),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "mr-1.5 h-4 w-4" }), "Clear stored cert"]
						})]
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, { children: "Caddyfile preview" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							"Written to",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "rounded bg-surface-2 px-1",
								children: status?.caddyfilePath || "C:\\RPM-Assure\\deploy\\Caddyfile"
							}),
							" ",
							"when you click Apply. Then restart Caddy:"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "overflow-x-auto rounded-lg border border-border bg-nav p-3 text-[11px] text-nav-fg",
						children: `# After Apply Caddyfile:
caddy validate --config C:\\RPM-Assure\\deploy\\Caddyfile
# Restart service or task:
#   nssm restart RPMAssure-Caddy
#   OR  schtasks /Run /TN RPMAssure-Caddy-OnStart
#   OR  caddy reload --config C:\\RPM-Assure\\deploy\\Caddyfile`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "max-h-72 overflow-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-[11px] text-fg whitespace-pre-wrap",
						children: caddyPreview || "Save or change mode to preview…"
					})
				]
			})] })
		]
	});
}
//#endregion
export { SslSettingsPage as component };
