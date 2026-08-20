/*
  Run FROM anywhere that can reach central (incl. Redsun):
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -U "rpmassure" -P "" -C -i thisfile
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

DECLARE @CustomerCode nvarchar(50) = N'RSR';
DECLARE @DisplayName nvarchar(200) = N'Redsun Raisins';
DECLARE @SqlInstanceName nvarchar(100) = N'RSR-SQLSRV-DB';

IF COL_LENGTH(N'dbo.Dim_Customer', N'CreatedAt') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @CustomerCode)
  BEGIN
    DECLARE @sql nvarchar(max) = N'
    INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
    VALUES (@c, @d, 1, @i, SYSUTCDATETIME(), SYSUTCDATETIME());';
    BEGIN TRY
      EXEC sp_executesql @sql, N'@c nvarchar(50),@d nvarchar(200),@i nvarchar(100)',
        @c=@CustomerCode,@d=@DisplayName,@i=@SqlInstanceName;
    END TRY
    BEGIN CATCH
      -- minimal columns fallback
      IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @CustomerCode)
        INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName)
        VALUES (@CustomerCode, @DisplayName, 1, @SqlInstanceName);
    END CATCH
  END
  ELSE
    UPDATE dbo.Dim_Customer
    SET DisplayName=@DisplayName, Active=1, SqlInstanceName=@SqlInstanceName,
        UpdatedAt = CASE WHEN COL_LENGTH(N'dbo.Dim_Customer',N'UpdatedAt') IS NOT NULL THEN SYSUTCDATETIME() ELSE UpdatedAt END
    WHERE CustomerCode=@CustomerCode;
END
ELSE
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @CustomerCode)
    INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName)
    VALUES (@CustomerCode, @DisplayName, 1, @SqlInstanceName);
  ELSE
    UPDATE dbo.Dim_Customer
    SET DisplayName=@DisplayName, Active=1, SqlInstanceName=@SqlInstanceName
    WHERE CustomerCode=@CustomerCode;
END

-- AmsConfig if present
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode=@CustomerCode)
  BEGIN
    BEGIN TRY
      INSERT dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro) VALUES (@CustomerCode, 1, 1);
    END TRY
    BEGIN CATCH
      PRINT CONCAT(N'AmsConfig insert note: ', ERROR_MESSAGE());
    END CATCH
  END
END

SELECT CustomerCode, DisplayName, Active, SqlInstanceName
FROM dbo.Dim_Customer WHERE CustomerCode = N'RSR';
PRINT N'Registered RSR active.';
GO
