/*
  UVSS-SYSPRO — create linked server RPM_CENTRAL (robust)
  Run as SYSPROAdmin (or sa):

  sqlcmd -S "." -U "SYSPROAdmin" -P '$y$pr0' -C -b -i 303_UVSS_LinkedServer_Central.sql
*/
USE master;
GO
SET NOCOUNT ON;
SET XACT_ABORT OFF;

DECLARE @CentralHost nvarchar(128) = N'102.222.21.220,14333';
DECLARE @RemoteUser  sysname       = N'Rpm_collect';
DECLARE @RemotePwd   nvarchar(128) = N'RpmCollect#AHIC2026';

/* Drop if present */
IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL' AND is_linked = 1)
BEGIN
  BEGIN TRY
    EXEC sp_dropserver @server = N'RPM_CENTRAL', @droplogins = 'droplogins';
    PRINT N'Dropped old RPM_CENTRAL';
  END TRY
  BEGIN CATCH
    PRINT CONCAT(N'Drop warning: ', ERROR_MESSAGE());
  END CATCH
END

/* Try providers in order until one sticks */
DECLARE @ok bit = 0;
DECLARE @prov sysname;
DECLARE @providers TABLE (ord int, prov sysname);
INSERT @providers VALUES
  (1, N'MSOLEDBSQL'),
  (2, N'SQLNCLI11'),
  (3, N'SQLNCLI'),
  (4, N'SQLOLEDB');

DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT prov FROM @providers ORDER BY ord;
OPEN c;
FETCH NEXT FROM c INTO @prov;
WHILE @@FETCH_STATUS = 0 AND @ok = 0
BEGIN
  BEGIN TRY
    IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL')
      EXEC sp_dropserver @server = N'RPM_CENTRAL', @droplogins = 'droplogins';

    EXEC sp_addlinkedserver
      @server     = N'RPM_CENTRAL',
      @srvproduct = N'',
      @provider   = @prov,
      @datasrc    = @CentralHost;

    IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL' AND is_linked = 1)
    BEGIN
      SET @ok = 1;
      PRINT CONCAT(N'Linked server created with provider: ', @prov);
    END
  END TRY
  BEGIN CATCH
    PRINT CONCAT(N'Provider ', @prov, N' failed: ', ERROR_MESSAGE());
  END CATCH
  FETCH NEXT FROM c INTO @prov;
END
CLOSE c; DEALLOCATE c;

IF @ok = 0
BEGIN
  /* Last resort: product = SQL Server (no explicit provider) */
  BEGIN TRY
    IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL')
      EXEC sp_dropserver @server = N'RPM_CENTRAL', @droplogins = 'droplogins';

    EXEC sp_addlinkedserver
      @server     = N'RPM_CENTRAL',
      @srvproduct = N'SQL Server';
    /* For product SQL Server, rename mapping uses datasrc = server name only —
       set via sp_setnetname if needed */
    EXEC sp_setnetname N'RPM_CENTRAL', @CentralHost;

    IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL')
    BEGIN
      SET @ok = 1;
      PRINT N'Linked server created with product=SQL Server + sp_setnetname';
    END
  END TRY
  BEGIN CATCH
    PRINT CONCAT(N'SQL Server product method failed: ', ERROR_MESSAGE());
  END CATCH
END

IF @ok = 0
BEGIN
  RAISERROR(N'Could not create RPM_CENTRAL linked server. Install MSOLEDBSQL or SQLNCLI driver.', 16, 1);
  RETURN;
END

/* Remote login mapping (all local logins) */
BEGIN TRY
  EXEC sp_droplinkedsrvlogin @rmtsrvname = N'RPM_CENTRAL', @locallogin = NULL;
END TRY
BEGIN CATCH
END CATCH

EXEC sp_addlinkedsrvlogin
  @rmtsrvname  = N'RPM_CENTRAL',
  @useself     = N'False',
  @locallogin  = NULL,
  @rmtuser     = @RemoteUser,
  @rmtpassword = @RemotePwd;

EXEC sp_serveroption @server = N'RPM_CENTRAL', @optname = N'data access', @optvalue = N'true';
EXEC sp_serveroption @server = N'RPM_CENTRAL', @optname = N'rpc', @optvalue = N'true';
EXEC sp_serveroption @server = N'RPM_CENTRAL', @optname = N'rpc out', @optvalue = N'true';

PRINT N'--- sys.servers ---';
SELECT name, product, provider, data_source, is_linked
FROM sys.servers
WHERE name = N'RPM_CENTRAL';

PRINT N'--- connectivity test ---';
BEGIN TRY
  SELECT TOP 5 CustomerCode, DisplayName, Active
  FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
  ORDER BY CustomerCode;
  PRINT N'Linked server OK — can read Dim_Customer';
END TRY
BEGIN CATCH
  PRINT CONCAT(N'Connectivity test FAIL: ', ERROR_MESSAGE());
  PRINT N'Check: central firewall port 14333, Rpm_collect login, RPMAssure_App exists.';
END CATCH
GO
