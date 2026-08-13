/*
  RPMAssure_App — FinSight L2/L3 support + recon workflow tables
  sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i 312_FinSight_L23_Workflow.sql
*/
USE [RPMAssure_App];
SET NOCOUNT ON;

/* Recon case workflow */
IF OBJECT_ID(N'dbo.Fact_FinSight_ReconCase', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Fact_FinSight_ReconCase
  (
    ReconCaseId       uniqueidentifier NOT NULL CONSTRAINT DF_FinSight_ReconCase_Id DEFAULT (NEWSEQUENTIALID()),
    CustomerCode      nvarchar(50)     NOT NULL,
    BalanceTypeCode   nvarchar(10)     NOT NULL,
    SnapshotDate      date             NULL,
    Status            nvarchar(30)     NOT NULL
      CONSTRAINT DF_FinSight_ReconCase_Status DEFAULT (N'Open'),
    OobLines          int              NOT NULL CONSTRAINT DF_FinSight_ReconCase_Oob DEFAULT (0),
    AbsVariance       decimal(18,2)    NULL,
    CloseBalance      decimal(18,2)    NULL,
    OwnerName         nvarchar(100)    NULL,
    Title             nvarchar(200)    NOT NULL,
    Notes             nvarchar(max)    NULL,
    SourceLevel       tinyint          NULL, -- 1/2/3 focus
    LevelKey          nvarchar(50)     NULL,
    CreatedAtUtc      datetime2(3)     NOT NULL CONSTRAINT DF_FinSight_ReconCase_Created DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc      datetime2(3)     NOT NULL CONSTRAINT DF_FinSight_ReconCase_Updated DEFAULT (SYSUTCDATETIME()),
    ClosedAtUtc       datetime2(3)     NULL,
    CONSTRAINT PK_Fact_FinSight_ReconCase PRIMARY KEY CLUSTERED (ReconCaseId),
    CONSTRAINT CK_FinSight_ReconCase_Status CHECK (Status IN (
      N'Open', N'Investigating', N'WaitingFinance', N'Cleared', N'Accepted', N'Closed'))
  );
  CREATE INDEX IX_FinSight_ReconCase_Customer ON dbo.Fact_FinSight_ReconCase (CustomerCode, Status);
  CREATE INDEX IX_FinSight_ReconCase_Module ON dbo.Fact_FinSight_ReconCase (CustomerCode, BalanceTypeCode, Status);
  PRINT 'Created Fact_FinSight_ReconCase';
END
ELSE PRINT 'Fact_FinSight_ReconCase exists';

IF OBJECT_ID(N'dbo.Fact_FinSight_ReconStep', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Fact_FinSight_ReconStep
  (
    ReconStepId   uniqueidentifier NOT NULL CONSTRAINT DF_FinSight_ReconStep_Id DEFAULT (NEWSEQUENTIALID()),
    ReconCaseId   uniqueidentifier NOT NULL,
    StepAtUtc     datetime2(3)     NOT NULL CONSTRAINT DF_FinSight_ReconStep_At DEFAULT (SYSUTCDATETIME()),
    ActorName     nvarchar(100)    NULL,
    FromStatus    nvarchar(30)     NULL,
    ToStatus      nvarchar(30)     NOT NULL,
    Note          nvarchar(max)    NULL,
    CONSTRAINT PK_Fact_FinSight_ReconStep PRIMARY KEY CLUSTERED (ReconStepId),
    CONSTRAINT FK_FinSight_ReconStep_Case FOREIGN KEY (ReconCaseId)
      REFERENCES dbo.Fact_FinSight_ReconCase (ReconCaseId)
  );
  CREATE INDEX IX_FinSight_ReconStep_Case ON dbo.Fact_FinSight_ReconStep (ReconCaseId, StepAtUtc);
  PRINT 'Created Fact_FinSight_ReconStep';
END
ELSE PRINT 'Fact_FinSight_ReconStep exists';

/* Optional view: latest L2/L3 variance lines (all balance types) */
CREATE OR ALTER VIEW dbo.vw_FinSight_DtrDetail_Latest
AS
WITH ranked AS (
  SELECT
    b.CustomerCode,
    b.BalanceTypeCode,
    b.InformationLevel,
    b.LevelKey,
    b.ParentLevelKey,
    b.GlCode,
    b.Dimension1,
    b.Description,
    b.SubCloseBalance,
    b.GlCloseBalance,
    b.Variance,
    b.SnapshotDate,
    b.InstanceName,
    b.CompanyDb,
    ROW_NUMBER() OVER (
      PARTITION BY b.CustomerCode, b.BalanceTypeCode, b.InformationLevel, b.LevelKey, b.GlCode, b.Description
      ORDER BY b.SnapshotDate DESC, b.ImportedAt DESC
    ) AS rn
  FROM dbo.vw_Datarapt_DtrBalances_All AS b WITH (NOLOCK)
  WHERE b.InformationLevel IN (1, 2, 3)
)
SELECT
  CustomerCode, BalanceTypeCode, InformationLevel, LevelKey, ParentLevelKey,
  GlCode, Dimension1, Description, SubCloseBalance, GlCloseBalance, Variance,
  SnapshotDate, InstanceName, CompanyDb
FROM ranked
WHERE rn = 1;
GO

PRINT '312 FinSight L2/L3 + workflow ready.';
