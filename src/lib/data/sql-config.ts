/**
 * SQL Server connection for RPMAssure_App
 * Priority: Settings UI file (data/rpma-settings.json) when complete
 *           > process env / .env.local
 * UI save is the source of truth for operators; env is fallback / bootstrap.
 */
import fs from "node:fs";
import path from "node:path";
import { getPrimarySqlFromFile } from "@/lib/settings/settings-store";
import { cleanSqlPassword } from "@/lib/data/sql-password";

export type DataMode = "auto" | "live" | "demo";

let fileEnvLoaded = false;

/** Call after Settings save so .env.local is re-read if needed */
export function invalidateEnvCache(): void {
  fileEnvLoaded = false;
}


function loadDotEnvFiles() {
  if (fileEnvLoaded || typeof process === "undefined") return;
  fileEnvLoaded = true;
  const cwd = process.cwd();
  for (const name of [".env.local", ".env"]) {
    const full = path.join(cwd, name);
    try {
      if (!fs.existsSync(full)) continue;
      let text = fs.readFileSync(full, "utf8");
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      for (const line of text.split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq <= 0) continue;
        const key = t.slice(0, eq).trim().replace(/^\uFEFF/, "");
        let val = t.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        // Always apply RPM_ASSURE_* from file so Settings sync is not stuck on first load
        if (
          process.env[key] === undefined ||
          process.env[key] === "" ||
          key.startsWith("RPM_ASSURE_")
        ) {
          process.env[key] = val;
        }
      }
    } catch {
      /* ignore */
    }
  }
}

function env(name: string): string | undefined {
  loadDotEnvFiles();
  const v = process.env[name];
  return v?.trim() ? v.trim() : undefined;
}

export function getDataMode(): DataMode {
  try {
    const f = getPrimarySqlFromFile();
    if (f?.dataMode === "live" || f?.dataMode === "demo" || f?.dataMode === "auto") {
      return f.dataMode;
    }
  } catch {
    /* ignore */
  }
  const fromEnv = env("RPM_ASSURE_DATA_MODE");
  if (fromEnv) {
    const m = fromEnv.toLowerCase();
    if (m === "live" || m === "demo" || m === "auto") return m;
  }
  return "auto";
}

function fileSqlComplete(): boolean {
  try {
    const f = getPrimarySqlFromFile();
    return Boolean(f?.server?.trim() && f?.user?.trim() && f?.password?.trim());
  } catch {
    return false;
  }
}

export function hasSqlConfig(): boolean {
  if (fileSqlComplete()) return true;
  return Boolean(
    env("RPM_ASSURE_SQL_SERVER") && env("RPM_ASSURE_SQL_USER") && env("RPM_ASSURE_SQL_PASSWORD"),
  );
}

export function sqlConfigDebug(): {
  hasServer: boolean;
  hasUser: boolean;
  hasPassword: boolean;
  cwd: string;
  source: "env" | "settings-file" | "mixed" | "none";
  effectiveSource: "settings-file" | "env" | "none";
  server?: string;
  port?: number;
  database?: string;
  user?: string;
} {
  loadDotEnvFiles();
  const envOk = Boolean(
    env("RPM_ASSURE_SQL_SERVER") && env("RPM_ASSURE_SQL_USER") && env("RPM_ASSURE_SQL_PASSWORD"),
  );
  let fileOk = false;
  try {
    fileOk = fileSqlComplete();
  } catch {
    fileOk = false;
  }

  let effective: "settings-file" | "env" | "none" = "none";
  if (fileOk) effective = "settings-file";
  else if (envOk) effective = "env";

  let snap: { server?: string; port?: number; database?: string; user?: string } = {};
  try {
    if (hasSqlConfig()) {
      const c = getSqlConfig();
      snap = {
        server: c.server,
        port: c.port,
        database: c.database,
        user: c.user,
      };
    }
  } catch {
    /* ignore */
  }

  return {
    hasServer: Boolean(env("RPM_ASSURE_SQL_SERVER")) || fileOk,
    hasUser: Boolean(env("RPM_ASSURE_SQL_USER")) || fileOk,
    hasPassword: Boolean(env("RPM_ASSURE_SQL_PASSWORD")) || fileOk,
    cwd: process.cwd(),
    source: envOk && fileOk ? "mixed" : envOk ? "env" : fileOk ? "settings-file" : "none",
    effectiveSource: effective,
    ...snap,
  };
}

