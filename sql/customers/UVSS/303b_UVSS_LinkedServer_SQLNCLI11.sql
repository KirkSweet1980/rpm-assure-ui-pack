/*
  Minimal linked server — SQLNCLI11 only (present on UVSS)
  sqlcmd -S "." -U "SYSPROAdmin" -P '$y$pr0' -C -b -i thisfile.sql
*/
USE master;
GO
SET NOCOUNT ON;

-- Drop existing
IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL')
BEGIN
  EXEC sp_dropserver @server = N'RPM_CENTRAL', @droplogins = 'droplogins';
  PRINT N'Dropped RPM_CENTRAL';
END
GO

EXEC sp_addlinkedserver
  @server     = N'RPM_CENTRAL',
  @srvproduct = N'',
  @provider   = N'SQLNCLI11',
  @datasrc    = N'102.222.21.220,14333';
PRINT N'sp_addlinkedserver done';
GO

EXEC sp_addlinkedsrvlogin
  @rmtsrvname  = N'RPM_CENTRAL',
  @useself     = N'False',
  @locallogin  = NULL,
  @rmtuser     = N'Rpm_collect',
  @rmtpassword = N'RpmCollect#AHIC2026';
PRINT N'sp_addlinkedsrvlogin done';
GO

EXEC sp_serveroption N'RPM_CENTRAL', N'data access', N'true';
EXEC sp_serveroption N'RPM_CENTRAL', N'rpc out', N'true';
GO

SELECT name, provider, data_source, is_linked
FROM sys.servers
WHERE name = N'RPM_CENTRAL';
GO

SELECT TOP 5 CustomerCode, DisplayName, Active
FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
ORDER BY CustomerCode;
PRINT N'OK if rows returned';
GO
