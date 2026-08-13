/*
================================================================================
  RPM Assure — Core schema v1
  Database : [RPMAssure]
  Product  : RPM Assure (RPMA)
  Tagline  : Data → Decision → Assured
================================================================================
  Conventions (frozen):
  - Multitenant entity : Customer (NOT Tenant)
  - PKs                : uniqueidentifier (GUID)
  - Customer codes     : CUS-00001
  - Timestamps         : SAST (UTC+2), columns *Sast (datetime2(3))
  - Soft delete        : Customer (IsDeleted, DeletedSast, DeletedByAppUserId)
  - SYSPRO v1          : OUT OF SCOPE
  - Customer portal v1 : OUT OF SCOPE
  - Forbidden          : Domain*, TenantId for customers, cross-customer migration
  - Sources            : Rmm, Epp, Cove, PartnerCenter, Graph, Manual
  - Roles              : PlatformAdmin (platform) | Operator | ExCo | TechnicalReadOnly
  - Auth v1            : Local first; EntraObjectId reserved for later
  - CSP                : Indirect
  - EPP vendor         : Bitdefender (UI: RPM End Point Protection)
  - Backup UI          : RPM Cloud Backup (code: Cove)
  - Display time UI    : 20:30 PM (format at app layer; store raw datetime2)
================================================================================
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_ID(N'RPMAssure') IS NULL
BEGIN
    CREATE DATABASE [RPMAssure];
END
GO

USE [RPMAssure];
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'stg')
    EXEC(N'CREATE SCHEMA stg');
GO

/* -------------------------------------------------------------------------- */
/*  Helper: SAST "now" — South Africa is permanently UTC+2 (no DST)           */
/* -------------------------------------------------------------------------- */
CREATE OR ALTER FUNCTION dbo.fn_SastNow()
RETURNS datetime2(3)
AS
BEGIN
    RETURN CAST(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'South Africa Standard Time' AS datetime2(3));
END
GO

/* ========================================================================== */
/*  APP USER (local auth first; Entra later)                                   */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.AppUser', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AppUser
    (
        AppUserId           uniqueidentifier NOT NULL
            CONSTRAINT DF_AppUser_AppUserId DEFAULT (NEWSEQUENTIALID()),
        UserName            nvarchar(100)    NOT NULL,
        Email               nvarchar(256)    NOT NULL,
        DisplayName         nvarchar(200)    NOT NULL,
        PasswordHash        nvarchar(500)    NULL,          -- local auth; null when Entra-only later
        IsPlatformAdmin     bit              NOT NULL
            CONSTRAINT DF_AppUser_IsPlatformAdmin DEFAULT (0),
        IsActive            bit              NOT NULL
            CONSTRAINT DF_AppUser_IsActive DEFAULT (1),
        EntraObjectId       nvarchar(64)     NULL,          -- reserved for Entra link
        LastLoginSast       datetime2(3)     NULL,
        CreatedSast         datetime2(3)     NOT NULL
            CONSTRAINT DF_AppUser_CreatedSast DEFAULT (dbo.fn_SastNow()),
        ModifiedSast        datetime2(3)     NOT NULL
            CONSTRAINT DF_AppUser_ModifiedSast DEFAULT (dbo.fn_SastNow()),
        CONSTRAINT PK_AppUser PRIMARY KEY CLUSTERED (AppUserId),
        CONSTRAINT UX_AppUser_UserName UNIQUE (UserName),
        CONSTRAINT UX_AppUser_Email UNIQUE (Email)
    );
END
GO

