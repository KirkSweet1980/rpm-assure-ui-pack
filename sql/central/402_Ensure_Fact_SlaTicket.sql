/*
  Optional ITSM-style SLA ticket facts (response / resolve clocks).
  When populated, app can derive compliance from real tickets later.

  sqlcmd ... -i 402_Ensure_Fact_SlaTicket.sql
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Fact_SlaTicket', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Fact_SlaTicket
  (
    SlaTicketId uniqueidentifier NOT NULL CONSTRAINT DF_Fact_SlaTicket_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode nvarchar(50) NOT NULL,
    ExternalRef nvarchar(100) NULL,
    Title nvarchar(300) NOT NULL,
    Priority nvarchar(20) NOT NULL,
    OpenedAt datetime2(3) NOT NULL,
    FirstResponseAt datetime2(3) NULL,
    ResolvedAt datetime2(3) NULL,
    ClosedAt datetime2(3) NULL,
    ResponseTargetMins int NULL,
    ResolveTargetMins int NULL,
    ResponseSlaMet bit NULL,
    ResolveSlaMet bit NULL,
    SourceSystem nvarchar(40) NULL, -- e.g. Manual, ConnectWise, Halo
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Fact_SlaTicket_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Fact_SlaTicket PRIMARY KEY (SlaTicketId),
    CONSTRAINT FK_Fact_SlaTicket_Customer FOREIGN KEY (CustomerCode) REFERENCES dbo.Dim_Customer (CustomerCode),
    CONSTRAINT CK_Fact_SlaTicket_Priority CHECK (Priority IN (N'Critical',N'High',N'Medium',N'Low'))
  );
  CREATE INDEX IX_Fact_SlaTicket_Customer ON dbo.Fact_SlaTicket (CustomerCode, OpenedAt DESC);
  PRINT N'Created Fact_SlaTicket';
END
ELSE
  PRINT N'Fact_SlaTicket already exists';
GO

/* Sample empty state only — do not seed fake tickets by default */
PRINT N'402 ready. Insert real tickets from ITSM or manual entry later.';
GO
