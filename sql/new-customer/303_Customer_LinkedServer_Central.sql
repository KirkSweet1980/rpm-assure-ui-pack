/*
  CUSTOMER SQL — linked server RPM_CENTRAL → write RPMAssure_App
  Edit password to match central Rpm_collect.

  sqlcmd -S "." -U sa -P "..." -C -b -i 303_Customer_LinkedServer_Central.sql
*/
USE master;
GO
SET NOCOUNT ON;

/* ========= EDIT ========= */
DECLARE @CentralHost nvarchar(128) = N'102.222.21.220,14333';
DECLARE @RemoteUser  sysname       = N'Rpm_collect';
DECLARE @RemotePwd   nvarchar(128) = N'CHANGE_ME_SAME_AS_CENTRAL';
/* ======================== */

IF @RemotePwd = N'CHANGE_ME_SAME_AS_CENTRAL'
BEGIN
  RAISERROR(N'Set @RemotePwd to central Rpm_collect password.', 16, 1);
  RETURN;
END;

IF EXISTS (SELECT 1 FROM sys.servers WHERE name = N'RPM_CENTRAL')
BEGIN
  EXEC sp_dropserver @server = N'RPM_CENTRAL', @droplogins = 'droplogins';
  PRINT N'Dropped existing RPM_CENTRAL';
END;

EXEC sp_addlinkedserver
  @server     = N'RPM_CENTRAL',
  @srvproduct = N'',
  @provider   = N'MSOLEDBSQL',
  @datasrc    = @CentralHost;

EXEC sp_addlinkedsrvlogin
  @rmtsrvname  = N'RPM_CENTRAL',
  @useself     = N'False',
  @locallogin  = NULL,
  @rmtuser     = @RemoteUser,
  @rmtpassword = @RemotePwd;

EXEC sp_serveroption @server = N'RPM_CENTRAL', @optname = N'rpc out', @optvalue = N'true';
EXEC sp_serveroption @server = N'RPM_CENTRAL', @optname = N'data access', @optvalue = N'true';

PRINT N'Test: SELECT TOP 1 CustomerCode FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer';
BEGIN TRY
  SELECT TOP 3 CustomerCode, DisplayName, Active
  FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
  ORDER BY CustomerCode;
  PRINT N'Linked server OK';
END TRY
BEGIN CATCH
  PRINT CONCAT(N'Linked server TEST FAIL: ', ERROR_MESSAGE());
END CATCH
GO
