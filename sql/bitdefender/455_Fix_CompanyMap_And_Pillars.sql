/*
  455 - Fix Dim_Bitdefender_CompanyMap schema, seed companies, set PillarBitdefender
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
    MatchType      nvarchar(20)   NOT NULL CONSTRAINT DF_BdCoMap_Type DEFAULT (N'Contains'),
    Priority       int            NOT NULL CONSTRAINT DF_BdCoMap_Pri DEFAULT (100),
    Notes          nvarchar(200)  NULL,
    Active         bit            NOT NULL CONSTRAINT DF_BdCoMap_Active DEFAULT (1),
    UpdatedAtUtc   datetime2(3)   NOT NULL CONSTRAINT DF_BdCoMap_Upd DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_Bitdefender_CompanyMap PRIMARY KEY (CompanyName, CustomerCode)
  );
  PRINT N'Dim_Bitdefender_CompanyMap created';
END
ELSE
BEGIN
  IF COL_LENGTH(N'dbo.Dim_Bitdefender_CompanyMap', N'MatchType') IS NULL
    ALTER TABLE dbo.Dim_Bitdefender_CompanyMap ADD MatchType nvarchar(20) NOT NULL
      CONSTRAINT DF_BdCoMap_Type2 DEFAULT (N'Contains');
  IF COL_LENGTH(N'dbo.Dim_Bitdefender_CompanyMap', N'Priority') IS NULL
    ALTER TABLE dbo.Dim_Bitdefender_CompanyMap ADD Priority int NOT NULL
      CONSTRAINT DF_BdCoMap_Pri2 DEFAULT (100);
  IF COL_LENGTH(N'dbo.Dim_Bitdefender_CompanyMap', N'CompanyId') IS NULL
    ALTER TABLE dbo.Dim_Bitdefender_CompanyMap ADD CompanyId nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Dim_Bitdefender_CompanyMap', N'Notes') IS NULL
    ALTER TABLE dbo.Dim_Bitdefender_CompanyMap ADD Notes nvarchar(200) NULL;
  IF COL_LENGTH(N'dbo.Dim_Bitdefender_CompanyMap', N'Active') IS NULL
    ALTER TABLE dbo.Dim_Bitdefender_CompanyMap ADD Active bit NOT NULL
      CONSTRAINT DF_BdCoMap_Act2 DEFAULT (1);
  IF COL_LENGTH(N'dbo.Dim_Bitdefender_CompanyMap', N'UpdatedAtUtc') IS NULL
    ALTER TABLE dbo.Dim_Bitdefender_CompanyMap ADD UpdatedAtUtc datetime2(3) NOT NULL
      CONSTRAINT DF_BdCoMap_Upd2 DEFAULT (SYSUTCDATETIME());
  PRINT N'Dim_Bitdefender_CompanyMap columns ensured';
END
GO

-- Endpoint company columns
IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'CompanyId') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD CompanyId nvarchar(40) NULL;
  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'CompanyName') IS NULL
    ALTER TABLE dbo.Bitdefender_Endpoints ADD CompanyName nvarchar(200) NULL;
END
GO

-- Seed exact GZ company names from explore
MERGE dbo.Dim_Bitdefender_CompanyMap AS t
USING (VALUES
  (N'Able Tracers', N'ABLE', N'6a0ea559eb41203001010715', N'Exact', 5, N'GZ company'),
  (N'AHI Carrier', N'AHIC', N'69bd078322d19cdd3f09397b', N'Exact', 5, N'GZ company'),
  (N'BHF Global', N'BHF', N'69de0c2b16ca7be0130daf1c', N'Exact', 5, N'GZ company'),
  (N'HydraSales', N'HYDRA', N'69bd0c1af3a3056c6a06fb28', N'Exact', 5, N'GZ company'),
  (N'MEDiPOS Medical Scheme', N'MEDIPOS', N'69bd0c41da988f021202283a', N'Exact', 5, N'GZ company'),
  (N'Metsiwater Solutions', N'METSI', N'69bd0c6dc3d507bff90acb61', N'Exact', 5, N'GZ company'),
  (N'Redsun Raisins', N'RSR', N'69bd0c8790973000eb04da38', N'Exact', 5, N'GZ company'),
  (N'RPM Internal Systems', N'RPMINT', N'69bd0befcd1ea15edb06818f', N'Exact', 5, N'GZ company'),
  (N'RSS - JHB', N'RSS', N'6a456b59d2b4565185039d36', N'Exact', 5, N'GZ company'),
  (N'UVSS', N'UVSS', N'69bd0cc79267dbb9a500443b', N'Exact', 5, N'GZ company'),
  (N'YLJ Health', N'YLJ', N'69bd047be847d159d40e4d31', N'Exact', 5, N'GZ company'),
  -- Contains fallbacks
  (N'Able', N'ABLE', NULL, N'Contains', 20, N''),
  (N'AHI', N'AHIC', NULL, N'Contains', 20, N''),
  (N'BHF', N'BHF', NULL, N'Contains', 20, N''),
  (N'Hydra', N'HYDRA', NULL, N'Contains', 20, N''),
  (N'MEDiPOS', N'MEDIPOS', NULL, N'Contains', 15, N''),
  (N'MEDIPOS', N'MEDIPOS', NULL, N'Contains', 15, N''),
  (N'Metsi', N'METSI', NULL, N'Contains', 20, N''),
  (N'Redsun', N'RSR', NULL, N'Contains', 20, N''),
  (N'RPM Internal', N'RPMINT', NULL, N'Contains', 20, N''),
  (N'RSS', N'RSS', NULL, N'Contains', 20, N''),
  (N'YLJ', N'YLJ', NULL, N'Contains', 15, N'')
) AS s(CompanyName, CustomerCode, CompanyId, MatchType, Priority, Notes)
ON t.CompanyName = s.CompanyName AND t.CustomerCode = s.CustomerCode
WHEN MATCHED THEN UPDATE SET
  CompanyId = COALESCE(s.CompanyId, t.CompanyId),
  MatchType = s.MatchType, Priority = s.Priority, Notes = s.Notes,
  Active = 1, UpdatedAtUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (CompanyName, CustomerCode, CompanyId, MatchType, Priority, Notes, Active)
  VALUES (s.CompanyName, s.CustomerCode, s.CompanyId, s.MatchType, s.Priority, s.Notes, 1);
PRINT N'Company map seeded with GZ company names';
GO

-- Ensure AmsConfig + PillarBitdefender for every customer with endpoints
IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarBitdefender') IS NULL
  BEGIN
    ALTER TABLE dbo.Dim_Customer_AmsConfig ADD PillarBitdefender bit NOT NULL
      CONSTRAINT DF_AmsCfg_Bd_Epp455 DEFAULT (0);
  END
END
GO

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarBitdefender') IS NOT NULL
BEGIN
  ;WITH codes AS (
    SELECT DISTINCT UPPER(LTRIM(RTRIM(CustomerCode))) AS CustomerCode
    FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
    WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
  )
  INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, PillarBitdefender, UpdatedAt, UpdatedBy)
  SELECT c.CustomerCode, 1, SYSUTCDATETIME(), N'455_epp'
  FROM codes c
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Dim_Customer_AmsConfig a
    WHERE UPPER(LTRIM(RTRIM(a.CustomerCode))) = c.CustomerCode
  )
  AND EXISTS (SELECT 1 FROM dbo.Dim_Customer d WHERE UPPER(LTRIM(RTRIM(d.CustomerCode))) = c.CustomerCode);

  UPDATE a
  SET PillarBitdefender = 1,
      UpdatedAt = SYSUTCDATETIME(),
      UpdatedBy = N'455_epp'
  FROM dbo.Dim_Customer_AmsConfig AS a
  WHERE EXISTS (
    SELECT 1 FROM dbo.Bitdefender_Endpoints e WITH (NOLOCK)
    WHERE UPPER(LTRIM(RTRIM(e.CustomerCode))) = UPPER(LTRIM(RTRIM(a.CustomerCode)))
  )
  AND ISNULL(a.PillarBitdefender, 0) = 0;
  PRINT N'PillarBitdefender set for all customers with EPP endpoints';
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
      SET @sql = N'GRANT SELECT ON OBJECT::dbo.Dim_Bitdefender_CompanyMap TO ' + QUOTENAME(@p);
      EXEC sp_executesql @sql;
      SET @sql = N'GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::dbo.Dim_Bitdefender_CompanyMap TO ' + QUOTENAME(@p);
      EXEC sp_executesql @sql;
      SET @sql = N'GRANT SELECT ON OBJECT::dbo.Bitdefender_Endpoints TO ' + QUOTENAME(@p);
      EXEC sp_executesql @sql;
      PRINT N'Granted ' + @p;
    END TRY BEGIN CATCH PRINT ERROR_MESSAGE(); END CATCH
  END
  FETCH NEXT FROM c INTO @p;
END
CLOSE c; DEALLOCATE c;
GO

PRINT N'=== EPP by customer (latest) ===';
SELECT CustomerCode, COUNT(*) AS Cnt
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
GROUP BY CustomerCode
ORDER BY CustomerCode;

PRINT N'=== Unmapped devices ===';
SELECT DeviceName, Fqdn, IpAddress
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = N'');
GO