/* ========================================================================== */
/*  CUSTOMER                                                                   */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Customer', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Customer
    (
        CustomerId          uniqueidentifier NOT NULL
            CONSTRAINT DF_Customer_CustomerId DEFAULT (NEWSEQUENTIALID()),
        CustomerCode        nvarchar(16)     NOT NULL,      -- CUS-00001
        Name                nvarchar(200)    NOT NULL,
        Status              nvarchar(20)     NOT NULL,      -- Active | Suspended | Closed
        TimeZoneId          nvarchar(100)    NOT NULL
            CONSTRAINT DF_Customer_TimeZoneId DEFAULT (N'South Africa Standard Time'),
        Notes               nvarchar(max)    NULL,
        IsDeleted           bit              NOT NULL
            CONSTRAINT DF_Customer_IsDeleted DEFAULT (0),
        DeletedSast         datetime2(3)     NULL,
        DeletedByAppUserId  uniqueidentifier NULL,
        CreatedSast         datetime2(3)     NOT NULL
            CONSTRAINT DF_Customer_CreatedSast DEFAULT (dbo.fn_SastNow()),
        ModifiedSast        datetime2(3)     NOT NULL
            CONSTRAINT DF_Customer_ModifiedSast DEFAULT (dbo.fn_SastNow()),
        CreatedByAppUserId  uniqueidentifier NULL,
        CONSTRAINT PK_Customer PRIMARY KEY CLUSTERED (CustomerId),
        CONSTRAINT UX_Customer_CustomerCode UNIQUE (CustomerCode),
        CONSTRAINT CK_Customer_Status CHECK (Status IN (N'Active', N'Suspended', N'Closed')),
        CONSTRAINT CK_Customer_CustomerCode CHECK (CustomerCode LIKE N'CUS-[0-9][0-9][0-9][0-9][0-9]'),
        CONSTRAINT FK_Customer_DeletedByAppUser
            FOREIGN KEY (DeletedByAppUserId) REFERENCES dbo.AppUser (AppUserId),
        CONSTRAINT FK_Customer_CreatedByAppUser
            FOREIGN KEY (CreatedByAppUserId) REFERENCES dbo.AppUser (AppUserId)
    );

    CREATE INDEX IX_Customer_Name
        ON dbo.Customer (Name)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_Customer_Status
        ON dbo.Customer (Status)
        WHERE IsDeleted = 0;
END
GO

/* ========================================================================== */
/*  USER ↔ CUSTOMER ACCESS (scoped roles)                                      */
/*  PlatformAdmin is NOT stored here — use AppUser.IsPlatformAdmin             */
/*  Role: Operator | ExCo | TechnicalReadOnly                                  */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.UserCustomerAccess', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserCustomerAccess
    (
        UserCustomerAccessId uniqueidentifier NOT NULL
            CONSTRAINT DF_UserCustomerAccess_Id DEFAULT (NEWSEQUENTIALID()),
        AppUserId            uniqueidentifier NOT NULL,
        CustomerId           uniqueidentifier NOT NULL,
        Role                 nvarchar(30)     NOT NULL,
        CreatedSast          datetime2(3)     NOT NULL
            CONSTRAINT DF_UserCustomerAccess_CreatedSast DEFAULT (dbo.fn_SastNow()),
        CONSTRAINT PK_UserCustomerAccess PRIMARY KEY CLUSTERED (UserCustomerAccessId),
        CONSTRAINT UX_UserCustomerAccess_User_Customer UNIQUE (AppUserId, CustomerId),
        CONSTRAINT CK_UserCustomerAccess_Role CHECK (Role IN (
            N'Operator', N'ExCo', N'TechnicalReadOnly')),
        CONSTRAINT FK_UserCustomerAccess_AppUser
            FOREIGN KEY (AppUserId) REFERENCES dbo.AppUser (AppUserId),
        CONSTRAINT FK_UserCustomerAccess_Customer
            FOREIGN KEY (CustomerId) REFERENCES dbo.Customer (CustomerId)
    );

    CREATE INDEX IX_UserCustomerAccess_CustomerId
        ON dbo.UserCustomerAccess (CustomerId);
END
GO

/* ========================================================================== */
/*  CUSTOMER EXTERNAL IDS (vendor keys; no domains)                            */
/*  Source: Rmm | Epp | Cove | PartnerCenter | Graph | Manual                  */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.CustomerExternalId', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CustomerExternalId
    (
        CustomerExternalIdId uniqueidentifier NOT NULL
            CONSTRAINT DF_CustomerExternalId_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerId           uniqueidentifier NOT NULL,
        Source               nvarchar(30)     NOT NULL,
        ExternalId           nvarchar(200)    NOT NULL,
        Label                nvarchar(200)    NULL,
        IsPrimary            bit              NOT NULL
            CONSTRAINT DF_CustomerExternalId_IsPrimary DEFAULT (1),
        CreatedSast          datetime2(3)     NOT NULL
            CONSTRAINT DF_CustomerExternalId_CreatedSast DEFAULT (dbo.fn_SastNow()),
        CONSTRAINT PK_CustomerExternalId PRIMARY KEY CLUSTERED (CustomerExternalIdId),
        CONSTRAINT UX_CustomerExternalId_Source_External
            UNIQUE (Source, ExternalId),
        CONSTRAINT CK_CustomerExternalId_Source CHECK (Source IN (
            N'Rmm', N'Epp', N'Cove', N'PartnerCenter', N'Graph', N'Manual')),
        CONSTRAINT FK_CustomerExternalId_Customer
            FOREIGN KEY (CustomerId) REFERENCES dbo.Customer (CustomerId)
    );

    CREATE INDEX IX_CustomerExternalId_CustomerId
        ON dbo.CustomerExternalId (CustomerId);
