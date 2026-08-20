USE master;
GO
SET NOCOUNT ON;
PRINT '=== 303b map-only (server must already exist) ===';

IF NOT EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL')
BEGIN
  RAISERROR('RPM_CENTRAL missing - run full 303 first.', 16, 1);
  RETURN;
END

-- wipe all linked logins for this server by drop+recreate login maps
-- drop default
BEGIN TRY
  EXEC master.dbo.sp_droplinkedsrvlogin @rmtsrvname=N'RPM_CENTRAL', @locallogin=NULL;
  PRINT 'Dropped default map';
END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH

BEGIN TRY
  EXEC master.dbo.sp_droplinkedsrvlogin @rmtsrvname=N'RPM_CENTRAL', @locallogin=N'SYSPROAdmin';
  PRINT 'Dropped SYSPROAdmin map';
END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH

BEGIN TRY
  EXEC master.dbo.sp_droplinkedsrvlogin @rmtsrvname=N'RPM_CENTRAL', @locallogin=N'rpmassure';
  PRINT 'Dropped rpmassure map';
END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH

EXEC master.dbo.sp_addlinkedsrvlogin
  @rmtsrvname=N'RPM_CENTRAL', @useself=N'false', @locallogin=NULL,
  @rmtuser=N'rpmassure', @rmtpassword=N'';
PRINT 'Added default * -> rpmassure';

EXEC master.dbo.sp_addlinkedsrvlogin
  @rmtsrvname=N'RPM_CENTRAL', @useself=N'false', @locallogin=N'SYSPROAdmin',
  @rmtuser=N'rpmassure', @rmtpassword=N'';
PRINT 'Added SYSPROAdmin -> rpmassure';

BEGIN TRY
  EXEC master.dbo.sp_addlinkedsrvlogin
    @rmtsrvname=N'RPM_CENTRAL', @useself=N'false', @locallogin=N'rpmassure',
    @rmtuser=N'rpmassure', @rmtpassword=N'';
  PRINT 'Added rpmassure -> rpmassure';
END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH

SELECT ISNULL(p.name, N'*DEFAULT*') AS LocalLogin, ll.remote_name, ll.uses_self_credential
FROM sys.linked_logins ll
JOIN sys.servers s ON s.server_id = ll.server_id
LEFT JOIN sys.server_principals p ON p.principal_id = ll.local_principal_id
WHERE s.name = N'RPM_CENTRAL';

PRINT 'Test...';
SELECT TOP 3 CustomerCode, DisplayName, Active
FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
ORDER BY CustomerCode;
PRINT '=== 303b OK ===';
GO
