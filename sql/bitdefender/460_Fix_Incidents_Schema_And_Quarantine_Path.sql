/*
  460 - Align Bitdefender_Incidents/Quarantine columns + Vault company map
  Fix missing DeviceName/Summary/DetectedAt from older table shapes
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Bitdefender_Incidents', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Bitdefender_Incidents (
    SnapshotDate     date           NOT NULL,
    IncidentId       nvarchar(80)   NOT NULL,
    CustomerCode     nvarchar(50)   NULL,
    EndpointId       nvarchar(40)   NULL,
    DeviceName       nvarchar(200)  NULL,
    Severity         nvarchar(40)   NULL,
    Status           nvarchar(40)   NULL,
    IncidentType     nvarchar(100)  NULL,
    Summary          nvarchar(500)  NULL,
    DetectedAt       datetime2(3)   NULL,
    RawJson          nvarchar(max)  NULL,
    ImportedAt       datetime2(3)   NOT NULL CONSTRAINT DF_BdInc_Imported460 DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Bitdefender_Incidents PRIMARY KEY (SnapshotDate, IncidentId)
  );
  PRINT N'Bitdefender_Incidents created';
END
ELSE
BEGIN
  IF COL_LENGTH(N'dbo.Bitdefender_Incidents', N'DeviceName') IS NULL
    ALTER TABLE dbo.Bitdefender_Incidents ADD DeviceName nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Incidents', N'Severity') IS NULL
    ALTER TABLE dbo.Bitdefender_Incidents ADD Severity nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Incidents', N'Status') IS NULL
    ALTER TABLE dbo.Bitdefender_Incidents ADD Status nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Incidents', N'IncidentType') IS NULL
    ALTER TABLE dbo.Bitdefender_Incidents ADD IncidentType nvarchar(100) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Incidents', N'Summary') IS NULL
    ALTER TABLE dbo.Bitdefender_Incidents ADD Summary nvarchar(500) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Incidents', N'DetectedAt') IS NULL
    ALTER TABLE dbo.Bitdefender_Incidents ADD DetectedAt datetime2(3) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Incidents', N'EndpointId') IS NULL
    ALTER TABLE dbo.Bitdefender_Incidents ADD EndpointId nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Incidents', N'CustomerCode') IS NULL
    ALTER TABLE dbo.Bitdefender_Incidents ADD CustomerCode nvarchar(50) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Incidents', N'RawJson') IS NULL
    ALTER TABLE dbo.Bitdefender_Incidents ADD RawJson nvarchar(max) NULL;
  PRINT N'Bitdefender_Incidents columns aligned';
END
GO

IF OBJECT_ID(N'dbo.Bitdefender_Quarantine', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Bitdefender_Quarantine (
    SnapshotDate     date           NOT NULL,
    ItemId           nvarchar(80)   NOT NULL,
    CustomerCode     nvarchar(50)   NULL,
    EndpointId       nvarchar(40)   NULL,
    DeviceName       nvarchar(200)  NULL,
    ThreatName       nvarchar(200)  NULL,
    FilePath         nvarchar(500)  NULL,
    Status           nvarchar(40)   NULL,
    QuarantinedAt    datetime2(3)   NULL,
    RawJson          nvarchar(max)  NULL,
    ImportedAt       datetime2(3)   NOT NULL CONSTRAINT DF_BdQuar_Imported460 DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Bitdefender_Quarantine PRIMARY KEY (SnapshotDate, ItemId)
  );
  PRINT N'Bitdefender_Quarantine created';
END
ELSE
BEGIN
  IF COL_LENGTH(N'dbo.Bitdefender_Quarantine', N'DeviceName') IS NULL
    ALTER TABLE dbo.Bitdefender_Quarantine ADD DeviceName nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Quarantine', N'ThreatName') IS NULL
    ALTER TABLE dbo.Bitdefender_Quarantine ADD ThreatName nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Quarantine', N'FilePath') IS NULL
    ALTER TABLE dbo.Bitdefender_Quarantine ADD FilePath nvarchar(500) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Quarantine', N'Status') IS NULL
    ALTER TABLE dbo.Bitdefender_Quarantine ADD Status nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Quarantine', N'QuarantinedAt') IS NULL
    ALTER TABLE dbo.Bitdefender_Quarantine ADD QuarantinedAt datetime2(3) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Quarantine', N'EndpointId') IS NULL
    ALTER TABLE dbo.Bitdefender_Quarantine ADD EndpointId nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Quarantine', N'CustomerCode') IS NULL
    ALTER TABLE dbo.Bitdefender_Quarantine ADD CustomerCode nvarchar(50) NULL;
  PRINT N'Bitdefender_Quarantine columns aligned';
END
GO

-- Vault Tech company map (GZ name: Vault-Tech)
IF OBJECT_ID(N'dbo.Dim_Bitdefender_CompanyMap', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Bitdefender_CompanyMap AS t
  USING (VALUES
    (N'Vault-Tech', N'VAULT', N'6a7bec651252da4f750c5e7a', N'Exact', 5, N'GZ inventory Vault-Tech'),
    (N'Vault Tech', N'VAULT', NULL, N'Contains', 10, N'Vault Tech'),
    (N'VaultTech', N'VAULT', NULL, N'Contains', 10, N'VaultTech')
  ) AS s(CompanyName, CustomerCode, CompanyId, MatchType, Priority, Notes)
  ON t.CompanyName = s.CompanyName AND t.CustomerCode = s.CustomerCode
  WHEN MATCHED THEN UPDATE SET
    CompanyId = COALESCE(s.CompanyId, t.CompanyId),
    MatchType = s.MatchType, Priority = s.Priority, Notes = s.Notes,
    Active = 1, UpdatedAtUtc = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (CompanyName, CustomerCode, CompanyId, MatchType, Priority, Notes, Active)
    VALUES (s.CompanyName, s.CustomerCode, s.CompanyId, s.MatchType, s.Priority, s.Notes, 1);
  PRINT N'Vault company map ready';
END
GO

-- Grants
DECLARE @p sysname, @sql nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM (VALUES (N'Rpm_collect'),(N'Rpm_app'),(N'rpm_app'),(N'rpmassure')) v(name);
OPEN c; FETCH NEXT FROM c INTO @p;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @p)
  BEGIN
    BEGIN TRY
      SET @sql = N'GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.Bitdefender_Incidents TO ' + QUOTENAME(@p);
      EXEC sp_executesql @sql;
      SET @sql = N'GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.Bitdefender_Quarantine TO ' + QUOTENAME(@p);
      EXEC sp_executesql @sql;
    END TRY BEGIN CATCH END CATCH
  END
  FETCH NEXT FROM c INTO @p;
END
CLOSE c; DEALLOCATE c;

PRINT N'=== Incident columns ===';
SELECT c.name, t.name AS type_name
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID(N'dbo.Bitdefender_Incidents')
ORDER BY c.column_id;
GO
