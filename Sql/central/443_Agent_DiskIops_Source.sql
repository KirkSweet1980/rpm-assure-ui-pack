USE RPMAssure_App;
GO
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Agent_DiskIops', N'U') IS NULL
BEGIN
  PRINT 'Agent_DiskIops missing';
  RETURN;
END
IF COL_LENGTH(N'dbo.Agent_DiskIops', N'Source') IS NULL
BEGIN
  ALTER TABLE dbo.Agent_DiskIops ADD Source nvarchar(40) NULL;
  PRINT 'Added Agent_DiskIops.Source';
END
ELSE
  PRINT 'Agent_DiskIops.Source already present';
GO
