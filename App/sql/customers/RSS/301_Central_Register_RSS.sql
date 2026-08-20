/*
  CENTRAL register RSS - Remote Site Solutions / RSS-PROD
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;
DECLARE @CustomerCode nvarchar(50) = N'RSS';
DECLARE @DisplayName nvarchar(200) = N'Remote Site Solutions';
DECLARE @SqlInstanceName nvarchar(100) = N'RSS-PROD';
DECLARE @Active bit = 1;
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @CustomerCode)
  INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
  VALUES (@CustomerCode, @DisplayName, @Active, @SqlInstanceName, SYSUTCDATETIME(), SYSUTCDATETIME());
ELSE
  UPDATE dbo.Dim_Customer
  SET DisplayName=@DisplayName, Active=@Active, SqlInstanceName=@SqlInstanceName, UpdatedAt=SYSUTCDATETIME()
  WHERE CustomerCode=@CustomerCode;
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode=@CustomerCode)
    INSERT dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro) VALUES (@CustomerCode,1,1);
  ELSE
    UPDATE dbo.Dim_Customer_AmsConfig SET AmsEnabled=1, PillarSyspro=1 WHERE CustomerCode=@CustomerCode;
END
SELECT CustomerCode, DisplayName, Active, SqlInstanceName, UpdatedAt
FROM dbo.Dim_Customer WHERE CustomerCode=@CustomerCode;
GO
