USE [RPMAssure];
GO
SET NOCOUNT ON;

PRINT '=== KPI views present ===';
SELECT name FROM sys.views
WHERE name LIKE 'vw_Kpi%' OR name LIKE 'vw_Datarapt%' OR name = 'vw_Dim_Customer_Active'
ORDER BY name;

PRINT '=== Fact / App / DTR catalog tables ===';
SELECT name FROM sys.tables
WHERE name LIKE 'Fact_%' OR name LIKE 'App_%'
   OR name IN (N'Dim_SlaPolicy', N'Dim_DtrBalanceType')
   OR name LIKE 'Syspro_Dtr%Balances'
ORDER BY name;

PRINT '=== Portfolio / Health (top 20) ===';
SELECT TOP 20
    CustomerCode, DisplayName, AsOfDate,
    HealthRagProposed, ActiveUserCount,
    CoveFailedDeviceCount, PulsewayOfflineCount, BdInfectedCount
FROM dbo.vw_Kpi_PortfolioDashboard
ORDER BY
    CASE HealthRagProposed WHEN 'Red' THEN 1 WHEN 'Amber' THEN 2 ELSE 3 END,
    CustomerCode;

PRINT '=== Executive dashboard (if 004 applied) ===';
IF OBJECT_ID(N'dbo.vw_Kpi_ExecutiveDashboard', N'V') IS NOT NULL
    SELECT TOP 20 CustomerCode, DisplayName, HealthRag, ActiveUserCount,
           IncidentCountTotal, OpenProblemCount, CsatScore
    FROM dbo.vw_Kpi_ExecutiveDashboard
    ORDER BY CustomerCode;
ELSE
    PRINT 'SKIP: vw_Kpi_ExecutiveDashboard missing — re-run 004.';

PRINT '=== Datarapt DTR (if 005 applied) ===';
IF OBJECT_ID(N'dbo.Dim_DtrBalanceType', N'U') IS NOT NULL
    SELECT * FROM dbo.Dim_DtrBalanceType ORDER BY SortOrder;
ELSE
    PRINT 'SKIP: Dim_DtrBalanceType missing — re-run 005.';

IF OBJECT_ID(N'dbo.vw_Kpi_Syspro_DtrVariance_Latest', N'V') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.vw_Kpi_Syspro_DtrVariance_Latest', N'BalanceTypeName') IS NOT NULL
        SELECT TOP 20 CustomerCode, SourceArea, BalanceTypeName, Variance, InformationLevel
        FROM dbo.vw_Kpi_Syspro_DtrVariance_Latest
        ORDER BY ABS(Variance) DESC;
    ELSE
        SELECT TOP 20 CustomerCode, SourceArea, Variance
        FROM dbo.vw_Kpi_Syspro_DtrVariance_Latest;
END
GO

PRINT '=== Done ===';
GO
