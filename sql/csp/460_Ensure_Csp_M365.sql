/*
  460 - Microsoft 365 Tenant (CSP) warehouse + RPM Resources pilot seed
  CustomerCode pilot: RPMINT (RPM Resources)
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarCsp') IS NULL
BEGIN
  ALTER TABLE dbo.Dim_Customer_AmsConfig ADD PillarCsp bit NULL;
  PRINT 'PillarCsp column added';
END
GO

IF OBJECT_ID(N'dbo.Dim_Csp_TenantMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Csp_TenantMap (
    CustomerCode   nvarchar(50)  NOT NULL,
    TenantId       nvarchar(64)  NOT NULL,
    PrimaryDomain  nvarchar(200) NULL,
    DisplayName    nvarchar(200) NULL,
    Country        nvarchar(100) NULL,
    Active         bit           NOT NULL CONSTRAINT DF_Dim_Csp_TenantMap_Active DEFAULT (1),
    Notes          nvarchar(500) NULL,
    UpdatedAtUtc   datetime2(0)  NOT NULL CONSTRAINT DF_Dim_Csp_TenantMap_Updated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_Csp_TenantMap PRIMARY KEY (CustomerCode, TenantId)
  );
  PRINT 'Dim_Csp_TenantMap created';
END
GO

IF OBJECT_ID(N'dbo.Csp_Licenses', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Csp_Licenses (
    CustomerCode    nvarchar(50)  NOT NULL,
    SnapshotDate    date          NOT NULL,
    SkuId           nvarchar(100) NOT NULL,
    SkuPartNumber   nvarchar(100) NULL,
    ProductName     nvarchar(200) NULL,
    PrepaidUnits    int           NULL,
    ConsumedUnits   int           NULL,
    AvailableUnits  int           NULL,
    ImportedAt      datetime2(0)  NOT NULL CONSTRAINT DF_Csp_Licenses_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Csp_Licenses PRIMARY KEY (CustomerCode, SnapshotDate, SkuId)
  );
  CREATE INDEX IX_Csp_Licenses_Snap ON dbo.Csp_Licenses (SnapshotDate) INCLUDE (CustomerCode);
  PRINT 'Csp_Licenses created';
END
GO

IF OBJECT_ID(N'dbo.Csp_Users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Csp_Users (
    CustomerCode         nvarchar(50)   NOT NULL,
    SnapshotDate         date           NOT NULL,
    UserPrincipalName    nvarchar(320)  NOT NULL,
    DisplayName          nvarchar(200)  NULL,
    AccountEnabled       bit            NULL,
    AssignedSkus         nvarchar(1000) NULL,
    Department           nvarchar(200)  NULL,
    JobTitle             nvarchar(200)  NULL,
    ImportedAt           datetime2(0)   NOT NULL CONSTRAINT DF_Csp_Users_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Csp_Users PRIMARY KEY (CustomerCode, SnapshotDate, UserPrincipalName)
  );
  CREATE INDEX IX_Csp_Users_Snap ON dbo.Csp_Users (SnapshotDate) INCLUDE (CustomerCode);
  PRINT 'Csp_Users created';
END
GO

IF OBJECT_ID(N'dbo.Csp_TenantHealth', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Csp_TenantHealth (
    CustomerCode    nvarchar(50)  NOT NULL,
    SnapshotDate    date          NOT NULL,
    HealthScore     decimal(5,1)  NULL,
    OpenIncidents   int           NULL,
    ServiceNote     nvarchar(500) NULL,
    ImportedAt      datetime2(0)  NOT NULL CONSTRAINT DF_Csp_TenantHealth_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Csp_TenantHealth PRIMARY KEY (CustomerCode, SnapshotDate)
  );
  PRINT 'Csp_TenantHealth created';
END
GO

/* ---- Pilot: RPM Resources (RPMINT) ---- */
DECLARE @Code nvarchar(50) = N'RPMINT';
DECLARE @Snap date = CAST(SYSUTCDATETIME() AS date);
DECLARE @Now  datetime2(0) = SYSUTCDATETIME();

/* Ensure customer exists (no-op if already there) */
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = @Code)
BEGIN
  INSERT INTO dbo.Dim_Customer (CustomerCode, DisplayName, Active)
  VALUES (@Code, N'RPM Resources', 1);
  PRINT 'Dim_Customer RPMINT inserted';
END

/* Cover flag */
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = @Code)
    UPDATE dbo.Dim_Customer_AmsConfig SET PillarCsp = 1 WHERE CustomerCode = @Code;
  ELSE
    INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, PillarCsp)
    VALUES (@Code, 1);
  PRINT 'PillarCsp=1 for RPMINT';
END

MERGE dbo.Dim_Csp_TenantMap AS t
USING (SELECT @Code AS CustomerCode, N'a1b2c3d4-rpmr-pilot-0001-m365tenant' AS TenantId) AS s
  ON t.CustomerCode = s.CustomerCode AND t.TenantId = s.TenantId
WHEN MATCHED THEN UPDATE SET
  PrimaryDomain = N'rpmresources.co.za',
  DisplayName   = N'RPM Resources',
  Country       = N'South Africa',
  Active        = 1,
  Notes         = N'Pilot CSP seed - Graph collect later',
  UpdatedAtUtc  = @Now