END
GO

/* ========================================================================== */
/*  CONNECTION (per customer + source credentials reference)                   */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Connection', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Connection
    (
        ConnectionId        uniqueidentifier NOT NULL
            CONSTRAINT DF_Connection_ConnectionId DEFAULT (NEWSEQUENTIALID()),
        CustomerId          uniqueidentifier NOT NULL,
        Source              nvarchar(30)     NOT NULL,
        DisplayName         nvarchar(200)    NOT NULL,
        Status              nvarchar(30)     NOT NULL,      -- Connected | Error | Disabled | NeverConnected
        SecretRef           nvarchar(500)    NULL,          -- vault/config ref; NOT the secret
        SettingsJson        nvarchar(max)    NULL,          -- non-secret settings only
        Watermark           nvarchar(500)    NULL,
        LastSuccessSast     datetime2(3)     NULL,
        LastErrorSast       datetime2(3)     NULL,
        LastError           nvarchar(2000)   NULL,
        CreatedSast         datetime2(3)     NOT NULL
            CONSTRAINT DF_Connection_CreatedSast DEFAULT (dbo.fn_SastNow()),
        ModifiedSast        datetime2(3)     NOT NULL
            CONSTRAINT DF_Connection_ModifiedSast DEFAULT (dbo.fn_SastNow()),
        CONSTRAINT PK_Connection PRIMARY KEY CLUSTERED (ConnectionId),
        CONSTRAINT UX_Connection_Customer_Source UNIQUE (CustomerId, Source),
        CONSTRAINT CK_Connection_Source CHECK (Source IN (
            N'Rmm', N'Epp', N'Cove', N'PartnerCenter', N'Graph', N'Manual')),
        CONSTRAINT CK_Connection_Status CHECK (Status IN (
            N'Connected', N'Error', N'Disabled', N'NeverConnected')),
        CONSTRAINT FK_Connection_Customer
            FOREIGN KEY (CustomerId) REFERENCES dbo.Customer (CustomerId)
    );

    CREATE INDEX IX_Connection_CustomerId_Status
        ON dbo.Connection (CustomerId, Status);
END
GO

/* ========================================================================== */
/*  DEVICE                                                                     */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Device', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Device
    (
        DeviceId            uniqueidentifier NOT NULL
            CONSTRAINT DF_Device_DeviceId DEFAULT (NEWSEQUENTIALID()),
        CustomerId          uniqueidentifier NOT NULL,
        Source              nvarchar(30)     NOT NULL
            CONSTRAINT DF_Device_Source DEFAULT (N'Rmm'),
        ExternalDeviceId    nvarchar(200)    NULL,
        Hostname            nvarchar(200)    NOT NULL,
        DeviceType          nvarchar(30)     NULL,          -- Server | Workstation | Other
        OperatingSystem     nvarchar(200)    NULL,
        SerialNumber        nvarchar(100)    NULL,
        IsOnline            bit              NULL,
        LastSeenSast        datetime2(3)     NULL,
        AgentVersion        nvarchar(50)     NULL,
        PatchStatus         nvarchar(50)     NULL,
        EppStatus           nvarchar(50)     NULL,          -- Healthy | Degraded | Unprotected | Unknown
        HasBackup           bit              NULL,
        CreatedSast         datetime2(3)     NOT NULL
            CONSTRAINT DF_Device_CreatedSast DEFAULT (dbo.fn_SastNow()),
        ModifiedSast        datetime2(3)     NOT NULL
            CONSTRAINT DF_Device_ModifiedSast DEFAULT (dbo.fn_SastNow()),
        CONSTRAINT PK_Device PRIMARY KEY CLUSTERED (DeviceId),
        CONSTRAINT FK_Device_Customer
            FOREIGN KEY (CustomerId) REFERENCES dbo.Customer (CustomerId),
        CONSTRAINT CK_Device_Source CHECK (Source IN (
            N'Rmm', N'Epp', N'Cove', N'PartnerCenter', N'Graph', N'Manual'))
    );

    CREATE INDEX IX_Device_CustomerId_Hostname
        ON dbo.Device (CustomerId, Hostname);

    CREATE INDEX IX_Device_CustomerId_LastSeenSast
        ON dbo.Device (CustomerId, LastSeenSast);

    CREATE UNIQUE INDEX UX_Device_Customer_External
        ON dbo.Device (CustomerId, Source, ExternalDeviceId)
        WHERE ExternalDeviceId IS NOT NULL;
