USE master;
GO
SET NOCOUNT ON;
PRINT '=== Fix linked login: force rpmassure, enable RPC ===';

IF NOT EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL')
BEGIN
  PRINT 'Creating RPM_CENTRAL...';
  EXEC master.dbo.sp_addlinkedserver
    @server = N'RPM_CENTRAL',
    @srvproduct = N'',
    @provider = N'MSOLEDBSQL',
    @datasrc = N'102.222.21.220,14333',
    @catalog = N'RPMAssure_App';
END

/* Drop ALL existing maps (default self-map is the bug) */
BEGIN TRY
  EXEC master.dbo.sp_droplinkedsrvlogin @rmtsrvname = N'RPM_CENTRAL', @locallogin = NULL;
  PRINT 'Dropped DEFAULT map';
END TRY BEGIN CATCH PRINT CONCAT('drop default: ', ERROR_MESSAGE()); END CATCH

BEGIN TRY
  EXEC master.dbo.sp_droplinkedsrvlogin @rmtsrvname = N'RPM_CENTRAL', @locallogin = N'SYSPROAdmin';
  PRINT 'Dropped SYSPROAdmin map';
END TRY BEGIN CATCH PRINT CONCAT('drop SYSPROAdmin: ', ERROR_MESSAGE()); END CATCH

BEGIN TRY
  EXEC master.dbo.sp_droplinkedsrvlogin @rmtsrvname = N'RPM_CENTRAL', @locallogin = N'rpmassure';
  PRINT 'Dropped rpmassure map';
END TRY BEGIN CATCH PRINT CONCAT('drop rpmassure: ', ERROR_MESSAGE()); END CATCH

/* Positional form - most reliable */
PRINT 'Adding default map * -> rpmassure (useself=false)...';
EXEC master.dbo.sp_addlinkedsrvlogin
  N'RPM_CENTRAL',   /* rmtsrvname */
  N'false',         /* useself - MUST be false */
  NULL,             /* locallogin NULL = default for all */
  N'rpmassure',     /* rmtuser */
  N'';     /* rmtpassword */

PRINT 'Adding SYSPROAdmin -> rpmassure...';
EXEC master.dbo.sp_addlinkedsrvlogin
  N'RPM_CENTRAL',
  N'false',
  N'SYSPROAdmin',
  N'rpmassure',
  N'';

BEGIN TRY
  EXEC master.dbo.sp_addlinkedsrvlogin
    N'RPM_CENTRAL', N'false', N'rpmassure', N'rpmassure', N'';
END TRY BEGIN CATCH PRINT CONCAT('rpmassure local map: ', ERROR_MESSAGE()); END CATCH

/* Options */
EXEC master.dbo.sp_serveroption N'RPM_CENTRAL', N'data access', N'true';
EXEC master.dbo.sp_serveroption N'RPM_CENTRAL', N'rpc', N'true';
EXEC master.dbo.sp_serveroption N'RPM_CENTRAL', N'rpc out', N'true';
EXEC master.dbo.sp_serveroption N'RPM_CENTRAL', N'remote proc transaction promotion', N'false';
PRINT 'RPC + data access ON';

PRINT '--- maps after fix (UseSelf MUST be 0, RemoteUser MUST be rpmassure) ---';
SELECT ISNULL(p.name, N'*DEFAULT*') AS LocalLogin,
       ll.remote_name AS RemoteUser,
       ll.uses_self_credential AS UseSelf
FROM sys.linked_logins ll
JOIN sys.servers s ON s.server_id = ll.server_id
LEFT JOIN sys.server_principals p ON p.principal_id = ll.local_principal_id
WHERE s.name = N'RPM_CENTRAL';

PRINT '--- four-part test ---';
SELECT TOP 5 CustomerCode, DisplayName, Active
FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
ORDER BY CustomerCode;

PRINT '=== FIX OK ===';
GO
