USE RPMAssure_App;
GO
SET NOCOUNT ON;
IF COL_LENGTH(N'dbo.Agent_Registry', N'LastHttpsUtc') IS NULL
  ALTER TABLE dbo.Agent_Registry ADD LastHttpsUtc datetime2(0) NULL;
IF COL_LENGTH(N'dbo.Agent_Registry', N'HeartbeatVia') IS NULL
  ALTER TABLE dbo.Agent_Registry ADD HeartbeatVia nvarchar(16) NULL;
GO
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
  GRANT SELECT, INSERT, UPDATE ON dbo.Agent_Registry TO [Rpm_collect];
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
  GRANT SELECT, INSERT ON dbo.Agent_Heartbeat TO [Rpm_collect];
PRINT 'Agent HTTPS columns ready';
GO
