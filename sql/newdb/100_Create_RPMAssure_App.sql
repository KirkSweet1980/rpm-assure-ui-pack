/*
================================================================================
  RPM Assure — NEW database (Option A)
  Creates: RPMAssure_App on current instance
  Does NOT alter existing [RPMAssure]
================================================================================
  Product : RPM Assure (RPMA)
  Tenant  : CustomerCode
  KPI Set : v1
  Datarapt: all 10 DTR balance types + InformationLevel 3→2→1
================================================================================
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_ID(N'RPMAssure_App') IS NULL
BEGIN
    PRINT 'Creating database RPMAssure_App...';
    CREATE DATABASE [RPMAssure_App];
END
ELSE
    PRINT 'Database RPMAssure_App already exists — deploying objects into it.';
GO

USE [RPMAssure_App];
GO

/* ========================================================================== */
/*  UTILITY                                                                    */
/* ========================================================================== */
CREATE OR ALTER FUNCTION dbo.fn_SastNow()
RETURNS datetime2(3)
AS
BEGIN
    RETURN CAST(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'South Africa Standard Time' AS datetime2(3));
END
GO

/* ========================================================================== */
/*  CUSTOMER SPINE                                                             */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Dim_Customer', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Dim_Customer
    (
        CustomerCode            nvarchar(50)    NOT NULL,
        DisplayName             nvarchar(200)   NOT NULL,
        Active                  bit             NOT NULL
            CONSTRAINT DF_Dim_Customer_Active DEFAULT (1),
        SqlInstanceName         nvarchar(100)   NULL,
        CovePartnerId           int             NULL,
        CovePartnerName         nvarchar(200)   NULL,
        Notes                   nvarchar(max)   NULL,
        PulsewayOrgName         nvarchar(200)   NULL,
        PulsewayOrgId           int             NULL,
        BitdefenderCompany      nvarchar(200)   NULL,
        BitdefenderCompanyId    nvarchar(100)   NULL,
        CreatedAt               datetime2(3)    NOT NULL
            CONSTRAINT DF_Dim_Customer_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt               datetime2(3)    NOT NULL
            CONSTRAINT DF_Dim_Customer_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Dim_Customer PRIMARY KEY CLUSTERED (CustomerCode)
    );
END
GO

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Dim_Customer_AmsConfig
    (
        CustomerCode            nvarchar(50)    NOT NULL,
        AmsEnabled              bit             NOT NULL
            CONSTRAINT DF_AmsConfig_AmsEnabled DEFAULT (1),
        PillarSyspro            bit             NOT NULL
            CONSTRAINT DF_AmsConfig_Syspro DEFAULT (0),
        PillarSql               bit             NOT NULL
            CONSTRAINT DF_AmsConfig_Sql DEFAULT (0),
        PillarCove              bit             NOT NULL
            CONSTRAINT DF_AmsConfig_Cove DEFAULT (0),
        PillarPulseway          bit             NOT NULL
            CONSTRAINT DF_AmsConfig_Pulseway DEFAULT (0),
        PillarBitdefender       bit             NOT NULL
            CONSTRAINT DF_AmsConfig_Bitdefender DEFAULT (0),
        PillarMicrosoftCsp      bit             NOT NULL
            CONSTRAINT DF_AmsConfig_Csp DEFAULT (0),
        Notes                   nvarchar(500)   NULL,
        UpdatedAt               datetime2(3)    NOT NULL
            CONSTRAINT DF_AmsConfig_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedBy               nvarchar(100)   NULL,
        CONSTRAINT PK_Dim_Customer_AmsConfig PRIMARY KEY CLUSTERED (CustomerCode),
        CONSTRAINT FK_AmsConfig_Customer FOREIGN KEY (CustomerCode)
            REFERENCES dbo.Dim_Customer (CustomerCode)
    );
END
GO

