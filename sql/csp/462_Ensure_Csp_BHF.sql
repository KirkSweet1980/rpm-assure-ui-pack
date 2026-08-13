/*
  462 - Enable Microsoft 365 Tenant (CSP) for BHF
  CustomerCode: BHF (Board of Healthcare Funders)
  Graph collect uses Csp.Config.BHF.ps1 when ready; PillarCsp=1 shows Cover immediately.
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

DECLARE @Code nvarchar(50) = N'BHF';
DECLARE @Name nvarchar(200) = N'Board of Healthcare Funders';
DECLARE @Domain nvarchar(200) = N'bhfglobal.co.za';
DECLARE @Now datetime2(0) = SYSUTCDATETIME();
DECLARE @Snap date = CAST(SYSUTCDATETIME() AS date);

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @Code)
BEGIN
  INSERT INTO dbo.Dim_Customer (CustomerCode, DisplayName, Active)
  VALUES (@Code, @Name, 1);
  PRINT 'Dim_Customer BHF inserted';
END
ELSE
BEGIN
  UPDATE dbo.Dim_Customer
  SET DisplayName = COALESCE(NULLIF(LTRIM(RTRIM(DisplayName)), N''), @Name)
  WHERE CustomerCode = @Code;
END

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = @Code)
    UPDATE dbo.Dim_Customer_AmsConfig SET PillarCsp = 1 WHERE CustomerCode = @Code;
  ELSE
    INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, PillarCsp) VALUES (@Code, 1);
  PRINT 'PillarCsp=1 for BHF';
END

IF OBJECT_ID(N'dbo.Dim_Csp_TenantMap', N'U') IS NOT NULL
BEGIN
  /* Placeholder TenantId until first Graph collect replaces it */
  MERGE dbo.Dim_Csp_TenantMap AS t
  USING (SELECT @Code AS CustomerCode, N'pending-bhf-graph-tenant' AS TenantId) AS s
    ON t.CustomerCode = s.CustomerCode AND t.TenantId = s.TenantId
  WHEN MATCHED THEN UPDATE SET
    PrimaryDomain = @Domain,
    DisplayName = @Name,
    Country = N'South Africa',
    Active = 1,
    Notes = N'BHF M365 cover enabled - await Graph Csp.Config.BHF.ps1',
    UpdatedAtUtc = @Now
  WHEN NOT MATCHED THEN INSERT (
    CustomerCode, TenantId, PrimaryDomain, DisplayName, Country, Active, Notes, UpdatedAtUtc
  ) VALUES (
    @Code, s.TenantId, @Domain, @Name, N'South Africa', 1,
    N'BHF M365 cover enabled - await Graph Csp.Config.BHF.ps1', @Now
  );

  /* Keep only pending row active until real tenant id arrives */
  UPDATE dbo.Dim_Csp_TenantMap
  SET Active = 0
  WHERE CustomerCode = @Code
    AND TenantId <> N'pending-bhf-graph-tenant'
    AND Notes LIKE N'%await Graph%';

  PRINT 'Dim_Csp_TenantMap BHF placeholder ready';
END
GO

/* Proof */
SELECT c.CustomerCode, c.DisplayName,
  ac.PillarCsp, tm.PrimaryDomain, tm.TenantId, tm.Active, tm.Notes
FROM dbo.Dim_Customer c
LEFT JOIN dbo.Dim_Customer_AmsConfig ac ON ac.CustomerCode = c.CustomerCode
LEFT JOIN dbo.Dim_Csp_TenantMap tm ON tm.CustomerCode = c.CustomerCode AND tm.Active = 1
WHERE c.CustomerCode = N'BHF';
GO
