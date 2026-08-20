/* Bronze landing for Cove Continuity payloads — replay / debug, not UI. */
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Cove_Raw', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Cove_Raw
  (
    RawId        bigint         NOT NULL IDENTITY(1,1) CONSTRAINT PK_Cove_Raw PRIMARY KEY,
    ImportedAt   datetime2(3)   NOT NULL CONSTRAINT DF_Cove_Raw_Imported DEFAULT (SYSUTCDATETIME()),
    Kind         nvarchar(40)   NOT NULL,  -- draas-dashboard | collect-meta
    ExternalId   nvarchar(80)   NULL,
    ExternalName nvarchar(200)  NULL,
    Payload      nvarchar(max)  NOT NULL
  );
  CREATE INDEX IX_Cove_Raw_KindAt ON dbo.Cove_Raw (Kind, ImportedAt DESC);
  PRINT N'Created Cove_Raw';
END
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
  GRANT SELECT, INSERT ON dbo.Cove_Raw TO [Rpm_collect];
GO

PRINT N'467 Cove_Raw ready';
GO
