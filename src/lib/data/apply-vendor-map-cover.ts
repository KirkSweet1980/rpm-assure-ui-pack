/**
 * After live SQL load: stamp map flags, then infer cover.
 * Cover = live rows OR an active vendor map (same as cover.ts).
 */
import { getPool } from "./sql-pool";
import { coverFromDetail, coverFromRow, type CustomerCover } from "./cover";
import type { CustomerDetailPayload, PortfolioPayload, PortfolioRow } from "./types";

async function mappedCodes(query: string): Promise<Set<string>> {
  const pool = await getPool();
  if (!pool) return new Set();
  try {
    const r = await pool.request().query(query);
    return new Set(
      (r.recordset ?? []).map((x: { CustomerCode: string }) =>
        String(x.CustomerCode).toUpperCase(),
      ),
    );
  } catch {
    return new Set();
  }
}

async function loadMaps() {
  const [rmm, cove, epp, csp] = await Promise.all([
    mappedCodes(`
SELECT DISTINCT CustomerCode FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK)
WHERE ISNULL(Active,1)=1 AND OrganizationName NOT LIKE N'Invalid%'
  AND LTRIM(RTRIM(ISNULL(OrganizationName,N''))) <> N''`),
    mappedCodes(`
SELECT DISTINCT CustomerCode FROM dbo.Dim_Cove_PartnerMap WITH (NOLOCK)
WHERE ISNULL(Active,1)=1 AND PartnerName NOT LIKE N'Invalid%'
  AND PartnerName NOT LIKE N'%column name%'
  AND LTRIM(RTRIM(ISNULL(PartnerName,N''))) <> N''`),
    mappedCodes(`
SELECT DISTINCT CustomerCode FROM dbo.Dim_Bitdefender_CompanyMap WITH (NOLOCK)
WHERE ISNULL(Active,1)=1 AND CompanyName NOT LIKE N'Invalid%'
  AND CompanyName NOT LIKE N'%column name%'
  AND LTRIM(RTRIM(ISNULL(CompanyName,N''))) <> N''`),
    mappedCodes(`
SELECT DISTINCT CustomerCode FROM dbo.Dim_Csp_TenantMap WITH (NOLOCK)
WHERE ISNULL(Active,1)=1`),
  ]);
  return { rmm, cove, epp, csp };
}

function stamp(row: PortfolioRow, maps: Awaited<ReturnType<typeof loadMaps>>) {
  const k = String(row.customerCode || "").toUpperCase();
  if (maps.rmm.has(k)) row.pulsewayMapped = true;
  if (maps.cove.has(k)) row.coveMapped = true;
  if (maps.epp.has(k)) row.eppMapped = true;
  if (maps.csp.has(k)) row.cspMapped = true;
  row.cover = coverFromRow(row);
}

export async function applyVendorMapCover(payload: PortfolioPayload): Promise<void> {
  const maps = await loadMaps();
  for (const row of payload.customers ?? []) stamp(row, maps);
  for (const row of payload.rows ?? []) stamp(row, maps);
  for (const board of payload.exco?.boards ?? []) {
    const row = payload.customers?.find(
      (c) => c.customerCode.toUpperCase() === String(board.customerCode || "").toUpperCase(),
    );
    if (row?.cover && "cover" in board) {
      (board as { cover?: CustomerCover }).cover = row.cover;
    }
  }
}

export async function applyVendorMapCoverDetail(detail: CustomerDetailPayload): Promise<void> {
  if (!detail.customer) return;
  const maps = await loadMaps();
  stamp(detail.customer, maps);
  const inferred = coverFromDetail(detail);
  detail.cover = inferred;
  detail.customer.cover = inferred;
  if (detail.cove) {
    detail.cove.enabled = Boolean(inferred.cove);
    if (detail.cove.enabled && detail.cove.message?.toLowerCase().includes("no cover")) {
      detail.cove.message = null;
    }
  }
  if (detail.rmm) {
    detail.rmm.enabled = Boolean(inferred.rmm);
    if (detail.rmm.enabled && detail.rmm.message?.toLowerCase().includes("no cover")) {
      detail.rmm.message = null;
    }
  }
  if (detail.epp) {
    detail.epp.enabled = Boolean(inferred.epp);
    if (detail.epp.enabled && detail.epp.message?.toLowerCase().includes("no cover")) {
      detail.epp.message = null;
    }
  }
  if (detail.csp) {
    detail.csp.enabled = Boolean(inferred.csp);
    if (detail.csp.enabled && detail.csp.message?.toLowerCase().includes("no cover")) {
      detail.csp.message = null;
    }
  }
}
