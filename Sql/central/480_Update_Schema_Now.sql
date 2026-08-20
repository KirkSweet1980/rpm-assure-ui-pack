/*
  RPM Assure — central schema update (idempotent).
  Safe to re-run. Creates missing tables/columns only.
  Target: RPMAssure_App
*/
SET NOCOUNT ON;
IF DB_ID(N'RPMAssure_App') IS NOT NULL
  USE RPMAssure_App;
GO

/* ---------- AmsConfig + pillar columns ---------- */
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Customer_AmsConfig (
    CustomerCode nvarchar(50) NOT NULL PRIMARY KEY,
    AmsEnabled bit NOT NULL CONSTRAINT DF_480_AmsEn DEFAULT (1),
    PillarSyspro bit NOT NULL CONSTRAINT DF_480_Sys DEFAULT (0),
    PillarSql bit NOT NULL CONSTRAINT DF_480_Sql DEFAULT (0),
    PillarCove bit NOT NULL CONSTRAINT DF_480_Cove DEFAULT (0),
    PillarPulseway bit NOT NULL CONSTRAINT DF_480_Pw DEFAULT (0),
    PillarBitdefender bit NOT NULL CONSTRAINT DF_480_Bd DEFAULT (0),
    PillarMicrosoftCsp bit NOT NULL CONSTRAINT DF_480_CspOld DEFAULT (0),
    PillarCsp bit NULL,
    Notes nvarchar(500) NULL,
    UpdatedAt datetime2(3) NULL,
    UpdatedBy nvarchar(100) NULL
  );
  PRINT 'Dim_Customer_AmsConfig created';
END
ELSE PRINT 'Dim_Customer_AmsConfig exists';
GO

IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarCsp') IS NULL
  ALTER TABLE dbo.Dim_Customer_AmsConfig ADD PillarCsp bit NULL;
IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarCove') IS NULL
  ALTER TABLE dbo.Dim_Customer_AmsConfig ADD PillarCove bit NOT NULL CONSTRAINT DF_480c_Cove DEFAULT (0);
IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarPulseway') IS NULL
  ALTER TABLE dbo.Dim_Customer_AmsConfig ADD PillarPulseway bit NOT NULL CONSTRAINT DF_480c_Pw DEFAULT (0);
IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarBitdefender') IS NULL
  ALTER TABLE dbo.Dim_Customer_AmsConfig ADD PillarBitdefender bit NOT NULL CONSTRAINT DF_480c_Bd DEFAULT (0);
IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'UpdatedAt') IS NULL
  ALTER TABLE dbo.Dim_Customer_AmsConfig ADD UpdatedAt datetime2(3) NULL;
IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'UpdatedBy') IS NULL
  ALTER TABLE dbo.Dim_Customer_AmsConfig ADD UpdatedBy nvarchar(100) NULL;
PRINT 'AmsConfig columns ready';
GO

/* ---------- Vendor maps ---------- */
IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Pulseway_OrgMap (
    OrganizationName nvarchar(200) NOT NULL PRIMARY KEY,
    OrganizationId int NULL,
    CustomerCode nvarchar(50) NOT NULL,
    Active bit NOT NULL CONSTRAINT DF_480_PwMapA DEFAULT (1),
    Notes nvarchar(500) NULL,
    UpdatedAtUtc datetime2(3) NULL
  );
  PRINT 'Dim_Pulseway_OrgMap created';
END
IF COL_LENGTH(N'dbo.Dim_Pulseway_OrgMap', N'Active') IS NULL
  ALTER TABLE dbo.Dim_Pulseway_OrgMap ADD Active bit NOT NULL CONSTRAINT DF_480_PwMapA2 DEFAULT (1);
PRINT 'Pulseway org map ready';
GO

IF OBJECT_ID(N'dbo.Dim_Pulseway_NameMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Pulseway_NameMap (
    NameLike     nvarchar(80)  NOT NULL,
    CustomerCode nvarchar(50)  NOT NULL,
    Priority     int           NOT NULL CONSTRAINT DF_480_PwNamePri DEFAULT (100),
    Active       bit           NOT NULL CONSTRAINT DF_480_PwNameAct DEFAULT (1),
    Notes        nvarchar(200) NULL,
    CONSTRAINT PK_Dim_Pulseway_NameMap PRIMARY KEY (NameLike)
  );
  PRINT 'Dim_Pulseway_NameMap created';
END
GO

