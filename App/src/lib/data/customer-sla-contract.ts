import { createServerFn } from "@tanstack/react-start";
import { getPool, getLastPoolError, sql } from "@/lib/data/sql-pool";
import { INDUSTRY_MEASURES, type IndustryPillarKey } from "@/lib/data/sla-metrics";

export type SlaContractStatus = "provisional" | "signed";

export type CustomerSlaKpi = {
  pillar: IndustryPillarKey;
  targetPct: number;
};

export type CustomerSlaContract = {
  customerCode: string;
  status: SlaContractStatus;
  documentName: string | null;
  signedBy: string | null;
  signedAtUtc: string | null;
  confirmedSignature: boolean;
  notes: string | null;
  kpis: Partial<Record<IndustryPillarKey, number>>;
};

export function defaultSlaKpis(): Record<IndustryPillarKey, number> {
  return {
    syspro: INDUSTRY_MEASURES.syspro.targetPct,
    rmm: INDUSTRY_MEASURES.rmm.targetPct,
    cove: INDUSTRY_MEASURES.cove.targetPct,
    epp: INDUSTRY_MEASURES.epp.targetPct,
    csp: INDUSTRY_MEASURES.csp.targetPct,
    tickets: INDUSTRY_MEASURES.tickets.targetPct,
  };
}

export function emptySlaContract(code: string): CustomerSlaContract {
  return {
    customerCode: code.toUpperCase(),
    status: "provisional",
    documentName: null,
    signedBy: null,
    signedAtUtc: null,
    confirmedSignature: false,
    notes: null,
    kpis: defaultSlaKpis(),
  };
}

function parseKpis(raw: string | null | undefined): Partial<Record<IndustryPillarKey, number>> {
  const base = defaultSlaKpis();
  if (!raw) return base;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    for (const k of Object.keys(base) as IndustryPillarKey[]) {
      const n = Number(j[k]);
      if (Number.isFinite(n) && n > 0 && n <= 100) base[k] = Math.round(n * 100) / 100;
    }
  } catch {
    /* keep defaults */
  }
  return base;
}

async function ensureTable(pool: NonNullable<Awaited<ReturnType<typeof getPool>>>) {
  await pool.request().query(`
IF OBJECT_ID(N'dbo.Dim_Customer_SlaContract', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Customer_SlaContract (
    CustomerCode nvarchar(32) NOT NULL CONSTRAINT PK_Dim_Customer_SlaContract PRIMARY KEY,
    Status nvarchar(20) NOT NULL CONSTRAINT DF_SlaC_Status DEFAULT (N'provisional'),
    DocumentName nvarchar(260) NULL,
    SignedBy nvarchar(120) NULL,
    SignedAtUtc datetime2 NULL,
    ConfirmedSignature bit NOT NULL CONSTRAINT DF_SlaC_Sig DEFAULT (0),
    Notes nvarchar(500) NULL,
    KpiJson nvarchar(max) NULL,
    UpdatedUtc datetime2 NOT NULL CONSTRAINT DF_SlaC_Upd DEFAULT (SYSUTCDATETIME())
  );
END
`);
}

export const fetchCustomerSlaContract = createServerFn({ method: "GET" })
  .validator((data: { code: string }) => data)
  .handler(async ({ data }): Promise<CustomerSlaContract> => {
    const code = String(data.code ?? "").trim().toUpperCase();
    const empty = emptySlaContract(code || "UNKNOWN");
    if (!code) return empty;
    const pool = await getPool();
    if (!pool) return empty;
    try {
      await ensureTable(pool);
      const r = await pool
        .request()
        .input("c", sql.NVarChar(32), code)
        .query(`
SELECT CustomerCode, Status, DocumentName, SignedBy, SignedAtUtc, ConfirmedSignature, Notes, KpiJson
FROM dbo.Dim_Customer_SlaContract WITH (NOLOCK)
WHERE CustomerCode = @c
`);
      const row = r.recordset[0] as
        | {
            CustomerCode: string;
            Status: string;
            DocumentName: string | null;
            SignedBy: string | null;
            SignedAtUtc: Date | string | null;
            ConfirmedSignature: boolean;
            Notes: string | null;
            KpiJson: string | null;
          }
        | undefined;
      if (!row) return empty;
      const signed = String(row.Status ?? "").toLowerCase() === "signed" && Boolean(row.ConfirmedSignature);
      return {
        customerCode: code,
        status: signed ? "signed" : "provisional",
        documentName: row.DocumentName,
        signedBy: row.SignedBy,
        signedAtUtc: row.SignedAtUtc ? new Date(row.SignedAtUtc).toISOString() : null,
        confirmedSignature: Boolean(row.ConfirmedSignature),
        notes: row.Notes,
        kpis: parseKpis(row.KpiJson),
      };
    } catch {
      return empty;
    }
  });

