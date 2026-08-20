-- Freshdesk SLA policy store + Dim_SlaPolicy columns. Safe to re-run.
SET NOCOUNT ON;
USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Freshdesk_SlaPolicy', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Freshdesk_SlaPolicy (
    PolicyId           bigint        NOT NULL,
    PolicyName         nvarchar(200) NULL,
    IsDefault          bit           NOT NULL CONSTRAINT DF_FdSla_Def DEFAULT 0,
    Position           int           NULL,
    Active             bit           NOT NULL CONSTRAINT DF_FdSla_Active DEFAULT 1,
    Priority           nvarchar(20)  NOT NULL,
    RespondMins        int           NULL,
    ResolveMins        int           NULL,
    BusinessHours      bit           NULL,
    CompanyId          bigint        NULL,
    CustomerCode       nvarchar(32)  NULL,
    RawJson            nvarchar(max) NULL,
    ImportedAt         datetime2(3)  NOT NULL CONSTRAINT DF_FdSla_Imp DEFAULT SYSUTCDATETIME()
  );
  CREATE CLUSTERED INDEX IX_FdSla_Pk ON dbo.Freshdesk_SlaPolicy (PolicyId, Priority, CompanyId);
END
GO

IF COL_LENGTH(N'dbo.Dim_SlaPolicy', N'Source') IS NULL
  ALTER TABLE dbo.Dim_SlaPolicy ADD Source nvarchar(40) NULL;
IF COL_LENGTH(N'dbo.Dim_SlaPolicy', N'PolicyName') IS NULL
  ALTER TABLE dbo.Dim_SlaPolicy ADD PolicyName nvarchar(200) NULL;
IF COL_LENGTH(N'dbo.Dim_SlaPolicy', N'BusinessHours') IS NULL
  ALTER TABLE dbo.Dim_SlaPolicy ADD BusinessHours bit NULL;
IF COL_LENGTH(N'dbo.Dim_SlaPolicy', N'ExternalPolicyId') IS NULL
  ALTER TABLE dbo.Dim_SlaPolicy ADD ExternalPolicyId bigint NULL;
IF COL_LENGTH(N'dbo.Dim_SlaPolicy', N'Position') IS NULL
  ALTER TABLE dbo.Dim_SlaPolicy ADD Position int NULL;
GO

PRINT N'519 Freshdesk SLA schema ready';
GO
