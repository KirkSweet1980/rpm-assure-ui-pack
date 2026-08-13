/**
 * Self-heal cover from live warehouse rows.
 * Same rule every customer / every pillar:
 *   count > 0  -> Covered
 *   count = 0  -> No Cover
 * Also stamps CustomerCode from maps and drops junk map rows
 * (e.g. "Invalid column name") so the UI cannot lie.
 */
import type { CustomerCover } from "./cover";
import { withRetry, withRetrySoft } from "./retry";

export type LiveCoverCounts = {
  rmm: number;
  cove: number;
  epp: number;
  csp: number;
};

type SqlFn = typeof import("./sql-pool").sql;
type Pool = NonNullable<Awaited<ReturnType<typeof import("./sql-pool").getPool>>>;

export async function healAndCountCover(
  pool: Pool,
  sql: SqlFn,
  code: string,
): Promise<LiveCoverCounts> {
  const c = String(code || "").trim();
  if (!c) return { rmm: 0, cove: 0, epp: 0, csp: 0 };

  return withRetry(() => healOnce(pool, sql, c), {
    attempts: 3,
    delaysMs: [300, 900, 1800],
    label: `heal-cover:${c}`,
  });
}

async function healOnce(
  pool: Pool,
  sql: SqlFn,
  c: string,
): Promise<LiveCoverCounts> {

  // 1) Drop junk maps created by failed onboarding prompts
  try {
    await pool.request().input("code", sql.NVarChar(50), c).query(`
DELETE FROM dbo.Dim_Bitdefender_CompanyMap
WHERE CustomerCode = @code
  AND (
    CompanyName LIKE N'Invalid%'
    OR CompanyName LIKE N'%column name%'
    OR CompanyName LIKE N'System.Object%'
    OR LTRIM(RTRIM(ISNULL(CompanyName,N''))) = N''
  );
DELETE FROM dbo.Dim_Pulseway_OrgMap
WHERE CustomerCode = @code
  AND (
    OrganizationName LIKE N'Invalid%'
    OR OrganizationName LIKE N'System.Object%'
    OR LTRIM(RTRIM(ISNULL(OrganizationName,N''))) = N''
  );
DELETE FROM dbo.Dim_Cove_PartnerMap
WHERE CustomerCode = @code
  AND (
    PartnerName LIKE N'Invalid%'
    OR PartnerName LIKE N'System.Object%'
    OR LTRIM(RTRIM(ISNULL(PartnerName,N''))) = N''
  );`);
  } catch {
    /* maps optional */
  }

  // 2) Stamp live rows from remaining maps (this customer only)
  try {
    await pool.request().input("code", sql.NVarChar(50), c).query(`
UPDATE d SET d.CustomerCode = @code
FROM dbo.Pulseway_Devices AS d
INNER JOIN dbo.Dim_Pulseway_OrgMap AS m
  ON m.Active = 1 AND m.CustomerCode = @code
 AND m.OrganizationName = d.OrganizationName
WHERE d.CustomerCode IS NULL OR d.CustomerCode <> @code;`);
  } catch {
    /* */
  }
  try {
    await pool.request().input("code", sql.NVarChar(50), c).query(`
UPDATE d SET d.CustomerCode = @code
FROM dbo.Cove_DeviceStatistics AS d
INNER JOIN dbo.Dim_Cove_PartnerMap AS m
  ON m.Active = 1 AND m.CustomerCode = @code
 AND (d.Product = m.PartnerName)
WHERE d.CustomerCode IS NULL OR d.CustomerCode <> @code;`);
  } catch {
    /* */
  }
  try {
    await pool.request().input("code", sql.NVarChar(50), c).query(`
UPDATE e SET e.CustomerCode = @code
FROM dbo.Bitdefender_Endpoints AS e
INNER JOIN dbo.Dim_Bitdefender_CompanyMap AS m
  ON m.Active = 1 AND m.CustomerCode = @code
 AND e.CompanyName = m.CompanyName
WHERE e.CompanyName IS NOT NULL
  AND (e.CustomerCode IS NULL OR e.CustomerCode <> @code);`);
  } catch {
    /* CompanyName column may be missing - ignore */
  }

  // 3) Live counts (latest snapshot only)
  const counts: LiveCoverCounts = { rmm: 0, cove: 0, epp: 0, csp: 0 };
  counts.rmm = await withRetrySoft(
    async () => {
      const r = await pool.request().input("code", sql.NVarChar(50), c).query(`
SELECT COUNT_BIG(*) AS n
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE CustomerCode = @code
  AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));`);
      return Number(r.recordset?.[0]?.n) || 0;
    },
    0,
    { attempts: 3, label: `count-rmm:${c}` },
  );
  counts.cove = await withRetrySoft(
    async () => {
      const r = await pool.request().input("code", sql.NVarChar(50), c).query(`
SELECT COUNT_BIG(*) AS n
FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
WHERE CustomerCode = @code
  AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK));`);
      return Number(r.recordset?.[0]?.n) || 0;
    },
    0,
    { attempts: 3, label: `count-cove:${c}` },
  );
  counts.epp = await withRetrySoft(
    async () => {
      const r = await pool.request().input("code", sql.NVarChar(50), c).query(`
SELECT COUNT_BIG(*) AS n
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE UPPER(LTRIM(RTRIM(ISNULL(CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code)))
  AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
    WHERE UPPER(LTRIM(RTRIM(ISNULL(CustomerCode,N'')))) = UPPER(LTRIM(RTRIM(@code))));`);
      return Number(r.recordset?.[0]?.n) || 0;
    },
    0,
    { attempts: 3, label: `count-epp:${c}` },
  );
  counts.csp = await withRetrySoft(
    async () => {
      const r = await pool.request().input("code", sql.NVarChar(50), c).query(`
SELECT
  (SELECT COUNT_BIG(*) FROM dbo.Csp_Licenses WITH (NOLOCK) WHERE CustomerCode = @code) +
  (SELECT COUNT_BIG(*) FROM dbo.Csp_TenantHealth WITH (NOLOCK) WHERE CustomerCode = @code)
  AS n;`);
      return Number(r.recordset?.[0]?.n) || 0;
    },
    0,
    { attempts: 3, label: `count-csp:${c}` },
  );

  // 4) Write AmsConfig to match live counts (self-heal flags)
  try {
    await pool
      .request()
      .input("code", sql.NVarChar(50), c)
      .input("rmm", sql.Bit, counts.rmm > 0)
      .input("cove", sql.Bit, counts.cove > 0)
      .input("epp", sql.Bit, counts.epp > 0)
      .input("csp", sql.Bit, counts.csp > 0).query(`
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NULL RETURN;
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = @code)
  INSERT dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarPulseway, PillarCove, PillarBitdefender)
  VALUES (@code, 1, @rmm, @cove, @epp);
ELSE
  UPDATE dbo.Dim_Customer_AmsConfig
  SET PillarPulseway = @rmm,
      PillarCove = @cove,
      PillarBitdefender = @epp,
      UpdatedAt = SYSUTCDATETIME(),
      UpdatedBy = N'heal-cover'
  WHERE CustomerCode = @code;
`);
  } catch {
    /* write optional */
  }
  try {
    await pool
      .request()
      .input("code", sql.NVarChar(50), c)
      .input("csp", sql.Bit, counts.csp > 0)
      .query(
        `UPDATE dbo.Dim_Customer_AmsConfig SET PillarMicrosoftCsp = @csp WHERE CustomerCode = @code`,
      );
  } catch {
    try {
      await pool
        .request()
        .input("code", sql.NVarChar(50), c)
        .input("csp", sql.Bit, counts.csp > 0)
        .query(
          `UPDATE dbo.Dim_Customer_AmsConfig SET PillarCsp = @csp WHERE CustomerCode = @code`,
        );
    } catch {
      /* optional */
    }
  }

  return counts;
}

export function coverFromLiveCounts(
  base: CustomerCover,
  live: LiveCoverCounts,
): CustomerCover {
  return {
    syspro: base.syspro,
    rmm: live.rmm > 0,
    cove: live.cove > 0,
    epp: live.epp > 0,
    csp: live.csp > 0,
  };
}