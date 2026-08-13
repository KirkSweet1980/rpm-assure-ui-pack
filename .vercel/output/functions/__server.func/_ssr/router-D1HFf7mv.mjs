import { M as redirect, c as HeadContent, d as createRouter, f as Outlet, h as createRootRoute, m as createFileRoute, p as lazyRouteComponent, s as Scripts } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { r as hasSqlConfig, t as getDataMode } from "./sql-config-BAM-cI78.mjs";
import { n as getPool, r as import_mssql } from "./sql-pool-kLXZ0UEv.mjs";
import { t as auth } from "./server-DhYyBlji.mjs";
import { t as Route$66 } from "./customers._code-DMK4iK3J.mjs";
import { n as ThemeProvider, t as DensityProvider } from "./theme-CBGmf9SK.mjs";
import { t as ROOT_ADMIN_EMAIL } from "./root-admin-vQ7nqsRE.mjs";
import { a as getDemoPortfolio, i as getDemoCustomerDetail, n as fetchLivePortfolio, r as fillCustomerPanels, t as fetchLiveCustomerDetail } from "./live-portfolio-BRTWk7If.mjs";
import { t as Route$67 } from "./reports-C-ApQtys.mjs";
import { i as buildPortfolioAmsHtml, n as buildDayEndFinSightHtml, r as buildPeriodEndFinSightHtml, t as buildApplicationsAmsHtml } from "./ams-report-html-DDL_kaDs.mjs";
import { t as Route$68 } from "./routes-azrtqO9k.mjs";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
//#region node_modules/.nitro/vite/services/ssr/assets/router-D1HFf7mv.js
var import_jsx_runtime = require_jsx_runtime();
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
var styles_default = "/assets/styles-Bmz8td7_.css";
var Route$65 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover"
			},
			{ title: "RPM Assure · Assure Insight" },
			{
				name: "description",
				content: "Multitenant AMS reporting for managed customers — SYSPRO and more."
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&display=swap"
			}
		]
	}),
	component: RootComponent
});
function RootComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en-ZA",
		className: "rpma-crisp",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DensityProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }) }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
