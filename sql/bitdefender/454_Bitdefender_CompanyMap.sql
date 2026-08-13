/*
  454 - Bitdefender company → CustomerCode map (MSP multi-tenant)
  + optional CompanyId / CompanyName columns on endpoints
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Dim_Bitdefender_CompanyMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_Bitdefender_CompanyMap (
    CompanyName    nvarchar(200)  NOT NULL,
    CustomerCode   nvarchar(50)   NOT NULL,
    CompanyId      nvarchar(40)   NULL,
    MatchType      nvarchar(20)   NOT NULL CONSTRAINT DF_BdCoMap_Type DEFAULT (N'Exact'), -- Exact|Contains
    Priority       int            NOT NULL CONSTRAINT DF_BdCoMap_Pri DEFAULT (100),
    Notes          nvarchar(200)  NULL,
    Active         bit            NOT NULL CONSTRAINT DF_BdCoMap_Active DEFAULT (1),
    UpdatedAtUtc   datetime2(3)   NOT NULL CONSTRAINT DF_BdCoMap_Upd DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_Bitdefender_CompanyMap PRIMARY KEY (CompanyName, CustomerCode)
  );
  PRINT N'Dim_Bitdefender_CompanyMap created';
END
GO

MERGE dbo.Dim_Bitdefender_CompanyMap AS t
USING (VALUES
  (N'Able Tracers', N'ABLE', NULL, N'Contains', 10, N'Cove/Pulseway Able'),
  (N'Able Traces', N'ABLE', NULL, N'Contains', 15, N'spelling'),
  (N'AHI Carrier', N'AHIC', NULL, N'Contains', 10, N'AHI'),
  (N'AHI Carriers', N'AHIC', NULL, N'Contains', 10, N'AHI'),
  (N'Board of Healthcare Funders', N'BHF', NULL, N'Contains', 10, N'BHF'),
  (N'BHF', N'BHF', NULL, N'Contains', 20, N'BHF short'),
  (N'PCNS', N'BHF', NULL, N'Contains', 15, N'PCNS company'),
  (N'Hydra Sales', N'HYDRA', NULL, N'Contains', 10, N'Hydra'),
  (N'Hydrasales', N'HYDRA', NULL, N'Contains', 10, N'Hydra'),
  (N'Hydra', N'HYDRA', NULL, N'Exact', 30, N'Hydra short'),
  (N'Redsun Raisins', N'RSR', NULL, N'Contains', 10, N'Redsun'),
  (N'Remote Site Solutions', N'RSS', NULL, N'Contains', 10, N'RSS'),
  (N'RPM Resources', N'RPMINT', NULL, N'Contains', 20, N'RPM parent'),
  (N'RPM Internal', N'RPMINT', NULL, N'Contains', 20, N'RPM'),
  (N'Simply Bright', N'SBS', NULL, N'Contains', 10, N'SBS'),
  (N'UVSS', N'UVSS', NULL, N'Contains', 10, N'UVSS'),
  (N'Unique Ventilation', N'UVSS', NULL, N'Contains', 10, N'UVSS'),
  (N'Metsi', N'METSI', NULL, N'Contains', 10, N'Metsi'),
  (N'MEDiPOS', N'MEDIPOS', NULL, N'Contains', 10, N'MEDiPOS'),
  (N'Interbrand', N'IB', NULL, N'Contains', 10, N'IB'),
  (N'Vault Tech', N'VAULT', NULL, N'Contains', 10, N'Vault'),
  (N'YLJ', N'YLJ', NULL, N'Contains', 10, N'YLJ')
) AS s(CompanyName, CustomerCode, CompanyId, MatchType, Priority, Notes)
ON t.CompanyName = s.CompanyName AND t.CustomerCode = s.CustomerCode
WHEN MATCHED THEN UPDATE SET
  MatchType = s.MatchType, Priority = s.Priority, Notes = s.Notes,
  Active = 1, UpdatedAtUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (CompanyName, CustomerCode, CompanyId, MatchType, Priority, Notes, Active)
  VALUES (s.CompanyName, s.CustomerCode, s.CompanyId, s.MatchType, s.Priority, s.Notes, 1);
PRINT N'Company map seeded';
GO

-- Company columns on endpoints
IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'CompanyId') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD CompanyId nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'CompanyName') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD CompanyName nvarchar(200) NULL;
  PRINT N'Bitdefender_Endpoints company columns ready';
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
      SET @sql = N'GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.Dim_Bitdefender_CompanyMap TO ' + QUOTENAME(@p);
      EXEC sp_executesql @sql;
      SET @sql = N'GRANT SELECT ON OBJECT::dbo.Dim_Bitdefender_CompanyMap TO ' + QUOTENAME(@p);
      EXEC sp_executesql @sql;
      PRINT N'Granted ' + @p;
    END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH
  END
  FETCH NEXT FROM c INTO @p;
END
CLOSE c; DEALLOCATE c;
GO
