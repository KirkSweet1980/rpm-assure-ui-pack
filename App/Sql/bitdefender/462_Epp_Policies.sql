/* 462 - RPM EndPoint Protection policies + module flags from GravityZone */
USE RPMAssure_App;
GO
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.Bitdefender_Policies', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Bitdefender_Policies (
    SnapshotDate   date           NOT NULL,
    PolicyId       nvarchar(40)   NOT NULL,
    PolicyName     nvarchar(200)  NULL,
    CustomerCode   nvarchar(50)   NOT NULL,
    DeviceCount    int            NULL,
    ModulesJson    nvarchar(max)  NULL,
    ImportedAt     datetime2(3)   NOT NULL CONSTRAINT DF_BdPol_Imp DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Bitdefender_Policies PRIMARY KEY (SnapshotDate, PolicyId, CustomerCode)
  );
  CREATE INDEX IX_BdPol_Code ON dbo.Bitdefender_Policies (CustomerCode, SnapshotDate);
  PRINT N'Bitdefender_Policies created';
END
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Bitdefender_Policies TO [Rpm_collect];
  PRINT N'Granted Rpm_collect on Bitdefender_Policies';
END
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'rpmassure')
  GRANT SELECT ON dbo.Bitdefender_Policies TO [rpmassure];
GO
PRINT N'462 EPP policies ready';
GO
