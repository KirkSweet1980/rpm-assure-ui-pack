/*
  CENTRAL 376 - write grants for in-app hotfix waive
  Requires Dim_Syspro_HotfixWaiver from 373.
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Dim_Syspro_HotfixWaiver', N'U') IS NULL
BEGIN
  RAISERROR(N'Run 373_Hotfix_Waivers.sql first.', 16, 1);
  RETURN;
END
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Dim_Syspro_HotfixWaiver TO [Rpm_collect];
  PRINT N'Granted SELECT/INSERT/UPDATE/DELETE on Dim_Syspro_HotfixWaiver to Rpm_collect';
END
ELSE
  PRINT N'Rpm_collect login not in this DB - grant manually to your app SQL user';
GO

/* Optional: dedicated app role table stays as-is */
SELECT TOP 5 CustomerCode, HotfixCode, Active, Reason
FROM dbo.Dim_Syspro_HotfixWaiver WITH (NOLOCK);
GO
