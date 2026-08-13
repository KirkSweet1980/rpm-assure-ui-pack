import { o as DEFAULT_SSL } from "./types-Dk-h6nx5.mjs";
import { l as writeSettingsFile, s as readSettingsFile } from "./settings-store-DT2EXCSw.mjs";
import fs from "node:fs";
import path from "node:path";
//#region node_modules/.nitro/vite/services/ssr/assets/ssl-store-C2W4YOb6.js
/**
* SSL / HTTPS config + certificate files + Caddyfile generation.
* Server-only — do not import from client components.
*/
function clampSsl(s) {
	const base = {
		...DEFAULT_SSL,
		...s ?? {}
	};
	const mode = base.mode === "disabled" || base.mode === "custom" || base.mode === "letsencrypt" ? base.mode : "letsencrypt";
	const port = Math.max(1, Math.min(65535, Math.floor(Number(base.appPort) || 8081)));
	return {
		mode,
		hostname: String(base.hostname || DEFAULT_SSL.hostname).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || DEFAULT_SSL.hostname,
		appHost: String(base.appHost || "127.0.0.1").trim() || "127.0.0.1",
		appPort: port,
		letsEncryptEmail: String(base.letsEncryptEmail || "").trim().slice(0, 200),
		hsts: base.hsts !== false,
		patchAuthUrls: base.patchAuthUrls !== false,
		lastAppliedAt: base.lastAppliedAt ?? null,
		certFileName: base.certFileName ?? null,
		keyFileName: base.keyFileName ?? null
	};
}
function getSslConfig() {
	return clampSsl(readSettingsFile().ssl);
}
function saveSslConfig(partial) {
	const prev = readSettingsFile();
	const next = clampSsl({
		...prev.ssl,
		...partial
	});
	writeSettingsFile({
		...prev,
		ssl: next
	});
	return next;
}
/** App-local cert store (always writable next to the app) */
function sslDataDir() {
	return path.join(process.cwd(), "data", "ssl", "custom");
}
/** Prefer deploy path on Windows host for Caddy; fall back to app data */
function sslDeployDir() {
	const win = "C:\\RPM-Assure\\deploy\\ssl\\custom";
	if (process.platform === "win32") return win;
	return path.join(process.cwd(), "deploy", "ssl", "custom");
}
function caddyfilePath() {
	if (process.platform === "win32") return "C:\\RPM-Assure\\deploy\\Caddyfile";
	return path.join(process.cwd(), "deploy", "Caddyfile");
}
function certPaths() {
	const dir = sslDataDir();
	return {
		dir,
		cert: path.join(dir, "fullchain.pem"),
		key: path.join(dir, "privkey.pem")
	};
}
function deployCertPaths() {
	const dir = sslDeployDir();
	return {
		dir,
		cert: path.join(dir, "fullchain.pem"),
		key: path.join(dir, "privkey.pem")
	};
}
function sslFileStatus() {
	const local = certPaths();
	const deploy = deployCertPaths();
	const localCert = fs.existsSync(local.cert);
	const localKey = fs.existsSync(local.key);
	const deployCert = fs.existsSync(deploy.cert);
	const deployKey = fs.existsSync(deploy.key);
	let certBytes = 0;
	let keyBytes = 0;
	try {
		if (localCert) certBytes = fs.statSync(local.cert).size;
		else if (deployCert) certBytes = fs.statSync(deploy.cert).size;
	} catch {}
	try {
		if (localKey) keyBytes = fs.statSync(local.key).size;
		else if (deployKey) keyBytes = fs.statSync(deploy.key).size;
	} catch {}
	return {
		certPresent: localCert || deployCert,
		keyPresent: localKey || deployKey,
		certBytes,
		keyBytes,
		localCertPath: local.cert,
		localKeyPath: local.key,
		deployCertPath: deploy.cert,
		deployKeyPath: deploy.key,
		caddyfilePath: caddyfilePath(),
		caddyfilePresent: fs.existsSync(caddyfilePath())
	};
}
function looksLikePem(pem, kind) {
	const t = pem.replace(/\r\n/g, "\n").trim();
	if (kind === "cert") return t.includes("-----BEGIN CERTIFICATE-----") && t.includes("-----END CERTIFICATE-----");
	return (t.includes("-----BEGIN PRIVATE KEY-----") || t.includes("-----BEGIN RSA PRIVATE KEY-----") || t.includes("-----BEGIN EC PRIVATE KEY-----")) && (t.includes("-----END PRIVATE KEY-----") || t.includes("-----END RSA PRIVATE KEY-----") || t.includes("-----END EC PRIVATE KEY-----"));
}
/** Store PEM cert + key under data/ssl/custom (and deploy copy when possible) */
function writeSslPemFiles(opts) {
	const certPem = (opts.certPem || "").replace(/\r\n/g, "\n").trim() + "\n";
	const keyPem = (opts.keyPem || "").replace(/\r\n/g, "\n").trim() + "\n";
	if (!looksLikePem(certPem, "cert")) return {
		ok: false,
		error: "Certificate must be PEM text starting with -----BEGIN CERTIFICATE-----"
	};
	if (!looksLikePem(keyPem, "key")) return {
		ok: false,
		error: "Private key must be PEM text (BEGIN PRIVATE KEY / RSA PRIVATE KEY / EC PRIVATE KEY)."
	};
	if (certPem.length > 512e3 || keyPem.length > 256e3) return {
		ok: false,
		error: "Certificate or key is too large."
	};
	const local = certPaths();
	fs.mkdirSync(local.dir, { recursive: true });
	fs.writeFileSync(local.cert, certPem, {
		encoding: "utf8",
		mode: 384
	});
	fs.writeFileSync(local.key, keyPem, {
		encoding: "utf8",
		mode: 384
	});
	try {
		const deploy = deployCertPaths();
		fs.mkdirSync(deploy.dir, { recursive: true });
		fs.writeFileSync(deploy.cert, certPem, {
			encoding: "utf8",
			mode: 384
		});
		fs.writeFileSync(deploy.key, keyPem, {
			encoding: "utf8",
			mode: 384
		});
	} catch (e) {
		console.warn("[rpm-assure] could not mirror certs to deploy path:", e instanceof Error ? e.message : e);
	}
	saveSslConfig({
		mode: "custom",
		certFileName: opts.certFileName ?? "fullchain.pem",
		keyFileName: opts.keyFileName ?? "privkey.pem"
	});
	return {
		ok: true,
		paths: local
	};
}
function buildCaddyfile(cfg) {
	const host = cfg.hostname || "assure.rpmresources.co.za";
	const upstream = `${cfg.appHost || "127.0.0.1"}:${cfg.appPort || 8081}`;
	const email = (cfg.letsEncryptEmail || "").trim();
	const globalLines = ["	auto_https disable_redirects"];
	if (email && cfg.mode === "letsencrypt") globalLines.push(`\temail ${email}`);
	const global = `{\n${globalLines.join("\n")}\n}\n\n`;
	const hsts = cfg.hsts ? `\n\t\tStrict-Transport-Security "max-age=31536000; includeSubDomains"` : "";
	if (cfg.mode === "disabled") return `# RPM Assure — HTTPS disabled via Settings → SSL
# Host was: ${host}
# Upstream app: ${upstream}
#
# Enable mode "letsencrypt" or "custom" and click Apply Caddyfile.
# HTTPS-only site (https:// host). No HTTP redirects.
`;
	let tlsBlock = "";
	if (cfg.mode === "custom") {
		const deploy = deployCertPaths();
		tlsBlock = `\n\ttls ${deploy.cert.replace(/\\/g, "/")} ${deploy.key.replace(/\\/g, "/")}\n`;
	} else if (cfg.mode === "letsencrypt") tlsBlock = `
	tls {
		issuer acme {
			disable_http_challenge
		}
	}
`;
	const logPath = process.platform === "win32" ? "C:/RPM-Assure/deploy/logs/caddy-access.log" : path.join(process.cwd(), "deploy", "logs", "caddy-access.log").replace(/\\/g, "/");
	return `${global}# RPM Assure HTTPS-only — generated from Settings → SSL
# Mode: ${cfg.mode}
# Site address is https:// so only TLS is served for this host.
# Let's Encrypt: disable_http_challenge (TLS-ALPN-01 on :443).
# Do not edit by hand if you manage SSL from the UI (re-apply overwrites).

https://${host} {
	encode gzip zstd
${tlsBlock}
	handle /healthz {
		respond "ok" 200
	}

	reverse_proxy ${upstream} {
		header_up Host {host}
		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-For {remote_host}
		header_up X-Forwarded-Proto {scheme}
		header_up X-Forwarded-Host {host}
	}

	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		-Server${hsts}
	}

	log {
		output file ${logPath} {
			roll_size 10mb
			roll_keep 5
		}
	}
}
`;
}
function patchAuthEnvForHttps(hostname) {
	const envPath = path.join(process.cwd(), ".env.local");
	const hostUrl = `https://${hostname.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
	try {
		let lines = [];
		if (fs.existsSync(envPath)) lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
		const keys = /* @__PURE__ */ new Set([
			"BETTER_AUTH_URL",
			"VITE_APP_URL",
			"BETTER_AUTH_TRUSTED_ORIGINS"
		]);
		const kept = lines.filter((line) => {
			const t = line.trim();
			if (!t || t.startsWith("#")) return true;
			const k = t.split("=")[0]?.trim();
			return !k || !keys.has(k);
		});
		const add = [
			`BETTER_AUTH_URL=${hostUrl}`,
			`VITE_APP_URL=${hostUrl}`,
			`BETTER_AUTH_TRUSTED_ORIGINS=${hostUrl}`
		];
		const body = [
			...kept.filter((l) => l.length > 0),
			"",
			"# synced from Settings → SSL",
			...add,
			""
		].join("\n");
		fs.writeFileSync(envPath, body, "utf8");
		process.env.BETTER_AUTH_URL = hostUrl;
		process.env.VITE_APP_URL = hostUrl;
		process.env.BETTER_AUTH_TRUSTED_ORIGINS = hostUrl;
		return {
			ok: true,
			path: envPath,
			message: `Auth URLs set to ${hostUrl}`
		};
	} catch (e) {
		return {
			ok: false,
			path: envPath,
			message: e instanceof Error ? e.message : String(e)
		};
	}
}
function applySslToDisk(cfg) {
	const ssl = clampSsl(cfg ?? getSslConfig());
	if (ssl.mode === "custom") {
		const st = sslFileStatus();
		if (!st.certPresent || !st.keyPresent) return {
			ok: false,
			caddyfile: "",
			caddyPath: caddyfilePath(),
			preview: "",
			error: "Custom mode requires certificate and private key. Paste PEM files and click Upload certificate first.",
			status: st
		};
		try {
			const local = certPaths();
			const deploy = deployCertPaths();
			if (fs.existsSync(local.cert) && fs.existsSync(local.key)) {
				fs.mkdirSync(deploy.dir, { recursive: true });
				fs.copyFileSync(local.cert, deploy.cert);
				fs.copyFileSync(local.key, deploy.key);
			}
		} catch (e) {
			console.warn("[rpm-assure] cert mirror:", e);
		}
	}
	const content = buildCaddyfile(ssl);
	const out = caddyfilePath();
	try {
		fs.mkdirSync(path.dirname(out), { recursive: true });
		fs.writeFileSync(out, content, "utf8");
	} catch (e) {
		return {
			ok: false,
			caddyfile: content,
			caddyPath: out,
			preview: content,
			error: "Could not write Caddyfile: " + (e instanceof Error ? e.message : String(e)),
			status: sslFileStatus()
		};
	}
	let auth;
	if (ssl.patchAuthUrls && ssl.mode !== "disabled") {
		const r = patchAuthEnvForHttps(ssl.hostname);
		auth = {
			ok: r.ok,
			message: r.message
		};
	}
	saveSslConfig({
		...ssl,
		lastAppliedAt: (/* @__PURE__ */ new Date()).toISOString()
	});
	return {
		ok: true,
		caddyfile: content,
		caddyPath: out,
		preview: content,
		auth,
		status: sslFileStatus()
	};
}
//#endregion
export { applySslToDisk, buildCaddyfile, caddyfilePath, certPaths, deployCertPaths, getSslConfig, saveSslConfig, sslFileStatus, writeSslPemFiles };
