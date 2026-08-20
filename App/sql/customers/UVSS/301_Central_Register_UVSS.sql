/*
  CENTRAL — register UVSS (Unique Ventilation Systems)
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 301_Central_Register_UVSS.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

DECLARE @CustomerCode    nvarchar(50)  = N'UVSS';
DECLARE @DisplayName     nvarchar(200) = N'Unique Ventilation Systems';
DECLARE @SqlInstanceName nvarchar(100) = N'UVSS-SYSPRO';
DECLARE @Active          bit           = 1;

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @CustomerCode)
BEGIN
  INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
  VALUES (@CustomerCode, @DisplayName, @Active, @SqlInstanceName, SYSUTCDATETIME(), SYSUTCDATETIME());
  PRINT N'Inserted UVSS';
END
ELSE
BEGIN
  UPDATE dbo.Dim_Customer
  SET DisplayName = @DisplayName,
      Active = @Active,
      SqlInstanceName = @SqlInstanceName,
      UpdatedAt = SYSUTCDATETIME()
  WHERE CustomerCode = @CustomerCode;
  PRINT N'Updated UVSS';
END;

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = @CustomerCode)
    INSERT dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro)
    VALUES (@CustomerCode, 1, 1);
  ELSE
    UPDATE dbo.Dim_Customer_AmsConfig
    SET AmsEnabled = 1, PillarSyspro = 1
    WHERE CustomerCode = @CustomerCode;
END;

INSERT INTO dbo.Dim_Customer_SyncLog (ActionType, CustomerCode, Detail, DryRun)
VALUES (N'RegisterCustomer', @CustomerCode,
  N'DisplayName=Unique Ventilation Systems Instance=UVSS-SYSPRO', 0);

SELECT CustomerCode, DisplayName, Active, SqlInstanceName, UpdatedAt
FROM dbo.Dim_Customer
WHERE CustomerCode = N'UVSS';
GO
