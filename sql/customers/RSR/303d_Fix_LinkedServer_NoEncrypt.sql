/*
  Fix RPM_CENTRAL linked server - remove invalid Encrypt attribute
  Run ON RSR-SQLSRV-DB as sysadmin (SYSPROAdmin)
*/
USE master;
SET NOCOUNT ON;

PRINT '=== Drop existing RPM_CENTRAL ===';
IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL' AND is_linked = 1)
BEGIN
  BEGIN TRY
    EXEC master.dbo.sp_dropserver @server = N'RPM_CENTRAL', @droplogins = 'droplogins';
    PRINT 'Dropped RPM_CENTRAL';
  END TRY BEGIN CATCH
    PRINT CONCAT('Drop failed: ', ERROR_MESSAGE());
    -- try without droplogins
    BEGIN TRY
      EXEC master.dbo.sp_dropserver @server = N'RPM_CENTRAL';
      PRINT 'Dropped (no droplogins)';
    END TRY BEGIN CATCH
      PRINT CONCAT('Drop2 failed: ', ERROR_MESSAGE());
    END CATCH
  END CATCH
END
ELSE PRINT 'RPM_CENTRAL not present';

DECLARE @provider nvarchar(128);
DECLARE @provstr nvarchar(4000);
DECLARE @ok bit = 0;

/* Attempt 1: MSOLEDBSQL - NO Encrypt key (many drivers reject Encrypt=Optional/Mandatory) */
SET @provider = N'MSOLEDBSQL';
SET @provstr = N'TrustServerCertificate=yes';
PRINT CONCAT('Try provider=', @provider, ' provstr=', @provstr);
BEGIN TRY
  EXEC master.dbo.sp_addlinkedserver
    @server     = N'RPM_CENTRAL',
    @srvproduct = N'',
    @provider   = @provider,
    @datasrc    = N'102.222.21.220,14333',
    @provstr    = @provstr;
  SET @ok = 1;
  PRINT 'Linked server created (MSOLEDBSQL TrustServerCertificate only)';
END TRY BEGIN CATCH
  PRINT CONCAT('MSOLEDBSQL failed: ', ERROR_MESSAGE());
END CATCH

/* Attempt 2: MSOLEDBSQL empty provstr */
IF @ok = 0
BEGIN
  IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL')
    EXEC master.dbo.sp_dropserver @server = N'RPM_CENTRAL', @droplogins = 'droplogins';
  SET @provstr = N'';
  PRINT 'Try MSOLEDBSQL empty provstr';
  BEGIN TRY
    EXEC master.dbo.sp_addlinkedserver
      @server     = N'RPM_CENTRAL',
      @srvproduct = N'',
      @provider   = N'MSOLEDBSQL',
      @datasrc    = N'102.222.21.220,14333';
    SET @ok = 1;
    PRINT 'Linked server created (MSOLEDBSQL default)';
  END TRY BEGIN CATCH
    PRINT CONCAT('MSOLEDBSQL default failed: ', ERROR_MESSAGE());
  END CATCH
END

/* Attempt 3: SQLNCLI11 */
IF @ok = 0
BEGIN
  IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL')
    EXEC master.dbo.sp_dropserver @server = N'RPM_CENTRAL', @droplogins = 'droplogins';
  PRINT 'Try SQLNCLI11';
  BEGIN TRY
    EXEC master.dbo.sp_addlinkedserver
      @server     = N'RPM_CENTRAL',
      @srvproduct = N'',
      @provider   = N'SQLNCLI11',
      @datasrc    = N'102.222.21.220,14333';
    SET @ok = 1;
    PRINT 'Linked server created (SQLNCLI11)';
  END TRY BEGIN CATCH
    PRINT CONCAT('SQLNCLI11 failed: ', ERROR_MESSAGE());
  END CATCH
END

/* Attempt 4: SQLOLEDB */
IF @ok = 0
BEGIN
  IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL')
    EXEC master.dbo.sp_dropserver @server = N'RPM_CENTRAL', @droplogins = 'droplogins';
  PRINT 'Try SQLOLEDB';
  BEGIN TRY
    EXEC master.dbo.sp_addlinkedserver
      @server     = N'RPM_CENTRAL',
      @srvproduct = N'',
      @provider   = N'SQLOLEDB',
      @datasrc    = N'102.222.21.220,14333';
    SET @ok = 1;
    PRINT 'Linked server created (SQLOLEDB)';
  END TRY BEGIN CATCH
    PRINT CONCAT('SQLOLEDB failed: ', ERROR_MESSAGE());
  END CATCH
END

IF @ok = 0
BEGIN
  RAISERROR(N'Could not create linked server with any provider.', 16, 1);
  RETURN;
END

/* Map local SYSPROAdmin -> remote rpmassure */
PRINT 'Map login SYSPROAdmin -> rpmassure';
BEGIN TRY
  EXEC master.dbo.sp_droplinkedsrvlogin @rmtsrvname = N'RPM_CENTRAL', @locallogin = NULL;
END TRY BEGIN CATCH END CATCH
BEGIN TRY
  EXEC master.dbo.sp_droplinkedsrvlogin @rmtsrvname = N'RPM_CENTRAL', @locallogin = N'SYSPROAdmin';
END TRY BEGIN CATCH END CATCH

EXEC master.dbo.sp_addlinkedsrvlogin
  @rmtsrvname = N'RPM_CENTRAL',
  @useself = N'False',
  @locallogin = NULL,  /* all local logins */
  @rmtuser = N'rpmassure',
  @rmtpassword = N'@ssuR3me!';

EXEC master.dbo.sp_addlinkedsrvlogin
  @rmtsrvname = N'RPM_CENTRAL',
  @useself = N'False',
  @locallogin = N'SYSPROAdmin',
  @rmtuser = N'rpmassure',
  @rmtpassword = N'@ssuR3me!';

EXEC master.dbo.sp_serveroption @server = N'RPM_CENTRAL', @optname = N'rpc', @optvalue = N'true';
EXEC master.dbo.sp_serveroption @server = N'RPM_CENTRAL', @optname = N'rpc out', @optvalue = N'true';
EXEC master.dbo.sp_serveroption @server = N'RPM_CENTRAL', @optname = N'data access', @optvalue = N'true';
EXEC master.dbo.sp_serveroption @server = N'RPM_CENTRAL', @optname = N'collation compatible', @optvalue = N'false';
EXEC master.dbo.sp_serveroption @server = N'RPM_CENTRAL', @optname = N'connect timeout', @optvalue = N'30';
EXEC master.dbo.sp_serveroption @server = N'RPM_CENTRAL', @optname = N'query timeout', @optvalue = N'0';
EXEC master.dbo.sp_serveroption @server = N'RPM_CENTRAL', @optname = N'remote proc transaction promotion', @optvalue = N'false';

PRINT '=== Test four-part ===';
BEGIN TRY
  SELECT TOP 1 CustomerCode, Active, SqlInstanceName
  FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
  WHERE CustomerCode = N'RSR';
  PRINT 'SELECT OK';
END TRY BEGIN CATCH
  PRINT CONCAT('SELECT FAIL ', ERROR_NUMBER(), ': ', ERROR_MESSAGE());
END CATCH

BEGIN TRY
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators WHERE 1 = 0;
  PRINT 'DELETE OK';
END TRY BEGIN CATCH
  PRINT CONCAT('DELETE FAIL ', ERROR_NUMBER(), ': ', ERROR_MESSAGE());
END CATCH

PRINT '=== Linked server fix done ===';
SELECT name, provider, data_source, provider_string
FROM sys.servers WHERE name = N'RPM_CENTRAL';