END
GO

/* ========================================================================== */
/*  BACKUP JOB (RPM Cloud Backup / Cove)                                       */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.BackupJob', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BackupJob
    (
        BackupJobId         uniqueidentifier NOT NULL
            CONSTRAINT DF_BackupJob_BackupJobId DEFAULT (NEWSEQUENTIALID()),
        CustomerId          uniqueidentifier NOT NULL,
        DeviceId            uniqueidentifier NULL,
        ExternalJobId       nvarchar(200)    NULL,
        DeviceName          nvarchar(200)    NULL,
        Result              nvarchar(20)     NOT NULL,      -- Succeeded | Failed | Missed | Warning | Running
        StartedSast         datetime2(3)     NULL,
        EndedSast           datetime2(3)     NULL,
        BytesTransferred    bigint           NULL,
        ErrorMessage        nvarchar(2000)   NULL,
        CreatedSast         datetime2(3)     NOT NULL
            CONSTRAINT DF_BackupJob_CreatedSast DEFAULT (dbo.fn_SastNow()),
        CONSTRAINT PK_BackupJob PRIMARY KEY CLUSTERED (BackupJobId),
        CONSTRAINT CK_BackupJob_Result CHECK (Result IN (
            N'Succeeded', N'Failed', N'Missed', N'Warning', N'Running')),
        CONSTRAINT FK_BackupJob_Customer
            FOREIGN KEY (CustomerId) REFERENCES dbo.Customer (CustomerId),
        CONSTRAINT FK_BackupJob_Device
            FOREIGN KEY (DeviceId) REFERENCES dbo.Device (DeviceId)
    );

    CREATE INDEX IX_BackupJob_CustomerId_StartedSast
        ON dbo.BackupJob (CustomerId, StartedSast DESC);

    CREATE INDEX IX_BackupJob_CustomerId_Result
        ON dbo.BackupJob (CustomerId, Result);
END
GO

/* ========================================================================== */
/*  SUBSCRIPTION (RPM Microsoft CSP — indirect)                                */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Subscription', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Subscription
    (
        SubscriptionId      uniqueidentifier NOT NULL
            CONSTRAINT DF_Subscription_SubscriptionId DEFAULT (NEWSEQUENTIALID()),
        CustomerId          uniqueidentifier NOT NULL,
        ExternalSubscriptionId nvarchar(100) NULL,
        SkuId               nvarchar(100)    NULL,
        SkuName             nvarchar(200)    NOT NULL,
        Quantity            int              NOT NULL
            CONSTRAINT DF_Subscription_Quantity DEFAULT (0),
        Status              nvarchar(50)     NULL,
        Term                nvarchar(50)     NULL,
        AutoRenew           bit              NULL,
        CreatedSast         datetime2(3)     NOT NULL
            CONSTRAINT DF_Subscription_CreatedSast DEFAULT (dbo.fn_SastNow()),
        ModifiedSast        datetime2(3)     NOT NULL
            CONSTRAINT DF_Subscription_ModifiedSast DEFAULT (dbo.fn_SastNow()),
        CONSTRAINT PK_Subscription PRIMARY KEY CLUSTERED (SubscriptionId),
        CONSTRAINT FK_Subscription_Customer
            FOREIGN KEY (CustomerId) REFERENCES dbo.Customer (CustomerId)
    );

    CREATE INDEX IX_Subscription_CustomerId
        ON dbo.Subscription (CustomerId);
