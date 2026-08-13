/*
  Broader central rights for the web app when using the same login as collect (Rpm_collect).
  Includes App_User + common Fact/KPI read paths.

  Prefer later: separate Rpm_app login. This unblocks production now.

  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i "C:\RPM-Assure\Sql\collect\233_Grant_App_Runtime_To_Rpm_collect.sql"
*/
SET NOCOUNT ON;
USE [RPMAssure_App];
GO

DECLARE @Login sysname = N'Rpm_collect';

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @Login)
BEGIN
  IF EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @Login)
    EXEC(N'CREATE USER [Rpm_collect] FOR LOGIN [Rpm_collect];');
  ELSE
  BEGIN
    RAISERROR(N'Login Rpm_collect missing on instance.', 16, 1);
    RETURN;
  END
END

/* Read everything in the reporting DB (KPI views, Syspro_*, Fact_*, Dim_*) */
IF IS_ROLEMEMBER(N'db_datareader', @Login) = 0
  ALTER ROLE db_datareader ADD MEMBER [Rpm_collect];

/* Write staff tables + optional seed/fact edits from UI */
DECLARE @w TABLE (n sysname);
INSERT INTO @w VALUES
  (N'App_User'),(N'App_UserCustomer'),
  (N'Fact_Incident'),(N'Fact_Problem'),(N'Fact_Risk'),(N'Fact_Issue'),
  (N'Fact_Priority'),(N'Fact_Change'),(N'Fact_Csat'),
  (N'Fact_ExecSummary'),(N'Fact_ExecNarrative'),(N'Fact_ExecDecision'),
  (N'Fact_ExecIncidentHighlight'),(N'Fact_VendorCase'),(N'Fact_DashboardSnapshot');

DECLARE @n sysname, @sql nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT n FROM @w;
OPEN c; FETCH NEXT FROM c INTO @n;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF OBJECT_ID(N'dbo.' + @n, N'U') IS NOT NULL
  BEGIN
    SET @sql = N'GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.' + QUOTENAME(@n) + N' TO [Rpm_collect];';
    EXEC sp_executesql @sql;
    PRINT N'Write granted: ' + @n;
  END
  FETCH NEXT FROM c INTO @n;
END
CLOSE c; DEALLOCATE c;

/* Collect write targets (if not already) — keep collect working */
DECLARE @c2 TABLE (n sysname);
INSERT INTO @c2 VALUES
  (N'Syspro_Operators'),(N'Syspro_JobLogging'),(N'Syspro_SystemLicense'),
  (N'Syspro_TaskGroup'),(N'Syspro_TaskItem'),(N'Syspro_HealthLog'),
  (N'Syspro_OperGroup'),(N'Syspro_OperAmendJnl'),
  (N'Syspro_SystemAuditLog'),(N'Syspro_DiagSummary'),(N'Syspro_SqlHealthBal'),
  (N'Sql_Backups'),(N'Sql_BackupFailures'),(N'Syspro_VersionInfo'),(N'Syspro_Hotfix'),
  (N'Syspro_DtrApBalances'),(N'Syspro_DtrArBalances'),(N'Syspro_DtrAssBalances'),
  (N'Syspro_DtrCbBalances'),(N'Syspro_DtrDnBalances'),(N'Syspro_DtrGitBalances'),
  (N'Syspro_DtrGrnBalances'),(N'Syspro_DtrInvBalances'),(N'Syspro_DtrWipBalances'),
  (N'Syspro_DtrWpiBalances'),(N'Dim_Customer');

DECLARE c3 CURSOR LOCAL FAST_FORWARD FOR SELECT n FROM @c2;
OPEN c3; FETCH NEXT FROM c3 INTO @n;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF OBJECT_ID(N'dbo.' + @n, N'U') IS NOT NULL
  BEGIN
    SET @sql = N'GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.' + QUOTENAME(@n) + N' TO [Rpm_collect];';
    EXEC sp_executesql @sql;
  END
  FETCH NEXT FROM c3 INTO @n;
END
CLOSE c3; DEALLOCATE c3;

PRINT N'';
PRINT N'Rpm_collect is now db_datareader + write on App_User / Fact / collect tables.';
PRINT N'Restart the app process, then hard-refresh the browser.';
GO
