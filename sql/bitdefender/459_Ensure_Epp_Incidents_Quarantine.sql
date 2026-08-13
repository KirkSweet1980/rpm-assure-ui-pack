/*
  459 - Ensure Incidents / Quarantine / CollectStatus tables for EPP feeds
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
    ImportedAt       datetime2(3)   NOT NULL CONSTRAINT DF_BdInc_Imported459 DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Bitdefender_Incidents PRIMARY KEY (SnapshotDate, IncidentId)
  );
  CREATE INDEX IX_BdInc_Code ON dbo.Bitdefender_Incidents (CustomerCode, SnapshotDate);
  PRINT N'Bitdefender_Incidents created';
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
    ImportedAt       datetime2(3)   NOT NULL CONSTRAINT DF_BdQuar_Imported459 DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Bitdefender_Quarantine PRIMARY KEY (SnapshotDate, ItemId)
  );
  CREATE INDEX IX_BdQuar_Code ON dbo.Bitdefender_Quarantine (CustomerCode, SnapshotDate);
  PRINT N'Bitdefender_Quarantine created';
END
GO

IF OBJECT_ID(N'dbo.Bitdefender_CollectStatus', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Bitdefender_CollectStatus (
    SnapshotDate        date           NOT NULL,
    EndpointsTotal      int            NULL,
    EndpointsMapped     int            NULL,
    EndpointsUnmapped   int            NULL,
    IncidentsOk         bit            NULL,
    IncidentsCount      int            NULL,
    QuarantineOk        bit            NULL,
    QuarantineCount     int            NULL,
    IncidentsMessage    nvarchar(400)  NULL,
    QuarantineMessage   nvarchar(400)  NULL,
    ImportedAt          datetime2(3)   NOT NULL CONSTRAINT DF_BdCS_Imported459 DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Bitdefender_CollectStatus PRIMARY KEY (SnapshotDate)
  );
  PRINT N'Bitdefender_CollectStatus created';
END
GO

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
      SET @sql = N'GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.Bitdefender_CollectStatus TO ' + QUOTENAME(@p);
      EXEC sp_executesql @sql;
      SET @sql = N'GRANT SELECT ON OBJECT::dbo.Bitdefender_Incidents TO ' + QUOTENAME(@p);
      EXEC sp_executesql @sql;
    END TRY BEGIN CATCH END CATCH
  END
  FETCH NEXT FROM c INTO @p;
END
CLOSE c; DEALLOCATE c;
PRINT N'EPP incident/quarantine objects ready';
GO
