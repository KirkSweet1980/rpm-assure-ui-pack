/*
  RSS-PROD -> central linked server RPM_CENTRAL
  Target: 102.222.21.220,14333  (comma = port, not colon)
  Remote login: rpmassure / (set locally — not in git)

  sqlcmd -S "." -U SYSPROAdmin -P "$y$pr0" -C -b -i thisfile
*/
USE master;
GO
SET NOCOUNT ON;

DECLARE @CentralHost nvarchar(128) = N'102.222.21.220,14333';
DECLARE @RemoteUser  sysname       = N'rpmassure';
DECLARE @RemotePwd   nvarchar(128) = N'';
DECLARE @Provider    nvarchar(128);
DECLARE @Ok          bit = 0;
DECLARE @Err         nvarchar(4000);

-- List available providers (diagnostic)
PRINT N'=== OLE DB providers on this SQL instance ===';
BEGIN TRY
  EXEC master.dbo.sp_enum_oledb_providers;
END TRY
BEGIN CATCH
  PRINT CONCAT(N'sp_enum_oledb_providers failed: ', ERROR_MESSAGE());
END CATCH

-- Drop existing
IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL')
BEGIN
  BEGIN TRY
    EXEC sp_dropserver @server = N'RPM_CENTRAL', @droplogins = 'droplogins';
    PRINT N'Dropped existing RPM_CENTRAL';
  END TRY
  BEGIN CATCH
    PRINT CONCAT(N'Drop warning: ', ERROR_MESSAGE());
  END CATCH
END

-- Try providers in order (SQL 2019 often has MSOLEDBSQL or SQLNCLI11)
DECLARE @Providers TABLE (ord int, name nvarchar(128));
INSERT @Providers (ord, name) VALUES
  (1, N'MSOLEDBSQL'),
  (2, N'SQLNCLI11'),
  (3, N'SQLOLEDB');

DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT name FROM @Providers ORDER BY ord;
OPEN c;
FETCH NEXT FROM c INTO @Provider;
WHILE @@FETCH_STATUS = 0 AND @Ok = 0
BEGIN
  BEGIN TRY
    PRINT CONCAT(N'Trying provider: ', @Provider, N' datasrc=', @CentralHost);
    EXEC sp_addlinkedserver
      @server     = N'RPM_CENTRAL',
      @srvproduct = N'',
      @provider   = @Provider,
      @datasrc    = @CentralHost;
    SET @Ok = 1;
    PRINT CONCAT(N'Linked server created with ', @Provider);
  END TRY
  BEGIN CATCH
    SET @Err = ERROR_MESSAGE();
    PRINT CONCAT(N'  FAIL ', @Provider, N': ', @Err);
    IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL')
    BEGIN
      BEGIN TRY EXEC sp_dropserver @server = N'RPM_CENTRAL', @droplogins = 'droplogins'; END TRY BEGIN CATCH END CATCH
    END
  END CATCH
  FETCH NEXT FROM c INTO @Provider;
END
CLOSE c; DEALLOCATE c;

IF @Ok = 0
BEGIN
  RAISERROR(N'Could not create RPM_CENTRAL with any provider. Check outbound TCP 14333 to central and providers above.', 16, 1);
  RETURN;
END

BEGIN TRY
  EXEC sp_addlinkedsrvlogin
    @rmtsrvname  = N'RPM_CENTRAL',
    @useself     = N'False',
    @locallogin  = NULL,
    @rmtuser     = @RemoteUser,
    @rmtpassword = @RemotePwd;
  PRINT N'Remote login mapped: rpmassure';
END TRY
BEGIN CATCH
  PRINT CONCAT(N'sp_addlinkedsrvlogin FAIL: ', ERROR_MESSAGE());
  RAISERROR(N'Linked server login mapping failed.', 16, 1);
  RETURN;
END CATCH

EXEC sp_serveroption @server = N'RPM_CENTRAL', @optname = N'rpc out', @optvalue = N'true';
EXEC sp_serveroption @server = N'RPM_CENTRAL', @optname = N'data access', @optvalue = N'true';
EXEC sp_serveroption @server = N'RPM_CENTRAL', @optname = N'connect timeout', @optvalue = N'30';

PRINT N'=== Test query via linked server ===';
BEGIN TRY
  SELECT TOP 3 CustomerCode, DisplayName, Active
  FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
  ORDER BY CustomerCode;
  PRINT N'Linked server TEST OK';
END TRY
BEGIN CATCH
  PRINT CONCAT(N'Linked server TEST FAIL: ', ERROR_MESSAGE());
  PRINT N'Common causes:';
  PRINT N'  - Central firewall blocks 102.222.21.220:14333 from this server';
  PRINT N'  - rpmassure password wrong on central (re-run 208)';
  PRINT N'  - Wrong port (must be comma: 102.222.21.220,14333)';
  RAISERROR(N'RPM_CENTRAL exists but query failed - fix network/login then re-run 303.', 16, 1);
END CATCH
GO
