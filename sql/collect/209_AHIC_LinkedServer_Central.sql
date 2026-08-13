/*
================================================================================
  AHIC — linked server RPM_CENTRAL
  Local session: Rpm_collect (same password)
  Remote:        Rpm_collect @ 102.222.21.220,14333 (same password)
  Run as: sa once (to create linked server), or sysadmin
================================================================================
*/
USE [master];
GO

IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL')
    EXEC sp_dropserver @server = N'RPM_CENTRAL', @droplogins = 'droplogins';
GO

BEGIN TRY
    EXEC sp_addlinkedserver
        @server = N'RPM_CENTRAL', @srvproduct = N'',
        @provider = N'MSOLEDBSQL', @datasrc = N'102.222.21.220,14333';
END TRY
BEGIN CATCH
    EXEC sp_addlinkedserver
        @server = N'RPM_CENTRAL', @srvproduct = N'',
        @provider = N'SQLNCLI11', @datasrc = N'102.222.21.220,14333';
END CATCH
GO

EXEC sp_serveroption N'RPM_CENTRAL', N'data access', N'true';
EXEC sp_serveroption N'RPM_CENTRAL', N'rpc out', N'true';
GO

/* Same user/password as local + central */
EXEC sp_addlinkedsrvlogin
    @rmtsrvname  = N'RPM_CENTRAL',
    @useself     = N'false',
    @locallogin  = NULL,
    @rmtuser     = N'Rpm_collect',
    @rmtpassword = N'RpmCollect#AHIC2026';
GO

PRINT CONCAT(N'Local session user: ', SUSER_SNAME());

/* Local read test */
BEGIN TRY
    SELECT COUNT(*) AS LocalOperators FROM Sysprodb.dbo.AdmOperator;
    PRINT N'LOCAL Sysprodb read: OK';
END TRY
BEGIN CATCH
    PRINT CONCAT(N'LOCAL read failed (run as sa for 209, or grant Rpm_collect): ', ERROR_MESSAGE());
END CATCH
GO

/* Remote test */
BEGIN TRY
    SELECT TOP 5 name FROM [RPM_CENTRAL].[RPMAssure_App].sys.tables;
    SELECT CustomerCode, Active, SqlInstanceName
    FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer WHERE CustomerCode = N'AHIC';
    INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer_SyncLog
        (ActionType, CustomerCode, Detail, DryRun)
    VALUES (N'LinkedServerAuthTest', N'AHIC', N'Rpm_collect both sides', 0);
    PRINT N'REMOTE central: OK';
END TRY
BEGIN CATCH
    PRINT CONCAT(N'REMOTE failed: ', ERROR_MESSAGE());
END CATCH
GO
