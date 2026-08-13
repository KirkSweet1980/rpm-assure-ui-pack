USE RPMAssure_App;
SET NOCOUNT ON;
SELECT CustomerCode, InformationLevel, COUNT(*) AS Rows,
  COUNT(DISTINCT CompanyDb) AS Companies,
  SUM(CASE WHEN ABS(ISNULL(Variance,0)) > 0.005 THEN 1 ELSE 0 END) AS OobLines
FROM dbo.vw_FinSight_ControlBalances_All WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.vw_FinSight_ControlBalances_All WITH (NOLOCK))
GROUP BY CustomerCode, InformationLevel
ORDER BY CustomerCode, InformationLevel;
