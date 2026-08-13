/**
 * Shared SQL Server connect for pool + Settings test.
 * Handles on-prem: Encrypt off, TrustServerCertificate on, quoted passwords.
 */
import sql from "mssql";
import { cleanSqlPassword, passwordDiagnostics } from "./sql-password";

export type SqlConnectInput = {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
  connectionTimeout?: number;
  requestTimeout?: number;
};

export type SqlConnectOk = {
  ok: true;
  pool: sql.ConnectionPool;
  serverName: string;
  database: string;
  who: string;
  encryptUsed: boolean;
};

export type SqlConnectFail = {
  ok: false;
  message: string;
  passwordLength: number;
  attempts: string[];
};

function baseConfig(
  c: SqlConnectInput,
  encrypt: boolean,
): sql.config {
  const password = cleanSqlPassword(c.password);
  return {
    server: c.server.trim(),
    port: Number(c.port) || 14333,
    database: (c.database || "RPMAssure_App").trim(),
    user: c.user.trim(),
    password,
    connectionTimeout: c.connectionTimeout ?? 15000,
    requestTimeout: c.requestTimeout ?? 45000,
    options: {
      encrypt,
      trustServerCertificate: c.trustServerCertificate !== false,
      enableArithAbort: true,
      // Avoid TDS issues on older SQL
      useUTC: true,
    },
    pool: {
      max: 12,
      min: 1,
      idleTimeoutMillis: 60000,
    },
  };
}

/**
 * Try preferred encrypt, then opposite. Returns open pool on success (caller must close if one-shot).
 */
export async function connectSql(
  c: SqlConnectInput,
): Promise<SqlConnectOk | SqlConnectFail> {
  const diag = passwordDiagnostics(c.password ?? "");
  const password = cleanSqlPassword(c.password ?? "");
  const pwdLen = password.length;
  if (!c.server?.trim() || !c.user?.trim()) {
    return {
      ok: false,
      message: "Server and user are required",
      passwordLength: pwdLen,
      attempts: [],
    };
  }
  if (!pwdLen) {
    return {
      ok: false,
      message:
        "Password is empty after cleaning. Type the full SQL password (no quotes), Save, then Test.",
      passwordLength: 0,
      attempts: [],
    };
  }

  const preferEncrypt = Boolean(c.encrypt);
  const order = [preferEncrypt, !preferEncrypt];
  const attempts: string[] = [];

  for (const encrypt of order) {
    const label = `encrypt=${encrypt}`;
    try {
      const pool = await new sql.ConnectionPool(baseConfig(c, encrypt)).connect();
      const r = await pool
        .request()
        .query(
          "SELECT @@SERVERNAME AS srv, DB_NAME() AS db, SUSER_SNAME() AS who, ORIGINAL_LOGIN() AS orig",
        );
      const row = r.recordset[0] as {
        srv: string;
        db: string;
        who: string;
        orig: string;
      };
      attempts.push(`${label}: OK`);
      return {
        ok: true,
        pool,
        serverName: row.srv,
        database: row.db,
        who: row.who || row.orig,
        encryptUsed: encrypt,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      attempts.push(`${label}: ${msg}`);
    }
  }

  const hintParts: string[] = [];
  if (diag.rawLength !== diag.cleanLength) {
    hintParts.push(
      `rawLen=${diag.rawLength} cleanLen=${diag.cleanLength}` +
        (diag.hint ? ` (${diag.hint})` : ""),
    );
  } else {
    hintParts.push(`pwdLength=${pwdLen}`);
  }
  if (password.includes("#")) hintParts.push("contains #");
  if (pwdLen === 19) {
    hintParts.push("length matches RpmCollect#AHIC2026 pattern");
  } else if (pwdLen === 21) {
    hintParts.push(
      "length 21 often means quotes were saved as part of the password — re-type WITHOUT quotes and Save",
    );
  }

  return {
    ok: false,
    message:
      `Login failed for ${c.user.trim()} @ ${c.server.trim()},${c.port || 14333} / ${(c.database || "RPMAssure_App").trim()}. ` +
      hintParts.join(". ") +
      ". " +
      attempts.join(" | ") +
      ` · On central reset login: 209b_Reset_Rpm_collect_Password.sql then sqlcmd -U Rpm_collect -P "RpmCollect#AHIC2026"`,
    passwordLength: pwdLen,
    attempts,
  };
}
