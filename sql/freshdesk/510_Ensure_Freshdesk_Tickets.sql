-- Freshdesk ticket store. Safe to re-run.
-- sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -b -i 510_Ensure_Freshdesk_Tickets.sql
SET NOCOUNT ON;
USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Freshdesk_Tickets', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Freshdesk_Tickets (
    SnapshotDate        date          NOT NULL,
    TicketId            bigint        NOT NULL,
    CustomerCode        nvarchar(32)  NULL,
    Subject             nvarchar(500) NULL,
    StatusId            int           NULL,
    StatusName          nvarchar(40)  NULL,
    PriorityId          int           NULL,
    PriorityName        nvarchar(40)  NULL,
    SourceId            int           NULL,
    TypeName            nvarchar(80)  NULL,
    RequesterId         bigint        NULL,
    RequesterEmail      nvarchar(200) NULL,
    ResponderId         bigint        NULL,
    GroupId             bigint        NULL,
    CompanyId           bigint        NULL,
    CompanyName         nvarchar(200) NULL,
    CreatedAtUtc        datetime2(0)  NULL,
    UpdatedAtUtc        datetime2(0)  NULL,
    DueByUtc            datetime2(0)  NULL,
    FirstRespondedAtUtc datetime2(0)  NULL,
    ResolvedAtUtc       datetime2(0)  NULL,
    ClosedAtUtc         datetime2(0)  NULL,
    TagsJson            nvarchar(max) NULL,
    CustomFieldsJson    nvarchar(max) NULL,
    ImportedAt          datetime2(3)  NOT NULL CONSTRAINT DF_Freshdesk_Tickets_Imp DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Freshdesk_Tickets PRIMARY KEY (SnapshotDate, TicketId)
  );
  CREATE INDEX IX_Freshdesk_Tickets_Customer ON dbo.Freshdesk_Tickets (CustomerCode, UpdatedAtUtc DESC);
  CREATE INDEX IX_Freshdesk_Tickets_Status ON dbo.Freshdesk_Tickets (StatusId, UpdatedAtUtc DESC);
  PRINT 'Created Freshdesk_Tickets';
END
ELSE
  PRINT 'Freshdesk_Tickets already exists';
GO

IF OBJECT_ID(N'dbo.Dim_Freshdesk_CompanyMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Freshdesk_CompanyMap (
    CompanyId      bigint        NULL,
    CompanyName    nvarchar(200) NOT NULL,
    CustomerCode   nvarchar(32)  NOT NULL,
    Active         bit           NOT NULL CONSTRAINT DF_Dim_Fd_CoMap_Active DEFAULT 1,
    Notes          nvarchar(200) NULL,
    CreatedAt      datetime2(3)  NOT NULL CONSTRAINT DF_Dim_Fd_CoMap_Created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Dim_Freshdesk_CompanyMap PRIMARY KEY (CompanyName)
  );
  PRINT 'Created Dim_Freshdesk_CompanyMap';
END
ELSE
  PRINT 'Dim_Freshdesk_CompanyMap already exists';
GO

-- Stamp Dim_Connection using the LIVE columns (ConnectionCode / LastSyncAt). Never assume ConnectionKind.
IF OBJECT_ID(N'dbo.Dim_Connection', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Dim_Connection', N'ConnectionCode') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Connection WHERE ConnectionCode = N'FRESHDESK')
  BEGIN
    INSERT INTO dbo.Dim_Connection (ConnectionCode, DisplayName, SourceKind, Status, Notes)
    VALUES (N'FRESHDESK', N'Freshdesk Tickets', N'Ams', N'Configured', N'Helpdesk ticket pull for AMS / contract SLA clocks');
    PRINT 'Inserted Dim_Connection FRESHDESK';
  END
  ELSE
    PRINT 'Dim_Connection FRESHDESK already present';
END
ELSE
  PRINT 'Dim_Connection missing or no ConnectionCode - skipped stamp';
GO

PRINT 'Freshdesk schema ready';
GO