IF OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Cove_PartnerMap (
    PartnerMapId uniqueidentifier NOT NULL CONSTRAINT DF_480_CoveMapId DEFAULT NEWSEQUENTIALID(),
    PartnerName nvarchar(200) NOT NULL,
    PartnerId int NULL,
    CustomerCode nvarchar(50) NOT NULL,
    Active bit NOT NULL CONSTRAINT DF_480_CoveMapA DEFAULT (1),
    Notes nvarchar(400) NULL,
    CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_480_CoveMapC DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_480_CoveMapU DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Dim_Cove_PartnerMap PRIMARY KEY (PartnerMapId)
  );
  CREATE UNIQUE INDEX UQ_480_CoveMap_Name ON dbo.Dim_Cove_PartnerMap (PartnerName);
  PRINT 'Dim_Cove_PartnerMap created';
END
IF COL_LENGTH(N'dbo.Dim_Cove_PartnerMap', N'PartnerName') IS NULL
  ALTER TABLE dbo.Dim_Cove_PartnerMap ADD PartnerName nvarchar(200) NULL;
IF COL_LENGTH(N'dbo.Dim_Cove_PartnerMap', N'CustomerCode') IS NULL
  ALTER TABLE dbo.Dim_Cove_PartnerMap ADD CustomerCode nvarchar(50) NULL;
IF COL_LENGTH(N'dbo.Dim_Cove_PartnerMap', N'Active') IS NULL
  ALTER TABLE dbo.Dim_Cove_PartnerMap ADD Active bit NOT NULL CONSTRAINT DF_480_CoveMapA2 DEFAULT (1);
PRINT 'Cove partner map ready';
GO

IF OBJECT_ID(N'dbo.Dim_Bitdefender_CompanyMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Bitdefender_CompanyMap (
    CompanyName nvarchar(200) NOT NULL,
    CustomerCode nvarchar(50) NOT NULL,
    CompanyId nvarchar(40) NULL,
    MatchType nvarchar(20) NULL,
    Priority int NULL,
    Notes nvarchar(200) NULL,
    Active bit NOT NULL CONSTRAINT DF_480_BdMapA DEFAULT (1),
    UpdatedAtUtc datetime2(3) NULL,
    CONSTRAINT PK_480_BdMap PRIMARY KEY (CompanyName, CustomerCode)
  );
  PRINT 'Dim_Bitdefender_CompanyMap created';
END
IF COL_LENGTH(N'dbo.Dim_Bitdefender_CompanyMap', N'CompanyName') IS NULL
  ALTER TABLE dbo.Dim_Bitdefender_CompanyMap ADD CompanyName nvarchar(200) NULL;
IF COL_LENGTH(N'dbo.Dim_Bitdefender_CompanyMap', N'Active') IS NULL
  ALTER TABLE dbo.Dim_Bitdefender_CompanyMap ADD Active bit NOT NULL CONSTRAINT DF_480_BdMapA2 DEFAULT (1);
PRINT 'Bitdefender company map ready';
GO

IF OBJECT_ID(N'dbo.Dim_Csp_TenantMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Csp_TenantMap (
    CustomerCode nvarchar(50) NOT NULL,
    TenantId nvarchar(64) NOT NULL,
    PrimaryDomain nvarchar(200) NULL,
    DisplayName nvarchar(200) NULL,
    Country nvarchar(100) NULL,
    Active bit NOT NULL CONSTRAINT DF_480_CspMapA DEFAULT (1),
    Notes nvarchar(500) NULL,
    UpdatedAtUtc datetime2(0) NOT NULL CONSTRAINT DF_480_CspMapU DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_480_CspMap PRIMARY KEY (CustomerCode, TenantId)
  );
  PRINT 'Dim_Csp_TenantMap created';
END
PRINT 'CSP tenant map ready';
GO

/* ---------- Fact table columns used by cover / UI ---------- */
IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'Product') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD Product nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Cove_DeviceStatistics', N'CustomerCode') IS NULL
    ALTER TABLE dbo.Cove_DeviceStatistics ADD CustomerCode nvarchar(50) NULL;
  PRINT 'Cove_DeviceStatistics columns ready';
END

IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'CompanyName') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD CompanyName nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'CompanyId') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD CompanyId nvarchar(40) NULL;
  PRINT 'Bitdefender_Endpoints company columns ready';
END

IF OBJECT_ID(N'dbo.Csp_Posture', N'U') IS NOT NULL
  AND COL_LENGTH(N'dbo.Csp_Posture', N'GlobalAdminNames') IS NULL
  ALTER TABLE dbo.Csp_Posture ADD GlobalAdminNames nvarchar(2000) NULL;
GO