END
GO

/* ========================================================================== */
/*  CLOUD USER + LICENSE ASSIGNMENT (Microsoft 365)                            */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.CloudUser', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CloudUser
    (
        CloudUserId         uniqueidentifier NOT NULL
            CONSTRAINT DF_CloudUser_CloudUserId DEFAULT (NEWSEQUENTIALID()),
        CustomerId          uniqueidentifier NOT NULL,
        ExternalUserId      nvarchar(100)    NULL,
        UserPrincipalName   nvarchar(256)    NOT NULL,
        DisplayName         nvarchar(200)    NULL,
        IsEnabled           bit              NULL,
        LastSignInSast      datetime2(3)     NULL,
        CreatedSast         datetime2(3)     NOT NULL
            CONSTRAINT DF_CloudUser_CreatedSast DEFAULT (dbo.fn_SastNow()),
        ModifiedSast        datetime2(3)     NOT NULL
            CONSTRAINT DF_CloudUser_ModifiedSast DEFAULT (dbo.fn_SastNow()),
        CONSTRAINT PK_CloudUser PRIMARY KEY CLUSTERED (CloudUserId),
        CONSTRAINT FK_CloudUser_Customer
            FOREIGN KEY (CustomerId) REFERENCES dbo.Customer (CustomerId)
    );

    CREATE INDEX IX_CloudUser_CustomerId_Upn
        ON dbo.CloudUser (CustomerId, UserPrincipalName);

    CREATE UNIQUE INDEX UX_CloudUser_Customer_External
        ON dbo.CloudUser (CustomerId, ExternalUserId)
        WHERE ExternalUserId IS NOT NULL;
END
GO

