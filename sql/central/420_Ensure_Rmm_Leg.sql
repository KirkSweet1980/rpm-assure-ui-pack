/*
  RPM Assure — RMM leg (leg 2 after SYSPRO)
  Multitenant spine: Dim_Customer.CustomerCode
  Source product UI: "RPM RMM Ecosystem" (technical: Pulseway)

  Join pattern (same spirit as SYSPRO, different key):
    SYSPRO  → Dim_Customer.SqlInstanceName  = Syspro_*.InstanceName
    RMM     → Dim_Customer.CustomerCode     = Pulseway_*.CustomerCode
              (via Dim_Pulseway_OrgMap / Dim_Customer.PulsewayOrgName)

  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -U "rpmassure" -P "..." -C -i 420_Ensure_Rmm_Leg.sql
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

/* ---- Map: Pulseway org → Customer ---- */
IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Pulseway_OrgMap
  (
    OrganizationName nvarchar(200) NOT NULL,
    OrganizationId   int           NULL,
    CustomerCode     nvarchar(50)  NOT NULL,
    Active           bit           NOT NULL CONSTRAINT DF_PwOrgMap_Active DEFAULT (1),
    Notes            nvarchar(500) NULL,
    CONSTRAINT PK_Dim_Pulseway_OrgMap PRIMARY KEY CLUSTERED (OrganizationName),
    CONSTRAINT FK_PwOrgMap_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
  );
  PRINT N'Created Dim_Pulseway_OrgMap';
END
GO

/* ---- Org rollup (like Syspro health / portfolio row) ---- */
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
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwOrgSum_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Pulseway_OrgSummary PRIMARY KEY (SnapshotDate, CustomerCode),
    CONSTRAINT FK_PwOrgSum_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
  );
  PRINT N'Created Pulseway_OrgSummary';
END
GO

/* ---- Devices (like Syspro_Operators for the estate) ---- */
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
    DeviceType nvarchar(40) NULL, -- Server | Workstation | Other
    CriticalNotifications int NULL,
    ElevatedNotifications int NULL,
    LastSeenOnline datetime2(3) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwDev_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Pulseway_Devices PRIMARY KEY (SnapshotDate, DeviceId)
  );
  CREATE INDEX IX_Pulseway_Devices_Customer ON dbo.Pulseway_Devices (CustomerCode, SnapshotDate);
  PRINT N'Created Pulseway_Devices';
END
ELSE
BEGIN
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'DeviceType') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD DeviceType nvarchar(40) NULL;
END
GO

/* ---- Groups / Sites / Notifications / Disks (warehouse parity) ---- */
IF OBJECT_ID(N'dbo.Pulseway_Groups', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pulseway_Groups
  (
    SnapshotDate date NOT NULL,
    GroupId nvarchar(100) NOT NULL,
    CustomerCode nvarchar(50) NULL,
    GroupName nvarchar(200) NULL,
    OrganizationName nvarchar(200) NULL,
    DeviceCount int NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwGrp_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Pulseway_Groups PRIMARY KEY (SnapshotDate, GroupId)
  );
  CREATE INDEX IX_Pulseway_Groups_Customer ON dbo.Pulseway_Groups (CustomerCode, SnapshotDate);
END
GO

IF OBJECT_ID(N'dbo.Pulseway_Sites', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pulseway_Sites
  (
    SnapshotDate date NOT NULL,
    SiteId nvarchar(100) NOT NULL,
    CustomerCode nvarchar(50) NULL,
    SiteName nvarchar(200) NULL,
    OrganizationName nvarchar(200) NULL,
    DeviceCount int NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwSite_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Pulseway_Sites PRIMARY KEY (SnapshotDate, SiteId)
  );
  CREATE INDEX IX_Pulseway_Sites_Customer ON dbo.Pulseway_Sites (CustomerCode, SnapshotDate);
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
    Severity nvarchar(40) NULL, -- Critical | Elevated | Normal | Low
    Title nvarchar(300) NULL,
    Message nvarchar(max) NULL,
    RaisedAt datetime2(3) NULL,
    IsActive bit NULL,
    OrganizationName nvarchar(200) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwNotif_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Pulseway_Notifications PRIMARY KEY (SnapshotDate, NotificationId)
  );
  CREATE INDEX IX_Pulseway_Notif_Customer ON dbo.Pulseway_Notifications (CustomerCode, SnapshotDate);
END
GO

IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pulseway_Disks
  (
    SnapshotDate date NOT NULL,
    DeviceId nvarchar(100) NOT NULL,
    DriveLetter nvarchar(10) NOT NULL,
    CustomerCode nvarchar(50) NULL,
    DeviceName nvarchar(200) NULL,
    TotalGb decimal(18,2) NULL,
    FreeGb decimal(18,2) NULL,
    UsedPct decimal(6,2) NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwDisk_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Pulseway_Disks PRIMARY KEY (SnapshotDate, DeviceId, DriveLetter)
  );
  CREATE INDEX IX_Pulseway_Disks_Customer ON dbo.Pulseway_Disks (CustomerCode, SnapshotDate);
END
GO

IF OBJECT_ID(N'dbo.Pulseway_Organizations', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pulseway_Organizations
  (
    SnapshotDate date NOT NULL,
    OrganizationId int NOT NULL,
    OrganizationName nvarchar(200) NULL,
    CustomerCode nvarchar(50) NULL,
    DeviceCount int NULL,
    ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_PwOrg_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Pulseway_Organizations PRIMARY KEY (SnapshotDate, OrganizationId)
  );
END
GO

/* ---- Pillar flag on AmsConfig ---- */
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  /* ensure every active customer has a config row; do not force PillarPulseway=1 */
  INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro, PillarSql, PillarCove, PillarPulseway, PillarBitdefender, PillarMicrosoftCsp)
  SELECT c.CustomerCode, 1, 1, 1, 0, 0, 0, 0
  FROM dbo.Dim_Customer c
  WHERE c.Active = 1
    AND NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig a WHERE a.CustomerCode = c.CustomerCode);
  PRINT N'AmsConfig rows ensured for active customers';
