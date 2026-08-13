/*
  458 - VTSERVER belongs to Vault Tech (CustomerCode VAULT), not RSR / RPMINT.
  Also seed Vault company map + EPP cover for VAULT.
  Run as Windows auth: sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -i this file
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

-- 1) Name map: VTSERVER -> VAULT (exact + MAC suffix)
IF OBJECT_ID(N'dbo.Dim_Bitdefender_NameMap', N'U') IS NOT NULL
BEGIN
  -- Remove wrong RPMINT mappings for VTSERVER
  DELETE FROM dbo.Dim_Bitdefender_NameMap
  WHERE UPPER(Pattern) LIKE N'VTSERVER%'
    AND CustomerCode = N'RPMINT';

  MERGE dbo.Dim_Bitdefender_NameMap AS t
  USING (VALUES
    (N'VTSERVER', N'VAULT', N'Exact', 1, N'Vault Tech VTSERVER'),
    (N'VTSERVER-', N'VAULT', N'Prefix', 1, N'Vault Tech VTSERVER MAC suffix'),
    (N'VAULT', N'VAULT', N'Prefix', 10, N'Vault hosts'),
    (N'VAULT-', N'VAULT', N'Prefix', 8, N'Vault- prefix')
  ) AS s(Pattern, CustomerCode, MatchType, Priority, Notes)
  ON t.Pattern = s.Pattern AND t.CustomerCode = s.CustomerCode
  WHEN MATCHED THEN UPDATE SET
    MatchType = s.MatchType, Priority = s.Priority, Notes = s.Notes,
    Active = 1, UpdatedAtUtc = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (Pattern, CustomerCode, MatchType, Priority, Notes, Active)
    VALUES (s.Pattern, s.CustomerCode, s.MatchType, s.Priority, s.Notes, 1);
  PRINT N'VTSERVER NameMap -> VAULT';
END
GO

-- 2) Company map: Vault Tech
IF OBJECT_ID(N'dbo.Dim_Bitdefender_CompanyMap', N'U') IS NOT NULL
BEGIN
  -- Ensure columns exist if older table shape
  IF COL_LENGTH(N'dbo.Dim_Bitdefender_CompanyMap', N'MatchType') IS NULL
    ALTER TABLE dbo.Dim_Bitdefender_CompanyMap ADD MatchType nvarchar(20) NOT NULL CONSTRAINT DF_BdCo_MT458 DEFAULT (N'Contains');
  IF COL_LENGTH(N'dbo.Dim_Bitdefender_CompanyMap', N'Priority') IS NULL
    ALTER TABLE dbo.Dim_Bitdefender_CompanyMap ADD Priority int NOT NULL CONSTRAINT DF_BdCo_Pri458 DEFAULT (100);
  IF COL_LENGTH(N'dbo.Dim_Bitdefender_CompanyMap', N'UpdatedAtUtc') IS NULL
    ALTER TABLE dbo.Dim_Bitdefender_CompanyMap ADD UpdatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_BdCo_Upd458 DEFAULT (SYSUTCDATETIME());
END
GO

IF OBJECT_ID(N'dbo.Dim_Bitdefender_CompanyMap', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Bitdefender_CompanyMap AS t
  USING (VALUES
    (N'Vault Tech', N'VAULT', NULL, N'Contains', 10, N'Vault Tech company'),
    (N'VaultTech', N'VAULT', NULL, N'Contains', 10, N'VaultTech'),
    (N'Vault', N'VAULT', NULL, N'Exact', 30, N'Vault short')
  ) AS s(CompanyName, CustomerCode, CompanyId, MatchType, Priority, Notes)
  ON t.CompanyName = s.CompanyName AND t.CustomerCode = s.CustomerCode
  WHEN MATCHED THEN UPDATE SET
    MatchType = s.MatchType, Priority = s.Priority, Notes = s.Notes,
    Active = 1, UpdatedAtUtc = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (CompanyName, CustomerCode, CompanyId, MatchType, Priority, Notes, Active)
    VALUES (s.CompanyName, s.CustomerCode, s.CompanyId, s.MatchType, s.Priority, s.Notes, 1);
  PRINT N'Company map Vault Tech ready';
END
GO

-- 3) Force latest snap VTSERVER* -> VAULT
IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
BEGIN
  UPDATE e
  SET CustomerCode = N'VAULT'
  FROM dbo.Bitdefender_Endpoints AS e
  WHERE e.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
    AND (
      UPPER(LTRIM(RTRIM(ISNULL(e.DeviceName,N'')))) = N'VTSERVER'
      OR UPPER(ISNULL(e.DeviceName,N'')) LIKE N'VTSERVER-%'
      OR UPPER(ISNULL(e.Fqdn,N'')) LIKE N'VTSERVER%'
    )
    AND ISNULL(e.CustomerCode, N'') <> N'VAULT';
  PRINT N'Forced VTSERVER* -> VAULT on latest snap';
END
GO

-- 4) Dim_Customer + cover pillar if tables exist
IF OBJECT_ID(N'dbo.Dim_Customer', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'VAULT')
  BEGIN
    -- Try insert with common columns only
    BEGIN TRY
      INSERT INTO dbo.Dim_Customer (CustomerCode, DisplayName, Active)
      VALUES (N'VAULT', N'Vault Tech', 1);
      PRINT N'Dim_Customer VAULT inserted';
    END TRY
    BEGIN CATCH
      PRINT N'Dim_Customer VAULT insert soft-fail: ' + ERROR_MESSAGE();
    END CATCH
  END
  ELSE
  BEGIN
    BEGIN TRY
      UPDATE dbo.Dim_Customer
      SET DisplayName = COALESCE(NULLIF(LTRIM(RTRIM(DisplayName)), N''), N'Vault Tech'),
          Active = 1
      WHERE CustomerCode = N'VAULT';
    END TRY BEGIN CATCH END CATCH
  END
END
GO

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarBitdefender') IS NOT NULL
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = N'VAULT')
    BEGIN
      BEGIN TRY
        INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, PillarBitdefender, UpdatedAt, UpdatedBy)
        VALUES (N'VAULT', 1, SYSUTCDATETIME(), N'458_vault_vt');
      END TRY
      BEGIN CATCH
        PRINT N'AmsConfig insert soft-fail: ' + ERROR_MESSAGE();
      END CATCH
    END
    ELSE
    BEGIN
      UPDATE dbo.Dim_Customer_AmsConfig
      SET PillarBitdefender = 1, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'458_vault_vt'
      WHERE CustomerCode = N'VAULT' AND ISNULL(PillarBitdefender, 0) = 0;
    END
  END
END
GO

-- 5) Ensure RSR no longer has VTSERVER
PRINT N'=== VTSERVER (must be VAULT) ===';
SELECT DeviceName, CustomerCode, CompanyName, IpAddress
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND UPPER(ISNULL(DeviceName,N'')) LIKE N'VTSERVER%';

PRINT N'=== RSR devices ===';
SELECT DeviceName, CustomerCode, CompanyName
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND CustomerCode = N'RSR'
ORDER BY DeviceName;

PRINT N'=== VAULT devices ===';
SELECT DeviceName, CustomerCode, CompanyName, IpAddress
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND CustomerCode = N'VAULT'
ORDER BY DeviceName;

PRINT N'=== Counts ===';
SELECT CustomerCode, COUNT(*) AS Cnt
FROM dbo.Bitdefender_Endpoints WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Endpoints WITH (NOLOCK))
  AND CustomerCode IS NOT NULL
GROUP BY CustomerCode
ORDER BY CustomerCode;
GO
