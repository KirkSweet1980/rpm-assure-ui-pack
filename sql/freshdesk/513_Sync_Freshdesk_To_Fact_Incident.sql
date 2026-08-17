SET QUOTED_IDENTIFIER ON;
GO
/* Stamp CustomerCode from map, then MERGE latest Freshdesk tickets into Fact_Incident.
   Do not fail the merge if a filtered index cannot be created. */
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Freshdesk_Tickets', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Fact_Incident', N'U') IS NULL
BEGIN
  PRINT '513 skip - Freshdesk_Tickets or Fact_Incident missing';
  RETURN;
END
GO

IF COL_LENGTH(N'dbo.Fact_Incident', N'SourceSystem') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD SourceSystem nvarchar(50) NULL;
IF COL_LENGTH(N'dbo.Fact_Incident', N'ExternalRef') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ExternalRef nvarchar(100) NULL;
IF COL_LENGTH(N'dbo.Fact_Incident', N'FirstResponseAt') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD FirstResponseAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Fact_Incident', N'ResolvedAt') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ResolvedAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Fact_Incident', N'ClosedAt') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ClosedAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Fact_Incident', N'ModuleCode') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ModuleCode nvarchar(50) NULL;
GO

/* Non-filtered index only - sqlcmd defaults QUOTED_IDENTIFIER OFF and filtered indexes fail. */
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE name = N'IX_Fact_Incident_FdRef' AND object_id = OBJECT_ID(N'dbo.Fact_Incident')
)
  CREATE INDEX IX_Fact_Incident_FdRef
    ON dbo.Fact_Incident (SourceSystem, ExternalRef);
GO

UPDATE t SET t.CustomerCode = m.CustomerCode
FROM dbo.Freshdesk_Tickets t
JOIN dbo.Dim_Freshdesk_CompanyMap m ON m.Active = 1
 AND (
      (t.CompanyId IS NOT NULL AND m.CompanyId IS NOT NULL AND t.CompanyId = m.CompanyId)
   OR LTRIM(RTRIM(ISNULL(t.CompanyName,N''))) = LTRIM(RTRIM(m.CompanyName))
 )
WHERE t.CustomerCode IS NULL OR t.CustomerCode <> m.CustomerCode;