END
GO

/* ---- KPI views (Rmm-named aliases for app; Pulseway physical tables) ---- */
CREATE OR ALTER VIEW dbo.vw_Kpi_Rmm_OrgSummary_Latest
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
    WHEN ISNULL(p.CriticalAlerts, 0) > 0 OR ISNULL(p.OfflineCount, 0) >= 5 THEN N'Red'
    WHEN ISNULL(p.OfflineCount, 0) > 0 OR ISNULL(p.ElevatedAlerts, 0) > 0 OR ISNULL(p.DiskHighCount, 0) > 0 THEN N'Amber'
    ELSE N'Green'
  END AS HealthRag,
  CONCAT(
    N'Offline=', ISNULL(p.OfflineCount, 0),
    N' Critical=', ISNULL(p.CriticalAlerts, 0),
    N' Devices=', ISNULL(p.DeviceCount, 0)
  ) AS HealthSummary
FROM dbo.Pulseway_OrgSummary AS p WITH (NOLOCK)
INNER JOIN (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_OrgSummary WITH (NOLOCK)
  GROUP BY CustomerCode
) AS m ON m.CustomerCode = p.CustomerCode AND m.mx = p.SnapshotDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Rmm_Devices_Latest
AS
SELECT d.*
FROM dbo.Pulseway_Devices AS d WITH (NOLOCK)
INNER JOIN (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Devices WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL
  GROUP BY CustomerCode
) AS m ON m.CustomerCode = d.CustomerCode AND m.mx = d.SnapshotDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Rmm_Notifications_Latest
AS
SELECT n.*
FROM dbo.Pulseway_Notifications AS n WITH (NOLOCK)
INNER JOIN (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Notifications WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL
  GROUP BY CustomerCode
) AS m ON m.CustomerCode = n.CustomerCode AND m.mx = n.SnapshotDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Rmm_Disks_Latest
AS
SELECT d.*
FROM dbo.Pulseway_Disks AS d WITH (NOLOCK)
INNER JOIN (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Disks WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL
  GROUP BY CustomerCode
) AS m ON m.CustomerCode = d.CustomerCode AND m.mx = d.SnapshotDate
WHERE ISNULL(d.UsedPct, 0) >= 85; -- pressure only
GO

/* Portfolio strip — one row per customer for ExCo */
CREATE OR ALTER VIEW dbo.vw_Kpi_Rmm_Portfolio
AS
SELECT
  c.CustomerCode,
  c.DisplayName,
  c.PulsewayOrgName,
  CAST(ISNULL(a.PillarPulseway, 0) AS bit) AS RmmEnabled,
  s.AsOfDate,
  s.DeviceCount,
  s.OnlineCount,
  s.OfflineCount,
  s.CriticalAlerts,
  s.ElevatedAlerts,
  s.DiskHighCount,
  s.HealthRag,
  s.HealthSummary,
  s.ImportedAt AS LastImportAt
FROM dbo.Dim_Customer AS c WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer_AmsConfig AS a WITH (NOLOCK) ON a.CustomerCode = c.CustomerCode
LEFT JOIN dbo.vw_Kpi_Rmm_OrgSummary_Latest AS s ON s.CustomerCode = c.CustomerCode
WHERE c.Active = 1;
GO

/* Keep legacy Pulseway view in sync */
CREATE OR ALTER VIEW dbo.vw_Kpi_Pulseway_OrgSummary_Latest
AS
SELECT
  AsOfDate AS SnapshotDate,
  CustomerCode,
  OrganizationName,
  DeviceCount, OnlineCount, OfflineCount, MaintenanceCount,
  CriticalAlerts, ElevatedAlerts, NormalAlerts, LowAlerts,
  DiskHighCount, ServerCount, WorkstationCount, NotificationCount,
  ImportedAt
FROM dbo.vw_Kpi_Rmm_OrgSummary_Latest;
GO

/* Mark RMM connection Active when any org summary exists */
IF OBJECT_ID(N'dbo.Dim_Connection', N'U') IS NOT NULL
BEGIN
  UPDATE dbo.Dim_Connection
  SET Status = N'Active',
      Notes = N'RPM RMM Ecosystem (Pulseway) — schema + UI leg live; wire API collect next.',
      UpdatedAt = SYSUTCDATETIME()
  WHERE ConnectionCode = N'PULSEWAY'
    AND EXISTS (SELECT 1 FROM dbo.Pulseway_OrgSummary);
END
GO

PRINT N'420 RMM leg ensure complete.';
PRINT N'Next: map orgs (Dim_Pulseway_OrgMap), import Pulseway snapshots, open customer → RMM in UI.';
GO