WHEN NOT MATCHED THEN INSERT (CustomerCode, TenantId, PrimaryDomain, DisplayName, Country, Active, Notes, UpdatedAtUtc)
VALUES (@Code, s.TenantId, N'rpmresources.co.za', N'RPM Resources', N'South Africa', 1, N'Pilot CSP seed - Graph collect later', @Now);

DELETE FROM dbo.Csp_Licenses WHERE CustomerCode = @Code AND SnapshotDate = @Snap;
INSERT INTO dbo.Csp_Licenses (CustomerCode, SnapshotDate, SkuId, SkuPartNumber, ProductName, PrepaidUnits, ConsumedUnits, AvailableUnits, ImportedAt)
VALUES
 (@Code, @Snap, N'SKU-BP',  N'O365_BUSINESS_PREMIUM',     N'Microsoft 365 Business Premium', 40, 36, 4, @Now),
 (@Code, @Snap, N'SKU-E3',  N'SPE_E3',                    N'Microsoft 365 E3',                10,  8, 2, @Now),
 (@Code, @Snap, N'SKU-EX',  N'EXCHANGESTANDARD',          N'Exchange Online (Plan 1)',         5,  3, 2, @Now),
 (@Code, @Snap, N'SKU-PBI', N'POWER_BI_PRO',              N'Power BI Pro',                     6,  4, 2, @Now),
 (@Code, @Snap, N'SKU-VIS', N'VISIOCLIENT',               N'Visio Plan 2',                     3,  1, 2, @Now);

DELETE FROM dbo.Csp_Users WHERE CustomerCode = @Code AND SnapshotDate = @Snap;
INSERT INTO dbo.Csp_Users (CustomerCode, SnapshotDate, UserPrincipalName, DisplayName, AccountEnabled, AssignedSkus, Department, JobTitle, ImportedAt)
VALUES
 (@Code, @Snap, N'admin@rpmresources.co.za',       N'RPM Admin',            1, N'Microsoft 365 Business Premium', N'IT',            N'Tenant Admin',           @Now),
 (@Code, @Snap, N'support@rpmresources.co.za',     N'Support Desk',         1, N'Microsoft 365 Business Premium', N'Support',       N'Service Desk Lead',      @Now),
 (@Code, @Snap, N'kirk.sweet@rpmresources.co.za',  N'Kirk Sweet',           1, N'Microsoft 365 E3',                N'Leadership',    N'Director',               @Now),
 (@Code, @Snap, N'ops@rpmresources.co.za',         N'Operations',           1, N'Microsoft 365 Business Premium', N'Operations',    N'Ops Coordinator',        @Now),
 (@Code, @Snap, N'finance@rpmresources.co.za',     N'Finance Shared',       1, N'Exchange Online (Plan 1)',        N'Finance',       N'Shared Mailbox',         @Now),
 (@Code, @Snap, N'backup@rpmresources.co.za',      N'Backup Operator',      1, N'Microsoft 365 Business Premium', N'IT',            N'Backup Admin',           @Now),
 (@Code, @Snap, N'noc@rpmresources.co.za',         N'NOC Monitoring',       1, N'Microsoft 365 Business Premium; Power BI Pro', N'NOC', N'Monitoring', @Now),
 (@Code, @Snap, N'consultant1@rpmresources.co.za', N'Field Consultant 1',   1, N'Microsoft 365 Business Premium', N'Consulting',    N'Senior Consultant',      @Now),
 (@Code, @Snap, N'consultant2@rpmresources.co.za', N'Field Consultant 2',   1, N'Microsoft 365 Business Premium', N'Consulting',    N'Consultant',             @Now),
 (@Code, @Snap, N'projects@rpmresources.co.za',    N'Projects',             1, N'Microsoft 365 E3; Visio Plan 2',  N'PMO',           N'Project Manager',        @Now),
 (@Code, @Snap, N'reports@rpmresources.co.za',     N'Reporting',            1, N'Power BI Pro',                    N'BI',            N'Analyst',                @Now),
 (@Code, @Snap, N'guest.pilot@rpmresources.co.za', N'Pilot Guest',          0, NULL,                               N'External',      N'Guest (disabled)',       @Now);

MERGE dbo.Csp_TenantHealth AS t
USING (SELECT @Code AS CustomerCode, @Snap AS SnapshotDate) AS s
  ON t.CustomerCode = s.CustomerCode AND t.SnapshotDate = s.SnapshotDate
WHEN MATCHED THEN UPDATE SET
  HealthScore = 96.0, OpenIncidents = 0,
  ServiceNote = N'All core services healthy (pilot seed)', ImportedAt = @Now
WHEN NOT MATCHED THEN INSERT (CustomerCode, SnapshotDate, HealthScore, OpenIncidents, ServiceNote, ImportedAt)
VALUES (@Code, @Snap, 96.0, 0, N'All core services healthy (pilot seed)', @Now);

PRINT 'RPMINT Microsoft 365 pilot seed complete';

