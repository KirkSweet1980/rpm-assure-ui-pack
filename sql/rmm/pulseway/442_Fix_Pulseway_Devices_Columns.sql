/*
  Fix existing Pulseway_Devices missing DeviceType (and related columns).
  Run as admin (Windows auth):
    sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 442_Fix_Pulseway_Devices_Columns.sql
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Pulseway_Devices', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pulseway_Devices
  (
    SnapshotDate date NOT NULL,
    DeviceId nvarchar(100) NOT NULL,
    CustomerCode nvarchar(50) NULL,
    Name nvarchar(200) NULL,
    OrganizationId int NULL,
    OrganizationName nvarchar(200) NULL,
    IsOnline bit NULL,
    OsName nvarchar(200) NULL,
    DeviceType nvarchar(40) NULL,
    CriticalNotifications int NULL,
    ElevatedNotifications int NULL,
    LastSeenOnline datetime2(3) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwDev442_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Pulseway_Devices442 PRIMARY KEY (SnapshotDate, DeviceId)
  );
  PRINT 'Created Pulseway_Devices';
END
ELSE
BEGIN
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'DeviceType') IS NULL
  BEGIN
    ALTER TABLE dbo.Pulseway_Devices ADD DeviceType nvarchar(40) NULL;
    PRINT 'Added DeviceType';
  END
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'OsName') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD OsName nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'CriticalNotifications') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD CriticalNotifications int NULL;
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'ElevatedNotifications') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD ElevatedNotifications int NULL;
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'LastSeenOnline') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD LastSeenOnline datetime2(3) NULL;
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'OrganizationId') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD OrganizationId int NULL;
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'OrganizationName') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD OrganizationName nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'IsOnline') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD IsOnline bit NULL;
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'Name') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD Name nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'CustomerCode') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD CustomerCode nvarchar(50) NULL;
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'ImportedAt') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwDev442_Imp DEFAULT (SYSUTCDATETIME());
  PRINT 'Pulseway_Devices columns checked';
END
GO

/* OrgSummary / Notifications if missing */
IF OBJECT_ID(N'dbo.Pulseway_OrgSummary', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pulseway_OrgSummary
  (
    SnapshotDate date NOT NULL,
    CustomerCode nvarchar(50) NOT NULL,
    OrganizationName nvarchar(200) NULL,
    DeviceCount int NULL,
    OnlineCount int NULL,
    OfflineCount int NULL,
    MaintenanceCount int NULL,
    CriticalAlerts int NULL,
    ElevatedAlerts int NULL,
    NormalAlerts int NULL,
    LowAlerts int NULL,
    DiskHighCount int NULL,
    ServerCount int NULL,
    WorkstationCount int NULL,
    NotificationCount int NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwOrgSum442 DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Pulseway_OrgSummary442 PRIMARY KEY (SnapshotDate, CustomerCode)
  );
END
GO

IF OBJECT_ID(N'dbo.Pulseway_Notifications', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pulseway_Notifications
  (
    SnapshotDate date NOT NULL,
    NotificationId nvarchar(100) NOT NULL,
    CustomerCode nvarchar(50) NULL,
    DeviceId nvarchar(100) NULL,
    DeviceName nvarchar(200) NULL,
    Severity nvarchar(40) NULL,
    Title nvarchar(300) NULL,
    Message nvarchar(max) NULL,
    RaisedAt datetime2(3) NULL,
    IsActive bit NULL,
    OrganizationName nvarchar(200) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwNotif442 DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Pulseway_Notifications442 PRIMARY KEY (SnapshotDate, NotificationId)
  );
END
GO

IF OBJECT_ID(N'dbo.vw_Kpi_Rmm_OrgSummary_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Kpi_Rmm_OrgSummary_Latest;
GO
CREATE VIEW dbo.vw_Kpi_Rmm_OrgSummary_Latest
AS
SELECT
  p.SnapshotDate AS AsOfDate,
  p.CustomerCode,
  p.OrganizationName,
  p.DeviceCount,
  p.OnlineCount,
  p.OfflineCount,
  p.MaintenanceCount,
  p.CriticalAlerts,
  p.ElevatedAlerts,
  p.NormalAlerts,
  p.LowAlerts,
  p.DiskHighCount,
  p.ServerCount,
  p.WorkstationCount,
  p.NotificationCount,
  p.ImportedAt,
  CASE
    WHEN ISNULL(p.CriticalAlerts, 0) > 0 OR ISNULL(p.OfflineCount, 0) >= 3 THEN N'Red'
    WHEN ISNULL(p.ElevatedAlerts, 0) > 0 OR ISNULL(p.OfflineCount, 0) > 0 THEN N'Amber'
    ELSE N'Green'
  END AS HealthRag,
  CASE
    WHEN ISNULL(p.CriticalAlerts, 0) > 0 THEN CONCAT(p.CriticalAlerts, N' critical alert(s)')
    WHEN ISNULL(p.OfflineCount, 0) > 0 THEN CONCAT(p.OfflineCount, N' device(s) offline')
    WHEN ISNULL(p.ElevatedAlerts, 0) > 0 THEN CONCAT(p.ElevatedAlerts, N' elevated alert(s)')
    ELSE CONCAT(ISNULL(p.DeviceCount, 0), N' device(s) - estate OK')
  END AS HealthSummary
FROM dbo.Pulseway_OrgSummary AS p WITH (NOLOCK)
INNER JOIN (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_OrgSummary WITH (NOLOCK)
  GROUP BY CustomerCode
) AS m ON m.CustomerCode = p.CustomerCode AND m.mx = p.SnapshotDate;
GO

IF OBJECT_ID(N'dbo.vw_Pulseway_UnmappedOrgs', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Pulseway_UnmappedOrgs;
GO
CREATE VIEW dbo.vw_Pulseway_UnmappedOrgs
AS
SELECT
  NULLIF(LTRIM(RTRIM(d.OrganizationName)), N'') AS OrganizationName,
  d.OrganizationId,
  COUNT_BIG(*) AS DeviceCount,
  MAX(d.SnapshotDate) AS LastSnapshotDate,
  MAX(d.ImportedAt) AS LastImportAt
FROM dbo.Pulseway_Devices AS d WITH (NOLOCK)
WHERE d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND (d.CustomerCode IS NULL OR LTRIM(RTRIM(d.CustomerCode)) = N'')
  AND NULLIF(LTRIM(RTRIM(d.OrganizationName)), N'') IS NOT NULL
GROUP BY NULLIF(LTRIM(RTRIM(d.OrganizationName)), N''), d.OrganizationId;
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Pulseway_Devices TO [Rpm_collect];
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Pulseway_Notifications TO [Rpm_collect];
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Pulseway_OrgSummary TO [Rpm_collect];
  IF OBJECT_ID(N'dbo.Pulseway_Organizations', N'U') IS NOT NULL
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Pulseway_Organizations TO [Rpm_collect];
  IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgMap', N'U') IS NOT NULL
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Dim_Pulseway_OrgMap TO [Rpm_collect];
  IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgAlias', N'U') IS NOT NULL
    GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Dim_Pulseway_OrgAlias TO [Rpm_collect];
  GRANT SELECT ON dbo.vw_Kpi_Rmm_OrgSummary_Latest TO [Rpm_collect];
  GRANT SELECT ON dbo.vw_Pulseway_UnmappedOrgs TO [Rpm_collect];
  PRINT 'Grants OK';
END
GO

-- Show columns
SELECT c.name AS ColName
FROM sys.columns c
WHERE c.object_id = OBJECT_ID(N'dbo.Pulseway_Devices')
ORDER BY c.column_id;

PRINT '442 fix complete. Re-run Collect-Pulseway-To-RPMAssure.ps1';
GO
