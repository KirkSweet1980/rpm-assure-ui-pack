SET NOCOUNT ON;
PRINT '1) basics';
SELECT SUSER_SNAME() AS Who, @@SERVERNAME AS Srv, CAST(GETDATE() AS date) AS Snap;

PRINT '2) Dim_Customer RSR via linked';
BEGIN TRY
  SELECT CustomerCode, Active, SqlInstanceName
  FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
  WHERE CustomerCode = N'RSR';
  PRINT 'linked Dim_Customer OK';
END TRY BEGIN CATCH
  PRINT CONCAT('Dim FAIL: ', ERROR_NUMBER(), ' ', ERROR_MESSAGE());
END CATCH

PRINT '3) SysproDB.AdmOperator count';
BEGIN TRY
  SELECT COUNT(*) AS Ops FROM SysproDB.dbo.AdmOperator;
END TRY BEGIN CATCH
  PRINT CONCAT('Ops FAIL: ', ERROR_MESSAGE());
END CATCH

PRINT '4) try DELETE zero-row from Syspro_Operators (write path)';
BEGIN TRY
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators
  WHERE 1 = 0;
  PRINT 'DELETE permission OK';
END TRY BEGIN CATCH
  PRINT CONCAT('DELETE FAIL: ', ERROR_NUMBER(), ' ', ERROR_MESSAGE());
END CATCH

PRINT '5) try INSERT one operator row then delete it';
BEGIN TRY
  DECLARE @sd date = CAST(GETDATE() AS date);
  INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators
  (SnapshotDate, InstanceName, OperatorCode, OperatorName, GroupCode, Email, LastLoginDate, OperatorStatus, ImportedAt)
  VALUES (@sd, N'RSR-SQLSRV-DB', N'__TEST__', N'test', NULL, NULL, NULL, N'Active', SYSUTCDATETIME());
  PRINT CONCAT('INSERT OK rows=', @@ROWCOUNT);
  DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators
  WHERE InstanceName = N'RSR-SQLSRV-DB' AND OperatorCode = N'__TEST__';
  PRINT 'cleanup OK';
END TRY BEGIN CATCH
  PRINT CONCAT('INSERT FAIL: ', ERROR_NUMBER(), ' ', ERROR_MESSAGE());
END CATCH

PRINT '=== diagnose done ===';
