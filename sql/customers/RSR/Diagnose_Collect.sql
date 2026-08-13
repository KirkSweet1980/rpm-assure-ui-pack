SET NOCOUNT ON;
PRINT '1) basics';
SELECT SUSER_SNAME() AS Who, @@SERVERNAME AS Srv, CAST(GETDATE() AS date) AS Snap;
GO

PRINT '2) linked Dim_Customer (dynamic)';
BEGIN TRY
  EXEC(N'SELECT CustomerCode, Active, SqlInstanceName
         FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
         WHERE CustomerCode = N''RSR''');
  PRINT 'linked Dim_Customer OK';
END TRY BEGIN CATCH
  PRINT CONCAT('Dim FAIL ', ERROR_NUMBER(), ': ', ERROR_MESSAGE());
END CATCH
GO

PRINT '3) local AdmOperator';
BEGIN TRY
  IF OBJECT_ID(N'SysproDB.dbo.AdmOperator', N'U') IS NOT NULL
    SELECT COUNT(*) AS Ops FROM SysproDB.dbo.AdmOperator;
  ELSE IF OBJECT_ID(N'Sysprodb.dbo.AdmOperator', N'U') IS NOT NULL
    SELECT COUNT(*) AS Ops FROM Sysprodb.dbo.AdmOperator;
  ELSE
    PRINT 'No AdmOperator table';
END TRY BEGIN CATCH
  PRINT CONCAT('Ops FAIL: ', ERROR_MESSAGE());
END CATCH
GO

PRINT '4) linked write test (dynamic INSERT/DELETE)';
BEGIN TRY
  EXEC(N'DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators WHERE 1=0');
  PRINT 'DELETE OK';
  EXEC(N'INSERT INTO [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators
    (SnapshotDate, InstanceName, OperatorCode, OperatorName, GroupCode, Email, LastLoginDate, OperatorStatus, ImportedAt)
    VALUES (CAST(GETDATE() AS date), N''RSR-SQLSRV-DB'', N''__TEST__'', N''test'', NULL, NULL, NULL, N''Active'', SYSUTCDATETIME())');
  PRINT 'INSERT OK';
  EXEC(N'DELETE FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Syspro_Operators
    WHERE InstanceName = N''RSR-SQLSRV-DB'' AND OperatorCode = N''__TEST__''');
  PRINT 'cleanup OK';
END TRY BEGIN CATCH
  PRINT CONCAT('WRITE FAIL ', ERROR_NUMBER(), ': ', ERROR_MESSAGE());
END CATCH
GO

PRINT '=== diagnose done ===';
GO
