/**
 * Live AMS incident + SLA tracking API (Fact_Incident).
 */
import { createServerFn } from "@tanstack/react-start";
import { getPool } from "@/lib/data/sql-pool";
import { hasSqlConfig } from "@/lib/data/sql-config";
import type { FactIncidentRow } from "@/lib/data/types";

export type UpsertIncidentInput = {
  customerCode: string;
  incidentId?: string | null;
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  status?: "New" | "InProgress" | "Resolved" | "Closed" | "Cancelled";
  priority?: string | null;
  isMajor?: boolean;
  ownerName?: string | null;
  externalRef?: string | null;
  businessImpact?: string | null;
  sourceSystem?: string | null;
};

export type TransitionIncidentInput = {
  incidentId: string;
  action: "respond" | "resolve" | "close" | "reopen";
  actorName?: string | null;
  note?: string | null;
};

function mapRow(r: Record<string, unknown>): FactIncidentRow {
  return {
    incidentId: r.IncidentId != null ? String(r.IncidentId) : null,
    title: String(r.Title ?? ""),
    severity: String(r.Severity ?? ""),
    status: String(r.Status ?? ""),
    priority: r.Priority != null ? String(r.Priority) : null,
    openedAt: r.OpenedAt ? new Date(r.OpenedAt as string | Date).toISOString() : null,
    firstResponseAt: r.FirstResponseAt
      ? new Date(r.FirstResponseAt as string | Date).toISOString()
      : null,
    resolvedAt: r.ResolvedAt
      ? new Date(r.ResolvedAt as string | Date).toISOString()
      : null,
    isMajor: !!r.IsMajor,
    externalRef: r.ExternalRef != null ? String(r.ExternalRef) : null,
    ownerName: r.OwnerName != null ? String(r.OwnerName) : null,
    sourceSystem: r.SourceSystem != null ? String(r.SourceSystem) : null,
    businessImpact: r.BusinessImpact != null ? String(r.BusinessImpact) : null,
    respondMins: r.RespondMins != null ? Number(r.RespondMins) : null,
    resolveMins: r.ResolveMins != null ? Number(r.ResolveMins) : null,
    responseMinsElapsed: r.ResponseMinsElapsed != null ? Number(r.ResponseMinsElapsed) : null,
    resolveMinsElapsed: r.ResolveMinsElapsed != null ? Number(r.ResolveMinsElapsed) : null,
    responseSlaMet: r.ResponseSlaMet == null ? null : !!r.ResponseSlaMet,
    resolveSlaMet: r.ResolveSlaMet == null ? null : !!r.ResolveSlaMet,
  };
}

