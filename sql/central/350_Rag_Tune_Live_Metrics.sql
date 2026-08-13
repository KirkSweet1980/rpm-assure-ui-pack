/*
  Live metrics for RAG threshold tuning (run on central RPMAssure_App)
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -U "Rpm_collect" -P "***" -C -i 350_Rag_Tune_Live_Metrics.sql
*/
SET NOCOUNT ON;
PRINT N'=== Per-customer live inputs (active) ===';
;WITH Cust AS (
  SELECT CustomerCode, DisplayName, ISNULL(SqlInstanceName,N'') AS SqlInstanceName, CAST(Active AS bit) AS Active
  FROM dbo.Dim_Customer WITH (NOLOCK) WHERE Active = 1
),
Ops AS (
  SELECT InstanceName, MAX(ImportedAt) AS LastOps, COUNT(*) AS OpsCnt
  FROM dbo.Syspro_Operators WITH (NOLOCK) GROUP BY InstanceName
),
Jobs AS (
  SELECT j.InstanceName, COUNT(*) AS JobsCnt,
         SUM(CASE WHEN j.ProgErrorCode IS NOT NULL AND j.ProgErrorCode <> 0 THEN 1 ELSE 0 END) AS JobErrors
  FROM dbo.Syspro_JobLogging j WITH (NOLOCK)
  WHERE j.SnapshotDate = (SELECT MAX(j2.SnapshotDate) FROM dbo.Syspro_JobLogging j2 WITH (NOLOCK) WHERE j2.InstanceName = j.InstanceName)
  GROUP BY j.InstanceName
),
Dtr AS (
  SELECT InstanceName,
         SUM(CASE WHEN ISNULL(Variance,0) <> 0 THEN 1 ELSE 0 END) AS VarLines
  FROM (
    SELECT InstanceName, Variance FROM dbo.Syspro_DtrInvBalances WITH (NOLOCK)
    UNION ALL SELECT InstanceName, Variance FROM dbo.Syspro_DtrApBalances WITH (NOLOCK)
    UNION ALL SELECT InstanceName, Variance FROM dbo.Syspro_DtrArBalances WITH (NOLOCK)
  ) x GROUP BY InstanceName
)
SELECT c.CustomerCode, c.DisplayName, c.SqlInstanceName,
       ISNULL(o.OpsCnt,0) AS OpsCnt, o.LastOps,
       ISNULL(j.JobErrors,0) AS JobErrors,
       ISNULL(d.VarLines,0) AS DtrVarLines,
       CASE WHEN o.LastOps IS NULL THEN NULL
            ELSE CAST(DATEDIFF(MINUTE, o.LastOps, SYSUTCDATETIME())/60.0 AS decimal(10,1)) END AS HoursSinceOps
FROM Cust c
LEFT JOIN Ops o ON o.InstanceName = c.SqlInstanceName
LEFT JOIN Jobs j ON j.InstanceName = c.SqlInstanceName
LEFT JOIN Dtr d ON d.InstanceName = c.SqlInstanceName
ORDER BY ISNULL(j.JobErrors,0) DESC, c.DisplayName;

PRINT N'=== Estate stats ===';
;WITH X AS (
  SELECT ISNULL(j.JobErrors,0) AS JobErrors
  FROM dbo.Dim_Customer c WITH (NOLOCK)
  LEFT JOIN (
    SELECT InstanceName,
           SUM(CASE WHEN ProgErrorCode IS NOT NULL AND ProgErrorCode <> 0 THEN 1 ELSE 0 END) AS JobErrors
    FROM dbo.Syspro_JobLogging WITH (NOLOCK)
    WHERE SnapshotDate IN (SELECT MAX(SnapshotDate) FROM dbo.Syspro_JobLogging j2 WITH (NOLOCK) WHERE j2.InstanceName = Syspro_JobLogging.InstanceName)
    GROUP BY InstanceName
  ) j ON j.InstanceName = c.SqlInstanceName
  WHERE c.Active = 1
)
SELECT COUNT(*) AS ActiveCustomers,
       MAX(JobErrors) AS MaxJobErrors,
       AVG(CAST(JobErrors AS float)) AS AvgJobErrors
FROM X;
PRINT N'Done. Prefer Settings → RAG → Suggest from live estate in the app.';
