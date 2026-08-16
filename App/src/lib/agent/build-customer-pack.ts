import fs from "node:fs";
import path from "node:path";
import { getPool, sql as sqlTypes } from "@/lib/data/sql-pool";
import { getSqlConfig, hasSqlConfig } from "@/lib/data/sql-config";
import { zipStore } from "@/lib/agent/zip-store";

export type CustomerPackMeta = {
  customerCode: string;
  displayName: string;
  sqlHost: string;
  instanceName: string;
};

function findInstallerFile(name: string): string | null {
  const cwd = process.cwd();
  const hits = [
    path.join(cwd, "sql", "agent", "installer", name),
    path.join(cwd, "..", "sql", "agent", "installer", name),
    path.join("C:\\RPM-Assure\\deploy\\ui-pack\\Sql\\agent\\installer", name),
    path.join("C:\\RPM-Assure\\Sql\\agent\\installer", name),
    path.join("/workspace/sql/agent/installer", name),
  ];
  for (const p of hits) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function centralFromSettings(): {
  centralDataSource: string;
  centralDatabase: string;
  centralSqlUser: string;
  centralSqlPassword: string;
} {
  if (hasSqlConfig()) {
    try {
      const c = getSqlConfig();
      const host = c.port && c.port !== 1433 ? `${c.server},${c.port}` : c.server;
      return {
        centralDataSource: host,
        centralDatabase: c.database || "RPMAssure_App",
        centralSqlUser: c.user,
        centralSqlPassword: c.password,
      };
    } catch {
      /* fall through */
    }
  }
  return {
    centralDataSource: "102.222.21.220,14333",
    centralDatabase: "RPMAssure_App",
    centralSqlUser: "rpmassure",
    centralSqlPassword: "@ssuR3me!",
  };
}

export async function loadCustomerPackMeta(codeRaw: string): Promise<CustomerPackMeta | null> {
  const code = String(codeRaw || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,20}$/.test(code)) return null;
  const pool = await getPool();
  if (!pool) {
    return { customerCode: code, displayName: code, sqlHost: "", instanceName: "" };
  }
  const r = await pool
    .request()
    .input("c", sqlTypes.NVarChar(32), code)
    .query(
      `SELECT TOP 1 CustomerCode, DisplayName, ISNULL(SqlInstanceName, N'') AS SqlInstanceName
       FROM dbo.Dim_Customer WITH (NOLOCK) WHERE CustomerCode = @c`,
    );
  const row = r.recordset?.[0] as
    | { CustomerCode?: string; DisplayName?: string; SqlInstanceName?: string }
    | undefined;
  if (!row) return { customerCode: code, displayName: code, sqlHost: "", instanceName: "" };
  const inst = String(row.SqlInstanceName ?? "").trim();
  return {
    customerCode: String(row.CustomerCode ?? code).toUpperCase(),
    displayName: String(row.DisplayName ?? code),
    sqlHost: inst,
    instanceName: inst,
  };
}

export async function buildCustomerAgentZip(codeRaw: string): Promise<{
  fileName: string;
  bytes: Buffer;
} | null> {
  const meta = await loadCustomerPackMeta(codeRaw);
  if (!meta) return null;
  const central = centralFromSettings();
  const pkg = {
    ...meta,
    localAuth: "Windows",
    ...central,
  };
  const wizardPath = findInstallerFile("Install-Customer-Pack-Wizard.ps1");
  const cmdPath = findInstallerFile("Start-Customer-Pack.cmd");
  const ensurePath = findInstallerFile("Ensure-Collect-And-Central.ps1");
  const sqlPath = findInstallerFile("Sql-Connect.ps1");
  if (!wizardPath || !cmdPath || !ensurePath || !sqlPath) {
    throw new Error("Installer templates missing on the App server. Run Update-AppServer.ps1.");
  }
  const wizard = fs.readFileSync(wizardPath);
  const cmd = fs.readFileSync(cmdPath);
  const ensure = fs.readFileSync(ensurePath);
  const sqlc = fs.readFileSync(sqlPath);
  const readme = Buffer.from(
    [
      `RPM Assure Edge Agent — ${pkg.displayName} (${pkg.customerCode})`,
      "",
      "1. Copy this folder to the customer SQL server.",
      "2. Right-click Start-Agent.cmd → Run as administrator.",
      "3. Customer → how YOU connect to SQL today (Windows or existing SQL login).",
      "4. Test existing login → Create rpmassure → set agent password → Finish.",
      "",
      "Customer identity is pre-filled. You enter the customer's existing SQL admin",
      "(Windows or SQL login such as RPMAdmin). The wizard then creates rpmassure.",
      "Last page: agent admin password (locks settings).",
      "",
    ].join("\r\n"),
    "utf8",
  );
  const bytes = zipStore([
    { name: "Start-Agent.cmd", data: cmd },
    { name: "Install-Customer-Pack-Wizard.ps1", data: wizard },
    { name: "Ensure-Collect-And-Central.ps1", data: ensure },
    { name: "Sql-Connect.ps1", data: sqlc },
    { name: "Customer.Package.json", data: Buffer.from(JSON.stringify(pkg, null, 2), "utf8") },
    { name: "README.txt", data: readme },
  ]);
  return { fileName: `RPMAssure-Agent-${pkg.customerCode}.zip`, bytes };
}