;WITH latest AS (
  SELECT MAX(SnapshotDate) AS Snap FROM dbo.Freshdesk_Tickets
),
src AS (
  SELECT
    t.TicketId,
    t.CustomerCode,
    LEFT(COALESCE(NULLIF(LTRIM(RTRIM(t.Subject)), N''), N'Freshdesk ticket ' + CAST(t.TicketId AS nvarchar(20))), 300) AS Title,
    CASE
      WHEN t.PriorityId = 4 OR t.PriorityName IN (N'Urgent', N'Critical') THEN N'Critical'
      WHEN t.PriorityId = 3 OR t.PriorityName IN (N'High') THEN N'High'
      WHEN t.PriorityId = 2 OR t.PriorityName IN (N'Medium') THEN N'Medium'
      ELSE N'Low'
    END AS Severity,
    CASE
      WHEN t.StatusId = 5 OR t.StatusName IN (N'Closed') THEN N'Closed'
      WHEN t.StatusId = 4 OR t.StatusName IN (N'Resolved') THEN N'Resolved'
      WHEN t.StatusId = 3 OR t.StatusName IN (N'Pending') THEN N'InProgress'
      WHEN t.StatusId = 2 OR t.StatusName IN (N'Open') THEN N'New'
      ELSE N'InProgress'
    END AS Status,
    CASE
      WHEN t.PriorityId = 4 OR t.PriorityName IN (N'Urgent', N'Critical') THEN N'Critical'
      WHEN t.PriorityId = 3 OR t.PriorityName IN (N'High') THEN N'High'
      WHEN t.PriorityId = 2 OR t.PriorityName IN (N'Medium') THEN N'Medium'
      ELSE N'Low'
    END AS Priority,
    COALESCE(t.CreatedAtUtc, t.UpdatedAtUtc, SYSUTCDATETIME()) AS OpenedAt,
    t.FirstRespondedAtUtc AS FirstResponseAt,
    t.ResolvedAtUtc AS ResolvedAt,
    t.ClosedAtUtc AS ClosedAt,
    CASE WHEN t.PriorityId = 4 OR t.PriorityName IN (N'Urgent', N'Critical') THEN CONVERT(bit, 1) ELSE CONVERT(bit, 0) END AS IsMajor,
    N'FD-' + CAST(t.TicketId AS nvarchar(20)) AS ExternalRef,
    LEFT(COALESCE(t.RequesterEmail, t.CompanyName), 200) AS OwnerName,
    CASE
      WHEN t.TypeName LIKE N'%SYSPRO%' OR t.TypeName LIKE N'%Financial%' OR t.TypeName LIKE N'%Distribution%' OR t.TypeName LIKE N'%Manufactur%' THEN N'SYSPRO'
      WHEN t.TypeName LIKE N'%Infra%' OR t.TypeName LIKE N'%Backup%' OR t.TypeName LIKE N'%RMM%' THEN N'RMM'
      WHEN t.TypeName LIKE N'%EPP%' OR t.TypeName LIKE N'%Security%' THEN N'EPP'
      WHEN t.TypeName LIKE N'%365%' OR t.TypeName LIKE N'%CSP%' OR t.TypeName LIKE N'%M365%' THEN N'CSP'
      ELSE N'AMS'
    END AS ModuleCode,
    LEFT(COALESCE(t.TypeName, t.CompanyName), 400) AS BusinessImpact
  FROM dbo.Freshdesk_Tickets t
  CROSS JOIN latest l
  WHERE t.SnapshotDate = l.Snap
    AND t.CustomerCode IS NOT NULL
    AND t.TicketId IS NOT NULL
)
MERGE dbo.Fact_Incident AS tgt
USING src ON tgt.SourceSystem = N'Freshdesk' AND tgt.ExternalRef = src.ExternalRef
WHEN MATCHED THEN UPDATE SET
  tgt.CustomerCode = src.CustomerCode,
  tgt.Title = src.Title,
  tgt.Severity = src.Severity,
  tgt.Status = src.Status,
  tgt.Priority = src.Priority,
  tgt.OpenedAt = src.OpenedAt,
  tgt.FirstResponseAt = src.FirstResponseAt,
  tgt.ResolvedAt = src.ResolvedAt,
  tgt.ClosedAt = src.ClosedAt,
  tgt.IsMajor = src.IsMajor,
  tgt.OwnerName = src.OwnerName,
  tgt.ModuleCode = src.ModuleCode,
  tgt.BusinessImpact = src.BusinessImpact,
  tgt.UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (
  CustomerCode, Title, Severity, Status, Priority,
  OpenedAt, FirstResponseAt, ResolvedAt, ClosedAt,
  IsMajor, ExternalRef, OwnerName, SourceSystem, ModuleCode, BusinessImpact
) VALUES (
  src.CustomerCode, src.Title, src.Severity, src.Status, src.Priority,
  src.OpenedAt, src.FirstResponseAt, src.ResolvedAt, src.ClosedAt,
  src.IsMajor, src.ExternalRef, src.OwnerName, N'Freshdesk', src.ModuleCode, src.BusinessImpact
);

PRINT CONCAT(N'Freshdesk -> Fact_Incident merge done. Rows on latest snap: ',
  (SELECT COUNT(*) FROM dbo.Freshdesk_Tickets t
   WHERE t.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Freshdesk_Tickets)
     AND t.CustomerCode IS NOT NULL));

SELECT CustomerCode, COUNT(*) AS Incidents
FROM dbo.Fact_Incident WITH (NOLOCK)
WHERE SourceSystem = N'Freshdesk'
GROUP BY CustomerCode
ORDER BY CustomerCode;
GO