/* ---------- Agent tables + RequestSyncUtc ---------- */
IF OBJECT_ID(N'dbo.Agent_Registry', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_Registry (
    AgentId uniqueidentifier NOT NULL CONSTRAINT DF_480_AgId DEFAULT NEWSEQUENTIALID(),
    CustomerCode nvarchar(32) NOT NULL,
    HostName nvarchar(128) NOT NULL,
    InstanceName nvarchar(128) NULL,
    AgentVersion nvarchar(32) NOT NULL CONSTRAINT DF_480_AgVer DEFAULT N'1.0.0',
    RoleTags nvarchar(256) NULL,
    InstallPath nvarchar(512) NULL,
    IsEnabled bit NOT NULL CONSTRAINT DF_480_AgEn DEFAULT 1,
    FirstSeenUtc datetime2(0) NOT NULL CONSTRAINT DF_480_AgFs DEFAULT SYSUTCDATETIME(),
    LastHeartbeatUtc datetime2(0) NULL,
    LastJobUtc datetime2(0) NULL,
    LastStatus nvarchar(32) NULL,
    LastMessage nvarchar(1000) NULL,
    RequestSyncUtc datetime2(0) NULL,
    CONSTRAINT PK_Agent_Registry PRIMARY KEY (AgentId),
    CONSTRAINT UQ_Agent_Registry_Host UNIQUE (CustomerCode, HostName)
  );
  PRINT 'Agent_Registry created';
END
ELSE PRINT 'Agent_Registry exists';
GO
IF COL_LENGTH(N'dbo.Agent_Registry', N'RequestSyncUtc') IS NULL
BEGIN
  ALTER TABLE dbo.Agent_Registry ADD RequestSyncUtc datetime2(0) NULL;
  PRINT 'RequestSyncUtc added';
END
ELSE PRINT 'RequestSyncUtc exists';
GO

IF OBJECT_ID(N'dbo.Agent_Heartbeat', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_Heartbeat (
    HeartbeatId bigint IDENTITY(1,1) NOT NULL,
    CustomerCode nvarchar(32) NOT NULL,
    HostName nvarchar(128) NOT NULL,
    AgentVersion nvarchar(32) NULL,
    ReportedAtUtc datetime2(0) NOT NULL CONSTRAINT DF_480_HbAt DEFAULT SYSUTCDATETIME(),
    OsCaption nvarchar(256) NULL,
    CpuPct decimal(5,2) NULL,
    MemFreeMb int NULL,
    DiskFreeGb decimal(12,2) NULL,
    JobQueueDepth int NULL,
    DetailJson nvarchar(max) NULL,
    CONSTRAINT PK_Agent_Heartbeat PRIMARY KEY (HeartbeatId)
  );
  PRINT 'Agent_Heartbeat created';
END
IF OBJECT_ID(N'dbo.Agent_JobRun', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_JobRun (
    JobRunId bigint IDENTITY(1,1) NOT NULL,
    CustomerCode nvarchar(32) NOT NULL,
    HostName nvarchar(128) NOT NULL,
    JobName nvarchar(64) NOT NULL,
    StartedUtc datetime2(0) NOT NULL,
    FinishedUtc datetime2(0) NULL,
    ExitCode int NULL,
    Success bit NULL,
    DurationSec int NULL,
    RowsPushed int NULL,
    Message nvarchar(2000) NULL,
    LogTail nvarchar(max) NULL,
    CONSTRAINT PK_Agent_JobRun PRIMARY KEY (JobRunId)
  );
  PRINT 'Agent_JobRun created';
END
IF OBJECT_ID(N'dbo.Agent_JobDefinition', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Agent_JobDefinition (
    JobName nvarchar(64) NOT NULL PRIMARY KEY,
    DisplayName nvarchar(128) NOT NULL,
    DefaultIntervalMin int NOT NULL CONSTRAINT DF_480_JdI DEFAULT 15,
    ScriptRelativePath nvarchar(512) NULL,
    IsEnabled bit NOT NULL CONSTRAINT DF_480_JdE DEFAULT 1,
    AppliesToRoles nvarchar(256) NULL,
    Notes nvarchar(500) NULL
  );
  PRINT 'Agent_JobDefinition created';
END
GO

IF OBJECT_ID(N'dbo.vw_Agent_Status_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Agent_Status_Latest;
GO
CREATE VIEW dbo.vw_Agent_Status_Latest
AS
SELECT
  r.CustomerCode, r.HostName, r.InstanceName, r.AgentVersion, r.RoleTags,
  r.IsEnabled, r.LastHeartbeatUtc, r.LastJobUtc, r.LastStatus, r.LastMessage,
  r.RequestSyncUtc,
  CASE
    WHEN r.LastHeartbeatUtc IS NULL THEN N'NEVER'
    WHEN r.LastHeartbeatUtc < DATEADD(minute, -20, SYSUTCDATETIME()) THEN N'STALE'
    ELSE N'ONLINE'
  END AS HealthStatus,
  DATEDIFF(minute, r.LastHeartbeatUtc, SYSUTCDATETIME()) AS MinutesSinceHeartbeat
FROM dbo.Agent_Registry r;
GO

/* ---------- Drop junk maps from failed onboarding prompts ---------- */
DELETE FROM dbo.Dim_Cove_PartnerMap
WHERE PartnerName LIKE N'Invalid%' OR PartnerName LIKE N'%column name%'
   OR PartnerName LIKE N'System.Object%' OR LTRIM(RTRIM(ISNULL(PartnerName,N''))) = N'';
DELETE FROM dbo.Dim_Pulseway_OrgMap
WHERE OrganizationName LIKE N'Invalid%' OR OrganizationName LIKE N'System.Object%'
   OR LTRIM(RTRIM(ISNULL(OrganizationName,N''))) = N'';
IF OBJECT_ID(N'dbo.Dim_Bitdefender_CompanyMap', N'U') IS NOT NULL
  DELETE FROM dbo.Dim_Bitdefender_CompanyMap
  WHERE CompanyName LIKE N'Invalid%' OR CompanyName LIKE N'%column name%'
     OR CompanyName LIKE N'System.Object%' OR LTRIM(RTRIM(ISNULL(CompanyName,N''))) = N'';
PRINT 'Junk maps cleaned';
GO

/* HYDRA: SYSPRO deferred — no agent, No Cover. RMM / Cove / EPP unchanged. */
IF EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'HYDRA')
BEGIN
  UPDATE dbo.Dim_Customer
  SET SqlInstanceName = NULL, UpdatedAt = SYSUTCDATETIME()
  WHERE CustomerCode = N'HYDRA';

  IF EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = N'HYDRA')
    UPDATE dbo.Dim_Customer_AmsConfig
    SET PillarSyspro = 0, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'480_hydra_off'
    WHERE CustomerCode = N'HYDRA';
  ELSE
    INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro, UpdatedAt, UpdatedBy)
    VALUES (N'HYDRA', 1, 0, SYSUTCDATETIME(), N'480_hydra_off');

  PRINT 'HYDRA SYSPRO cover off';
END
GO

/* ---------- Cover flags: map or live data = on ---------- */
UPDATE a SET PillarPulseway = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'480_schema'
FROM dbo.Dim_Customer_AmsConfig a
WHERE ISNULL(a.PillarPulseway, 0) = 0
  AND EXISTS (
    SELECT 1 FROM dbo.Dim_Pulseway_OrgMap m
    WHERE m.CustomerCode = a.CustomerCode AND ISNULL(m.Active,1) = 1
      AND m.OrganizationName NOT LIKE N'Invalid%'
  );
UPDATE a SET PillarCove = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'480_schema'
FROM dbo.Dim_Customer_AmsConfig a
WHERE ISNULL(a.PillarCove, 0) = 0
  AND EXISTS (
    SELECT 1 FROM dbo.Dim_Cove_PartnerMap m
    WHERE m.CustomerCode = a.CustomerCode AND ISNULL(m.Active,1) = 1
      AND m.PartnerName NOT LIKE N'Invalid%'
  );
UPDATE a SET PillarBitdefender = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'480_schema'
FROM dbo.Dim_Customer_AmsConfig a
WHERE ISNULL(a.PillarBitdefender, 0) = 0
  AND EXISTS (
    SELECT 1 FROM dbo.Dim_Bitdefender_CompanyMap m
    WHERE m.CustomerCode = a.CustomerCode AND ISNULL(m.Active,1) = 1
      AND m.CompanyName NOT LIKE N'Invalid%'
  );
UPDATE a SET PillarCsp = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'480_schema'
FROM dbo.Dim_Customer_AmsConfig a
WHERE ISNULL(a.PillarCsp, 0) = 0
  AND EXISTS (
    SELECT 1 FROM dbo.Dim_Csp_TenantMap m
    WHERE m.CustomerCode = a.CustomerCode AND ISNULL(m.Active,1) = 1
  );
PRINT 'Pillar flags stamped from maps';
GO

/* ---------- Grants ---------- */
BEGIN TRY
  GRANT SELECT, INSERT, UPDATE ON dbo.Agent_Registry TO [rpmassure];
  GRANT SELECT, INSERT ON dbo.Agent_Heartbeat TO [rpmassure];
  GRANT SELECT, INSERT ON dbo.Agent_JobRun TO [rpmassure];
  GRANT SELECT ON dbo.vw_Agent_Status_Latest TO [rpmassure];
  PRINT 'Granted rpmassure';
END TRY BEGIN CATCH PRINT 'Grant rpmassure: ' + ERROR_MESSAGE(); END CATCH
BEGIN TRY
  GRANT SELECT, INSERT, UPDATE ON dbo.Agent_Registry TO [Rpm_collect];
  GRANT SELECT, INSERT ON dbo.Agent_Heartbeat TO [Rpm_collect];
  GRANT SELECT, INSERT ON dbo.Agent_JobRun TO [Rpm_collect];
  GRANT SELECT ON dbo.vw_Agent_Status_Latest TO [Rpm_collect];
  PRINT 'Granted Rpm_collect';
END TRY BEGIN CATCH PRINT 'Grant Rpm_collect: ' + ERROR_MESSAGE(); END CATCH
GO

/* ---------- Proof ---------- */
SELECT
  OBJECT_ID(N'dbo.Agent_Registry') AS Agent_Registry,
  COL_LENGTH(N'dbo.Agent_Registry', N'RequestSyncUtc') AS RequestSyncUtc,
  OBJECT_ID(N'dbo.Dim_Cove_PartnerMap') AS CoveMap,
  COL_LENGTH(N'dbo.Dim_Cove_PartnerMap', N'PartnerName') AS PartnerName,
  OBJECT_ID(N'dbo.Dim_Bitdefender_CompanyMap') AS BdMap,
  COL_LENGTH(N'dbo.Dim_Bitdefender_CompanyMap', N'CompanyName') AS CompanyName,
  COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarCsp') AS PillarCsp;
SELECT CustomerCode, PartnerName, Active FROM dbo.Dim_Cove_PartnerMap
WHERE ISNULL(Active,1)=1 ORDER BY CustomerCode;
GO
PRINT '480 schema update complete';
GO

/* Freshdesk-mapped companies become Assure tenants (SBT / SBS Tanks, etc.) */
IF OBJECT_ID(N'dbo.Dim_Customer', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.Dim_Freshdesk_CompanyMap', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'SBT')
  BEGIN
    IF COL_LENGTH(N'dbo.Dim_Customer', N'CreatedAt') IS NOT NULL
      INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active, SqlInstanceName, CreatedAt, UpdatedAt)
      VALUES (N'SBT', N'SBS Tanks', 1, NULL, SYSUTCDATETIME(), SYSUTCDATETIME());
    ELSE
      INSERT dbo.Dim_Customer (CustomerCode, DisplayName, Active)
      VALUES (N'SBT', N'SBS Tanks', 1);
    PRINT '480 created Dim_Customer SBT (SBS Tanks)';
  END
  ELSE
    UPDATE dbo.Dim_Customer SET Active = 1 WHERE CustomerCode = N'SBT' AND Active = 0;

  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Freshdesk_CompanyMap WHERE CompanyName = N'SBS Tanks')
    INSERT dbo.Dim_Freshdesk_CompanyMap (CompanyId, CompanyName, CustomerCode, Notes, Active)
    VALUES (CONVERT(bigint, 48005599640), N'SBS Tanks', N'SBT', N'480 SBT', 1);
  ELSE
    UPDATE dbo.Dim_Freshdesk_CompanyMap
      SET CustomerCode = N'SBT', Active = 1, CompanyId = COALESCE(CompanyId, CONVERT(bigint, 48005599640))
    WHERE CompanyName = N'SBS Tanks';
END
GO

/* Latest RMM device per DeviceId — Pulseway page collects used different SnapshotDate
   so MAX(SnapshotDate) per customer dropped hosts (AHI 6 servers showed as 3). */
IF OBJECT_ID(N'dbo.vw_Kpi_Rmm_Devices_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Kpi_Rmm_Devices_Latest;
GO
IF OBJECT_ID(N'dbo.Pulseway_Devices', N'U') IS NOT NULL
BEGIN
  EXEC(N'
  CREATE VIEW dbo.vw_Kpi_Rmm_Devices_Latest
  AS
  SELECT d.*
  FROM dbo.Pulseway_Devices AS d WITH (NOLOCK)
  INNER JOIN (
    SELECT DeviceId, MAX(SnapshotDate) AS mx
    FROM dbo.Pulseway_Devices WITH (NOLOCK)
    GROUP BY DeviceId
  ) m ON m.DeviceId = d.DeviceId AND m.mx = d.SnapshotDate
  ');
  PRINT 'vw_Kpi_Rmm_Devices_Latest latest-per-DeviceId';
END
GO

