/*
  CENTRAL — ensure AHIC is Active with SqlInstanceName for live Portfolio join
  sqlcmd -S "102.222.21.220,14333" -d RPMAssure_App -E -C -i 220_...
*/
USE RPMAssure_App;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'AHIC')
BEGIN
  INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
  VALUES (N'AHIC', N'AHI Carrier', 1, N'AHIC-SSQL-SRV', SYSUTCDATETIME(), SYSUTCDATETIME());
  PRINT N'Inserted AHIC';
END
ELSE
BEGIN
  UPDATE dbo.Dim_Customer
  SET DisplayName = COALESCE(NULLIF(DisplayName, N''), N'AHI Carrier'),
      Active = 1,
      SqlInstanceName = N'AHIC-SSQL-SRV',
      UpdatedAt = SYSUTCDATETIME()
  WHERE CustomerCode = N'AHIC';
  PRINT N'Updated AHIC';
END
GO

SELECT CustomerCode, DisplayName, Active, SqlInstanceName
FROM dbo.Dim_Customer
WHERE CustomerCode = N'AHIC';
GO
