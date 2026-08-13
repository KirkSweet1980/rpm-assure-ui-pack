import { n as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { r as hasSqlConfig } from "./sql-config-BAM-cI78.mjs";
import { n as getPool } from "./sql-pool-kLXZ0UEv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ams-incident-api-DdsFAsHL.js
/**
* Live AMS incident + SLA tracking API (Fact_Incident).
*/
function mapRow(r) {
	return {
		incidentId: r.IncidentId != null ? String(r.IncidentId) : null,
		title: String(r.Title ?? ""),
		severity: String(r.Severity ?? ""),
		status: String(r.Status ?? ""),
		priority: r.Priority != null ? String(r.Priority) : null,
		openedAt: r.OpenedAt ? new Date(r.OpenedAt).toISOString() : null,
		firstResponseAt: r.FirstResponseAt ? new Date(r.FirstResponseAt).toISOString() : null,
		resolvedAt: r.ResolvedAt ? new Date(r.ResolvedAt).toISOString() : null,
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
		resolveSlaMet: r.ResolveSlaMet == null ? null : !!r.ResolveSlaMet
	};
}
var upsertAmsIncident_createServerFn_handler = createServerRpc({
	id: "c074baa98ff82b2ab90b9b124fbd06f844335e280343557d55653b014240b5a5",
	name: "upsertAmsIncident",
	filename: "src/lib/data/ams-incident-api.ts"
}, (opts) => upsertAmsIncident.__executeServer(opts));
var upsertAmsIncident = createServerFn({ method: "POST" }).validator((data) => data).handler(upsertAmsIncident_createServerFn_handler, async ({ data }) => {
	if (!hasSqlConfig()) return {
		ok: false,
		error: "SQL not configured"
	};
	const pool = await getPool();
	if (!pool) return {
		ok: false,
		error: "SQL pool unavailable"
	};
	const code = (data.customerCode || "").trim().toUpperCase();
	const title = (data.title || "").trim();
	if (!code || title.length < 3) return {
		ok: false,
		error: "customerCode and title (min 3) required"
	};
	const severity = data.severity || "Medium";
	const status = data.status || "New";
	const priority = data.priority || severity;
	try {
		if (data.incidentId) {
			await pool.request().input("id", data.incidentId).input("title", title).input("sev", severity).input("status", status).input("pri", priority).input("major", data.isMajor ? 1 : 0).input("owner", data.ownerName ?? null).input("ext", data.externalRef ?? null).input("impact", data.businessImpact ?? null).input("src", data.sourceSystem ?? "AMS").query(`
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
			return {
				ok: true,
				incident: mapRow((await pool.request().input("id", data.incidentId).query(`
SELECT TOP 1 CAST(IncidentId AS nvarchar(36)) AS IncidentId, Title, Severity, Status, Priority,
  OpenedAt, FirstResponseAt, ResolvedAt, IsMajor, ExternalRef, OwnerName, SourceSystem, BusinessImpact,
  ResponseSlaMet, ResolveSlaMet
FROM dbo.Fact_Incident WHERE IncidentId = @id;
`)).recordset[0])
			};
		}
		const ins = await pool.request().input("code", code).input("title", title).input("sev", severity).input("status", status).input("pri", priority).input("major", data.isMajor ? 1 : 0).input("owner", data.ownerName ?? null).input("ext", data.externalRef ?? null).input("impact", data.businessImpact ?? null).input("src", data.sourceSystem ?? "AMS").query(`
INSERT INTO dbo.Fact_Incident
  (CustomerCode, Title, Severity, Status, Priority, OpenedAt, IsMajor, OwnerName, ExternalRef, BusinessImpact, SourceSystem)
OUTPUT CAST(INSERTED.IncidentId AS nvarchar(36)) AS IncidentId
VALUES
  (@code, @title, @sev, @status, @pri, SYSUTCDATETIME(), @major, @owner, @ext, @impact, @src);
`);
		const id = String(ins.recordset?.[0]?.IncidentId ?? "");
		return {
			ok: true,
			incident: mapRow((await pool.request().input("id", id).query(`
SELECT TOP 1 CAST(IncidentId AS nvarchar(36)) AS IncidentId, Title, Severity, Status, Priority,
  OpenedAt, FirstResponseAt, ResolvedAt, IsMajor, ExternalRef, OwnerName, SourceSystem, BusinessImpact,
  ResponseSlaMet, ResolveSlaMet
FROM dbo.Fact_Incident WHERE IncidentId = @id;
`)).recordset[0])
		};
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : String(e)
		};
	}
});
var transitionAmsIncident_createServerFn_handler = createServerRpc({
	id: "f84543eac9beee0944a5e994928628eff4a1d87a7956b529582f6a208b258961",
	name: "transitionAmsIncident",
	filename: "src/lib/data/ams-incident-api.ts"
}, (opts) => transitionAmsIncident.__executeServer(opts));
var transitionAmsIncident = createServerFn({ method: "POST" }).validator((data) => data).handler(transitionAmsIncident_createServerFn_handler, async ({ data }) => {
	if (!hasSqlConfig()) return {
		ok: false,
		error: "SQL not configured"
	};
	const pool = await getPool();
	if (!pool) return {
		ok: false,
		error: "SQL pool unavailable"
	};
	const id = data.incidentId;
	if (!id) return {
		ok: false,
		error: "incidentId required"
	};
	try {
		const cur = await pool.request().input("id", id).query(`
SELECT TOP 1 OpenedAt, FirstResponseAt, ResolvedAt, Status, Priority, Severity
FROM dbo.Fact_Incident WHERE IncidentId = @id;
`);
		if (!cur.recordset?.length) return {
			ok: false,
			error: "Incident not found"
		};
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
			const elapsed = Math.round(((/* @__PURE__ */ new Date()).getTime() - opened.getTime()) / 6e4);
			const met = respondMins != null ? elapsed <= respondMins : null;
			await pool.request().input("id", id).input("met", met === null ? null : met ? 1 : 0).query(`
UPDATE dbo.Fact_Incident
SET FirstResponseAt = COALESCE(FirstResponseAt, SYSUTCDATETIME()),
    ResponseSlaMet = COALESCE(ResponseSlaMet, @met),
    Status = CASE WHEN Status = N'New' THEN N'InProgress' ELSE Status END,
    UpdatedAt = SYSUTCDATETIME()
WHERE IncidentId = @id;
`);
		} else if (data.action === "resolve") {
			const elapsed = Math.round(((/* @__PURE__ */ new Date()).getTime() - opened.getTime()) / 6e4);
			const met = resolveMins != null ? elapsed <= resolveMins : null;
			await pool.request().input("id", id).input("met", met === null ? null : met ? 1 : 0).query(`
UPDATE dbo.Fact_Incident
SET ResolvedAt = COALESCE(ResolvedAt, SYSUTCDATETIME()),
    ResolveSlaMet = COALESCE(ResolveSlaMet, @met),
    FirstResponseAt = COALESCE(FirstResponseAt, SYSUTCDATETIME()),
    Status = N'Resolved',
    UpdatedAt = SYSUTCDATETIME()
WHERE IncidentId = @id;
`);
		} else if (data.action === "close") await pool.request().input("id", id).query(`
UPDATE dbo.Fact_Incident
SET ClosedAt = SYSUTCDATETIME(),
    ResolvedAt = COALESCE(ResolvedAt, SYSUTCDATETIME()),
    Status = N'Closed',
    UpdatedAt = SYSUTCDATETIME()
WHERE IncidentId = @id;
`);
		else if (data.action === "reopen") await pool.request().input("id", id).query(`
UPDATE dbo.Fact_Incident
SET Status = N'InProgress',
    ClosedAt = NULL,
    ResolvedAt = NULL,
    ResolveSlaMet = NULL,
    UpdatedAt = SYSUTCDATETIME()
WHERE IncidentId = @id;
`);
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
			ok: true,
			incident: mapRow(row.recordset[0])
		};
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : String(e)
		};
	}
});
//#endregion
export { transitionAmsIncident_createServerFn_handler, upsertAmsIncident_createServerFn_handler };
