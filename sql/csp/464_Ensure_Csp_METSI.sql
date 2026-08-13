/*
  464 - Enable Microsoft 365 Tenant (CSP) for METSI
  CustomerCode: METSI (Metsi Water Solutions)
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

DECLARE @Code nvarchar(50) = N'METSI';
DECLARE @Name nvarchar(200) = N'Metsi Water Solutions';
DECLARE @Domain nvarchar(200) = N'metsi.co.za';
DECLARE @Now datetime2(0) = SYSUTCDATETIME();

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @Code)
BEGIN
  INSERT INTO dbo.Dim_Customer (CustomerCode, DisplayName, Active)
  VALUES (@Code, @Name, 1);
  PRINT 'Dim_Customer METSI inserted';
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
  PRINT 'PillarCsp=1 for METSI';
END

IF OBJECT_ID(N'dbo.Dim_Csp_TenantMap', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Csp_TenantMap AS t
  USING (SELECT @Code AS CustomerCode, N'pending-metsi-graph-tenant' AS TenantId) AS s
    ON t.CustomerCode = s.CustomerCode AND t.TenantId = s.TenantId
  WHEN MATCHED THEN UPDATE SET
    PrimaryDomain = @Domain,
    DisplayName = @Name,
    Country = N'South Africa',
    Active = 1,
    Notes = N'METSI M365 cover enabled - await Graph Csp.Config.METSI.ps1',
    UpdatedAtUtc = @Now
  WHEN NOT MATCHED THEN INSERT (
    CustomerCode, TenantId, PrimaryDomain, DisplayName, Country, Active, Notes, UpdatedAtUtc
  ) VALUES (
    @Code, s.TenantId, @Domain, @Name, N'South Africa', 1,
    N'METSI M365 cover enabled - await Graph Csp.Config.METSI.ps1', @Now
  );
  PRINT 'Dim_Csp_TenantMap METSI placeholder ready';
END
GO

SELECT c.CustomerCode, c.DisplayName, ac.PillarCsp, tm.PrimaryDomain, tm.TenantId, tm.Active, tm.Notes
FROM dbo.Dim_Customer c
LEFT JOIN dbo.Dim_Customer_AmsConfig ac ON ac.CustomerCode = c.CustomerCode
LEFT JOIN dbo.Dim_Csp_TenantMap tm ON tm.CustomerCode = c.CustomerCode AND tm.Active = 1
WHERE c.CustomerCode = N'METSI';
GO