/* KPI view */
IF OBJECT_ID(N'dbo.vw_Kpi_Csp_Summary', N'V') IS NOT NULL DROP VIEW dbo.vw_Kpi_Csp_Summary;
GO
CREATE VIEW dbo.vw_Kpi_Csp_Summary
AS
WITH lic AS (
  SELECT l.CustomerCode, l.SnapshotDate,
    COUNT(*) AS SkuCount,
    SUM(ISNULL(l.PrepaidUnits, 0)) AS TotalSeats,
    SUM(ISNULL(l.ConsumedUnits, 0)) AS AssignedSeats,
    SUM(ISNULL(l.AvailableUnits, 0)) AS UnusedSeats,
    MAX(l.ImportedAt) AS LastImportAt
  FROM dbo.Csp_Licenses AS l WITH (NOLOCK)
  INNER JOIN (
    SELECT CustomerCode, MAX(SnapshotDate) AS mx
    FROM dbo.Csp_Licenses WITH (NOLOCK)
    GROUP BY CustomerCode
  ) m ON m.CustomerCode = l.CustomerCode AND m.mx = l.SnapshotDate
  GROUP BY l.CustomerCode, l.SnapshotDate
),
usr AS (
  SELECT u.CustomerCode, u.SnapshotDate,
    COUNT(*) AS UserCount,
    SUM(CASE WHEN u.AccountEnabled = 1 THEN 1 ELSE 0 END) AS EnabledUsers,
    MAX(u.ImportedAt) AS LastImportAt
  FROM dbo.Csp_Users AS u WITH (NOLOCK)
  INNER JOIN (
    SELECT CustomerCode, MAX(SnapshotDate) AS mx
    FROM dbo.Csp_Users WITH (NOLOCK)
    GROUP BY CustomerCode
  ) m ON m.CustomerCode = u.CustomerCode AND m.mx = u.SnapshotDate
  GROUP BY u.CustomerCode, u.SnapshotDate
)
SELECT
  COALESCE(lic.CustomerCode, usr.CustomerCode, th.CustomerCode, tm.CustomerCode) AS CustomerCode,
  COALESCE(lic.SnapshotDate, usr.SnapshotDate, th.SnapshotDate) AS AsOfDate,
  tm.PrimaryDomain,
  tm.DisplayName AS TenantDisplayName,
  tm.TenantId,
  ISNULL(lic.SkuCount, 0) AS SkuCount,
  ISNULL(lic.TotalSeats, 0) AS TotalSeats,
  ISNULL(lic.AssignedSeats, 0) AS AssignedSeats,
  ISNULL(lic.UnusedSeats, 0) AS UnusedSeats,
  ISNULL(usr.UserCount, 0) AS UserCount,
  ISNULL(usr.EnabledUsers, 0) AS EnabledUsers,
  th.HealthScore,
  th.OpenIncidents,
  COALESCE(lic.LastImportAt, usr.LastImportAt, th.ImportedAt, tm.UpdatedAtUtc) AS LastImportAt
FROM dbo.Dim_Csp_TenantMap AS tm WITH (NOLOCK)
FULL OUTER JOIN lic ON lic.CustomerCode = tm.CustomerCode
FULL OUTER JOIN usr ON usr.CustomerCode = COALESCE(tm.CustomerCode, lic.CustomerCode)
LEFT JOIN dbo.Csp_TenantHealth AS th WITH (NOLOCK)
  ON th.CustomerCode = COALESCE(tm.CustomerCode, lic.CustomerCode, usr.CustomerCode)
 AND th.SnapshotDate = COALESCE(lic.SnapshotDate, usr.SnapshotDate, th.SnapshotDate)
WHERE tm.Active = 1 OR tm.Active IS NULL OR lic.CustomerCode IS NOT NULL OR usr.CustomerCode IS NOT NULL;
GO

PRINT 'vw_Kpi_Csp_Summary ready';
GO

/* Grants (soft) */
BEGIN TRY
  GRANT SELECT ON dbo.Dim_Csp_TenantMap TO Rpm_collect;
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Csp_Licenses TO Rpm_collect;
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Csp_Users TO Rpm_collect;
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Csp_TenantHealth TO Rpm_collect;
  GRANT SELECT ON dbo.vw_Kpi_Csp_Summary TO Rpm_collect;
  GRANT SELECT ON dbo.Dim_Csp_TenantMap TO rpmassure;
  GRANT SELECT ON dbo.Csp_Licenses TO rpmassure;
  GRANT SELECT ON dbo.Csp_Users TO rpmassure;
  GRANT SELECT ON dbo.Csp_TenantHealth TO rpmassure;
  GRANT SELECT ON dbo.vw_Kpi_Csp_Summary TO rpmassure;
  PRINT 'Grants applied';
END TRY
BEGIN CATCH
  PRINT 'Grant soft-fail: ' + ERROR_MESSAGE();
END CATCH
GO

/* Proof */
SELECT CustomerCode, PrimaryDomain, SkuCount, TotalSeats, AssignedSeats, UserCount, HealthScore
FROM dbo.vw_Kpi_Csp_Summary
ORDER BY CustomerCode;
GO
