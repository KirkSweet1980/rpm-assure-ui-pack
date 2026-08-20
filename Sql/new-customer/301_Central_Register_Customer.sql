/*
  CENTRAL — register a new managed customer for RPM Assure
  Edit the DECLAREs below, then:

  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 301_Central_Register_Customer.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

/* ========= EDIT THESE ========= */
DECLARE @CustomerCode    nvarchar(50)  = N'NEWCODE';       -- e.g. SFRUIT
DECLARE @DisplayName     nvarchar(200) = N'New Customer';  -- e.g. Sir Fruit
DECLARE @SqlInstanceName nvarchar(100) = N'NEW-SSQL-SRV';  -- customer SQL host name
DECLARE @Active          bit           = 1;
/* ============================== */

IF @CustomerCode IS NULL OR LTRIM(RTRIM(@CustomerCode)) = N'' OR @CustomerCode = N'NEWCODE'
BEGIN
  RAISERROR(N'Set @CustomerCode before running (not NEWCODE).', 16, 1);
  RETURN;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @CustomerCode)
BEGIN
  INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
  VALUES (@CustomerCode, @DisplayName, @Active, @SqlInstanceName, SYSUTCDATETIME(), SYSUTCDATETIME());
  PRINT CONCAT(N'Inserted ', @CustomerCode);
END
ELSE
BEGIN
  UPDATE dbo.Dim_Customer
  SET DisplayName = @DisplayName,
      Active = @Active,
      SqlInstanceName = @SqlInstanceName,
      UpdatedAt = SYSUTCDATETIME()
  WHERE CustomerCode = @CustomerCode;
  PRINT CONCAT(N'Updated ', @CustomerCode);
END;

/* AMS pillar flags — SYSPRO on for new AMS pilots */
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
  CONCAT(N'DisplayName=', @DisplayName, N' Instance=', @SqlInstanceName), 0);

SELECT CustomerCode, DisplayName, Active, SqlInstanceName, UpdatedAt
FROM dbo.Dim_Customer
WHERE CustomerCode = @CustomerCode;
GO
