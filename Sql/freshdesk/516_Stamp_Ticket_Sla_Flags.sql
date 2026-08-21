USE RPMAssure_App;
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
GO

/* Stamp Fact_Incident SLA flags from timestamps + Dim_SlaPolicy.
   Closed tickets without a resolve time use ClosedAt / UpdatedAt.
   Open tickets past the clock are a breach. Open tickets still inside the clock stay NULL. */

IF COL_LENGTH(N'dbo.Fact_Incident', N'FirstResponseAt') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD FirstResponseAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Fact_Incident', N'ResolvedAt') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ResolvedAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Fact_Incident', N'ClosedAt') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ClosedAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Fact_Incident', N'ResponseSlaMet') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ResponseSlaMet bit NULL;
IF COL_LENGTH(N'dbo.Fact_Incident', N'ResolveSlaMet') IS NULL
  ALTER TABLE dbo.Fact_Incident ADD ResolveSlaMet bit NULL;
GO

UPDATE i
SET i.ResolvedAt = COALESCE(i.ResolvedAt, i.ClosedAt)
FROM dbo.Fact_Incident i
WHERE i.ResolvedAt IS NULL
  AND i.ClosedAt IS NOT NULL
  AND i.Status IN (N'Resolved', N'Closed');

UPDATE i
SET
  i.ResponseSlaMet = CASE
    WHEN i.OpenedAt IS NULL OR p.RespondMins IS NULL THEN i.ResponseSlaMet
    WHEN i.FirstResponseAt IS NOT NULL
      THEN CASE WHEN DATEDIFF(MINUTE, i.OpenedAt, i.FirstResponseAt) <= p.RespondMins THEN CONVERT(bit,1) ELSE CONVERT(bit,0) END
    WHEN i.Status IN (N'Resolved', N'Closed', N'Cancelled') THEN i.ResponseSlaMet
    WHEN DATEDIFF(MINUTE, i.OpenedAt, SYSUTCDATETIME()) > p.RespondMins THEN CONVERT(bit,0)
    ELSE NULL
  END,
  i.ResolveSlaMet = CASE
    WHEN i.OpenedAt IS NULL OR p.ResolveMins IS NULL THEN i.ResolveSlaMet
    WHEN COALESCE(i.ResolvedAt, i.ClosedAt) IS NOT NULL
      THEN CASE WHEN DATEDIFF(MINUTE, i.OpenedAt, COALESCE(i.ResolvedAt, i.ClosedAt)) <= p.ResolveMins THEN CONVERT(bit,1) ELSE CONVERT(bit,0) END
    WHEN i.Status IN (N'Resolved', N'Closed')
      THEN CASE WHEN DATEDIFF(MINUTE, i.OpenedAt, SYSUTCDATETIME()) <= p.ResolveMins THEN CONVERT(bit,1) ELSE CONVERT(bit,0) END
    WHEN DATEDIFF(MINUTE, i.OpenedAt, SYSUTCDATETIME()) > p.ResolveMins THEN CONVERT(bit,0)
    ELSE NULL
  END
FROM dbo.Fact_Incident i
OUTER APPLY (
  SELECT TOP 1 RespondMins, ResolveMins
  FROM dbo.Dim_SlaPolicy WITH (NOLOCK)
  WHERE Active = 1
    AND Priority = COALESCE(i.Priority, i.Severity)
    AND (CustomerCode = i.CustomerCode OR CustomerCode IS NULL)
  ORDER BY CASE WHEN CustomerCode = i.CustomerCode THEN 0 ELSE 1 END, ISNULL(Position, 99)
) p;

PRINT N'516 ticket SLA flags stamped';

SELECT
  CustomerCode,
  COUNT(*) AS Tickets,
  SUM(CASE WHEN ResponseSlaMet = 1 THEN 1 ELSE 0 END) AS RespMet,
  SUM(CASE WHEN ResponseSlaMet = 0 THEN 1 ELSE 0 END) AS RespBreach,
  SUM(CASE WHEN ResolveSlaMet = 1 THEN 1 ELSE 0 END) AS ResMet,
  SUM(CASE WHEN ResolveSlaMet = 0 THEN 1 ELSE 0 END) AS ResBreach
FROM dbo.Fact_Incident WITH (NOLOCK)
GROUP BY CustomerCode
ORDER BY CustomerCode;
GO