/* Maps (single set — no duplicates) */
IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgMap', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Dim_Pulseway_OrgMap
    (
        OrganizationName nvarchar(200) NOT NULL,
        OrganizationId   int           NULL,
        CustomerCode     nvarchar(50)  NOT NULL,
        Active           bit           NOT NULL CONSTRAINT DF_Pulseway_OrgMap_Active DEFAULT (1),
        Notes            nvarchar(500) NULL,
        CONSTRAINT PK_Dim_Pulseway_OrgMap PRIMARY KEY CLUSTERED (OrganizationName),
        CONSTRAINT FK_Pulseway_OrgMap_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
END
GO

IF OBJECT_ID(N'dbo.Dim_Bitdefender_CompanyMap', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Dim_Bitdefender_CompanyMap
    (
        CompanyName  nvarchar(200) NOT NULL,
        CompanyId    nvarchar(100) NULL,
        CustomerCode nvarchar(50)  NOT NULL,
        Active       bit           NOT NULL CONSTRAINT DF_Bd_CompanyMap_Active DEFAULT (1),
        Notes        nvarchar(500) NULL,
        CONSTRAINT PK_Dim_Bitdefender_CompanyMap PRIMARY KEY CLUSTERED (CompanyName),
        CONSTRAINT FK_Bd_CompanyMap_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
END
GO

IF OBJECT_ID(N'dbo.Dim_HostMap', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Dim_HostMap
    (
        MapId        int            NOT NULL IDENTITY(1,1),
        Pattern      nvarchar(200)  NOT NULL,
        CustomerCode nvarchar(50)   NOT NULL,
        Priority     int            NOT NULL CONSTRAINT DF_HostMap_Priority DEFAULT (100),
        IsActive     bit            NOT NULL CONSTRAINT DF_HostMap_Active DEFAULT (1),
        Notes        nvarchar(500)  NULL,
        CreatedAt    datetime2(3)   NOT NULL CONSTRAINT DF_HostMap_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt    datetime2(3)   NOT NULL CONSTRAINT DF_HostMap_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Dim_HostMap PRIMARY KEY CLUSTERED (MapId),
        CONSTRAINT FK_HostMap_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
END
GO

IF OBJECT_ID(N'dbo.Dim_Customer_SyncLog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Dim_Customer_SyncLog
    (
        LogId        bigint         NOT NULL IDENTITY(1,1),
        RunAt        datetime2(3)   NOT NULL CONSTRAINT DF_SyncLog_RunAt DEFAULT (SYSUTCDATETIME()),
        ActionType   nvarchar(50)   NOT NULL,
        CustomerCode nvarchar(50)   NULL,
        Detail       nvarchar(max)  NULL,
        DryRun       bit            NOT NULL CONSTRAINT DF_SyncLog_DryRun DEFAULT (0),
        CONSTRAINT PK_Dim_Customer_SyncLog PRIMARY KEY CLUSTERED (LogId)
    );
END
GO

/* ========================================================================== */
/*  APP USERS (RPM Assure staff)                                               */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.App_User', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.App_User
    (
        AppUserId       uniqueidentifier NOT NULL CONSTRAINT DF_App_User_Id DEFAULT (NEWSEQUENTIALID()),
        UserName        nvarchar(100)  NOT NULL,
        Email           nvarchar(256)  NOT NULL,
        DisplayName     nvarchar(200)  NOT NULL,
        PasswordHash    nvarchar(500)  NULL,
        IsPlatformAdmin bit            NOT NULL CONSTRAINT DF_App_User_Admin DEFAULT (0),
        IsActive        bit            NOT NULL CONSTRAINT DF_App_User_Active DEFAULT (1),
        EntraObjectId   nvarchar(64)   NULL,
        CreatedAt       datetime2(3)   NOT NULL CONSTRAINT DF_App_User_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       datetime2(3)   NOT NULL CONSTRAINT DF_App_User_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_App_User PRIMARY KEY CLUSTERED (AppUserId),
        CONSTRAINT UX_App_User_UserName UNIQUE (UserName),
        CONSTRAINT UX_App_User_Email UNIQUE (Email)
    );
END
GO

IF OBJECT_ID(N'dbo.App_UserCustomer', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.App_UserCustomer
    (
        AppUserCustomerId uniqueidentifier NOT NULL CONSTRAINT DF_App_UserCustomer_Id DEFAULT (NEWSEQUENTIALID()),
        AppUserId       uniqueidentifier NOT NULL,
        CustomerCode    nvarchar(50)     NOT NULL,
        Role            nvarchar(30)     NOT NULL,
        CreatedAt       datetime2(3)     NOT NULL CONSTRAINT DF_App_UserCustomer_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_App_UserCustomer PRIMARY KEY CLUSTERED (AppUserCustomerId),
        CONSTRAINT UX_App_UserCustomer UNIQUE (AppUserId, CustomerCode),
        CONSTRAINT CK_App_UserCustomer_Role CHECK (Role IN (N'Operator', N'ExCo', N'TechnicalReadOnly')),
        CONSTRAINT FK_App_UserCustomer_User FOREIGN KEY (AppUserId) REFERENCES dbo.App_User (AppUserId),
        CONSTRAINT FK_App_UserCustomer_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
END
GO

/* ========================================================================== */
/*  TELEMETRY SNAPSHOT SHELLS (import targets — same spirit as warehouse)      */
/* ========================================================================== */

/* Pulseway */
IF OBJECT_ID(N'dbo.Pulseway_OrgSummary', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pulseway_OrgSummary
    (
        SnapshotDate date NOT NULL,
        CustomerCode nvarchar(50) NOT NULL,
        OrganizationName nvarchar(200) NULL,
        DeviceCount int NULL, OnlineCount int NULL, OfflineCount int NULL,
        MaintenanceCount int NULL,
        CriticalAlerts int NULL, ElevatedAlerts int NULL, NormalAlerts int NULL, LowAlerts int NULL,
        DiskHighCount int NULL, ServerCount int NULL, WorkstationCount int NULL, NotificationCount int NULL,
        ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Pw_OrgSummary_ImportedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Pulseway_OrgSummary PRIMARY KEY (SnapshotDate, CustomerCode),
        CONSTRAINT FK_Pulseway_OrgSummary_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
END
GO

IF OBJECT_ID(N'dbo.Pulseway_Devices', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pulseway_Devices
    (
        SnapshotDate date NOT NULL,
        DeviceId nvarchar(100) NOT NULL,
        CustomerCode nvarchar(50) NULL,
        Name nvarchar(200) NULL,
        OrganizationId int NULL, OrganizationName nvarchar(200) NULL,
        IsOnline bit NULL, OsName nvarchar(200) NULL,
        CriticalNotifications int NULL, ElevatedNotifications int NULL,
        LastSeenOnline datetime2(3) NULL,
        ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Pw_Devices_ImportedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Pulseway_Devices PRIMARY KEY (SnapshotDate, DeviceId)
    );
    CREATE INDEX IX_Pulseway_Devices_Customer ON dbo.Pulseway_Devices (CustomerCode, SnapshotDate);
END
GO

/* Cove */
IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Cove_DeviceStatistics
    (
        SnapshotDate date NOT NULL,
        AccountId bigint NOT NULL,
        PartnerId int NULL,
        CustomerCode nvarchar(50) NULL,
        DeviceName nvarchar(200) NULL, MachineName nvarchar(200) NULL,
        UsedBytes bigint NULL, SelectedBytes bigint NULL,
        LastSuccessTime datetime2(3) NULL, LastBackupStatus nvarchar(100) NULL,
        Product nvarchar(100) NULL,
        ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Cove_Dev_ImportedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Cove_DeviceStatistics PRIMARY KEY (SnapshotDate, AccountId)
    );
    CREATE INDEX IX_Cove_Device_Customer ON dbo.Cove_DeviceStatistics (CustomerCode, SnapshotDate);
END
GO

/* Bitdefender */
IF OBJECT_ID(N'dbo.Bitdefender_CompanySummary', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Bitdefender_CompanySummary
    (
        SnapshotDate date NOT NULL,
        CustomerCode nvarchar(50) NOT NULL,
        CompanyName nvarchar(200) NULL,
        EndpointCount int NULL, ManagedCount int NULL, OnlineCount int NULL, OfflineCount int NULL,
        UnmanagedCount int NULL, QuarantineCount int NULL,
        IncidentCount24h int NULL, IncidentCount7d int NULL,
        InfectedCount int NULL, SignatureOutdatedCnt int NULL,
        AvgRiskScorePct decimal(9,2) NULL, MalwareUnresolvedCnt int NULL,
        PolicyNonCompliantCnt int NULL, ModulesDisabledCnt int NULL,
        ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Bd_Company_ImportedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Bitdefender_CompanySummary PRIMARY KEY (SnapshotDate, CustomerCode)
    );
END
GO

IF OBJECT_ID(N'dbo.Bitdefender_Incidents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Bitdefender_Incidents
    (
        SnapshotDate date NOT NULL,
        IncidentId nvarchar(100) NOT NULL,
        CustomerCode nvarchar(50) NULL,
        Severity nvarchar(50) NULL, Status nvarchar(50) NULL,
        ThreatName nvarchar(300) NULL, DetectionName nvarchar(300) NULL,
        EndpointName nvarchar(200) NULL,
        CreatedOn datetime2(3) NULL, CreatedAt datetime2(3) NULL, LastUpdate datetime2(3) NULL,
        ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Bd_Inc_ImportedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Bitdefender_Incidents PRIMARY KEY (SnapshotDate, IncidentId)
    );
    CREATE INDEX IX_Bd_Incidents_Customer ON dbo.Bitdefender_Incidents (CustomerCode, SnapshotDate);
END
GO

/* SQL estate */
IF OBJECT_ID(N'dbo.Sql_Backups', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sql_Backups
    (
        SnapshotDate date NOT NULL,
        InstanceName nvarchar(100) NOT NULL,
        DatabaseName nvarchar(128) NOT NULL,
        LastFullBackup datetime2(3) NULL,
        LastDiffBackup datetime2(3) NULL,
        LastLogBackup datetime2(3) NULL,
        ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Sql_Backups_ImportedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Sql_Backups PRIMARY KEY (SnapshotDate, InstanceName, DatabaseName)
    );
END
GO

/* SYSPRO operators / jobs / health (for Active Users + drivers) */
IF OBJECT_ID(N'dbo.Syspro_Operators', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Syspro_Operators
    (
        SnapshotDate date NOT NULL,
        InstanceName nvarchar(100) NOT NULL,
        OperatorCode nvarchar(50) NOT NULL,
        OperatorName nvarchar(200) NULL,
        GroupCode nvarchar(50) NULL,
        Email nvarchar(256) NULL,
        LastLoginDate datetime2(3) NULL,
        OperatorStatus nvarchar(50) NULL,
        ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Syspro_Oper_ImportedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Syspro_Operators PRIMARY KEY (SnapshotDate, InstanceName, OperatorCode)
    );
END
GO

IF OBJECT_ID(N'dbo.Syspro_JobLogging', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Syspro_JobLogging
    (
        RowId bigint NOT NULL IDENTITY(1,1),
        SnapshotDate date NOT NULL,
        InstanceName nvarchar(100) NOT NULL,
        CompanyDb nvarchar(100) NULL,
        ProgramName nvarchar(200) NULL,
        Operator nvarchar(50) NULL,
        Message nvarchar(max) NULL,
        ProgErrorCode decimal(18,2) NULL,
        ErrorStatusCode nvarchar(50) NULL,
        TransactionStatus nvarchar(100) NULL,
        ProgRunDate datetime2(3) NULL,
        ImpactDate datetime2(3) NULL,
        ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Syspro_Job_ImportedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Syspro_JobLogging PRIMARY KEY (RowId)
    );
    CREATE INDEX IX_Syspro_Job_Snap ON dbo.Syspro_JobLogging (SnapshotDate, InstanceName);
END
GO

IF OBJECT_ID(N'dbo.Syspro_HealthLog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Syspro_HealthLog
    (
        RowId int NOT NULL IDENTITY(1,1),
        SnapshotDate date NOT NULL,
        InstanceName nvarchar(100) NOT NULL,
        CompanyDb nvarchar(100) NULL,
        RunDateTime datetime2(3) NULL,
        Operator nvarchar(50) NULL,
        HealthFunction nvarchar(100) NULL,
        Description nvarchar(500) NULL,
        StatusFlag nvarchar(50) NULL,
        Message nvarchar(max) NULL,
        ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_Syspro_Health_ImportedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Syspro_HealthLog PRIMARY KEY (RowId)
    );
END
GO

/* ========================================================================== */
/*  DATARAPT DTR — all 10 + levels                                             */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Dim_DtrBalanceType', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Dim_DtrBalanceType
    (
        BalanceTypeCode nvarchar(10)  NOT NULL,
        BalanceTypeName nvarchar(100) NOT NULL,
        TableName       nvarchar(128) NOT NULL,
        SortOrder       int           NOT NULL,
        Active          bit           NOT NULL CONSTRAINT DF_DtrType_Active DEFAULT (1),
        CONSTRAINT PK_Dim_DtrBalanceType PRIMARY KEY (BalanceTypeCode)
    );
END
GO

MERGE dbo.Dim_DtrBalanceType AS t
USING (VALUES
    (N'AP',  N'Accounts Payable',    N'Syspro_DtrApBalances',  1),
    (N'AR',  N'Accounts Receivable', N'Syspro_DtrArBalances',  2),
    (N'ASS', N'Assets',              N'Syspro_DtrAssBalances', 3),
    (N'CB',  N'Cashbook',            N'Syspro_DtrCbBalances',  4),
    (N'DN',  N'Dispatch Notes',      N'Syspro_DtrDnBalances',  5),
    (N'GIT', N'Goods In Transit',    N'Syspro_DtrGitBalances', 6),
    (N'GRN', N'GRN Suspense',        N'Syspro_DtrGrnBalances', 7),
    (N'INV', N'Inventory',           N'Syspro_DtrInvBalances', 8),
    (N'WIP', N'Work In Progress',    N'Syspro_DtrWipBalances', 9),
    (N'WPI', N'WIP Inspection',      N'Syspro_DtrWpiBalances',10)
) AS s(BalanceTypeCode, BalanceTypeName, TableName, SortOrder)
ON t.BalanceTypeCode = s.BalanceTypeCode
WHEN NOT MATCHED THEN INSERT (BalanceTypeCode, BalanceTypeName, TableName, SortOrder, Active)
VALUES (s.BalanceTypeCode, s.BalanceTypeName, s.TableName, s.SortOrder, 1);
GO

/* Unified DTR table factory via dynamic SQL */
DECLARE @types TABLE (T sysname, SubPrefix sysname);
INSERT @types VALUES
 (N'Syspro_DtrApBalances', N'Ap'),
 (N'Syspro_DtrArBalances', N'Ar'),
 (N'Syspro_DtrAssBalances', N'Sub'),
 (N'Syspro_DtrCbBalances', N'Sub'),
 (N'Syspro_DtrDnBalances', N'Sub'),
 (N'Syspro_DtrGitBalances', N'Sub'),
 (N'Syspro_DtrGrnBalances', N'Sub'),
 (N'Syspro_DtrInvBalances', N'Inv'),
 (N'Syspro_DtrWipBalances', N'Sub'),
 (N'Syspro_DtrWpiBalances', N'Sub');

DECLARE @t sysname, @p sysname, @sql nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT T, SubPrefix FROM @types;
OPEN c; FETCH NEXT FROM c INTO @t, @p;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF OBJECT_ID(N'dbo.' + @t, N'U') IS NULL
    BEGIN
        SET @sql = N'
        CREATE TABLE dbo.' + QUOTENAME(@t) + N'(
            RowId bigint NOT NULL IDENTITY(1,1),
            SnapshotDate date NOT NULL,
            InstanceName nvarchar(100) NOT NULL,
            CompanyDb nvarchar(100) NOT NULL,
            CustomerCode nvarchar(50) NULL,
            GlYear int NULL,
            GlPeriod int NULL,
            InformationLevel tinyint NULL,
            LevelKey nvarchar(50) NULL,
            ParentLevelKey nvarchar(50) NULL,
            GlCode nvarchar(50) NULL,
            Dimension1 nvarchar(50) NULL,
            Description nvarchar(200) NULL,
            ' + CASE WHEN @p IN (N'Ap',N'Ar',N'Inv')
                THEN QUOTENAME(@p + N'OpenBalance') + N' decimal(18,2) NULL, '
                   + QUOTENAME(@p + N'CloseBalance') + N' decimal(18,2) NULL, '
                ELSE N'SubOpenBalance decimal(18,2) NULL, SubCloseBalance decimal(18,2) NULL, '
              END + N'
            GlOpenBalance decimal(18,2) NULL,
            GlCloseBalance decimal(18,2) NULL,
            Variance decimal(18,2) NULL,
            RefreshDate datetime2(3) NULL,
            ImportedAt datetime2(3) NOT NULL CONSTRAINT DF_' + REPLACE(@t,N'Syspro_',N'') + N'_Imp DEFAULT (SYSUTCDATETIME()),
            CONSTRAINT PK_' + @t + N' PRIMARY KEY (RowId),
            CONSTRAINT CK_' + @t + N'_Lvl CHECK (InformationLevel IS NULL OR InformationLevel IN (1,2,3))
        );
        CREATE INDEX IX_' + @t + N'_Snap ON dbo.' + QUOTENAME(@t) + N'(SnapshotDate, InstanceName, CompanyDb);
        CREATE INDEX IX_' + @t + N'_Cust ON dbo.' + QUOTENAME(@t) + N'(CustomerCode, SnapshotDate);';
        EXEC sys.sp_executesql @sql;
        PRINT 'Created ' + @t;
    END
    FETCH NEXT FROM c INTO @t, @p;
END
CLOSE c; DEALLOCATE c;
GO

/* Legacy-friendly: Branch/Warehouse aliases as computed? skip — use Dimension1 for all new loads.
   Add Branch/Warehouse nullable columns on AP/AR/INV for warehouse import compatibility */
IF COL_LENGTH(N'dbo.Syspro_DtrApBalances', N'Branch') IS NULL
    ALTER TABLE dbo.Syspro_DtrApBalances ADD Branch nvarchar(50) NULL;
IF COL_LENGTH(N'dbo.Syspro_DtrArBalances', N'Branch') IS NULL
    ALTER TABLE dbo.Syspro_DtrArBalances ADD Branch nvarchar(50) NULL;
IF COL_LENGTH(N'dbo.Syspro_DtrInvBalances', N'Warehouse') IS NULL
    ALTER TABLE dbo.Syspro_DtrInvBalances ADD Warehouse nvarchar(50) NULL;
GO

/* ========================================================================== */
/*  SLA + AMS PROCESS FACTS                                                    */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Dim_SlaPolicy', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Dim_SlaPolicy
    (
        SlaPolicyId int NOT NULL IDENTITY(1,1),
        CustomerCode nvarchar(50) NULL,
        Priority nvarchar(20) NOT NULL,
        RespondMins int NOT NULL,
        ResolveMins int NOT NULL,
        AvailabilityPct decimal(6,3) NULL,
        Active bit NOT NULL CONSTRAINT DF_Sla_Active DEFAULT (1),
        CONSTRAINT PK_Dim_SlaPolicy PRIMARY KEY (SlaPolicyId),
        CONSTRAINT CK_Sla_Priority CHECK (Priority IN (N'Critical',N'High',N'Medium',N'Low'))
    );
END
GO
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_SlaPolicy)
INSERT dbo.Dim_SlaPolicy (CustomerCode, Priority, RespondMins, ResolveMins, AvailabilityPct) VALUES
(NULL,N'Critical',60,240,99.500),(NULL,N'High',240,480,99.500),
(NULL,N'Medium',480,1440,99.500),(NULL,N'Low',1440,4320,99.500);
GO

IF OBJECT_ID(N'dbo.Fact_Incident', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_Incident
    (
        IncidentId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_Incident_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerCode nvarchar(50) NOT NULL,
        Title nvarchar(300) NOT NULL,
        Severity nvarchar(20) NOT NULL,
        Status nvarchar(30) NOT NULL,
        Priority nvarchar(20) NULL,
        OpenedAt datetime2(3) NOT NULL,
        FirstResponseAt datetime2(3) NULL,
        ResolvedAt datetime2(3) NULL,
        ClosedAt datetime2(3) NULL,
        BusinessImpact nvarchar(max) NULL,
        ModuleCode nvarchar(50) NULL,
        ExternalRef nvarchar(100) NULL,
        IsMajor bit NOT NULL CONSTRAINT DF_Fact_Incident_Major DEFAULT (0),
        ResponseSlaMet bit NULL,
        ResolveSlaMet bit NULL,
        CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Incident_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Incident_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_Incident PRIMARY KEY (IncidentId),
        CONSTRAINT CK_Fact_Incident_Sev CHECK (Severity IN (N'Critical',N'High',N'Medium',N'Low')),
        CONSTRAINT CK_Fact_Incident_Status CHECK (Status IN (N'New',N'InProgress',N'Resolved',N'Closed',N'Cancelled')),
        CONSTRAINT FK_Fact_Incident_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
    CREATE INDEX IX_Fact_Incident_Cust ON dbo.Fact_Incident (CustomerCode, OpenedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.Fact_Problem', N'U') IS NULL
CREATE TABLE dbo.Fact_Problem
(
    ProblemId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_Problem_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode nvarchar(50) NOT NULL,
    Title nvarchar(300) NOT NULL,
    Severity nvarchar(20) NULL,
    Status nvarchar(30) NOT NULL,
    OwnerName nvarchar(200) NULL,
    OpenedAt datetime2(3) NOT NULL,
    ClosedAt datetime2(3) NULL,
    Summary nvarchar(max) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Problem_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Problem_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_Problem PRIMARY KEY (ProblemId),
    CONSTRAINT CK_Fact_Problem_Status CHECK (Status IN (N'Open',N'Investigating',N'RootCauseIdentified',N'Closed',N'Cancelled')),
    CONSTRAINT FK_Fact_Problem_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
);
GO

IF OBJECT_ID(N'dbo.Fact_Change', N'U') IS NULL
CREATE TABLE dbo.Fact_Change
(
    ChangeId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_Change_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode nvarchar(50) NOT NULL,
    Title nvarchar(300) NOT NULL,
    Status nvarchar(30) NOT NULL,
    Outcome nvarchar(20) NULL,
    CompletedAt datetime2(3) NULL,
    ExternalRef nvarchar(100) NULL,
    Summary nvarchar(max) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Change_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Change_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_Change PRIMARY KEY (ChangeId),
    CONSTRAINT CK_Fact_Change_Outcome CHECK (Outcome IS NULL OR Outcome IN (N'Succeeded',N'Failed',N'RolledBack',N'Cancelled')),
    CONSTRAINT FK_Fact_Change_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
);
GO

IF OBJECT_ID(N'dbo.Fact_Risk', N'U') IS NULL
CREATE TABLE dbo.Fact_Risk
(
    RiskId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_Risk_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode nvarchar(50) NOT NULL,
    Title nvarchar(300) NOT NULL,
    Category nvarchar(40) NULL,
    Rag nvarchar(10) NOT NULL,
    Status nvarchar(20) NOT NULL,
    OwnerName nvarchar(200) NULL,
    TargetDate date NULL,
    Summary nvarchar(max) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Risk_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Risk_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_Risk PRIMARY KEY (RiskId),
    CONSTRAINT CK_Fact_Risk_Rag CHECK (Rag IN (N'Red',N'Amber',N'Green')),
    CONSTRAINT CK_Fact_Risk_Status CHECK (Status IN (N'Open',N'Mitigating',N'Closed')),
    CONSTRAINT FK_Fact_Risk_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
);
GO

IF OBJECT_ID(N'dbo.Fact_Issue', N'U') IS NULL
CREATE TABLE dbo.Fact_Issue
(
    IssueId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_Issue_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode nvarchar(50) NOT NULL,
    Title nvarchar(300) NOT NULL,
    Source nvarchar(30) NULL,
    Severity nvarchar(20) NULL,
    Status nvarchar(20) NOT NULL,
    OwnerName nvarchar(200) NULL,
    TargetDate date NULL,
    Summary nvarchar(max) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Issue_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Issue_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_Issue PRIMARY KEY (IssueId),
    CONSTRAINT CK_Fact_Issue_Status CHECK (Status IN (N'Open',N'InProgress',N'Closed',N'Cancelled')),
    CONSTRAINT FK_Fact_Issue_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
);
GO

IF OBJECT_ID(N'dbo.Fact_Priority', N'U') IS NULL
CREATE TABLE dbo.Fact_Priority
(
    PriorityId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_Priority_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode nvarchar(50) NOT NULL,
    Title nvarchar(300) NOT NULL,
    Detail nvarchar(max) NULL,
    SortOrder int NOT NULL CONSTRAINT DF_Fact_Priority_Sort DEFAULT (0),
    Status nvarchar(20) NOT NULL CONSTRAINT DF_Fact_Priority_Status DEFAULT (N'Active'),
    PeriodLabel nvarchar(40) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Priority_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Priority_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_Priority PRIMARY KEY (PriorityId),
    CONSTRAINT CK_Fact_Priority_Status CHECK (Status IN (N'Active',N'Done',N'Cancelled')),
    CONSTRAINT FK_Fact_Priority_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
);
GO

IF OBJECT_ID(N'dbo.Fact_VendorCase', N'U') IS NULL
CREATE TABLE dbo.Fact_VendorCase
(
    VendorCaseId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_VendorCase_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode nvarchar(50) NOT NULL,
    VendorName nvarchar(100) NOT NULL,
    ExternalRef nvarchar(100) NULL,
    Title nvarchar(300) NOT NULL,
    Status nvarchar(30) NOT NULL,
    Priority nvarchar(20) NULL,
    OpenedAt datetime2(3) NOT NULL,
    ClosedAt datetime2(3) NULL,
    Summary nvarchar(max) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_VendorCase_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_VendorCase_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_VendorCase PRIMARY KEY (VendorCaseId),
    CONSTRAINT CK_Fact_VendorCase_Status CHECK (Status IN (N'Open',N'PendingVendor',N'PendingCustomer',N'InProgress',N'Closed',N'Cancelled')),
    CONSTRAINT FK_Fact_VendorCase_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
);
GO

IF OBJECT_ID(N'dbo.Fact_Csat', N'U') IS NULL
CREATE TABLE dbo.Fact_Csat
(
    CsatId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_Csat_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode nvarchar(50) NOT NULL,
    PeriodFrom date NOT NULL,
    PeriodTo date NOT NULL,
    Score decimal(5,2) NOT NULL,
    ResponseCount int NULL,
    Source nvarchar(50) NULL,
    Notes nvarchar(500) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Csat_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_Csat PRIMARY KEY (CsatId),
    CONSTRAINT CK_Fact_Csat_Score CHECK (Score >= 1.0 AND Score <= 5.0),
    CONSTRAINT FK_Fact_Csat_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
);
GO

IF OBJECT_ID(N'dbo.Fact_ExecSummary', N'U') IS NULL
CREATE TABLE dbo.Fact_ExecSummary
(
    ExecSummaryId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_ExecSummary_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode nvarchar(50) NOT NULL,
    PeriodFrom date NOT NULL,
    PeriodTo date NOT NULL,
    PeriodLabel nvarchar(40) NOT NULL,
    HealthRag nvarchar(10) NOT NULL,
    HealthScore decimal(5,2) NULL,
    HealthSummary nvarchar(1000) NULL,
    HealthDriversJson nvarchar(max) NULL,
    BusinessImpactSummary nvarchar(max) NULL,
    OpenRiskCount int NULL,
    OpenIssueCount int NULL,
    MajorIncidentCount int NULL,
    Status nvarchar(20) NOT NULL CONSTRAINT DF_Fact_ExecSummary_Status DEFAULT (N'Draft'),
    PreparedByAppUserId uniqueidentifier NULL,
    PublishedAt datetime2(3) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_ExecSummary_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_ExecSummary_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_ExecSummary PRIMARY KEY (ExecSummaryId),
    CONSTRAINT CK_Fact_ExecSummary_Rag CHECK (HealthRag IN (N'Red',N'Amber',N'Green')),
    CONSTRAINT CK_Fact_ExecSummary_Status CHECK (Status IN (N'Draft',N'Final',N'Published')),
    CONSTRAINT FK_Fact_ExecSummary_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode),
    CONSTRAINT FK_Fact_ExecSummary_User FOREIGN KEY (PreparedByAppUserId) REFERENCES dbo.App_User (AppUserId)
);
GO
IF OBJECT_ID(N'dbo.Fact_ExecSummary', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Fact_ExecSummary_Customer_Period' AND object_id = OBJECT_ID(N'dbo.Fact_ExecSummary'))
    CREATE UNIQUE INDEX UX_Fact_ExecSummary_Customer_Period ON dbo.Fact_ExecSummary (CustomerCode, PeriodFrom, PeriodTo);
GO

IF OBJECT_ID(N'dbo.Fact_ExecNarrative', N'U') IS NULL
CREATE TABLE dbo.Fact_ExecNarrative
(
    ExecNarrativeId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_ExecNarrative_Id DEFAULT (NEWSEQUENTIALID()),
    ExecSummaryId uniqueidentifier NOT NULL,
    CustomerCode nvarchar(50) NOT NULL,
    NarrativeType nvarchar(30) NOT NULL,
    SortOrder int NOT NULL CONSTRAINT DF_Fact_ExecNarrative_Sort DEFAULT (0),
    Title nvarchar(200) NULL,
    Body nvarchar(max) NOT NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_ExecNarrative_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_ExecNarrative PRIMARY KEY (ExecNarrativeId),
    CONSTRAINT CK_Fact_ExecNarrative_Type CHECK (NarrativeType IN (N'Achievement',N'PriorityNextPeriod',N'Other')),
    CONSTRAINT FK_Fact_ExecNarrative_Summary FOREIGN KEY (ExecSummaryId) REFERENCES dbo.Fact_ExecSummary (ExecSummaryId),
    CONSTRAINT FK_Fact_ExecNarrative_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
);
GO

IF OBJECT_ID(N'dbo.Fact_ExecDecision', N'U') IS NULL
CREATE TABLE dbo.Fact_ExecDecision
(
    ExecDecisionId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_ExecDecision_Id DEFAULT (NEWSEQUENTIALID()),
    ExecSummaryId uniqueidentifier NOT NULL,
    CustomerCode nvarchar(50) NOT NULL,
    Title nvarchar(300) NOT NULL,
    Detail nvarchar(max) NULL,
    RequestedOf nvarchar(200) NULL,
    Priority nvarchar(20) NULL,
    Status nvarchar(20) NOT NULL CONSTRAINT DF_Fact_ExecDecision_Status DEFAULT (N'Pending'),
    DueDate date NULL,
    DecisionAt datetime2(3) NULL,
    DecisionNotes nvarchar(max) NULL,
    SortOrder int NOT NULL CONSTRAINT DF_Fact_ExecDecision_Sort DEFAULT (0),
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_ExecDecision_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_ExecDecision PRIMARY KEY (ExecDecisionId),
    CONSTRAINT CK_Fact_ExecDecision_Status CHECK (Status IN (N'Pending',N'Approved',N'Rejected',N'Deferred')),
    CONSTRAINT FK_Fact_ExecDecision_Summary FOREIGN KEY (ExecSummaryId) REFERENCES dbo.Fact_ExecSummary (ExecSummaryId),
    CONSTRAINT FK_Fact_ExecDecision_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
);
GO

IF OBJECT_ID(N'dbo.Fact_ExecIncidentHighlight', N'U') IS NULL
CREATE TABLE dbo.Fact_ExecIncidentHighlight
(
    ExecIncidentHighlightId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_ExecIncH_Id DEFAULT (NEWSEQUENTIALID()),
    ExecSummaryId uniqueidentifier NOT NULL,
    CustomerCode nvarchar(50) NOT NULL,
    IncidentId uniqueidentifier NULL,
    Title nvarchar(300) NOT NULL,
    OpenedAt datetime2(3) NULL,
    ResolvedAt datetime2(3) NULL,
    Severity nvarchar(20) NULL,
    Status nvarchar(30) NULL,
    BusinessImpact nvarchar(max) NULL,
    Summary nvarchar(max) NULL,
    SortOrder int NOT NULL CONSTRAINT DF_Fact_ExecIncH_Sort DEFAULT (0),
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_ExecIncH_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_ExecIncidentHighlight PRIMARY KEY (ExecIncidentHighlightId),
    CONSTRAINT FK_Fact_ExecIncH_Summary FOREIGN KEY (ExecSummaryId) REFERENCES dbo.Fact_ExecSummary (ExecSummaryId),
    CONSTRAINT FK_Fact_ExecIncH_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode),
    CONSTRAINT FK_Fact_ExecIncH_Incident FOREIGN KEY (IncidentId) REFERENCES dbo.Fact_Incident (IncidentId)
);
GO

IF OBJECT_ID(N'dbo.Fact_DashboardSnapshot', N'U') IS NULL
CREATE TABLE dbo.Fact_DashboardSnapshot
(
    DashboardSnapshotId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_Dash_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode nvarchar(50) NOT NULL,
    PeriodFrom date NOT NULL,
    PeriodTo date NOT NULL,
    PeriodLabel nvarchar(40) NOT NULL,
    AsOfAt datetime2(3) NOT NULL,
    HealthRag nvarchar(10) NOT NULL,
    HealthScore decimal(5,2) NULL,
    HealthSummary nvarchar(1000) NULL,
    AvailabilityPct decimal(6,3) NULL,
    AvailabilitySlaPct decimal(6,3) NULL,
    SlaResponsePct decimal(6,3) NULL,
    SlaResolvePct decimal(6,3) NULL,
    SlaCompliancePct decimal(6,3) NULL,
    IncidentCountTotal int NULL,
    IncidentCountCritical int NULL,
    OpenProblemCount int NULL,
    ChangeSuccessPct decimal(6,3) NULL,
    ChangeCount int NULL,
    ActiveUserCount int NULL,
    CsatScore decimal(5,2) NULL,
    OpenVendorCaseCount int NULL,
    CoveFailedDeviceCount int NULL,
    PulsewayOfflineCount int NULL,
    BdInfectedCount int NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_Dash_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_DashboardSnapshot PRIMARY KEY (DashboardSnapshotId),
    CONSTRAINT CK_Fact_Dash_Rag CHECK (HealthRag IN (N'Red',N'Amber',N'Green')),
    CONSTRAINT FK_Fact_Dash_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Fact_DashboardSnapshot_Period' AND object_id = OBJECT_ID(N'dbo.Fact_DashboardSnapshot'))
    CREATE UNIQUE INDEX UX_Fact_DashboardSnapshot_Period ON dbo.Fact_DashboardSnapshot (CustomerCode, PeriodFrom, PeriodTo);
GO

PRINT 'Core tables created.';
GO

/* ========================================================================== */
/*  KPI + DATARAPT VIEWS                                                       */
/* ========================================================================== */
CREATE OR ALTER VIEW dbo.vw_Dim_Customer_Active
AS
SELECT c.*, a.AmsEnabled, a.PillarSyspro, a.PillarSql, a.PillarCove,
       a.PillarPulseway, a.PillarBitdefender, a.PillarMicrosoftCsp
FROM dbo.Dim_Customer c
LEFT JOIN dbo.Dim_Customer_AmsConfig a ON a.CustomerCode = c.CustomerCode
WHERE c.Active = 1;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_ActiveUsers
AS
SELECT c.CustomerCode, s.AsOfDate,
    SUM(CASE WHEN s.LastLoginDate IS NOT NULL
              AND s.LastLoginDate >= DATEADD(DAY,-30,CAST(s.AsOfDate AS datetime2))
              AND (s.OperatorStatus IS NULL OR s.OperatorStatus NOT IN (N'D',N'Disabled',N'I',N'Inactive',N'N'))
             THEN 1 ELSE 0 END) AS ActiveUserCount
FROM (
    SELECT o.*, o.SnapshotDate AS AsOfDate
    FROM dbo.Syspro_Operators o
    INNER JOIN (SELECT InstanceName, MAX(SnapshotDate) mx FROM dbo.Syspro_Operators GROUP BY InstanceName) m
      ON m.InstanceName = o.InstanceName AND m.mx = o.SnapshotDate
) s
INNER JOIN dbo.Dim_Customer c ON c.SqlInstanceName = s.InstanceName AND c.Active = 1
GROUP BY c.CustomerCode, s.AsOfDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Pulseway_OrgSummary_Latest
AS
SELECT p.*
FROM dbo.Pulseway_OrgSummary p
INNER JOIN (SELECT CustomerCode, MAX(SnapshotDate) mx FROM dbo.Pulseway_OrgSummary GROUP BY CustomerCode) m
  ON m.CustomerCode = p.CustomerCode AND m.mx = p.SnapshotDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Cove_DeviceLatest
AS
SELECT d.*,
    CASE WHEN d.LastSuccessTime IS NULL OR d.LastSuccessTime < DATEADD(HOUR,-24,CAST(d.SnapshotDate AS datetime2)) THEN 1 ELSE 0 END AS IsRpoBreach24h,
    CASE WHEN d.LastBackupStatus LIKE N'%Fail%' OR d.LastBackupStatus LIKE N'%Error%'
           OR UPPER(ISNULL(d.LastBackupStatus,N'')) IN (N'FAILED',N'ERROR',N'MISSED') THEN 1 ELSE 0 END AS IsBackupFailed
FROM dbo.Cove_DeviceStatistics d
INNER JOIN (SELECT CustomerCode, MAX(SnapshotDate) mx FROM dbo.Cove_DeviceStatistics WHERE CustomerCode IS NOT NULL GROUP BY CustomerCode) m
  ON m.CustomerCode = d.CustomerCode AND m.mx = d.SnapshotDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Cove_Summary
AS
SELECT CustomerCode, SnapshotDate AS AsOfDate, COUNT(*) DeviceCount,
       SUM(IsBackupFailed) FailedDeviceCount, SUM(IsRpoBreach24h) RpoBreach24hCount
FROM dbo.vw_Kpi_Cove_DeviceLatest
GROUP BY CustomerCode, SnapshotDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Bitdefender_CompanyLatest
AS
SELECT b.*
FROM dbo.Bitdefender_CompanySummary b
INNER JOIN (SELECT CustomerCode, MAX(SnapshotDate) mx FROM dbo.Bitdefender_CompanySummary GROUP BY CustomerCode) m
  ON m.CustomerCode = b.CustomerCode AND m.mx = b.SnapshotDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Sql_BackupSummary
AS
SELECT c.CustomerCode, b.SnapshotDate AS AsOfDate, COUNT(*) DatabaseCount,
    SUM(CASE WHEN b.LastFullBackup IS NULL OR b.LastFullBackup < DATEADD(HOUR,-24,CAST(b.SnapshotDate AS datetime2)) THEN 1 ELSE 0 END) FullBackupRpoBreachCount
FROM dbo.Sql_Backups b
INNER JOIN (SELECT InstanceName, MAX(SnapshotDate) mx FROM dbo.Sql_Backups GROUP BY InstanceName) m
  ON m.InstanceName = b.InstanceName AND m.mx = b.SnapshotDate
INNER JOIN dbo.Dim_Customer c ON c.SqlInstanceName = b.InstanceName AND c.Active = 1
GROUP BY c.CustomerCode, b.SnapshotDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_JobErrorCounts
AS
SELECT c.CustomerCode, j.SnapshotDate AS AsOfDate, COUNT(*) JobErrorCount
FROM dbo.Syspro_JobLogging j
INNER JOIN (SELECT InstanceName, MAX(SnapshotDate) mx FROM dbo.Syspro_JobLogging GROUP BY InstanceName) m
  ON m.InstanceName = j.InstanceName AND m.mx = j.SnapshotDate
INNER JOIN dbo.Dim_Customer c ON c.SqlInstanceName = j.InstanceName AND c.Active = 1
WHERE (j.ProgErrorCode IS NOT NULL AND j.ProgErrorCode <> 0)
   OR (j.ErrorStatusCode IS NOT NULL AND LTRIM(RTRIM(j.ErrorStatusCode)) NOT IN (N'',N'0',N'OK'))
   OR (j.TransactionStatus LIKE N'%Fail%')
   OR (j.Message LIKE N'%error%')
GROUP BY c.CustomerCode, j.SnapshotDate;
GO

/* Unified DTR */
CREATE OR ALTER VIEW dbo.vw_Datarapt_DtrBalances_All
AS
SELECT N'AP' BalanceTypeCode, N'Accounts Payable' BalanceTypeName, SnapshotDate, InstanceName, CompanyDb, CustomerCode,
       GlYear, GlPeriod, InformationLevel, LevelKey, ParentLevelKey, GlCode,
       COALESCE(Branch, Dimension1) Dimension1, Description,
       ApOpenBalance SubOpenBalance, ApCloseBalance SubCloseBalance,
       GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
FROM dbo.Syspro_DtrApBalances
UNION ALL
SELECT N'AR', N'Accounts Receivable', SnapshotDate, InstanceName, CompanyDb, CustomerCode,
       GlYear, GlPeriod, InformationLevel, LevelKey, ParentLevelKey, GlCode,
       COALESCE(Branch, Dimension1), Description, ArOpenBalance, ArCloseBalance,
       GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
FROM dbo.Syspro_DtrArBalances
UNION ALL
SELECT N'INV', N'Inventory', SnapshotDate, InstanceName, CompanyDb, CustomerCode,
       GlYear, GlPeriod, InformationLevel, LevelKey, ParentLevelKey, GlCode,
       COALESCE(Warehouse, Dimension1), Description, InvOpenBalance, InvCloseBalance,
       GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
FROM dbo.Syspro_DtrInvBalances
UNION ALL
SELECT N'ASS', N'Assets', SnapshotDate, InstanceName, CompanyDb, CustomerCode,
       GlYear, GlPeriod, InformationLevel, LevelKey, ParentLevelKey, GlCode, Dimension1, Description,
       SubOpenBalance, SubCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
FROM dbo.Syspro_DtrAssBalances
UNION ALL
SELECT N'CB', N'Cashbook', SnapshotDate, InstanceName, CompanyDb, CustomerCode,
       GlYear, GlPeriod, InformationLevel, LevelKey, ParentLevelKey, GlCode, Dimension1, Description,
       SubOpenBalance, SubCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
FROM dbo.Syspro_DtrCbBalances
UNION ALL
SELECT N'DN', N'Dispatch Notes', SnapshotDate, InstanceName, CompanyDb, CustomerCode,
       GlYear, GlPeriod, InformationLevel, LevelKey, ParentLevelKey, GlCode, Dimension1, Description,
       SubOpenBalance, SubCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
FROM dbo.Syspro_DtrDnBalances
UNION ALL
SELECT N'GIT', N'Goods In Transit', SnapshotDate, InstanceName, CompanyDb, CustomerCode,
       GlYear, GlPeriod, InformationLevel, LevelKey, ParentLevelKey, GlCode, Dimension1, Description,
       SubOpenBalance, SubCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
FROM dbo.Syspro_DtrGitBalances
UNION ALL
SELECT N'GRN', N'GRN Suspense', SnapshotDate, InstanceName, CompanyDb, CustomerCode,
       GlYear, GlPeriod, InformationLevel, LevelKey, ParentLevelKey, GlCode, Dimension1, Description,
       SubOpenBalance, SubCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
FROM dbo.Syspro_DtrGrnBalances
UNION ALL
SELECT N'WIP', N'Work In Progress', SnapshotDate, InstanceName, CompanyDb, CustomerCode,
       GlYear, GlPeriod, InformationLevel, LevelKey, ParentLevelKey, GlCode, Dimension1, Description,
       SubOpenBalance, SubCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
FROM dbo.Syspro_DtrWipBalances
UNION ALL
SELECT N'WPI', N'WIP Inspection', SnapshotDate, InstanceName, CompanyDb, CustomerCode,
       GlYear, GlPeriod, InformationLevel, LevelKey, ParentLevelKey, GlCode, Dimension1, Description,
       SubOpenBalance, SubCloseBalance, GlOpenBalance, GlCloseBalance, Variance, RefreshDate, ImportedAt
FROM dbo.Syspro_DtrWpiBalances;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_DtrVariance_Latest
AS
SELECT v.CustomerCode, v.SnapshotDate AS AsOfDate, v.BalanceTypeCode AS SourceArea, v.BalanceTypeName,
       v.InstanceName, v.CompanyDb, v.InformationLevel, v.LevelKey, v.GlCode, v.Dimension1,
       v.Description, v.Variance, v.SubCloseBalance, v.GlCloseBalance
FROM (
    SELECT d.*, MAX(d.SnapshotDate) OVER (PARTITION BY d.InstanceName, d.BalanceTypeCode) MaxSnap
    FROM dbo.vw_Datarapt_DtrBalances_All d
    WHERE d.Variance IS NOT NULL AND d.Variance <> 0 AND d.CustomerCode IS NOT NULL
) v
WHERE v.SnapshotDate = v.MaxSnap;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_Syspro_DtrVarianceCounts
AS
SELECT CustomerCode, AsOfDate, COUNT(*) VarianceLineCount,
    SUM(CASE WHEN SourceArea=N'AP' THEN 1 ELSE 0 END) ApVarianceLines,
    SUM(CASE WHEN SourceArea=N'AR' THEN 1 ELSE 0 END) ArVarianceLines,
    SUM(CASE WHEN SourceArea=N'INV' THEN 1 ELSE 0 END) InvVarianceLines,
    SUM(CASE WHEN SourceArea IN (N'ASS',N'CB',N'DN',N'GIT',N'GRN',N'WIP',N'WPI') THEN 1 ELSE 0 END) OtherDtrVarianceLines
FROM dbo.vw_Kpi_Syspro_DtrVariance_Latest
GROUP BY CustomerCode, AsOfDate;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_HealthRag_Proposed
AS
SELECT
    c.CustomerCode, c.DisplayName,
    (SELECT MAX(v) FROM (VALUES (pw.SnapshotDate),(cv.AsOfDate),(bd.SnapshotDate),(sq.AsOfDate),(je.AsOfDate),(dt.AsOfDate)) x(v)) AsOfDate,
    ISNULL(pw.OfflineCount,0) PulsewayOfflineCount,
    ISNULL(pw.CriticalAlerts,0) PulsewayCriticalAlerts,
    ISNULL(cv.FailedDeviceCount,0) CoveFailedDeviceCount,
    ISNULL(cv.RpoBreach24hCount,0) CoveRpoBreach24hCount,
    ISNULL(bd.InfectedCount,0) BdInfectedCount,
    ISNULL(bd.IncidentCount24h,0) BdIncidentCount24h,
    ISNULL(sq.FullBackupRpoBreachCount,0) SqlFullBackupRpoBreachCount,
    ISNULL(je.JobErrorCount,0) SysproJobErrorCount,
    ISNULL(dt.VarianceLineCount,0) SysproDtrVarianceLines,
    ISNULL(au.ActiveUserCount,0) ActiveUserCount,
    CASE
        WHEN ISNULL(cv.FailedDeviceCount,0)>=1 OR ISNULL(bd.InfectedCount,0)>=1
          OR ISNULL(pw.CriticalAlerts,0)>=5 OR ISNULL(sq.FullBackupRpoBreachCount,0)>=3
          OR ISNULL(dt.VarianceLineCount,0)>=5 THEN N'Red'
        WHEN ISNULL(cv.RpoBreach24hCount,0)>=1 OR ISNULL(pw.OfflineCount,0)>=1
          OR ISNULL(bd.IncidentCount24h,0)>=1 OR ISNULL(je.JobErrorCount,0)>=1
          OR ISNULL(sq.FullBackupRpoBreachCount,0)>=1 OR ISNULL(dt.VarianceLineCount,0)>=1
          OR ISNULL(pw.CriticalAlerts,0)>=1 THEN N'Amber'
        ELSE N'Green'
    END HealthRagProposed,
    CONCAT(N'Offline=',ISNULL(pw.OfflineCount,0),N' CoveFail=',ISNULL(cv.FailedDeviceCount,0),
           N' BDInfected=',ISNULL(bd.InfectedCount,0),N' JobErr=',ISNULL(je.JobErrorCount,0),
           N' DTR=',ISNULL(dt.VarianceLineCount,0)) HealthSummaryProposed
FROM dbo.vw_Dim_Customer_Active c
LEFT JOIN dbo.vw_Kpi_Pulseway_OrgSummary_Latest pw ON pw.CustomerCode=c.CustomerCode
LEFT JOIN dbo.vw_Kpi_Cove_Summary cv ON cv.CustomerCode=c.CustomerCode
LEFT JOIN dbo.vw_Kpi_Bitdefender_CompanyLatest bd ON bd.CustomerCode=c.CustomerCode
LEFT JOIN dbo.vw_Kpi_Sql_BackupSummary sq ON sq.CustomerCode=c.CustomerCode
LEFT JOIN dbo.vw_Kpi_Syspro_JobErrorCounts je ON je.CustomerCode=c.CustomerCode
LEFT JOIN dbo.vw_Kpi_Syspro_DtrVarianceCounts dt ON dt.CustomerCode=c.CustomerCode
LEFT JOIN dbo.vw_Kpi_ActiveUsers au ON au.CustomerCode=c.CustomerCode
WHERE c.AmsEnabled=1 OR c.AmsEnabled IS NULL;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_PortfolioDashboard
AS
SELECT h.*,
    CAST(NULL AS decimal(6,1)) AvailabilityPct,
    CAST(NULL AS decimal(6,1)) SlaCompliancePct,
    CAST(NULL AS int) IncidentCountTotal,
    CAST(NULL AS int) IncidentCountCritical,
    CAST(NULL AS int) OpenProblemCount,
    CAST(NULL AS decimal(6,1)) ChangeSuccessPct,
    CAST(NULL AS decimal(5,2)) CsatScore,
    CAST(NULL AS int) OpenVendorCaseCount
FROM dbo.vw_Kpi_HealthRag_Proposed h;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_IncidentCounts_Period
AS
SELECT CustomerCode,
    COUNT(*) IncidentCountTotal,
    SUM(CASE WHEN Severity=N'Critical' THEN 1 ELSE 0 END) IncidentCountCritical
FROM dbo.Fact_Incident
WHERE Status<>N'Cancelled'
  AND OpenedAt >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
  AND OpenedAt < DATEADD(MONTH,1,DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
GROUP BY CustomerCode;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_OpenProblems
AS
SELECT CustomerCode, COUNT(*) OpenProblemCount
FROM dbo.Fact_Problem
WHERE Status IN (N'Open',N'Investigating',N'RootCauseIdentified')
GROUP BY CustomerCode;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_ChangeSuccess_Period
AS
SELECT CustomerCode, COUNT(*) ChangeCount,
    CASE WHEN COUNT(*)=0 THEN NULL
         ELSE CAST(100.0*SUM(CASE WHEN Outcome=N'Succeeded' THEN 1 ELSE 0 END)/COUNT(*) AS decimal(6,1)) END ChangeSuccessPct
FROM dbo.Fact_Change
WHERE Outcome IN (N'Succeeded',N'Failed',N'RolledBack')
  AND CompletedAt >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
  AND CompletedAt < DATEADD(MONTH,1,DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
GROUP BY CustomerCode;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_OpenVendorCases
AS
SELECT CustomerCode, COUNT(*) OpenVendorCaseCount
FROM dbo.Fact_VendorCase
WHERE Status IN (N'Open',N'PendingVendor',N'PendingCustomer',N'InProgress')
GROUP BY CustomerCode;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_ExecutiveDashboard
AS
SELECT p.CustomerCode, p.DisplayName, p.AsOfDate,
    COALESCE(ds.HealthRag, p.HealthRagProposed) HealthRag,
    COALESCE(ds.HealthSummary, p.HealthSummaryProposed) HealthSummary,
    ds.AvailabilityPct, ds.SlaCompliancePct,
    COALESCE(ds.IncidentCountTotal, ic.IncidentCountTotal) IncidentCountTotal,
    COALESCE(ds.IncidentCountCritical, ic.IncidentCountCritical) IncidentCountCritical,
    COALESCE(ds.OpenProblemCount, op.OpenProblemCount) OpenProblemCount,
    COALESCE(ds.ChangeSuccessPct, ch.ChangeSuccessPct) ChangeSuccessPct,
    COALESCE(ds.ActiveUserCount, p.ActiveUserCount) ActiveUserCount,
    COALESCE(ds.CsatScore, cs.Score) CsatScore,
    COALESCE(ds.OpenVendorCaseCount, vc.OpenVendorCaseCount) OpenVendorCaseCount,
    p.CoveFailedDeviceCount, p.PulsewayOfflineCount, p.BdInfectedCount, p.SysproJobErrorCount, p.SysproDtrVarianceLines
FROM dbo.vw_Kpi_PortfolioDashboard p
LEFT JOIN dbo.vw_Kpi_IncidentCounts_Period ic ON ic.CustomerCode=p.CustomerCode
LEFT JOIN dbo.vw_Kpi_OpenProblems op ON op.CustomerCode=p.CustomerCode
LEFT JOIN dbo.vw_Kpi_ChangeSuccess_Period ch ON ch.CustomerCode=p.CustomerCode
LEFT JOIN dbo.vw_Kpi_OpenVendorCases vc ON vc.CustomerCode=p.CustomerCode
OUTER APPLY (SELECT TOP 1 Score FROM dbo.Fact_Csat s WHERE s.CustomerCode=p.CustomerCode ORDER BY PeriodTo DESC) cs
OUTER APPLY (SELECT TOP 1 * FROM dbo.Fact_DashboardSnapshot d WHERE d.CustomerCode=p.CustomerCode ORDER BY PeriodTo DESC) ds;
GO

/* Seed platform admin placeholder */
IF NOT EXISTS (SELECT 1 FROM dbo.App_User WHERE UserName=N'administrator')
INSERT dbo.App_User (UserName, Email, DisplayName, PasswordHash, IsPlatformAdmin, IsActive)
VALUES (N'administrator', N'administrator@rpm.local', N'Administrator', N'REPLACE_WITH_HASH', 1, 1);
GO

PRINT '================================================';
PRINT 'RPMAssure_App deploy complete.';
PRINT 'Next: 101_Smoke, then optional 102_CopyFrom_RPMAssure.';
PRINT '================================================';
GO