var $$splitComponentImporter$59 = () => import("./login-eAoord6N.mjs");
var Route$64 = createFileRoute("/login")({ component: lazyRouteComponent($$splitComponentImporter$59, "component") });
var $$splitComponentImporter$58 = () => import("./security-DYoCg9t9.mjs");
var Route$63 = createFileRoute("/security")({ component: lazyRouteComponent($$splitComponentImporter$58, "component") });
var $$splitComponentImporter$57 = () => import("./settings-BuZv1SvR.mjs");
var Route$62 = createFileRoute("/settings")({ component: lazyRouteComponent($$splitComponentImporter$57, "component") });
var $$splitComponentImporter$56 = () => import("./two-factor-DPvOeXoz.mjs");
var Route$61 = createFileRoute("/two-factor")({ component: lazyRouteComponent($$splitComponentImporter$56, "component") });
/**
* Second factor after password sign-in.
* better-auth holds a short-lived 2FA cookie until TOTP/backup succeeds.
*/
/**
* Bootstrap / reset Platform Admin (Better Auth credential + App_User).
*
* Password sources (first wins):
*   1) data/admin-bootstrap.json  { "email", "password", "reset": true }
*   2) RPM_ASSURE_ADMIN_PASSWORD in process.env / .env.local
*
* No password is hardcoded in source.
*/
var globalRef = globalThis;
function logOnce(key, msg, level = "log") {
	if (globalRef.__rpmaBootstrapLogged__ === key) return;
	globalRef.__rpmaBootstrapLogged__ = key;
	if (level === "warn") console.warn(msg);
	else console.log(msg);
}
function truthy(v) {
	if (v === true) return true;
	if (v === false || v == null) return false;
	return [
		"1",
		"true",
		"yes",
		"on"
	].includes(String(v).trim().toLowerCase());
}
function stripBom(s) {
	return s.replace(/^\uFEFF/, "").trim();
}
function parseEnvFile(text) {
	const out = {};
	const body = text.replace(/^\uFEFF/, "");
	for (const raw of body.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;
		const eq = line.indexOf("=");
		if (eq <= 0) continue;
		const key = stripBom(line.slice(0, eq));
		let val = line.slice(eq + 1).trim();
		if (val.startsWith("\"") && val.endsWith("\"") || val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
		out[key] = stripBom(val);
	}
	return out;
}
function loadAdminEnvFromDisk(force = false) {
	if (globalRef.__rpmaEnvLocalLoaded__ && !force) return;
	const candidates = [
		join(process.cwd(), ".env.local"),
		join(process.cwd(), ".env"),
		"C:\\RPM-Assure\\App\\.env.local",
		"C:\\RPM-Assure\\App\\.env"
	];
	for (const p of candidates) try {
		if (!existsSync(p)) continue;
		const map = parseEnvFile(readFileSync(p, "utf8"));
		for (const [k, v] of Object.entries(map)) if (k.startsWith("RPM_ASSURE_ADMIN") || k === "RPM_ASSURE_RESET_ADMIN" || process.env[k] === void 0 || process.env[k] === "") process.env[k] = v;
		logOnce("env:" + p, `[bootstrap-admin] loaded env from ${p}`);
	} catch {}
	globalRef.__rpmaEnvLocalLoaded__ = true;
}
function readBootstrapJson() {
	const candidates = [join(process.cwd(), "data", "admin-bootstrap.json"), "C:\\RPM-Assure\\App\\data\\admin-bootstrap.json"];
	for (const p of candidates) try {
		if (!existsSync(p)) continue;
		const raw = readFileSync(p, "utf8").replace(/^\uFEFF/, "");
		const j = JSON.parse(raw);
		if (j.password) j.password = stripBom(String(j.password));
		if (j.email) j.email = stripBom(String(j.email)).toLowerCase();
		logOnce("json:" + p, `[bootstrap-admin] read ${p}`);
		return j;
	} catch (e) {
		console.warn("[bootstrap-admin] bad json", p, e);
	}
	return null;
}
function clearBootstrapJson() {
	for (const p of [join(process.cwd(), "data", "admin-bootstrap.json"), "C:\\RPM-Assure\\App\\data\\admin-bootstrap.json"]) try {
		if (existsSync(p)) unlinkSync(p);
	} catch {}
}
function writeStatus(msg) {
	try {
		const dir = join(process.cwd(), "data");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "admin-bootstrap-status.txt"), `${(/* @__PURE__ */ new Date()).toISOString()} ${msg}\n`, "utf8");
	} catch {}
}
async function upsertAppUserAdmin(email, displayName) {
	if (!hasSqlConfig() || getDataMode() === "demo") return;
	try {
		const pool = await getPool();
		if (!pool) return;
		await pool.request().query(`
      IF COL_LENGTH(N'dbo.App_User', N'StaffRole') IS NULL
        ALTER TABLE dbo.App_User ADD StaffRole nvarchar(30) NULL;
    `);
		const userName = (email.split("@")[0] || "admin").slice(0, 100);
		await pool.request().input("email", import_mssql.default.NVarChar(256), email).input("dn", import_mssql.default.NVarChar(200), displayName).input("un", import_mssql.default.NVarChar(100), userName).query(`
        IF EXISTS (SELECT 1 FROM dbo.App_User WHERE LOWER(Email) = @email)
          UPDATE dbo.App_User
          SET DisplayName = @dn, UserName = @un, StaffRole = N'PlatformAdmin',
              IsPlatformAdmin = 1, IsActive = 1, UpdatedAt = SYSUTCDATETIME()
          WHERE LOWER(Email) = @email;
        ELSE
          INSERT INTO dbo.App_User (UserName, Email, DisplayName, StaffRole, IsPlatformAdmin, IsActive)
          VALUES (@un, @email, @dn, N'PlatformAdmin', 1, 1);
      `);
	} catch (e) {
		console.warn("[bootstrap-admin] App_User sync skipped:", e);
	}
}
async function setCredentialPassword(ctx, email, password, displayName) {
	const hash = await ctx.password.hash(password);
	const existing = await ctx.internalAdapter.findUserByEmail(email);
	if (existing?.user) {
		if ((await ctx.internalAdapter.findAccounts(existing.user.id) ?? []).find((a) => a.providerId === "credential")) await ctx.internalAdapter.updatePassword(existing.user.id, hash);
		else await ctx.internalAdapter.linkAccount({
			userId: existing.user.id,
			providerId: "credential",
			accountId: existing.user.id,
			password: hash
		});
		await ctx.internalAdapter.updateUser(existing.user.id, { name: displayName });
		return "reset";
	}
	const created = await ctx.internalAdapter.createUser({
		email,
		name: displayName,
		emailVerified: true
	});
	if (!created?.id) throw new Error("Failed to create auth user " + email);
	await ctx.internalAdapter.linkAccount({
		userId: created.id,
		providerId: "credential",
		accountId: created.id,
		password: hash
	});
	return "created";
}
async function runBootstrap() {
	loadAdminEnvFromDisk();
	const file = readBootstrapJson();
	const email = stripBom(file?.email || process.env.RPM_ASSURE_ADMIN_EMAIL || "rpmadmin@rpm.local").toLowerCase();
	const password = stripBom(file?.password || process.env.RPM_ASSURE_ADMIN_PASSWORD || "");
	const force = truthy(file?.reset) || truthy(process.env.RPM_ASSURE_RESET_ADMIN) || Boolean(file?.password);
	const displayName = "RPM Admin";
	try {
		const ctx = await auth.$context;
		const count = (await ctx.adapter.findMany({ model: "user" }))?.length ?? 0;
		const existing = await ctx.internalAdapter.findUserByEmail(email);
		const emptyDb = count === 0;
		if (!force && !emptyDb && existing?.user) {
			const accounts = await ctx.internalAdapter.findAccounts(existing.user.id);
			if ((accounts ?? []).some((a) => a.providerId === "credential" && Boolean(a.password))) {
				let verifyNote = "";
				if (password.length >= 8) try {
					const cred = (accounts ?? []).find((a) => a.providerId === "credential" && a.password);
					if (cred?.password) verifyNote = await ctx.password.verify({
						hash: cred.password,
						password
					}) ? " Env password MATCHES stored hash." : " Env password does NOT match stored hash — run Fix-Login with reset.";
				} catch {}
				const message = `Admin ${email} already set.${verifyNote}`;
				logOnce("admin-ok", "[bootstrap-admin] " + message);
				writeStatus(message);
				globalRef.__rpmaBootstrapLastOk__ = true;
				return {
					ok: true,
					message,
					userCount: count
				};
			}
		}
		if (!force && !emptyDb && count > 0 && !existing?.user) {
			const message = `Auth has ${count} user(s) but not ${email}; force via admin-bootstrap.json with reset:true.`;
			console.log("[bootstrap-admin]", message);
			writeStatus(message);
			globalRef.__rpmaBootstrapLastOk__ = true;
			return {
				ok: true,
				message
			};
		}
		if (!password || password.length < 8) {
			const message = count === 0 ? "No auth users and no password configured. Run Fix-Login.ps1 or set RPM_ASSURE_ADMIN_PASSWORD, then GET /api/bootstrap-admin." : "Reset requested but password missing/too short (min 8).";
			console.warn("[bootstrap-admin]", message);
			writeStatus(message);
			globalRef.__rpmaBootstrapLastOk__ = false;
			return {
				ok: false,
				message
			};
		}
		const emailsToStamp = Array.from(new Set([
			email,
			"rpmadmin@rpm.local",
			"rpmroot@rpm.local",
			ROOT_ADMIN_EMAIL
		].map((e) => e.toLowerCase()).filter(Boolean)));
		const actions = [];
		for (const em of emailsToStamp) {
			const act = await setCredentialPassword(ctx, em, password, displayName);
			actions.push(`${act}:${em}`);
			await upsertAppUserAdmin(em, displayName);
		}
		{
			const again = await ctx.internalAdapter.findUserByEmail(email);
			if (again?.user) {
				const cred = (await ctx.internalAdapter.findAccounts(again.user.id) ?? []).find((a) => a.providerId === "credential" && a.password);
				if (cred?.password) {
					if (!await ctx.password.verify({
						hash: cred.password,
						password
					})) {
						const message = `Password verify FAILED after write for ${email}`;
						writeStatus(message);
						globalRef.__rpmaBootstrapLastOk__ = false;
						return {
							ok: false,
							message
						};
					}
				}
			}
		}
		const message = `Password set (${actions.join(", ")}). Sign in: RPMAdmin`;
		console.log("[bootstrap-admin]", message);
		writeStatus(message);
		await upsertAppUserAdmin(email, displayName);
		if (file) clearBootstrapJson();
		const finalMsg = `OK — sign in Username: RPMAdmin  Password: (the one you set). Email: ${email}`;
		writeStatus(finalMsg);
		globalRef.__rpmaBootstrapLastOk__ = true;
		return {
			ok: true,
			message: finalMsg
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		console.error("[bootstrap-admin] failed:", e);
		writeStatus("FAIL " + message);
		globalRef.__rpmaBootstrapLastOk__ = false;
		return {
			ok: false,
			message
		};
	}
}
function ensureBootstrapAdmin() {
	loadAdminEnvFromDisk();
	const file = readBootstrapJson();
	if (truthy(file?.reset) || truthy(process.env.RPM_ASSURE_RESET_ADMIN) || Boolean(file?.password) || globalRef.__rpmaBootstrapLastOk__ === false) globalRef.__rpmaBootstrapAdminPromise__ = void 0;
	globalRef.__rpmaBootstrapAdminPromise__ ??= runBootstrap().then((r) => {
		if (!r.ok) globalRef.__rpmaBootstrapAdminPromise__ = void 0;
		return r;
	});
	return globalRef.__rpmaBootstrapAdminPromise__;
}
async function runAdminBootstrapNow() {
	globalRef.__rpmaBootstrapAdminPromise__ = void 0;
	globalRef.__rpmaEnvLocalLoaded__ = false;
	globalRef.__rpmaBootstrapLastOk__ = void 0;
	globalRef.__rpmaBootstrapLogged__ = void 0;
	return ensureBootstrapAdmin();
}
ensureBootstrapAdmin();
/**
* GET /api/bootstrap-admin — create/reset Platform Admin from env or bootstrap file.
* Does not return the password.
*/
var Route$60 = createFileRoute("/api/bootstrap-admin")({ server: { handlers: {
	GET: async () => {
		const result = await runAdminBootstrapNow();
		return new Response(JSON.stringify({
			...result,
			hint: "Sign in with username RPMAdmin (or rpmadmin@rpm.local). Password from admin-bootstrap.json / RPM_ASSURE_ADMIN_PASSWORD."
		}), {
			status: result.ok ? 200 : 500,
			headers: { "content-type": "application/json" }
		});
	},
	POST: async () => {
		const result = await runAdminBootstrapNow();
		return new Response(JSON.stringify(result), {
			status: result.ok ? 200 : 500,
			headers: { "content-type": "application/json" }
		});
	}
} } });
async function loadPortfolioForReport() {
	if (getDataMode() !== "demo" && hasSqlConfig()) try {
		const live = await fetchLivePortfolio();
		if (live?.rows?.length) return live;
	} catch (e) {
		console.warn("[rpm-assure] report portfolio live failed:", e instanceof Error ? e.message : e);
	}
	return getDemoPortfolio();
}
function emptyCustomerDetail(row) {
	return {
		customer: row,
		operators: [],
		recentLogins: [],
		jobErrors: [],
		dtrLevel1: [],
		dtrDetailLines: [],
		finsightReconCases: [],
		license: null,
		healthLogs: [],
		taskGroups: [],
		taskItems: [],
		incidents: [],
		problems: [],
		risks: [],
		issues: [],
		priorities: [],
		slaPolicies: [],
		availabilitySla: null,
		amsSlaSummary: null,
		changes: [],
		csat: null,
		operGroups: [],
		operAmends: [],
		securitySummary: {
			groupMemberships: 0,
			distinctOperatorsInGroups: 0,
			distinctGroups: 0,
			amendCount90d: 0
		},
		execSummary: null,
		execNarratives: [],
		auditEvents: [],
		diagSummaries: [],
		sqlHealthRows: [],
		extraSummary: {
			auditCount: 0,
			diagCount: 0,
			sqlHealthCount: 0,
			sqlHealthFailCount: 0,
			lastAuditImport: null
		},
		operationalAssurance: {
			collectAgeHours: null,
			collectFresh: false,
			jobErrorCount: row.sysproJobErrorCount,
			activeUserRatioPct: null,
			dtrOutOfBalance: row.sysproDtrVarianceLines,
			scorePct: row.healthRag === "Green" ? 80 : row.healthRag === "Amber" ? 55 : 30,
			summary: row.healthSummary || "Portfolio row only — detail collect incomplete."
		},
		sqlBackups: [],
		sqlBackupFailures: [],
		sysproVersion: null,
		sysproHotfixes: [],
		hotfixGap: [],
		hotfixGapSummary: null,
		rmm: {
			enabled: false,
			pillarOn: false,
			pulsewayOrgName: null,
			summary: null,
			devices: [],
			alerts: [],
			mapping: [],
			message: null
		},
		cove: {
			enabled: false,
			summary: null,
			devices: [],
			mapping: [],
			unmapped: [],
			message: null
		},
		dataMode: "live"
	};
}
async function loadCustomerForReport(code) {
	const mode = getDataMode();
	let lastErr = null;
	if (mode !== "demo" && hasSqlConfig()) try {
		const live = await fetchLiveCustomerDetail(code);
		if (live) try {
			return {
				customer: fillCustomerPanels(live),
				source: "live",
				warning: null
			};
		} catch (e) {
			lastErr = e instanceof Error ? e.message : String(e);
			console.warn("[rpm-assure] fillCustomerPanels failed:", lastErr);
			return {
				customer: live,
				source: "live",
				warning: lastErr
			};
		}
	} catch (e) {
		lastErr = e instanceof Error ? e.message : String(e);
		console.warn("[rpm-assure] report customer live failed:", lastErr);
	}
	try {
		const demo = getDemoCustomerDetail(code);
		if (demo) return {
			customer: fillCustomerPanels(demo),
			source: "demo",
			warning: lastErr ? `Live detail failed (${lastErr}); showing demo/fallback.` : null
		};
	} catch (e) {
		lastErr = e instanceof Error ? e.message : String(e);
	}
	try {
		const row = (await loadPortfolioForReport()).rows.find((r) => (r.customerCode || "").toUpperCase() === code.toUpperCase());
		if (row) return {
			customer: fillCustomerPanels(emptyCustomerDetail(row)),
			source: "portfolio",
			warning: lastErr ? `Detail load failed (${lastErr}); preview built from portfolio metrics only.` : "Preview built from portfolio metrics only."
		};
	} catch (e) {
		lastErr = e instanceof Error ? e.message : String(e);
	}
	return {
		customer: null,
		source: "none",
		warning: lastErr
	};
}
function fallbackReportPack(format, customer, err) {
	const name = customer?.customer?.displayName || customer?.customer?.customerCode || "Customer";
	const code = customer?.customer?.customerCode || "—";
	const rag = customer?.customer?.healthRag || "—";
	const subject = `RPM Assure — ${format} — ${name} (partial)`;
	const text = `${subject}\n\nPreview builder error: ${err}\nHealth: ${rag}`;
	return {
		subject,
		html: `<!DOCTYPE html><html lang="en-ZA"><head><meta charset="utf-8"/><title>${subject.replace(/</g, "")}</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#1a1a1a}h1{color:#12365a}.err{background:#fff4f4;border:1px solid #e8b4b4;padding:12px;border-radius:8px;margin:16px 0}</style></head><body>
<h1>RPM Assure — ${format}</h1>
<p><strong>${name}</strong> (${code}) · Health ${rag}</p>
<div class="err"><strong>Full pack could not be built.</strong><br/>${String(err).replace(/</g, "<")}</div>
<ul>
<li>Job errors: ${customer?.customer?.sysproJobErrorCount ?? "—"}</li>
<li>FinSight Out of Balance lines: ${customer?.customer?.sysproDtrVarianceLines ?? "—"}</li>
<li>Active users: ${customer?.customer?.activeUserCount ?? "—"}</li>
<li>Last collect: ${customer?.customer?.lastImportAt ?? "—"}</li>
</ul>
</body></html>`,
		text
	};
}
function buildPack(format, customer, portfolio) {
	if (format === "estate") return buildPortfolioAmsHtml(portfolio);
	if (!customer) throw new Error("Customer required for this format");
	if (format === "day-end") return buildDayEndFinSightHtml({
		customer,
		portfolio
	});
	if (format === "period-end") return buildPeriodEndFinSightHtml({
		customer,
		portfolio
	});
	if (format === "ams-weekly") return buildApplicationsAmsHtml({
		customer,
		portfolio,
		variant: "weekly"
	});
	if (format === "ams-monthly") return buildApplicationsAmsHtml({
		customer,
		portfolio,
		variant: "monthly"
	});
	return buildApplicationsAmsHtml({
		customer,
		portfolio,
		variant: "full"
	});
}
async function buildReportPreview(opts) {
	try {
		const raw = (opts.format || "ams-full").toLowerCase();
		const format = raw === "day-end" || raw === "period-end" || raw === "estate" || raw === "custom-pack" || raw === "ams-full" || raw === "ams-weekly" || raw === "ams-monthly" ? raw : "ams-full";
		let portfolio;
		try {
			portfolio = await loadPortfolioForReport();
		} catch (e) {
			return {
				ok: false,
				error: "Could not load portfolio: " + (e instanceof Error ? e.message : String(e))
			};
		}
		if (format === "estate") try {
			const pack = buildPortfolioAmsHtml(portfolio);
			return {
				ok: true,
				subject: pack.subject,
				html: pack.html,
				source: portfolio.summary?.dataMode ?? "demo",
				warning: null
			};
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			const pack = fallbackReportPack("estate", null, msg);
			return {
				ok: true,
				subject: pack.subject,
				html: pack.html,
				source: "fallback",
				warning: msg
			};
		}
		const code = (opts.customerCode || "").trim();
		if (!code) return {
			ok: false,
			error: "Select a customer (or wait for the list to load)."
		};
		let loaded;
		try {
			loaded = await loadCustomerForReport(code);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			return {
				ok: false,
				error: "Could not load customer " + code + ": " + msg
			};
		}
		if (!loaded.customer) return {
			ok: false,
			error: "Customer not found: " + code + (loaded.warning ? " — " + loaded.warning : "") + ". Check Dim_Customer is Active and collect has run."
		};
		try {
			const pack = buildPack(format, loaded.customer, portfolio);
			if (!pack?.html) throw new Error("Report builder returned empty HTML");
			return {
				ok: true,
				subject: pack.subject,
				html: pack.html,
				source: loaded.source,
				warning: loaded.warning
			};
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			console.error("[rpm-assure] buildReportPreview buildPack failed:", msg);
			const pack = fallbackReportPack(format, loaded.customer, msg);
			return {
				ok: true,
				subject: pack.subject,
				html: pack.html,
				source: loaded.source,
				warning: "Builder error (fallback pack): " + msg
			};
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.error("[rpm-assure] buildReportPreview failed:", msg);
		return {
			ok: false,
			error: "Preview failed: " + msg
		};
	}
}
/**
* Reliable JSON endpoint for AMS report preview.
* Avoids createServerFn POST empty-body issues on some Windows/Vite setups.
*
* GET  /api/report-preview?format=day-end&customer=UVSS
* POST /api/report-preview  { "format":"day-end", "customerCode":"UVSS" }
*/
var Route$59 = createFileRoute("/api/report-preview")({ server: { handlers: {
	GET: async ({ request }) => {
		const url = new URL(request.url);
		const result = await buildReportPreview({
			format: url.searchParams.get("format") || "ams-full",
			customerCode: url.searchParams.get("customer") || url.searchParams.get("customerCode") || void 0
		});
		return new Response(JSON.stringify(result), {
			status: result.ok ? 200 : 400,
			headers: {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store"
			}
		});
	},
	POST: async ({ request }) => {
		let body = {};
		try {
			body = await request.json();
		} catch {}
		const result = await buildReportPreview({
			format: body.format,
			customerCode: body.customerCode || body.customer
		});
		return new Response(JSON.stringify(result), {
			status: result.ok ? 200 : 400,
			headers: {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store"
			}
		});
	}
} } });
var Route$58 = createFileRoute("/settings/")({ beforeLoad: () => {
	throw redirect({ to: "/settings/sql" });
} });
var $$splitComponentImporter$55 = () => import("./settings.about-w-6_am66.mjs");
var Route$57 = createFileRoute("/settings/about")({ component: lazyRouteComponent($$splitComponentImporter$55, "component") });
var $$splitComponentImporter$54 = () => import("./settings.alerts-dLYQTRgh.mjs");
var Route$56 = createFileRoute("/settings/alerts")({ component: lazyRouteComponent($$splitComponentImporter$54, "component") });
var $$splitComponentImporter$53 = () => import("./settings.audit-1mavqyZJ.mjs");
var Route$55 = createFileRoute("/settings/audit")({ component: lazyRouteComponent($$splitComponentImporter$53, "component") });
var $$splitComponentImporter$52 = () => import("./settings.collect-DtQkC3a4.mjs");
var Route$54 = createFileRoute("/settings/collect")({ component: lazyRouteComponent($$splitComponentImporter$52, "component") });
var $$splitComponentImporter$51 = () => import("./settings.dashboard-Csn5J7Q6.mjs");
var Route$53 = createFileRoute("/settings/dashboard")({ component: lazyRouteComponent($$splitComponentImporter$51, "component") });
var $$splitComponentImporter$50 = () => import("./settings.integrations-DSvkAE7s.mjs");
var Route$52 = createFileRoute("/settings/integrations")({ component: lazyRouteComponent($$splitComponentImporter$50, "component") });
var $$splitComponentImporter$49 = () => import("./settings.profile-C-m9hvXX.mjs");
var Route$51 = createFileRoute("/settings/profile")({ component: lazyRouteComponent($$splitComponentImporter$49, "component") });
var $$splitComponentImporter$48 = () => import("./settings.query-CX_OpeR8.mjs");
var Route$50 = createFileRoute("/settings/query")({ component: lazyRouteComponent($$splitComponentImporter$48, "component") });
var $$splitComponentImporter$47 = () => import("./settings.rag-CAvJnog3.mjs");
var Route$49 = createFileRoute("/settings/rag")({ component: lazyRouteComponent($$splitComponentImporter$47, "component") });
var $$splitComponentImporter$46 = () => import("./settings.reports-Br2Ivgb5.mjs");
var Route$48 = createFileRoute("/settings/reports")({ component: lazyRouteComponent($$splitComponentImporter$46, "component") });
var $$splitComponentImporter$45 = () => import("./settings.security-CVe3tILQ.mjs");
var Route$47 = createFileRoute("/settings/security")({ component: lazyRouteComponent($$splitComponentImporter$45, "component") });
var $$splitComponentImporter$44 = () => import("./settings.smtp-BTTBDghg.mjs");
var Route$46 = createFileRoute("/settings/smtp")({ component: lazyRouteComponent($$splitComponentImporter$44, "component") });
/** Outbound email removed from RPM Assure for now. */
var $$splitComponentImporter$43 = () => import("./settings.sql-pznsTNBl.mjs");
var Route$45 = createFileRoute("/settings/sql")({ component: lazyRouteComponent($$splitComponentImporter$43, "component") });
var $$splitComponentImporter$42 = () => import("./settings.ssl-CvXYkKiG.mjs");
var Route$44 = createFileRoute("/settings/ssl")({ component: lazyRouteComponent($$splitComponentImporter$42, "component") });
var $$splitComponentImporter$41 = () => import("./settings.users-BQkiq0hD.mjs");
var Route$43 = createFileRoute("/settings/users")({ component: lazyRouteComponent($$splitComponentImporter$41, "component") });
var Route$42 = createFileRoute("/api/auth/$")({ server: { handlers: {
	GET: async ({ request }) => {
		await ensureBootstrapAdmin();
		return auth.handler(request);
	},
	POST: async ({ request }) => {
		await ensureBootstrapAdmin();
		return auth.handler(request);
	}
} } });
/**
* Outbound weekly email disabled — use in-app Reports.
*/
function gone() {
	return new Response(JSON.stringify({
		ok: false,
		error: "Weekly email cron is disabled. Use Reports in the app."
	}), {
		status: 410,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store"
		}
	});
}
var Route$41 = createFileRoute("/api/cron/weekly-report")({ server: { handlers: {
	GET: async () => gone(),
	POST: async () => gone()
} } });
var $$splitComponentImporter$40 = () => import("./customers._code.index-B7_woDuB.mjs");
var Route$40 = createFileRoute("/customers/$code/")({ component: lazyRouteComponent($$splitComponentImporter$40, "component") });
var $$splitComponentImporter$39 = () => import("./customers._code.ams-Cn_4Ncmi.mjs");
var Route$39 = createFileRoute("/customers/$code/ams")({ component: lazyRouteComponent($$splitComponentImporter$39, "component") });
var $$splitComponentImporter$38 = () => import("./customers._code.cove-BVCafJSC.mjs");
var Route$38 = createFileRoute("/customers/$code/cove")({ component: lazyRouteComponent($$splitComponentImporter$38, "component") });
var $$splitComponentImporter$37 = () => import("./customers._code.csp-C0geZNbL.mjs");
var Route$37 = createFileRoute("/customers/$code/csp")({ component: lazyRouteComponent($$splitComponentImporter$37, "component") });
var $$splitComponentImporter$36 = () => import("./customers._code.epp-Bn5El7QY.mjs");
var Route$36 = createFileRoute("/customers/$code/epp")({ component: lazyRouteComponent($$splitComponentImporter$36, "component") });
var $$splitComponentImporter$35 = () => import("./customers._code.rmm-BMylvHPg.mjs");
var Route$35 = createFileRoute("/customers/$code/rmm")({ component: lazyRouteComponent($$splitComponentImporter$35, "component") });
var $$splitComponentImporter$34 = () => import("./customers._code.syspro-BsGMhNnx.mjs");
var Route$34 = createFileRoute("/customers/$code/syspro")({ component: lazyRouteComponent($$splitComponentImporter$34, "component") });
var $$splitComponentImporter$33 = () => import("./customers._code.ams.index-C7uJrflJ.mjs");
var Route$33 = createFileRoute("/customers/$code/ams/")({ component: lazyRouteComponent($$splitComponentImporter$33, "component") });
var $$splitComponentImporter$32 = () => import("./customers._code.ams.change-DODCUUPk.mjs");
var Route$32 = createFileRoute("/customers/$code/ams/change")({ component: lazyRouteComponent($$splitComponentImporter$32, "component") });
var $$splitComponentImporter$31 = () => import("./customers._code.ams.incidents-C7vAVJeL.mjs");
var Route$31 = createFileRoute("/customers/$code/ams/incidents")({ component: lazyRouteComponent($$splitComponentImporter$31, "component") });
var $$splitComponentImporter$30 = () => import("./customers._code.ams.risks-CRb7ylzn.mjs");
var Route$30 = createFileRoute("/customers/$code/ams/risks")({ component: lazyRouteComponent($$splitComponentImporter$30, "component") });
var $$splitComponentImporter$29 = () => import("./customers._code.ams.sla-DRD5doi9.mjs");
var Route$29 = createFileRoute("/customers/$code/ams/sla")({ component: lazyRouteComponent($$splitComponentImporter$29, "component") });
var $$splitComponentImporter$28 = () => import("./customers._code.cove.index-36T-cX5B.mjs");
var Route$28 = createFileRoute("/customers/$code/cove/")({ component: lazyRouteComponent($$splitComponentImporter$28, "component") });
var $$splitComponentImporter$27 = () => import("./customers._code.cove.devices-oDU4OHly.mjs");
var Route$27 = createFileRoute("/customers/$code/cove/devices")({ component: lazyRouteComponent($$splitComponentImporter$27, "component") });
var $$splitComponentImporter$26 = () => import("./customers._code.cove.mapping-DCYoXwRo.mjs");
var Route$26 = createFileRoute("/customers/$code/cove/mapping")({ component: lazyRouteComponent($$splitComponentImporter$26, "component") });
var $$splitComponentImporter$25 = () => import("./customers._code.cove.overview-DoaFqyd-.mjs");
/** Legacy /cove/overview — Device stats removed; show Devices on Cloud Backup */
var Route$25 = createFileRoute("/customers/$code/cove/overview")({ component: lazyRouteComponent($$splitComponentImporter$25, "component") });
var $$splitComponentImporter$24 = () => import("./customers._code.cove.recovery-DaEeRhZR.mjs");
var Route$24 = createFileRoute("/customers/$code/cove/recovery")({ component: lazyRouteComponent($$splitComponentImporter$24, "component") });
var $$splitComponentImporter$23 = () => import("./customers._code.cove.retention-D236I_L2.mjs");
var Route$23 = createFileRoute("/customers/$code/cove/retention")({ component: lazyRouteComponent($$splitComponentImporter$23, "component") });
var $$splitComponentImporter$22 = () => import("./customers._code.csp.index-DXJCDQGp.mjs");
var Route$22 = createFileRoute("/customers/$code/csp/")({ component: lazyRouteComponent($$splitComponentImporter$22, "component") });
var $$splitComponentImporter$21 = () => import("./customers._code.csp.licenses-BG11EUJ6.mjs");
var Route$21 = createFileRoute("/customers/$code/csp/licenses")({ component: lazyRouteComponent($$splitComponentImporter$21, "component") });
var $$splitComponentImporter$20 = () => import("./customers._code.csp.users-CBxPmuYK.mjs");
var Route$20 = createFileRoute("/customers/$code/csp/users")({ component: lazyRouteComponent($$splitComponentImporter$20, "component") });
var $$splitComponentImporter$19 = () => import("./customers._code.epp.index-CC-ryT_7.mjs");
var Route$19 = createFileRoute("/customers/$code/epp/")({ component: lazyRouteComponent($$splitComponentImporter$19, "component") });
var $$splitComponentImporter$18 = () => import("./customers._code.epp.incidents-CGUn1xOD.mjs");
var Route$18 = createFileRoute("/customers/$code/epp/incidents")({ component: lazyRouteComponent($$splitComponentImporter$18, "component") });
var $$splitComponentImporter$17 = () => import("./customers._code.epp.modules-C1Mo_FhJ.mjs");
var Route$17 = createFileRoute("/customers/$code/epp/modules")({ component: lazyRouteComponent($$splitComponentImporter$17, "component") });
var $$splitComponentImporter$16 = () => import("./customers._code.epp.quarantine-DHfwal6r.mjs");
var Route$16 = createFileRoute("/customers/$code/epp/quarantine")({ component: lazyRouteComponent($$splitComponentImporter$16, "component") });
var $$splitComponentImporter$15 = () => import("./customers._code.rmm.index-ndNxErjb.mjs");
/** Default RMM landing — Platform Overview removed; open Servers */
var Route$15 = createFileRoute("/customers/$code/rmm/")({ component: lazyRouteComponent($$splitComponentImporter$15, "component") });
var $$splitComponentImporter$14 = () => import("./customers._code.rmm.alerts-CYYxnl35.mjs");
var Route$14 = createFileRoute("/customers/$code/rmm/alerts")({ component: lazyRouteComponent($$splitComponentImporter$14, "component") });
var $$splitComponentImporter$13 = () => import("./customers._code.rmm.devices-NdmgLjCi.mjs");
var Route$13 = createFileRoute("/customers/$code/rmm/devices")({ component: lazyRouteComponent($$splitComponentImporter$13, "component") });
var $$splitComponentImporter$12 = () => import("./customers._code.rmm.mapping-CdKaUn6r.mjs");
var Route$12 = createFileRoute("/customers/$code/rmm/mapping")({ component: lazyRouteComponent($$splitComponentImporter$12, "component") });
var $$splitComponentImporter$11 = () => import("./customers._code.rmm.overview-DVL3Te5w.mjs");
/** Legacy /rmm/overview — Platform Overview removed; show Servers */
var Route$11 = createFileRoute("/customers/$code/rmm/overview")({ component: lazyRouteComponent($$splitComponentImporter$11, "component") });
var $$splitComponentImporter$10 = () => import("./customers._code.rmm.patch-B8ORwQZ1.mjs");
var Route$10 = createFileRoute("/customers/$code/rmm/patch")({ component: lazyRouteComponent($$splitComponentImporter$10, "component") });
var $$splitComponentImporter$9 = () => import("./customers._code.rmm.workstations-DKPj64tX.mjs");
var Route$9 = createFileRoute("/customers/$code/rmm/workstations")({ component: lazyRouteComponent($$splitComponentImporter$9, "component") });
var $$splitComponentImporter$8 = () => import("./customers._code.syspro.index-BBtdfE4C.mjs");
var Route$8 = createFileRoute("/customers/$code/syspro/")({ component: lazyRouteComponent($$splitComponentImporter$8, "component") });
var $$splitComponentImporter$7 = () => import("./customers._code.syspro.dtr-DlvEHMny.mjs");
var Route$7 = createFileRoute("/customers/$code/syspro/dtr")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
var $$splitComponentImporter$6 = () => import("./customers._code.syspro.health-DBeKl2VU.mjs");
var Route$6 = createFileRoute("/customers/$code/syspro/health")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./customers._code.syspro.hotfixes-DB_-x-nM.mjs");
var Route$5 = createFileRoute("/customers/$code/syspro/hotfixes")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
var $$splitComponentImporter$4 = () => import("./customers._code.syspro.jobs-iUg1_smb.mjs");
var Route$4 = createFileRoute("/customers/$code/syspro/jobs")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./customers._code.syspro.license-DblDgGtl.mjs");
var Route$3 = createFileRoute("/customers/$code/syspro/license")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./customers._code.syspro.operators-3PtdEL_d.mjs");
var Route$2 = createFileRoute("/customers/$code/syspro/operators")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./customers._code.syspro.security-CQcIXaFK.mjs");
var Route$1 = createFileRoute("/customers/$code/syspro/security")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./customers._code.syspro.sql-BMr5Mr68.mjs");
var Route = createFileRoute("/customers/$code/syspro/sql")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var IndexRoute = Route$68.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$65
});
var LoginRoute = Route$64.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => Route$65
});
var ReportsRoute = Route$67.update({
	id: "/reports",
	path: "/reports",
	getParentRoute: () => Route$65
});
var SecurityRoute = Route$63.update({
	id: "/security",
	path: "/security",
	getParentRoute: () => Route$65
});
var SettingsRoute = Route$62.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => Route$65
});
var TwoFactorRoute = Route$61.update({
	id: "/two-factor",
	path: "/two-factor",
	getParentRoute: () => Route$65
});
var ApiBootstrapAdminRoute = Route$60.update({
	id: "/api/bootstrap-admin",
	path: "/api/bootstrap-admin",
	getParentRoute: () => Route$65
});
var ApiReportPreviewRoute = Route$59.update({
	id: "/api/report-preview",
	path: "/api/report-preview",
	getParentRoute: () => Route$65
});
var CustomersCodeRoute = Route$66.update({
	id: "/customers/$code",
	path: "/customers/$code",
	getParentRoute: () => Route$65
});
var SettingsIndexRoute = Route$58.update({
	id: "/",
	path: "/",
	getParentRoute: () => SettingsRoute
});
var SettingsAboutRoute = Route$57.update({
	id: "/about",
	path: "/about",
	getParentRoute: () => SettingsRoute
});
var SettingsAlertsRoute = Route$56.update({
	id: "/alerts",
	path: "/alerts",
	getParentRoute: () => SettingsRoute
});
var SettingsAuditRoute = Route$55.update({
	id: "/audit",
	path: "/audit",
	getParentRoute: () => SettingsRoute
});
var SettingsCollectRoute = Route$54.update({
	id: "/collect",
	path: "/collect",
	getParentRoute: () => SettingsRoute
});
var SettingsDashboardRoute = Route$53.update({
	id: "/dashboard",
	path: "/dashboard",
	getParentRoute: () => SettingsRoute
});
var SettingsIntegrationsRoute = Route$52.update({
	id: "/integrations",
	path: "/integrations",
	getParentRoute: () => SettingsRoute
});
var SettingsProfileRoute = Route$51.update({
	id: "/profile",
	path: "/profile",
	getParentRoute: () => SettingsRoute
});
var SettingsQueryRoute = Route$50.update({
	id: "/query",
	path: "/query",
	getParentRoute: () => SettingsRoute
});
var SettingsRagRoute = Route$49.update({
	id: "/rag",
	path: "/rag",
	getParentRoute: () => SettingsRoute
});
var SettingsReportsRoute = Route$48.update({
	id: "/reports",
	path: "/reports",
	getParentRoute: () => SettingsRoute
});
var SettingsSecurityRoute = Route$47.update({
	id: "/security",
	path: "/security",
	getParentRoute: () => SettingsRoute
});
var SettingsSmtpRoute = Route$46.update({
	id: "/smtp",
	path: "/smtp",
	getParentRoute: () => SettingsRoute
});
var SettingsSqlRoute = Route$45.update({
	id: "/sql",
	path: "/sql",
	getParentRoute: () => SettingsRoute
});
var SettingsSslRoute = Route$44.update({
	id: "/ssl",
	path: "/ssl",
	getParentRoute: () => SettingsRoute
});
var SettingsUsersRoute = Route$43.update({
	id: "/users",
	path: "/users",
	getParentRoute: () => SettingsRoute
});
var ApiAuthSplatRoute = Route$42.update({
	id: "/api/auth/$",
	path: "/api/auth/$",
	getParentRoute: () => Route$65
});
var ApiCronWeeklyReportRoute = Route$41.update({
	id: "/api/cron/weekly-report",
	path: "/api/cron/weekly-report",
	getParentRoute: () => Route$65
});
var CustomersCodeIndexRoute = Route$40.update({
	id: "/",
	path: "/",
	getParentRoute: () => CustomersCodeRoute
});
var CustomersCodeAmsRoute = Route$39.update({
	id: "/ams",
	path: "/ams",
	getParentRoute: () => CustomersCodeRoute
});
var CustomersCodeCoveRoute = Route$38.update({
	id: "/cove",
	path: "/cove",
	getParentRoute: () => CustomersCodeRoute
});
var CustomersCodeCspRoute = Route$37.update({
	id: "/csp",
	path: "/csp",
	getParentRoute: () => CustomersCodeRoute
});
var CustomersCodeEppRoute = Route$36.update({
	id: "/epp",
	path: "/epp",
	getParentRoute: () => CustomersCodeRoute
});
var CustomersCodeRmmRoute = Route$35.update({
	id: "/rmm",
	path: "/rmm",
	getParentRoute: () => CustomersCodeRoute
});
var CustomersCodeSysproRoute = Route$34.update({
	id: "/syspro",
	path: "/syspro",
	getParentRoute: () => CustomersCodeRoute
});
var CustomersCodeAmsIndexRoute = Route$33.update({
	id: "/",
	path: "/",
	getParentRoute: () => CustomersCodeAmsRoute
});
var CustomersCodeAmsChangeRoute = Route$32.update({
	id: "/change",
	path: "/change",
	getParentRoute: () => CustomersCodeAmsRoute
});
var CustomersCodeAmsIncidentsRoute = Route$31.update({
	id: "/incidents",
	path: "/incidents",
	getParentRoute: () => CustomersCodeAmsRoute
});
var CustomersCodeAmsRisksRoute = Route$30.update({
	id: "/risks",
	path: "/risks",
	getParentRoute: () => CustomersCodeAmsRoute
});
var CustomersCodeAmsSlaRoute = Route$29.update({
	id: "/sla",
	path: "/sla",
	getParentRoute: () => CustomersCodeAmsRoute
});
var CustomersCodeCoveIndexRoute = Route$28.update({
	id: "/",
	path: "/",
	getParentRoute: () => CustomersCodeCoveRoute
});
var CustomersCodeCoveDevicesRoute = Route$27.update({
	id: "/devices",
	path: "/devices",
	getParentRoute: () => CustomersCodeCoveRoute
});
var CustomersCodeCoveMappingRoute = Route$26.update({
	id: "/mapping",
	path: "/mapping",
	getParentRoute: () => CustomersCodeCoveRoute
});
var CustomersCodeCoveOverviewRoute = Route$25.update({
	id: "/overview",
	path: "/overview",
	getParentRoute: () => CustomersCodeCoveRoute
});
var CustomersCodeCoveRecoveryRoute = Route$24.update({
	id: "/recovery",
	path: "/recovery",
	getParentRoute: () => CustomersCodeCoveRoute
});
var CustomersCodeCoveRetentionRoute = Route$23.update({
	id: "/retention",
	path: "/retention",
	getParentRoute: () => CustomersCodeCoveRoute
});
var CustomersCodeCspIndexRoute = Route$22.update({
	id: "/",
	path: "/",
	getParentRoute: () => CustomersCodeCspRoute
});
var CustomersCodeCspLicensesRoute = Route$21.update({
	id: "/licenses",
	path: "/licenses",
	getParentRoute: () => CustomersCodeCspRoute
});
var CustomersCodeCspUsersRoute = Route$20.update({
	id: "/users",
	path: "/users",
	getParentRoute: () => CustomersCodeCspRoute
});
var CustomersCodeEppIndexRoute = Route$19.update({
	id: "/",
	path: "/",
	getParentRoute: () => CustomersCodeEppRoute
});
var CustomersCodeEppIncidentsRoute = Route$18.update({
	id: "/incidents",
	path: "/incidents",
	getParentRoute: () => CustomersCodeEppRoute
});
var CustomersCodeEppModulesRoute = Route$17.update({
	id: "/modules",
	path: "/modules",
	getParentRoute: () => CustomersCodeEppRoute
});
var CustomersCodeEppQuarantineRoute = Route$16.update({
	id: "/quarantine",
	path: "/quarantine",
	getParentRoute: () => CustomersCodeEppRoute
});
var CustomersCodeRmmIndexRoute = Route$15.update({
	id: "/",
	path: "/",
	getParentRoute: () => CustomersCodeRmmRoute
});
var CustomersCodeRmmAlertsRoute = Route$14.update({
	id: "/alerts",
	path: "/alerts",
	getParentRoute: () => CustomersCodeRmmRoute
});
var CustomersCodeRmmDevicesRoute = Route$13.update({
	id: "/devices",
	path: "/devices",
	getParentRoute: () => CustomersCodeRmmRoute
});
var CustomersCodeRmmMappingRoute = Route$12.update({
	id: "/mapping",
	path: "/mapping",
	getParentRoute: () => CustomersCodeRmmRoute
});
var CustomersCodeRmmOverviewRoute = Route$11.update({
	id: "/overview",
	path: "/overview",
	getParentRoute: () => CustomersCodeRmmRoute
});
var CustomersCodeRmmPatchRoute = Route$10.update({
	id: "/patch",
	path: "/patch",
	getParentRoute: () => CustomersCodeRmmRoute
});
var CustomersCodeRmmWorkstationsRoute = Route$9.update({
	id: "/workstations",
	path: "/workstations",
	getParentRoute: () => CustomersCodeRmmRoute
});
var CustomersCodeSysproIndexRoute = Route$8.update({
	id: "/",
	path: "/",
	getParentRoute: () => CustomersCodeSysproRoute
});
var CustomersCodeSysproDtrRoute = Route$7.update({
	id: "/dtr",
	path: "/dtr",
	getParentRoute: () => CustomersCodeSysproRoute
});
var CustomersCodeSysproHealthRoute = Route$6.update({
	id: "/health",
	path: "/health",
	getParentRoute: () => CustomersCodeSysproRoute
});
var CustomersCodeSysproHotfixesRoute = Route$5.update({
	id: "/hotfixes",
	path: "/hotfixes",
	getParentRoute: () => CustomersCodeSysproRoute
});
var CustomersCodeSysproJobsRoute = Route$4.update({
	id: "/jobs",
	path: "/jobs",
	getParentRoute: () => CustomersCodeSysproRoute
});
var CustomersCodeSysproLicenseRoute = Route$3.update({
	id: "/license",
	path: "/license",
	getParentRoute: () => CustomersCodeSysproRoute
});
var CustomersCodeSysproOperatorsRoute = Route$2.update({
	id: "/operators",
	path: "/operators",
	getParentRoute: () => CustomersCodeSysproRoute
});
var CustomersCodeSysproSecurityRoute = Route$1.update({
	id: "/security",
	path: "/security",
	getParentRoute: () => CustomersCodeSysproRoute
});
var CustomersCodeSysproSqlRoute = Route.update({
	id: "/sql",
	path: "/sql",
	getParentRoute: () => CustomersCodeSysproRoute
});
var SettingsRouteChildren = {
	SettingsAboutRoute,
	SettingsAlertsRoute,
	SettingsAuditRoute,
	SettingsCollectRoute,
	SettingsDashboardRoute,
	SettingsIntegrationsRoute,
	SettingsProfileRoute,
	SettingsQueryRoute,
	SettingsRagRoute,
	SettingsReportsRoute,
	SettingsSecurityRoute,
	SettingsSmtpRoute,
	SettingsSqlRoute,
	SettingsSslRoute,
	SettingsUsersRoute,
	SettingsIndexRoute
};
var SettingsRouteWithChildren = SettingsRoute._addFileChildren(SettingsRouteChildren);
var CustomersCodeAmsRouteChildren = {
	CustomersCodeAmsChangeRoute,
	CustomersCodeAmsIncidentsRoute,
	CustomersCodeAmsRisksRoute,
	CustomersCodeAmsSlaRoute,
	CustomersCodeAmsIndexRoute
};
var CustomersCodeAmsRouteWithChildren = CustomersCodeAmsRoute._addFileChildren(CustomersCodeAmsRouteChildren);
var CustomersCodeCoveRouteChildren = {
	CustomersCodeCoveDevicesRoute,
	CustomersCodeCoveMappingRoute,
	CustomersCodeCoveOverviewRoute,
	CustomersCodeCoveRecoveryRoute,
	CustomersCodeCoveRetentionRoute,
	CustomersCodeCoveIndexRoute
};
var CustomersCodeCoveRouteWithChildren = CustomersCodeCoveRoute._addFileChildren(CustomersCodeCoveRouteChildren);
var CustomersCodeCspRouteChildren = {
	CustomersCodeCspLicensesRoute,
	CustomersCodeCspUsersRoute,
	CustomersCodeCspIndexRoute
};
var CustomersCodeCspRouteWithChildren = CustomersCodeCspRoute._addFileChildren(CustomersCodeCspRouteChildren);
var CustomersCodeEppRouteChildren = {
	CustomersCodeEppIncidentsRoute,
	CustomersCodeEppModulesRoute,
	CustomersCodeEppQuarantineRoute,
	CustomersCodeEppIndexRoute
};
var CustomersCodeEppRouteWithChildren = CustomersCodeEppRoute._addFileChildren(CustomersCodeEppRouteChildren);
var CustomersCodeRmmRouteChildren = {
	CustomersCodeRmmAlertsRoute,
	CustomersCodeRmmDevicesRoute,
	CustomersCodeRmmMappingRoute,
	CustomersCodeRmmOverviewRoute,
	CustomersCodeRmmPatchRoute,
	CustomersCodeRmmWorkstationsRoute,
	CustomersCodeRmmIndexRoute
};
var CustomersCodeRmmRouteWithChildren = CustomersCodeRmmRoute._addFileChildren(CustomersCodeRmmRouteChildren);
var CustomersCodeSysproRouteChildren = {
	CustomersCodeSysproDtrRoute,
	CustomersCodeSysproHealthRoute,
	CustomersCodeSysproHotfixesRoute,
	CustomersCodeSysproJobsRoute,
	CustomersCodeSysproLicenseRoute,
	CustomersCodeSysproOperatorsRoute,
	CustomersCodeSysproSecurityRoute,
	CustomersCodeSysproSqlRoute,
	CustomersCodeSysproIndexRoute
};
var CustomersCodeRouteChildren = {
	CustomersCodeAmsRoute: CustomersCodeAmsRouteWithChildren,
	CustomersCodeCoveRoute: CustomersCodeCoveRouteWithChildren,
	CustomersCodeCspRoute: CustomersCodeCspRouteWithChildren,
	CustomersCodeEppRoute: CustomersCodeEppRouteWithChildren,
	CustomersCodeRmmRoute: CustomersCodeRmmRouteWithChildren,
	CustomersCodeSysproRoute: CustomersCodeSysproRoute._addFileChildren(CustomersCodeSysproRouteChildren),
	CustomersCodeIndexRoute
};
var rootRouteChildren = {
	IndexRoute,
	LoginRoute,
	ReportsRoute,
	SecurityRoute,
	SettingsRoute: SettingsRouteWithChildren,
	TwoFactorRoute,
	ApiBootstrapAdminRoute,
	ApiReportPreviewRoute,
	CustomersCodeRoute: CustomersCodeRoute._addFileChildren(CustomersCodeRouteChildren),
	ApiAuthSplatRoute,
	ApiCronWeeklyReportRoute
};
var routeTree = Route$65._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadDelay: 50,
		defaultPreloadStaleTime: 12e4,
		defaultStaleTime: 6e4,
		defaultPendingMs: 1e3,
		defaultPendingMinMs: 0
	});
}
//#endregion
export { getRouter };
