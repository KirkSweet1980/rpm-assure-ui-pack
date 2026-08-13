/*
================================================================================
  RPM Assure — Fact add-on for Executive Dashboard / Summary (KPI Set v1)
  Database : RPMAssure  |  Server : RPMWINRM\RPMREPORTS
================================================================================
  Keeps existing Dim_Customer + snapshots.
  Tenant key : CustomerCode (nvarchar) — matches spine.
  New process tables only.
================================================================================
*/
USE [RPMAssure];
GO

SET NOCOUNT ON;
GO

/* Optional: SAST now if not present */
IF OBJECT_ID(N'dbo.fn_SastNow', N'FN') IS NULL
BEGIN
    EXEC(N'
    CREATE FUNCTION dbo.fn_SastNow()
    RETURNS datetime2(3)
    AS
    BEGIN
        RETURN CAST(SYSUTCDATETIME() AT TIME ZONE ''UTC'' AT TIME ZONE ''South Africa Standard Time'' AS datetime2(3));
    END
    ');
END
GO

/* ========================================================================== */
/*  App staff users (RPM Assure app — not SYSPRO operators)                    */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.App_User', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.App_User
    (
        AppUserId       uniqueidentifier NOT NULL
            CONSTRAINT DF_App_User_AppUserId DEFAULT (NEWSEQUENTIALID()),
        UserName        nvarchar(100)  NOT NULL,
        Email           nvarchar(256)  NOT NULL,
        DisplayName     nvarchar(200)  NOT NULL,
        PasswordHash    nvarchar(500)  NULL,
        IsPlatformAdmin bit            NOT NULL
            CONSTRAINT DF_App_User_IsPlatformAdmin DEFAULT (0),
        IsActive        bit            NOT NULL
            CONSTRAINT DF_App_User_IsActive DEFAULT (1),
        EntraObjectId   nvarchar(64)   NULL,
        CreatedAt       datetime2(3)   NOT NULL
            CONSTRAINT DF_App_User_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       datetime2(3)   NOT NULL
            CONSTRAINT DF_App_User_UpdatedAt DEFAULT (SYSUTCDATETIME()),
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
        AppUserCustomerId uniqueidentifier NOT NULL
            CONSTRAINT DF_App_UserCustomer_Id DEFAULT (NEWSEQUENTIALID()),
        AppUserId       uniqueidentifier NOT NULL,
        CustomerCode    nvarchar(50)     NOT NULL,
        Role            nvarchar(30)     NOT NULL,
        CreatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_App_UserCustomer_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_App_UserCustomer PRIMARY KEY CLUSTERED (AppUserCustomerId),
        CONSTRAINT UX_App_UserCustomer UNIQUE (AppUserId, CustomerCode),
        CONSTRAINT CK_App_UserCustomer_Role CHECK (Role IN (N'Operator', N'ExCo', N'TechnicalReadOnly')),
        CONSTRAINT FK_App_UserCustomer_User FOREIGN KEY (AppUserId) REFERENCES dbo.App_User (AppUserId),
        CONSTRAINT FK_App_UserCustomer_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
    CREATE INDEX IX_App_UserCustomer_CustomerCode ON dbo.App_UserCustomer (CustomerCode);
END
GO

/* ========================================================================== */
/*  SLA policy (per customer optional; NULL CustomerCode = default)           */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Dim_SlaPolicy', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Dim_SlaPolicy
    (
        SlaPolicyId     int            NOT NULL IDENTITY(1,1),
        CustomerCode    nvarchar(50)   NULL,
        Priority        nvarchar(20)   NOT NULL,
        RespondMins     int            NOT NULL,
        ResolveMins     int            NOT NULL,
        AvailabilityPct decimal(6, 3)  NULL,
        Active          bit            NOT NULL
            CONSTRAINT DF_Dim_SlaPolicy_Active DEFAULT (1),
        CONSTRAINT PK_Dim_SlaPolicy PRIMARY KEY CLUSTERED (SlaPolicyId),
        CONSTRAINT CK_Dim_SlaPolicy_Priority CHECK (Priority IN (N'Critical', N'High', N'Medium', N'Low'))
    );
END
GO

/* Seed default SLA if empty */
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_SlaPolicy)
BEGIN
    INSERT INTO dbo.Dim_SlaPolicy (CustomerCode, Priority, RespondMins, ResolveMins, AvailabilityPct)
    VALUES
        (NULL, N'Critical', 60,   240,  99.500),
        (NULL, N'High',     240,  480,  99.500),
        (NULL, N'Medium',   480,  1440, 99.500),
        (NULL, N'Low',      1440, 4320, 99.500);
END
GO

/* ========================================================================== */
/*  INCIDENT (AMS / ITSM — not Bitdefender)                                    */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Fact_Incident', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_Incident
    (
        IncidentId          uniqueidentifier NOT NULL
            CONSTRAINT DF_Fact_Incident_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerCode        nvarchar(50)     NOT NULL,
        Title               nvarchar(300)    NOT NULL,
        Severity            nvarchar(20)     NOT NULL,
        Status              nvarchar(30)     NOT NULL,
        Priority            nvarchar(20)     NULL,
        OpenedAt            datetime2(3)     NOT NULL,
        FirstResponseAt     datetime2(3)     NULL,
        ResolvedAt          datetime2(3)     NULL,
        ClosedAt            datetime2(3)     NULL,
        BusinessImpact      nvarchar(max)    NULL,
        ModuleCode          nvarchar(50)     NULL,
        ExternalRef         nvarchar(100)    NULL,
        IsMajor             bit              NOT NULL
            CONSTRAINT DF_Fact_Incident_IsMajor DEFAULT (0),
        ResponseSlaMet      bit              NULL,
        ResolveSlaMet       bit              NULL,
        CreatedAt           datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_Incident_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt           datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_Incident_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_Incident PRIMARY KEY CLUSTERED (IncidentId),
        CONSTRAINT CK_Fact_Incident_Severity CHECK (Severity IN (N'Critical', N'High', N'Medium', N'Low')),
        CONSTRAINT CK_Fact_Incident_Status CHECK (Status IN (N'New', N'InProgress', N'Resolved', N'Closed', N'Cancelled')),
        CONSTRAINT FK_Fact_Incident_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
    CREATE INDEX IX_Fact_Incident_Customer_Opened ON dbo.Fact_Incident (CustomerCode, OpenedAt DESC);
    CREATE INDEX IX_Fact_Incident_Customer_Status ON dbo.Fact_Incident (CustomerCode, Status);
END
GO

/* ========================================================================== */
/*  PROBLEM                                                                    */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Fact_Problem', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_Problem
    (
        ProblemId       uniqueidentifier NOT NULL
            CONSTRAINT DF_Fact_Problem_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerCode    nvarchar(50)     NOT NULL,
        Title           nvarchar(300)    NOT NULL,
        Severity        nvarchar(20)     NULL,
        Status          nvarchar(30)     NOT NULL,
        OwnerName       nvarchar(200)    NULL,
        OpenedAt        datetime2(3)     NOT NULL,
        ClosedAt        datetime2(3)     NULL,
        Summary         nvarchar(max)    NULL,
        CreatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_Problem_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_Problem_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_Problem PRIMARY KEY CLUSTERED (ProblemId),
        CONSTRAINT CK_Fact_Problem_Status CHECK (Status IN (
            N'Open', N'Investigating', N'RootCauseIdentified', N'Closed', N'Cancelled')),
        CONSTRAINT FK_Fact_Problem_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
    CREATE INDEX IX_Fact_Problem_Customer_Status ON dbo.Fact_Problem (CustomerCode, Status);
END
GO

/* ========================================================================== */
/*  CHANGE                                                                     */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Fact_Change', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_Change
    (
        ChangeId        uniqueidentifier NOT NULL
            CONSTRAINT DF_Fact_Change_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerCode    nvarchar(50)     NOT NULL,
        Title           nvarchar(300)    NOT NULL,
        Status          nvarchar(30)     NOT NULL,
        Outcome         nvarchar(20)     NULL,
        CompletedAt     datetime2(3)     NULL,
        ExternalRef     nvarchar(100)    NULL,
        Summary         nvarchar(max)    NULL,
        CreatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_Change_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_Change_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_Change PRIMARY KEY CLUSTERED (ChangeId),
        CONSTRAINT CK_Fact_Change_Outcome CHECK (Outcome IS NULL OR Outcome IN (
            N'Succeeded', N'Failed', N'RolledBack', N'Cancelled')),
        CONSTRAINT FK_Fact_Change_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
    CREATE INDEX IX_Fact_Change_Customer_Completed ON dbo.Fact_Change (CustomerCode, CompletedAt DESC);
END
GO

/* ========================================================================== */
/*  RISK / ISSUE / PRIORITY / VENDOR / CSAT                                    */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Fact_Risk', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_Risk
    (
        RiskId          uniqueidentifier NOT NULL
            CONSTRAINT DF_Fact_Risk_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerCode    nvarchar(50)     NOT NULL,
        Title           nvarchar(300)    NOT NULL,
        Category        nvarchar(40)     NULL,
        Rag             nvarchar(10)     NOT NULL,
        Status          nvarchar(20)     NOT NULL,
        OwnerName       nvarchar(200)    NULL,
        TargetDate      date             NULL,
        Summary         nvarchar(max)    NULL,
        CreatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_Risk_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_Risk_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_Risk PRIMARY KEY CLUSTERED (RiskId),
        CONSTRAINT CK_Fact_Risk_Rag CHECK (Rag IN (N'Red', N'Amber', N'Green')),
        CONSTRAINT CK_Fact_Risk_Status CHECK (Status IN (N'Open', N'Mitigating', N'Closed')),
        CONSTRAINT FK_Fact_Risk_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
    CREATE INDEX IX_Fact_Risk_Customer_Status ON dbo.Fact_Risk (CustomerCode, Status, Rag);
END
GO

IF OBJECT_ID(N'dbo.Fact_Issue', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_Issue
    (
        IssueId         uniqueidentifier NOT NULL
            CONSTRAINT DF_Fact_Issue_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerCode    nvarchar(50)     NOT NULL,
        Title           nvarchar(300)    NOT NULL,
        Source          nvarchar(30)     NULL,
        Severity        nvarchar(20)     NULL,
        Status          nvarchar(20)     NOT NULL,
        OwnerName       nvarchar(200)    NULL,
        TargetDate      date             NULL,
        Summary         nvarchar(max)    NULL,
        CreatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_Issue_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_Issue_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_Issue PRIMARY KEY CLUSTERED (IssueId),
        CONSTRAINT CK_Fact_Issue_Status CHECK (Status IN (N'Open', N'InProgress', N'Closed', N'Cancelled')),
        CONSTRAINT FK_Fact_Issue_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
END
GO

IF OBJECT_ID(N'dbo.Fact_Priority', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_Priority
    (
        PriorityId      uniqueidentifier NOT NULL
            CONSTRAINT DF_Fact_Priority_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerCode    nvarchar(50)     NOT NULL,
        Title           nvarchar(300)    NOT NULL,
        Detail          nvarchar(max)    NULL,
        SortOrder       int              NOT NULL
            CONSTRAINT DF_Fact_Priority_SortOrder DEFAULT (0),
        Status          nvarchar(20)     NOT NULL
            CONSTRAINT DF_Fact_Priority_Status DEFAULT (N'Active'),
        PeriodLabel     nvarchar(40)     NULL,
        CreatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_Priority_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_Priority_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_Priority PRIMARY KEY CLUSTERED (PriorityId),
        CONSTRAINT CK_Fact_Priority_Status CHECK (Status IN (N'Active', N'Done', N'Cancelled')),
        CONSTRAINT FK_Fact_Priority_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
    CREATE INDEX IX_Fact_Priority_Customer ON dbo.Fact_Priority (CustomerCode, Status, SortOrder);
END
GO

IF OBJECT_ID(N'dbo.Fact_VendorCase', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_VendorCase
    (
        VendorCaseId    uniqueidentifier NOT NULL
            CONSTRAINT DF_Fact_VendorCase_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerCode    nvarchar(50)     NOT NULL,
        VendorName      nvarchar(100)    NOT NULL,
        ExternalRef     nvarchar(100)    NULL,
        Title           nvarchar(300)    NOT NULL,
        Status          nvarchar(30)     NOT NULL,
        Priority        nvarchar(20)     NULL,
        OpenedAt        datetime2(3)     NOT NULL,
        ClosedAt        datetime2(3)     NULL,
        Summary         nvarchar(max)    NULL,
        CreatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_VendorCase_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_VendorCase_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_VendorCase PRIMARY KEY CLUSTERED (VendorCaseId),
        CONSTRAINT CK_Fact_VendorCase_Status CHECK (Status IN (
            N'Open', N'PendingVendor', N'PendingCustomer', N'InProgress', N'Closed', N'Cancelled')),
        CONSTRAINT FK_Fact_VendorCase_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
    CREATE INDEX IX_Fact_VendorCase_Customer_Status ON dbo.Fact_VendorCase (CustomerCode, Status);
END
GO

IF OBJECT_ID(N'dbo.Fact_Csat', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_Csat
    (
        CsatId          uniqueidentifier NOT NULL
            CONSTRAINT DF_Fact_Csat_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerCode    nvarchar(50)     NOT NULL,
        PeriodFrom      date             NOT NULL,
        PeriodTo        date             NOT NULL,
        Score           decimal(5, 2)    NOT NULL,
        ResponseCount   int              NULL,
        Source          nvarchar(50)     NULL,
        Notes           nvarchar(500)    NULL,
        CreatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_Csat_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_Csat PRIMARY KEY CLUSTERED (CsatId),
        CONSTRAINT CK_Fact_Csat_Score CHECK (Score >= 1.0 AND Score <= 5.0),
        CONSTRAINT FK_Fact_Csat_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
    CREATE INDEX IX_Fact_Csat_Customer_Period ON dbo.Fact_Csat (CustomerCode, PeriodTo DESC);
END
GO

/* ========================================================================== */
/*  EXECUTIVE SUMMARY + children                                               */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Fact_ExecSummary', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_ExecSummary
    (
        ExecSummaryId       uniqueidentifier NOT NULL
            CONSTRAINT DF_Fact_ExecSummary_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerCode        nvarchar(50)     NOT NULL,
        PeriodFrom          date             NOT NULL,
        PeriodTo            date             NOT NULL,
        PeriodLabel         nvarchar(40)     NOT NULL,
        HealthRag           nvarchar(10)     NOT NULL,
        HealthScore         decimal(5, 2)    NULL,
        HealthSummary       nvarchar(1000)   NULL,
        HealthDriversJson   nvarchar(max)    NULL,
        BusinessImpactSummary nvarchar(max)  NULL,
        OpenRiskCount       int              NULL,
        OpenIssueCount      int              NULL,
        MajorIncidentCount  int              NULL,
        Status              nvarchar(20)     NOT NULL
            CONSTRAINT DF_Fact_ExecSummary_Status DEFAULT (N'Draft'),
        PreparedByAppUserId uniqueidentifier NULL,
        PublishedAt         datetime2(3)     NULL,
        CreatedAt           datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_ExecSummary_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt           datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_ExecSummary_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_ExecSummary PRIMARY KEY CLUSTERED (ExecSummaryId),
        CONSTRAINT CK_Fact_ExecSummary_Rag CHECK (HealthRag IN (N'Red', N'Amber', N'Green')),
        CONSTRAINT CK_Fact_ExecSummary_Status CHECK (Status IN (N'Draft', N'Final', N'Published')),
        CONSTRAINT FK_Fact_ExecSummary_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode),
        CONSTRAINT FK_Fact_ExecSummary_User FOREIGN KEY (PreparedByAppUserId) REFERENCES dbo.App_User (AppUserId)
    );
    CREATE UNIQUE INDEX UX_Fact_ExecSummary_Customer_Period
        ON dbo.Fact_ExecSummary (CustomerCode, PeriodFrom, PeriodTo);
END
GO

IF OBJECT_ID(N'dbo.Fact_ExecNarrative', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_ExecNarrative
    (
        ExecNarrativeId uniqueidentifier NOT NULL
            CONSTRAINT DF_Fact_ExecNarrative_Id DEFAULT (NEWSEQUENTIALID()),
        ExecSummaryId   uniqueidentifier NOT NULL,
        CustomerCode    nvarchar(50)     NOT NULL,
        NarrativeType   nvarchar(30)     NOT NULL,
        SortOrder       int              NOT NULL
            CONSTRAINT DF_Fact_ExecNarrative_Sort DEFAULT (0),
        Title           nvarchar(200)    NULL,
        Body            nvarchar(max)    NOT NULL,
        CreatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_ExecNarrative_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_ExecNarrative PRIMARY KEY CLUSTERED (ExecNarrativeId),
        CONSTRAINT CK_Fact_ExecNarrative_Type CHECK (NarrativeType IN (
            N'Achievement', N'PriorityNextPeriod', N'Other')),
        CONSTRAINT FK_Fact_ExecNarrative_Summary FOREIGN KEY (ExecSummaryId) REFERENCES dbo.Fact_ExecSummary (ExecSummaryId),
        CONSTRAINT FK_Fact_ExecNarrative_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
    CREATE INDEX IX_Fact_ExecNarrative_Summary ON dbo.Fact_ExecNarrative (ExecSummaryId, NarrativeType, SortOrder);
END
GO

IF OBJECT_ID(N'dbo.Fact_ExecDecision', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_ExecDecision
    (
        ExecDecisionId  uniqueidentifier NOT NULL
            CONSTRAINT DF_Fact_ExecDecision_Id DEFAULT (NEWSEQUENTIALID()),
        ExecSummaryId   uniqueidentifier NOT NULL,
        CustomerCode    nvarchar(50)     NOT NULL,
        Title           nvarchar(300)    NOT NULL,
        Detail          nvarchar(max)    NULL,
        RequestedOf     nvarchar(200)    NULL,
        Priority        nvarchar(20)     NULL,
        Status          nvarchar(20)     NOT NULL
            CONSTRAINT DF_Fact_ExecDecision_Status DEFAULT (N'Pending'),
        DueDate         date             NULL,
        DecisionAt      datetime2(3)     NULL,
        DecisionNotes   nvarchar(max)    NULL,
        SortOrder       int              NOT NULL
            CONSTRAINT DF_Fact_ExecDecision_Sort DEFAULT (0),
        CreatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_ExecDecision_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_ExecDecision PRIMARY KEY CLUSTERED (ExecDecisionId),
        CONSTRAINT CK_Fact_ExecDecision_Status CHECK (Status IN (
            N'Pending', N'Approved', N'Rejected', N'Deferred')),
        CONSTRAINT FK_Fact_ExecDecision_Summary FOREIGN KEY (ExecSummaryId) REFERENCES dbo.Fact_ExecSummary (ExecSummaryId),
        CONSTRAINT FK_Fact_ExecDecision_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
END
GO

IF OBJECT_ID(N'dbo.Fact_ExecIncidentHighlight', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_ExecIncidentHighlight
    (
        ExecIncidentHighlightId uniqueidentifier NOT NULL
            CONSTRAINT DF_Fact_ExecIncidentHighlight_Id DEFAULT (NEWSEQUENTIALID()),
        ExecSummaryId   uniqueidentifier NOT NULL,
        CustomerCode    nvarchar(50)     NOT NULL,
        IncidentId      uniqueidentifier NULL,
        Title           nvarchar(300)    NOT NULL,
        OpenedAt        datetime2(3)     NULL,
        ResolvedAt      datetime2(3)     NULL,
        Severity        nvarchar(20)     NULL,
        Status          nvarchar(30)     NULL,
        BusinessImpact  nvarchar(max)    NULL,
        Summary         nvarchar(max)    NULL,
        SortOrder       int              NOT NULL
            CONSTRAINT DF_Fact_ExecIncidentHighlight_Sort DEFAULT (0),
        CreatedAt       datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_ExecIncidentHighlight_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_ExecIncidentHighlight PRIMARY KEY CLUSTERED (ExecIncidentHighlightId),
        CONSTRAINT FK_Fact_ExecIncidentHighlight_Summary FOREIGN KEY (ExecSummaryId) REFERENCES dbo.Fact_ExecSummary (ExecSummaryId),
        CONSTRAINT FK_Fact_ExecIncidentHighlight_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode),
        CONSTRAINT FK_Fact_ExecIncidentHighlight_Incident FOREIGN KEY (IncidentId) REFERENCES dbo.Fact_Incident (IncidentId)
    );
END
GO

/* ========================================================================== */
/*  DASHBOARD SNAPSHOT (monthly freeze — KPI Set v1 outputs)                   */
/* ========================================================================== */
IF OBJECT_ID(N'dbo.Fact_DashboardSnapshot', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fact_DashboardSnapshot
    (
        DashboardSnapshotId uniqueidentifier NOT NULL
            CONSTRAINT DF_Fact_DashboardSnapshot_Id DEFAULT (NEWSEQUENTIALID()),
        CustomerCode        nvarchar(50)     NOT NULL,
        PeriodFrom          date             NOT NULL,
        PeriodTo            date             NOT NULL,
        PeriodLabel         nvarchar(40)     NOT NULL,
        AsOfAt              datetime2(3)     NOT NULL,
        HealthRag           nvarchar(10)     NOT NULL,
        HealthScore         decimal(5, 2)    NULL,
        HealthSummary       nvarchar(1000)   NULL,
        AvailabilityPct     decimal(6, 3)    NULL,
        AvailabilitySlaPct  decimal(6, 3)    NULL,
        SlaResponsePct      decimal(6, 3)    NULL,
        SlaResolvePct       decimal(6, 3)    NULL,
        SlaCompliancePct    decimal(6, 3)    NULL,
        IncidentCountTotal  int              NULL,
        IncidentCountCritical int            NULL,
        OpenProblemCount    int              NULL,
        ChangeSuccessPct    decimal(6, 3)    NULL,
        ChangeCount         int              NULL,
        ActiveUserCount     int              NULL,
        CsatScore           decimal(5, 2)    NULL,
        OpenVendorCaseCount int              NULL,
        /* Telemetry snapshot helpers */
        CoveFailedDeviceCount int            NULL,
        PulsewayOfflineCount  int            NULL,
        BdInfectedCount       int            NULL,
        CreatedAt           datetime2(3)     NOT NULL
            CONSTRAINT DF_Fact_DashboardSnapshot_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Fact_DashboardSnapshot PRIMARY KEY CLUSTERED (DashboardSnapshotId),
        CONSTRAINT CK_Fact_DashboardSnapshot_Rag CHECK (HealthRag IN (N'Red', N'Amber', N'Green')),
        CONSTRAINT FK_Fact_DashboardSnapshot_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode)
    );
    CREATE UNIQUE INDEX UX_Fact_DashboardSnapshot_Customer_Period
        ON dbo.Fact_DashboardSnapshot (CustomerCode, PeriodFrom, PeriodTo);
END
GO

/* ========================================================================== */
/*  KPI views that merge telemetry + Fact_* (after tables exist)               */
/* ========================================================================== */
CREATE OR ALTER VIEW dbo.vw_Kpi_IncidentCounts_Period
AS
/* Parameter-free: rolling current calendar month SAST-ish using GETDATE local — adjust app filter */
SELECT
    i.CustomerCode,
    COUNT(*) AS IncidentCountTotal,
    SUM(CASE WHEN i.Severity = N'Critical' THEN 1 ELSE 0 END) AS IncidentCountCritical
FROM dbo.Fact_Incident AS i
WHERE i.Status <> N'Cancelled'
  AND i.OpenedAt >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
  AND i.OpenedAt < DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
GROUP BY i.CustomerCode;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_OpenProblems
AS
SELECT
    CustomerCode,
    COUNT(*) AS OpenProblemCount
FROM dbo.Fact_Problem
WHERE Status IN (N'Open', N'Investigating', N'RootCauseIdentified')
GROUP BY CustomerCode;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_ChangeSuccess_Period
AS
SELECT
    CustomerCode,
    COUNT(*) AS ChangeCount,
    CASE
        WHEN COUNT(*) = 0 THEN NULL
        ELSE CAST(100.0 * SUM(CASE WHEN Outcome = N'Succeeded' THEN 1 ELSE 0 END) / COUNT(*) AS decimal(6, 1))
    END AS ChangeSuccessPct
FROM dbo.Fact_Change
WHERE Outcome IN (N'Succeeded', N'Failed', N'RolledBack')
  AND CompletedAt >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
  AND CompletedAt < DATEADD(MONTH, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
GROUP BY CustomerCode;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_OpenVendorCases
AS
SELECT
    CustomerCode,
    COUNT(*) AS OpenVendorCaseCount
FROM dbo.Fact_VendorCase
WHERE Status IN (N'Open', N'PendingVendor', N'PendingCustomer', N'InProgress')
GROUP BY CustomerCode;
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_TopRisks
AS
SELECT TOP (100) PERCENT
    CustomerCode,
    RiskId,
    Title,
    Rag,
    Status,
    OwnerName,
    TargetDate,
    ROW_NUMBER() OVER (
        PARTITION BY CustomerCode
        ORDER BY CASE Rag WHEN N'Red' THEN 1 WHEN N'Amber' THEN 2 ELSE 3 END,
                 CASE WHEN TargetDate IS NULL THEN 1 ELSE 0 END,
                 TargetDate,
                 UpdatedAt DESC
    ) AS RiskRank
FROM dbo.Fact_Risk
WHERE Status IN (N'Open', N'Mitigating');
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_KeyPriorities
AS
SELECT
    CustomerCode,
    PriorityId,
    Title,
    Detail,
    SortOrder,
    Status,
    PeriodLabel,
    ROW_NUMBER() OVER (PARTITION BY CustomerCode ORDER BY SortOrder, UpdatedAt DESC) AS PriorityRank
FROM dbo.Fact_Priority
WHERE Status = N'Active';
GO

CREATE OR ALTER VIEW dbo.vw_Kpi_ExecutiveDashboard
AS
SELECT
    p.CustomerCode,
    p.DisplayName,
    p.AsOfDate,
    /* Prefer published snapshot month if you join later; else proposed */
    COALESCE(ds.HealthRag, p.HealthRagProposed) AS HealthRag,
    COALESCE(ds.HealthSummary, p.HealthSummaryProposed) AS HealthSummary,
    ds.AvailabilityPct,
    ds.SlaCompliancePct,
    COALESCE(ds.IncidentCountTotal, ic.IncidentCountTotal) AS IncidentCountTotal,
    COALESCE(ds.IncidentCountCritical, ic.IncidentCountCritical) AS IncidentCountCritical,
    COALESCE(ds.OpenProblemCount, op.OpenProblemCount) AS OpenProblemCount,
    COALESCE(ds.ChangeSuccessPct, ch.ChangeSuccessPct) AS ChangeSuccessPct,
    COALESCE(ds.ActiveUserCount, p.ActiveUserCount) AS ActiveUserCount,
    COALESCE(ds.CsatScore, cs.Score) AS CsatScore,
    COALESCE(ds.OpenVendorCaseCount, vc.OpenVendorCaseCount) AS OpenVendorCaseCount,
    p.CoveFailedDeviceCount,
    p.PulsewayOfflineCount,
    p.BdInfectedCount,
    p.SysproJobErrorCount
FROM dbo.vw_Kpi_PortfolioDashboard AS p
LEFT JOIN dbo.vw_Kpi_IncidentCounts_Period AS ic ON ic.CustomerCode = p.CustomerCode
LEFT JOIN dbo.vw_Kpi_OpenProblems AS op ON op.CustomerCode = p.CustomerCode
LEFT JOIN dbo.vw_Kpi_ChangeSuccess_Period AS ch ON ch.CustomerCode = p.CustomerCode
LEFT JOIN dbo.vw_Kpi_OpenVendorCases AS vc ON vc.CustomerCode = p.CustomerCode
OUTER APPLY (
    SELECT TOP (1) s.Score
    FROM dbo.Fact_Csat AS s
    WHERE s.CustomerCode = p.CustomerCode
    ORDER BY s.PeriodTo DESC
) AS cs
OUTER APPLY (
    SELECT TOP (1) *
    FROM dbo.Fact_DashboardSnapshot AS d
    WHERE d.CustomerCode = p.CustomerCode
    ORDER BY d.PeriodTo DESC
) AS ds;
GO

PRINT N'Fact add-on + merged KPI views created successfully.';
GO
