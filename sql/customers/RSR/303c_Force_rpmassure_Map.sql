USE master;
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
ELSE
  PRINT 'RPM_CENTRAL already exists';

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

PRINT 'Adding default map * -> rpmassure (useself=false)...';
EXEC master.dbo.sp_addlinkedsrvlogin
  N'RPM_CENTRAL',
  N'false',
  NULL,
  N'rpmassure',
  N'@ssuR3me!';

PRINT 'Adding SYSPROAdmin -> rpmassure...';
EXEC master.dbo.sp_addlinkedsrvlogin
  N'RPM_CENTRAL',
  N'false',
  N'SYSPROAdmin',
  N'rpmassure',
  N'@ssuR3me!';

BEGIN TRY
  EXEC master.dbo.sp_addlinkedsrvlogin
    N'RPM_CENTRAL', N'false', N'rpmassure', N'rpmassure', N'@ssuR3me!';
  PRINT 'rpmassure -> rpmassure OK';
END TRY BEGIN CATCH PRINT CONCAT('rpmassure local map: ', ERROR_MESSAGE()); END CATCH

EXEC master.dbo.sp_serveroption N'RPM_CENTRAL', N'data access', N'true';
EXEC master.dbo.sp_serveroption N'RPM_CENTRAL', N'rpc', N'true';
EXEC master.dbo.sp_serveroption N'RPM_CENTRAL', N'rpc out', N'true';
EXEC master.dbo.sp_serveroption N'RPM_CENTRAL', N'remote proc transaction promotion', N'false';
PRINT 'RPC + data access ON';

PRINT '--- maps after fix ---';
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
