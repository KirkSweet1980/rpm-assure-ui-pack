/*
  467 - Enable Microsoft 365 Tenant (CSP) for SBS - Simply Bright
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

DECLARE @Code nvarchar(50) = N'SBS';
DECLARE @Name nvarchar(200) = N'Simply Bright';
DECLARE @Domain nvarchar(200) = N'simplybright.co.za';
DECLARE @Now datetime2(0) = SYSUTCDATETIME();

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @Code)
BEGIN
  INSERT INTO dbo.Dim_Customer (CustomerCode, DisplayName, Active)
  VALUES (@Code, @Name, 1);
  PRINT 'Dim_Customer SBS inserted';
END
ELSE
BEGIN
  UPDATE dbo.Dim_Customer
  SET DisplayName = COALESCE(NULLIF(LTRIM(RTRIM(DisplayName)), N''), @Name),
      Active = 1
  WHERE CustomerCode = @Code;
END

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = @Code)
    UPDATE dbo.Dim_Customer_AmsConfig SET PillarCsp = 1 WHERE CustomerCode = @Code;
  ELSE
    INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, PillarCsp) VALUES (@Code, 1);
  PRINT 'PillarCsp=1 for SBS';
END

IF OBJECT_ID(N'dbo.Dim_Csp_TenantMap', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Csp_TenantMap AS t
  USING (SELECT @Code AS CustomerCode, N'pending-sbs-graph-tenant' AS TenantId) AS s
    ON t.CustomerCode = s.CustomerCode AND t.TenantId = s.TenantId
  WHEN MATCHED THEN UPDATE SET
    PrimaryDomain = @Domain,
    DisplayName = @Name,
    Country = N'South Africa',
    Active = 1,
    Notes = N'SBS M365 cover - await Graph collect',
    UpdatedAtUtc = @Now
  WHEN NOT MATCHED THEN INSERT (
    CustomerCode, TenantId, PrimaryDomain, DisplayName, Country, Active, Notes, UpdatedAtUtc
  ) VALUES (
    @Code, s.TenantId, @Domain, @Name, N'South Africa', 1,
    N'SBS M365 cover - await Graph collect', @Now
  );
  PRINT 'Dim_Csp_TenantMap SBS placeholder ready';
END
GO

SELECT c.CustomerCode, c.DisplayName, ac.PillarCsp, tm.PrimaryDomain, tm.TenantId, tm.Active
FROM dbo.Dim_Customer c
LEFT JOIN dbo.Dim_Customer_AmsConfig ac ON ac.CustomerCode = c.CustomerCode
LEFT JOIN dbo.Dim_Csp_TenantMap tm ON tm.CustomerCode = c.CustomerCode AND tm.Active = 1
WHERE c.CustomerCode = N'SBS';
GO