export const saveCustomerSlaContract = createServerFn({ method: "POST" })
  .validator(
    (data: {
      code: string;
      documentName?: string;
      signedBy?: string;
      confirmedSignature?: boolean;
      notes?: string;
      kpis?: Partial<Record<IndustryPillarKey, number>>;
      sign?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    const code = String(data.code ?? "").trim().toUpperCase();
    if (!code) return { ok: false as const, error: "customer code required" };
    const pool = await getPool();
    if (!pool) return { ok: false as const, error: getLastPoolError() || "SQL not connected" };
    const kpis = { ...defaultSlaKpis(), ...(data.kpis ?? {}) };
    const confirm = Boolean(data.confirmedSignature);
    const sign = Boolean(data.sign) && confirm;
    const doc = String(data.documentName ?? "").trim().slice(0, 260);
    const by = String(data.signedBy ?? "").trim().slice(0, 120);
    const notes = String(data.notes ?? "").trim().slice(0, 500);
    if (sign && !doc) return { ok: false as const, error: "Document name required to sign" };
    if (sign && !by) return { ok: false as const, error: "Signed-by name required" };
    try {
      await ensureTable(pool);
      await pool
        .request()
        .input("c", sql.NVarChar(32), code)
        .input("st", sql.NVarChar(20), sign ? "signed" : "provisional")
        .input("dn", sql.NVarChar(260), doc || null)
        .input("by", sql.NVarChar(120), by || null)
        .input("sig", sql.Bit, confirm ? 1 : 0)
        .input("n", sql.NVarChar(500), notes || null)
        .input("k", sql.NVarChar(sql.MAX), JSON.stringify(kpis))
        .query(`
MERGE dbo.Dim_Customer_SlaContract AS t
USING (SELECT @c AS CustomerCode) AS s
ON t.CustomerCode = s.CustomerCode
WHEN MATCHED THEN UPDATE SET
  Status = @st,
  DocumentName = COALESCE(@dn, t.DocumentName),
  SignedBy = CASE WHEN @st = N'signed' THEN @by ELSE t.SignedBy END,
  SignedAtUtc = CASE WHEN @st = N'signed' THEN SYSUTCDATETIME() ELSE t.SignedAtUtc END,
  ConfirmedSignature = @sig,
  Notes = @n,
  KpiJson = @k,
  UpdatedUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT
  (CustomerCode, Status, DocumentName, SignedBy, SignedAtUtc, ConfirmedSignature, Notes, KpiJson)
  VALUES (@c, @st, @dn, CASE WHEN @st = N'signed' THEN @by ELSE NULL END,
          CASE WHEN @st = N'signed' THEN SYSUTCDATETIME() ELSE NULL END,
          @sig, @n, @k);
`);
      return { ok: true as const, status: sign ? ("signed" as const) : ("provisional" as const) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  });

export async function loadSlaKpiMap(): Promise<Record<string, import("./service-sla").SlaKpiOverrides>> {
  const map: Record<string, import("./service-sla").SlaKpiOverrides> = {};
  const pool = await getPool();
  if (!pool) return map;
  try {
    const r = await pool.request().query(`
SELECT CustomerCode, KpiJson FROM dbo.Dim_Customer_SlaContract WITH (NOLOCK)
`);
    for (const row of r.recordset as { CustomerCode: string; KpiJson: string | null }[]) {
      const code = String(row.CustomerCode ?? "").toUpperCase();
      if (!code) continue;
      map[code] = parseKpis(row.KpiJson);
    }
  } catch {
    /* empty */
  }
  return map;
}