IF OBJECT_ID(N'dbo.LicenseAssignment', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LicenseAssignment
    (
        LicenseAssignmentId uniqueidentifier NOT NULL
            CONSTRAINT DF_LicenseAssignment_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerId          uniqueidentifier NOT NULL,
        CloudUserId         uniqueidentifier NOT NULL,
        SkuId               nvarchar(100)    NULL,
        SkuName             nvarchar(200)    NOT NULL,
        CreatedSast         datetime2(3)     NOT NULL
            CONSTRAINT DF_LicenseAssignment_CreatedSast DEFAULT (dbo.fn_SastNow()),
        CONSTRAINT PK_LicenseAssignment PRIMARY KEY CLUSTERED (LicenseAssignmentId),
        CONSTRAINT FK_LicenseAssignment_Customer
            FOREIGN KEY (CustomerId) REFERENCES dbo.Customer (CustomerId),
        CONSTRAINT FK_LicenseAssignment_CloudUser
            FOREIGN KEY (CloudUserId) REFERENCES dbo.CloudUser (CloudUserId)
    );

    CREATE INDEX IX_LicenseAssignment_CustomerId
        ON dbo.LicenseAssignment (CustomerId);

    CREATE INDEX IX_LicenseAssignment_CloudUserId
        ON dbo.LicenseAssignment (CloudUserId);
END
GO

/* ========================================================================== */
/*  EXCEPTION (AMS inbox — portfolio + per customer)                           */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Exception', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Exception
    (
        ExceptionId         uniqueidentifier NOT NULL
            CONSTRAINT DF_Exception_ExceptionId DEFAULT (NEWSEQUENTIALID()),
        CustomerId          uniqueidentifier NOT NULL,
        Source              nvarchar(30)     NOT NULL,
        Category            nvarchar(50)     NULL,          -- Backup | Patch | License | Device | Security | Other
        Severity            nvarchar(20)     NOT NULL,      -- Critical | High | Medium | Low | Info
        Status              nvarchar(20)     NOT NULL,      -- Open | Acknowledged | Resolved | Suppressed
        Title               nvarchar(300)    NOT NULL,
        Detail              nvarchar(max)    NULL,
        EntityType          nvarchar(50)     NULL,          -- Device | BackupJob | CloudUser | ...
        EntityId            uniqueidentifier NULL,
        Fingerprint         nvarchar(128)    NOT NULL,      -- dedupe key
        OpenedSast          datetime2(3)     NOT NULL
            CONSTRAINT DF_Exception_OpenedSast DEFAULT (dbo.fn_SastNow()),
        AcknowledgedSast    datetime2(3)     NULL,
        ResolvedSast        datetime2(3)     NULL,
        AcknowledgedByAppUserId uniqueidentifier NULL,
        ResolvedByAppUserId uniqueidentifier NULL,
        CreatedSast         datetime2(3)     NOT NULL
            CONSTRAINT DF_Exception_CreatedSast DEFAULT (dbo.fn_SastNow()),
        ModifiedSast        datetime2(3)     NOT NULL
            CONSTRAINT DF_Exception_ModifiedSast DEFAULT (dbo.fn_SastNow()),
        CONSTRAINT PK_Exception PRIMARY KEY CLUSTERED (ExceptionId),
        CONSTRAINT CK_Exception_Source CHECK (Source IN (
            N'Rmm', N'Epp', N'Cove', N'PartnerCenter', N'Graph', N'Manual')),
        CONSTRAINT CK_Exception_Severity CHECK (Severity IN (
            N'Critical', N'High', N'Medium', N'Low', N'Info')),
        CONSTRAINT CK_Exception_Status CHECK (Status IN (
            N'Open', N'Acknowledged', N'Resolved', N'Suppressed')),
        CONSTRAINT FK_Exception_Customer
            FOREIGN KEY (CustomerId) REFERENCES dbo.Customer (CustomerId),
        CONSTRAINT FK_Exception_AcknowledgedBy
            FOREIGN KEY (AcknowledgedByAppUserId) REFERENCES dbo.AppUser (AppUserId),
        CONSTRAINT FK_Exception_ResolvedBy
            FOREIGN KEY (ResolvedByAppUserId) REFERENCES dbo.AppUser (AppUserId)
    );

    CREATE INDEX IX_Exception_CustomerId_Status_Severity
        ON dbo.Exception (CustomerId, Status, Severity);

    CREATE INDEX IX_Exception_Status_OpenedSast
        ON dbo.Exception (Status, OpenedSast DESC);

    /* One open/ack exception per fingerprint per customer */
    CREATE UNIQUE INDEX UX_Exception_Customer_Fingerprint_Open
        ON dbo.Exception (CustomerId, Fingerprint)
        WHERE Status IN (N'Open', N'Acknowledged');
END
GO

/* ========================================================================== */
/*  REPORT DEFINITION + RUN                                                    */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.ReportDefinition', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReportDefinition
    (
        ReportDefinitionId  uniqueidentifier NOT NULL
            CONSTRAINT DF_ReportDefinition_Id DEFAULT (NEWSEQUENTIALID()),
        ReportCode          nvarchar(100)    NOT NULL,      -- Area.Name e.g. Backup.FailedJobs
        Name                nvarchar(200)    NOT NULL,
        Scope               nvarchar(20)     NOT NULL,      -- Customer | Portfolio
        Area                nvarchar(50)     NOT NULL,      -- Portfolio | Device | Backup | Security | License | Customer
        Description         nvarchar(500)    NULL,
        IsActive            bit              NOT NULL
            CONSTRAINT DF_ReportDefinition_IsActive DEFAULT (1),
        CreatedSast         datetime2(3)     NOT NULL
            CONSTRAINT DF_ReportDefinition_CreatedSast DEFAULT (dbo.fn_SastNow()),
        CONSTRAINT PK_ReportDefinition PRIMARY KEY CLUSTERED (ReportDefinitionId),
        CONSTRAINT UX_ReportDefinition_ReportCode UNIQUE (ReportCode),
        CONSTRAINT CK_ReportDefinition_Scope CHECK (Scope IN (N'Customer', N'Portfolio'))
    );
END
GO

IF OBJECT_ID(N'dbo.ReportRun', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReportRun
    (
        ReportRunId         uniqueidentifier NOT NULL
            CONSTRAINT DF_ReportRun_ReportRunId DEFAULT (NEWSEQUENTIALID()),
        ReportDefinitionId  uniqueidentifier NOT NULL,
        CustomerId          uniqueidentifier NULL,          -- null = portfolio
        RequestedByAppUserId uniqueidentifier NULL,
        Status              nvarchar(20)     NOT NULL,      -- Pending | Running | Succeeded | Failed
        Format              nvarchar(10)     NOT NULL,      -- Pdf | Excel
        FileName            nvarchar(300)    NULL,
        ErrorMessage        nvarchar(2000)   NULL,
        StartedSast         datetime2(3)     NULL,
        CompletedSast       datetime2(3)     NULL,
        CreatedSast         datetime2(3)     NOT NULL
            CONSTRAINT DF_ReportRun_CreatedSast DEFAULT (dbo.fn_SastNow()),
        CONSTRAINT PK_ReportRun PRIMARY KEY CLUSTERED (ReportRunId),
        CONSTRAINT CK_ReportRun_Status CHECK (Status IN (
            N'Pending', N'Running', N'Succeeded', N'Failed')),
        CONSTRAINT CK_ReportRun_Format CHECK (Format IN (N'Pdf', N'Excel')),
        CONSTRAINT FK_ReportRun_ReportDefinition
            FOREIGN KEY (ReportDefinitionId) REFERENCES dbo.ReportDefinition (ReportDefinitionId),
        CONSTRAINT FK_ReportRun_Customer
            FOREIGN KEY (CustomerId) REFERENCES dbo.Customer (CustomerId),
        CONSTRAINT FK_ReportRun_AppUser
            FOREIGN KEY (RequestedByAppUserId) REFERENCES dbo.AppUser (AppUserId)
    );

    CREATE INDEX IX_ReportRun_CustomerId_CreatedSast
        ON dbo.ReportRun (CustomerId, CreatedSast DESC);
END
GO

/* ========================================================================== */
/*  AUDIT EVENT                                                                */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.AuditEvent', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditEvent
    (
        AuditEventId        uniqueidentifier NOT NULL
            CONSTRAINT DF_AuditEvent_AuditEventId DEFAULT (NEWSEQUENTIALID()),
        CustomerId          uniqueidentifier NULL,          -- null = platform-level
        AppUserId           uniqueidentifier NULL,
        Action              nvarchar(100)    NOT NULL,      -- Login, Export, ConnectionUpdate, ...
        EntityType          nvarchar(50)     NULL,
        EntityId            uniqueidentifier NULL,
        DetailJson          nvarchar(max)    NULL,
        CreatedSast         datetime2(3)     NOT NULL
            CONSTRAINT DF_AuditEvent_CreatedSast DEFAULT (dbo.fn_SastNow()),
        CONSTRAINT PK_AuditEvent PRIMARY KEY CLUSTERED (AuditEventId),
        CONSTRAINT FK_AuditEvent_Customer
            FOREIGN KEY (CustomerId) REFERENCES dbo.Customer (CustomerId),
        CONSTRAINT FK_AuditEvent_AppUser
            FOREIGN KEY (AppUserId) REFERENCES dbo.AppUser (AppUserId)
    );

    CREATE INDEX IX_AuditEvent_CustomerId_CreatedSast
        ON dbo.AuditEvent (CustomerId, CreatedSast DESC);

    CREATE INDEX IX_AuditEvent_AppUserId_CreatedSast
        ON dbo.AuditEvent (AppUserId, CreatedSast DESC);
END
GO

/* ========================================================================== */
/*  STAGING (raw vendor pulls — optional empty shells)                         */
/* ========================================================================== */
IF OBJECT_ID(N'stg.IngestBatch', N'U') IS NULL
BEGIN
    CREATE TABLE stg.IngestBatch
    (
        IngestBatchId       uniqueidentifier NOT NULL
            CONSTRAINT DF_stg_IngestBatch_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerId          uniqueidentifier NOT NULL,
        Source              nvarchar(30)     NOT NULL,
        ConnectionId        uniqueidentifier NULL,
        StartedSast         datetime2(3)     NOT NULL
            CONSTRAINT DF_stg_IngestBatch_StartedSast DEFAULT (dbo.fn_SastNow()),
        CompletedSast       datetime2(3)     NULL,
        Status              nvarchar(20)     NOT NULL,
        RowCount            int              NULL,
        ErrorMessage        nvarchar(2000)   NULL,
        CONSTRAINT PK_stg_IngestBatch PRIMARY KEY CLUSTERED (IngestBatchId)
    );
END
GO

PRINT N'RPM Assure schema v1 created successfully.';
GO