/** host,port OR host + port — never pass "host,port" as server name */
export function parseSqlServer(
  raw: string,
  portEnv?: string,
): { server: string; port: number } {
  const s = raw.trim();
  // Accept "host,port" or "host:port" (reject accidental double port)
  if (s.includes(",")) {
    const [host, portStr] = s.split(",").map((x) => x.trim());
    const port = Number(portStr || portEnv || 1433);
    if (!host || !Number.isFinite(port)) {
      throw new Error(`Invalid SQL server: ${raw}`);
    }
    return { server: host, port };
  }
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(s) || (s.includes(":") && !s.includes("\\"))) {
    // host:port (not instance name host\instance)
    const idx = s.lastIndexOf(":");
    const host = s.slice(0, idx).trim();
    const port = Number(s.slice(idx + 1).trim() || portEnv || 1433);
    if (host && Number.isFinite(port)) return { server: host, port };
  }
  const port = Number(portEnv || 1433);
  return { server: s, port: Number.isFinite(port) ? port : 1433 };
}

export function getSqlConfig() {
  const file = (() => {
    try {
      return getPrimarySqlFromFile();
    } catch {
      return null;
    }
  })();

  // Prefer Settings UI file when complete (fixes "UI updated but env still wins")
  const useFile = Boolean(
    file?.server?.trim() && file?.user?.trim() && file?.password?.trim(),
  );

  const serverRaw = useFile
    ? file!.server.trim()
    : env("RPM_ASSURE_SQL_SERVER") || file?.server?.trim();
  const user = useFile
    ? file!.user.trim()
    : env("RPM_ASSURE_SQL_USER") || file?.user?.trim();
  const password = useFile
    ? file!.password
    : env("RPM_ASSURE_SQL_PASSWORD") || file?.password;

  const passwordClean = cleanSqlPassword(password);
  if (!serverRaw || !user || !passwordClean) {
    throw new Error(
      "SQL config incomplete — set Settings → SQL Server (or .env.local RPM_ASSURE_SQL_*).",
    );
  }

  const portEnv = useFile
    ? file!.port != null
      ? String(file!.port)
      : undefined
    : env("RPM_ASSURE_SQL_PORT") ||
      (file?.port != null ? String(file.port) : undefined);

  const { server, port } = parseSqlServer(serverRaw, portEnv);

  const trust = useFile
    ? (file!.trustServerCertificate ?? true)
    : env("RPM_ASSURE_SQL_TRUST_CERT") !== undefined
      ? env("RPM_ASSURE_SQL_TRUST_CERT") !== "false"
      : (file?.trustServerCertificate ?? true);

  const encrypt = useFile
    ? (file!.encrypt ?? true)
    : env("RPM_ASSURE_SQL_ENCRYPT") !== undefined
      ? env("RPM_ASSURE_SQL_ENCRYPT") !== "false"
      : (file?.encrypt ?? true);

  const database = useFile
    ? file!.database?.trim() || "RPMAssure_App"
    : env("RPM_ASSURE_SQL_DATABASE") ?? file?.database ?? "RPMAssure_App";

  // Resolved port: explicit file port wins when not embedded in server string
  let resolvedPort = port;
  if (useFile && file!.port != null && !String(serverRaw).includes(",") && !String(serverRaw).includes(":")) {
    resolvedPort = Number(file!.port) || port;
  } else if (
    !useFile &&
    !env("RPM_ASSURE_SQL_PORT") &&
    !String(serverRaw).includes(",") &&
    file?.port
  ) {
    resolvedPort = file.port;
  }

  return {
    server,
    port: resolvedPort,
    database,
    user,
    password: passwordClean,
    options: {
      encrypt,
      trustServerCertificate: trust,
      enableArithAbort: true,
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 12000,
    requestTimeout: 20000,
    _source: useFile ? ("settings-file" as const) : ("env" as const),
  };
}
