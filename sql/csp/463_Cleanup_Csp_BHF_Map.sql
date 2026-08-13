/*
  463 - BHF CSP map cleanup after successful Graph collect
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

DECLARE @Code nvarchar(50) = N'BHF';
DECLARE @Tenant nvarchar(64) = N'69193fbf-a336-4e0b-a500-e844e117162a';
DECLARE @Domain nvarchar(200) = N'bhfglobal.com';
DECLARE @Now datetime2(0) = SYSUTCDATETIME();

DELETE FROM dbo.Dim_Csp_TenantMap
WHERE CustomerCode = @Code
  AND (TenantId = N'pending-bhf-graph-tenant' OR TenantId LIKE N'pending-%');

UPDATE dbo.Dim_Csp_TenantMap
SET Active = 0, UpdatedAtUtc = @Now
WHERE CustomerCode = @Code AND TenantId <> @Tenant;

UPDATE dbo.Dim_Csp_TenantMap
SET PrimaryDomain = @Domain,
    DisplayName = N'Board of Healthcare Funders',
    Active = 1,
    Notes = N'Graph collect live',
    UpdatedAtUtc = @Now
WHERE CustomerCode = @Code AND TenantId = @Tenant;

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
  UPDATE dbo.Dim_Customer_AmsConfig SET PillarCsp = 1 WHERE CustomerCode = @Code;

PRINT 'BHF map cleaned';
GO

SELECT CustomerCode, TenantId, PrimaryDomain, Active, Notes
FROM dbo.Dim_Csp_TenantMap WITH (NOLOCK)
WHERE CustomerCode = N'BHF'
ORDER BY Active DESC;

SELECT CustomerCode, PrimaryDomain, SkuCount, AssignedSeats, UserCount, HealthScore
FROM dbo.vw_Kpi_Csp_Summary WITH (NOLOCK)
WHERE CustomerCode = N'BHF';

IF OBJECT_ID(N'dbo.vw_Kpi_Csp_Posture_Latest', N'V') IS NOT NULL
  SELECT CustomerCode, SecureScorePct, MfaRegisteredPct, GlobalAdminCount, GuestUserCount, FailedSignInCount7d
  FROM dbo.vw_Kpi_Csp_Posture_Latest WITH (NOLOCK)
  WHERE CustomerCode = N'BHF';
GO
