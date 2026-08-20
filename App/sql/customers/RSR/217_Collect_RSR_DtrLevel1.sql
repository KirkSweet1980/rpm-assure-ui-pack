SET NOCOUNT ON;
PRINT '217 DTR start';
DECLARE @CustomerCode nvarchar(50) = N'RSR';
DECLARE @InstanceName nvarchar(100) = N'RSR-SQLSRV-DB';
DECLARE @SnapshotDate date = CAST(GETDATE() AS date);
DECLARE @n int = 0;
DECLARE @sql nvarchar(max) = N'SELECT @n = COUNT(*) FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer WHERE CustomerCode=@c AND Active=1';
BEGIN TRY
  EXEC sp_executesql @sql, N'@c nvarchar(50), @n int OUTPUT', @c=@CustomerCode, @n=@n OUTPUT;
END TRY BEGIN CATCH
  PRINT CONCAT('Dim FAIL ', ERROR_NUMBER(), ': ', ERROR_MESSAGE());
  RAISERROR('dim fail',16,1); RETURN;
END CATCH
IF @n=0 BEGIN PRINT 'RSR not active'; RAISERROR('inactive',16,1); RETURN; END
PRINT 'DTR stub - expand after operators work';
PRINT '=== Done 217 DTR ===';