export const upsertAmsIncident = createServerFn({ method: "POST" })
  .validator((data: UpsertIncidentInput) => data)
  .handler(async ({ data }: { data: UpsertIncidentInput }) => {
    if (!hasSqlConfig()) return { ok: false as const, error: "SQL not configured" };
    const pool = await getPool();
    if (!pool) return { ok: false as const, error: "SQL pool unavailable" };
    const code = (data.customerCode || "").trim().toUpperCase();
    const title = (data.title || "").trim();
    if (!code || title.length < 3) {
      return { ok: false as const, error: "customerCode and title (min 3) required" };
    }
    const severity = data.severity || "Medium";
    const status = data.status || "New";
    const priority = data.priority || severity;

    try {
      if (data.incidentId) {
        await pool
          .request()
          .input("id", data.incidentId)
          .input("title", title)
          .input("sev", severity)
          .input("status", status)
          .input("pri", priority)
          .input("major", data.isMajor ? 1 : 0)
          .input("owner", data.ownerName ?? null)
          .input("ext", data.externalRef ?? null)
          .input("impact", data.businessImpact ?? null)
          .input("src", data.sourceSystem ?? "RPM Assure")
          .query(`
UPDATE dbo.Fact_Incident
SET Title = @title,
    Severity = @sev,
    Status = @status,
    Priority = @pri,
    IsMajor = @major,
    OwnerName = @owner,
    ExternalRef = @ext,
    BusinessImpact = @impact,
    SourceSystem = COALESCE(@src, SourceSystem),
    UpdatedAt = SYSUTCDATETIME()
WHERE IncidentId = @id;
`);
        const row = await pool.request().input("id", data.incidentId).query(`
SELECT TOP 1 CAST(IncidentId AS nvarchar(36)) AS IncidentId, Title, Severity, Status, Priority,
  OpenedAt, FirstResponseAt, ResolvedAt, IsMajor, ExternalRef, OwnerName, SourceSystem, BusinessImpact,
  ResponseSlaMet, ResolveSlaMet
FROM dbo.Fact_Incident WHERE IncidentId = @id;
`);
        return {
          ok: true as const,
          incident: mapRow(row.recordset[0] as Record<string, unknown>),
        };
      }

      const ins = await pool
        .request()
        .input("code", code)
        .input("title", title)
        .input("sev", severity)
        .input("status", status)
        .input("pri", priority)
        .input("major", data.isMajor ? 1 : 0)
        .input("owner", data.ownerName ?? null)
        .input("ext", data.externalRef ?? null)
        .input("impact", data.businessImpact ?? null)
        .input("src", data.sourceSystem ?? "RPM Assure")
        .query(`
INSERT INTO dbo.Fact_Incident
  (CustomerCode, Title, Severity, Status, Priority, OpenedAt, IsMajor, OwnerName, ExternalRef, BusinessImpact, SourceSystem)
OUTPUT CAST(INSERTED.IncidentId AS nvarchar(36)) AS IncidentId
VALUES
  (@code, @title, @sev, @status, @pri, SYSUTCDATETIME(), @major, @owner, @ext, @impact, @src);
`);
      const id = String(ins.recordset?.[0]?.IncidentId ?? "");
      const row = await pool.request().input("id", id).query(`
SELECT TOP 1 CAST(IncidentId AS nvarchar(36)) AS IncidentId, Title, Severity, Status, Priority,
  OpenedAt, FirstResponseAt, ResolvedAt, IsMajor, ExternalRef, OwnerName, SourceSystem, BusinessImpact,
  ResponseSlaMet, ResolveSlaMet
FROM dbo.Fact_Incident WHERE IncidentId = @id;
`);
      return {
        ok: true as const,
        incident: mapRow(row.recordset[0] as Record<string, unknown>),
      };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });

export const transitionAmsIncident = createServerFn({ method: "POST" })
  .validator((data: TransitionIncidentInput) => data)
  .handler(async ({ data }: { data: TransitionIncidentInput }) => {
    if (!hasSqlConfig()) return { ok: false as const, error: "SQL not configured" };
    const pool = await getPool();
    if (!pool) return { ok: false as const, error: "SQL pool unavailable" };
    const id = data.incidentId;
    if (!id) return { ok: false as const, error: "incidentId required" };

    try {
      const cur = await pool.request().input("id", id).query(`
SELECT TOP 1 OpenedAt, FirstResponseAt, ResolvedAt, Status, Priority, Severity
FROM dbo.Fact_Incident WHERE IncidentId = @id;
`);
      if (!cur.recordset?.length) return { ok: false as const, error: "Incident not found" };
      const c = cur.recordset[0];
      const opened = new Date(c.OpenedAt);
      const pri = String(c.Priority || c.Severity || "Medium");

      const pol = await pool.request().input("pri", pri).query(`
SELECT TOP 1 RespondMins, ResolveMins FROM dbo.Dim_SlaPolicy
WHERE Active = 1 AND Priority = @pri
ORDER BY CASE WHEN CustomerCode IS NULL THEN 1 ELSE 0 END;
`);
      const respondMins = pol.recordset?.[0]?.RespondMins != null ? Number(pol.recordset[0].RespondMins) : null;
      const resolveMins = pol.recordset?.[0]?.ResolveMins != null ? Number(pol.recordset[0].ResolveMins) : null;

      if (data.action === "respond") {
        const now = new Date();
        const elapsed = Math.round((now.getTime() - opened.getTime()) / 60000);
        const met = respondMins != null ? elapsed <= respondMins : null;
        await pool
          .request()
          .input("id", id)
          .input("met", met === null ? null : met ? 1 : 0)
          .query(`
UPDATE dbo.Fact_Incident
SET FirstResponseAt = COALESCE(FirstResponseAt, SYSUTCDATETIME()),
    ResponseSlaMet = COALESCE(ResponseSlaMet, @met),
    Status = CASE WHEN Status = N'New' THEN N'InProgress' ELSE Status END,
    UpdatedAt = SYSUTCDATETIME()
WHERE IncidentId = @id;
`);
      } else if (data.action === "resolve") {
        const now = new Date();
        const elapsed = Math.round((now.getTime() - opened.getTime()) / 60000);
        const met = resolveMins != null ? elapsed <= resolveMins : null;
        await pool
          .request()
          .input("id", id)
          .input("met", met === null ? null : met ? 1 : 0)
          .query(`
UPDATE dbo.Fact_Incident
SET ResolvedAt = COALESCE(ResolvedAt, SYSUTCDATETIME()),
    ResolveSlaMet = COALESCE(ResolveSlaMet, @met),
    FirstResponseAt = COALESCE(FirstResponseAt, SYSUTCDATETIME()),
    Status = N'Resolved',
    UpdatedAt = SYSUTCDATETIME()
WHERE IncidentId = @id;
`);
      } else if (data.action === "close") {
        await pool.request().input("id", id).query(`
UPDATE dbo.Fact_Incident
SET ClosedAt = SYSUTCDATETIME(),
    ResolvedAt = COALESCE(ResolvedAt, SYSUTCDATETIME()),
    Status = N'Closed',
    UpdatedAt = SYSUTCDATETIME()
WHERE IncidentId = @id;
`);
      } else if (data.action === "reopen") {
        await pool.request().input("id", id).query(`
UPDATE dbo.Fact_Incident
SET Status = N'InProgress',
    ClosedAt = NULL,
    ResolvedAt = NULL,
    ResolveSlaMet = NULL,
    UpdatedAt = SYSUTCDATETIME()
WHERE IncidentId = @id;
`);
      }

      let row;
      try {
        row = await pool.request().input("id", id).query(`
SELECT TOP 1 CAST(IncidentId AS nvarchar(36)) AS IncidentId, Title, Severity, Status, Priority,
  OpenedAt, FirstResponseAt, ResolvedAt, IsMajor, ExternalRef, OwnerName, SourceSystem, BusinessImpact,
  RespondMins, ResolveMins, ResponseMinsElapsed, ResolveMinsElapsed,
  ResponseSlaMetCalc AS ResponseSlaMet, ResolveSlaMetCalc AS ResolveSlaMet
FROM dbo.vw_Ams_IncidentLive WHERE IncidentId = @id;
`);
      } catch {
        row = await pool.request().input("id", id).query(`
SELECT TOP 1 CAST(IncidentId AS nvarchar(36)) AS IncidentId, Title, Severity, Status, Priority,
  OpenedAt, FirstResponseAt, ResolvedAt, IsMajor, ExternalRef, OwnerName, SourceSystem, BusinessImpact,
  ResponseSlaMet, ResolveSlaMet
FROM dbo.Fact_Incident WHERE IncidentId = @id;
`);
      }
      return {
        ok: true as const,
        incident: mapRow(row.recordset[0] as Record<string, unknown>),
      };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });
