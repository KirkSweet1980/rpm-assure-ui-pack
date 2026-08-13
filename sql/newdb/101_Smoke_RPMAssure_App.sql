USE [RPMAssure_App];
GO
SET NOCOUNT ON;
SELECT @@SERVERNAME ServerName, DB_NAME() DbName;
SELECT COUNT(*) TablesCnt FROM sys.tables WHERE is_ms_shipped=0;
SELECT COUNT(*) ViewsCnt FROM sys.views WHERE name LIKE 'vw_%';
SELECT name FROM sys.tables WHERE name LIKE 'Syspro_Dtr%Balances' ORDER BY 1;
SELECT * FROM dbo.Dim_DtrBalanceType ORDER BY SortOrder;
SELECT name FROM sys.tables WHERE name LIKE 'Fact_%' ORDER BY 1;
SELECT name FROM sys.views WHERE name LIKE 'vw_Kpi%' ORDER BY 1;
SELECT TOP 20 * FROM dbo.vw_Kpi_PortfolioDashboard;
SELECT TOP 20 * FROM dbo.vw_Kpi_ExecutiveDashboard;
PRINT 'Smoke done — empty portfolio is OK until copy/import.';
GO
