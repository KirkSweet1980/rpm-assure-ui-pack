import sql from "mssql";
import { getSqlConfig, hasSqlConfig } from "./sql-config";
import { connectSql } from "./sql-connect";
import { isTransientError } from "./retry";

let pool: sql.ConnectionPool | null = null;
let poolError: string | null = null;
/** Coalesce concurrent getPool() so we only open one connection */
let connecting: Promise<sql.ConnectionPool | null> | null = null;

export function getLastPoolError(): string | null {
  return poolError;
}

export function resetPool(): void {
  try {
    void pool?.close();
  } catch {
    /* ignore */
  }
  pool = null;
  poolError = null;
  connecting = null;
}

export async function getPool(): Promise<sql.ConnectionPool | null> {
  if (!hasSqlConfig()) {
    poolError = "SQL env not configured";
    return null;
  }
  if (pool?.connected) return pool;
  if (connecting) return connecting;

  connecting = (async () => {
    const delays = [300, 900, 2200];
    let lastMsg = "";
    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (pool?.connected) return pool;

          const cfg = getSqlConfig();
          const src = (cfg as { _source?: string })._source ?? "?";
          console.info(
            `[rpm-assure] SQL connecting ${cfg.server}:${cfg.port}/${cfg.database} user=${cfg.user} source=${src} attempt=${attempt}`,
          );

          const result = await connectSql({
            server: cfg.server,
            port: cfg.port,
            database: cfg.database,
            user: cfg.user,
            password: cfg.password,
            encrypt: cfg.options?.encrypt,
            trustServerCertificate: cfg.options?.trustServerCertificate,
            connectionTimeout: cfg.connectionTimeout,
            requestTimeout: cfg.requestTimeout,
          });

          if (!result.ok) {
            lastMsg = result.message;
            if (!isTransientError(result.message) || attempt === 3) {
              pool = null;
              poolError = result.message;
              console.error("[rpm-assure] SQL connect failed:", poolError);
              return null;
            }
            console.warn(
              `[rpm-assure] SQL connect attempt ${attempt} failed, retrying: ${result.message.slice(0, 160)}`,
            );
            await new Promise((r) => setTimeout(r, delays[attempt - 1]));
            continue;
          }

          pool = result.pool;
          poolError = null;
          console.info(
            `[rpm-assure] SQL connected ${result.serverName}/${result.database} as ${result.who} encrypt=${result.encryptUsed}`,
          );
          pool.on("error", (err: Error) => {
            console.error("[rpm-assure] SQL pool error", err);
            pool = null;
            poolError = err.message;
            connecting = null;
          });
          return pool;
        } catch (e) {
          lastMsg = e instanceof Error ? e.message : String(e);
          if (!isTransientError(e) || attempt === 3) {
            pool = null;
            poolError = lastMsg;
            console.error("[rpm-assure] SQL connect failed:", poolError);
            return null;
          }
          await new Promise((r) => setTimeout(r, delays[attempt - 1]));
        }
      }
      pool = null;
      poolError = lastMsg || "SQL connect failed after retries";
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

export { sql };