/*
  One identity table for every vendor map.
  Collectors stamp CustomerCode from here. UI does not remap.
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Dim_ExternalIdentity', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_ExternalIdentity
  (
    IdentityId     uniqueidentifier NOT NULL CONSTRAINT DF_ExtId_Id DEFAULT (NEWSEQUENTIALID()),
    Source         nvarchar(40)  NOT NULL,  -- COVE | PULSEWAY | FRESHDESK | EPP | GRAPH | HOST
    MatchKind      nvarchar(20)  NOT NULL,  -- id | name | alias | host-prefix
    ExternalId     nvarchar(80)  NULL,
    ExternalName   nvarchar(200) NULL,
    CustomerCode   nvarchar(50)  NOT NULL,
    Active         bit           NOT NULL CONSTRAINT DF_ExtId_Active DEFAULT (1),
    Notes          nvarchar(400) NULL,
    CreatedAtUtc   datetime2(3)  NOT NULL CONSTRAINT DF_ExtId_Created DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc   datetime2(3)  NOT NULL CONSTRAINT DF_ExtId_Updated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_ExternalIdentity PRIMARY KEY (IdentityId)
  );
  CREATE UNIQUE INDEX UQ_ExtId_Natural
    ON dbo.Dim_ExternalIdentity (Source, MatchKind, ExternalName, ExternalId)
    WHERE Active = 1;
  CREATE INDEX IX_ExtId_Customer ON dbo.Dim_ExternalIdentity (CustomerCode) WHERE Active = 1;
  CREATE INDEX IX_ExtId_SourceName ON dbo.Dim_ExternalIdentity (Source, ExternalName) WHERE Active = 1;
  PRINT N'Created Dim_ExternalIdentity';
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_RefreshExternalIdentityFromMaps
AS
BEGIN
  SET NOCOUNT ON;

  IF OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NOT NULL
    MERGE dbo.Dim_ExternalIdentity AS t
    USING (
      SELECT N'COVE' AS Source, N'name' AS MatchKind,
             CONVERT(nvarchar(80), PartnerId) AS ExternalId,
             PartnerName AS ExternalName, CustomerCode,
             N'from Dim_Cove_PartnerMap' AS Notes
      FROM dbo.Dim_Cove_PartnerMap
      WHERE Active = 1 AND NULLIF(LTRIM(RTRIM(PartnerName)), N'') IS NOT NULL
    ) AS s
      ON t.Source = s.Source AND t.MatchKind = s.MatchKind
     AND ISNULL(t.ExternalName, N'') = ISNULL(s.ExternalName, N'')
     AND ISNULL(t.ExternalId, N'') = ISNULL(s.ExternalId, N'')
    WHEN MATCHED THEN UPDATE SET t.CustomerCode = s.CustomerCode, t.Active = 1, t.Notes = s.Notes, t.UpdatedAtUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (Source, MatchKind, ExternalId, ExternalName, CustomerCode, Active, Notes)
      VALUES (s.Source, s.MatchKind, s.ExternalId, s.ExternalName, s.CustomerCode, 1, s.Notes);

  IF OBJECT_ID(N'dbo.Dim_Cove_PartnerAlias', N'U') IS NOT NULL
    MERGE dbo.Dim_ExternalIdentity AS t
    USING (
      SELECT N'COVE' AS Source, N'alias' AS MatchKind,
             CONVERT(nvarchar(80), PartnerId) AS ExternalId,
             PartnerName AS ExternalName, CustomerCode,
             N'from Dim_Cove_PartnerAlias' AS Notes
      FROM dbo.Dim_Cove_PartnerAlias
      WHERE Active = 1 AND NULLIF(LTRIM(RTRIM(PartnerName)), N'') IS NOT NULL
    ) AS s
      ON t.Source = s.Source AND t.MatchKind = s.MatchKind
     AND ISNULL(t.ExternalName, N'') = ISNULL(s.ExternalName, N'')
     AND ISNULL(t.ExternalId, N'') = ISNULL(s.ExternalId, N'')
    WHEN MATCHED THEN UPDATE SET t.CustomerCode = s.CustomerCode, t.Active = 1, t.Notes = s.Notes, t.UpdatedAtUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (Source, MatchKind, ExternalId, ExternalName, CustomerCode, Active, Notes)
      VALUES (s.Source, s.MatchKind, s.ExternalId, s.ExternalName, s.CustomerCode, 1, s.Notes);

  IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgMap', N'U') IS NOT NULL
    MERGE dbo.Dim_ExternalIdentity AS t
    USING (
      SELECT N'PULSEWAY' AS Source, N'name' AS MatchKind,
             CONVERT(nvarchar(80), OrganizationId) AS ExternalId,
             OrganizationName AS ExternalName, CustomerCode,
             N'from Dim_Pulseway_OrgMap' AS Notes
      FROM dbo.Dim_Pulseway_OrgMap
      WHERE ISNULL(Active, 1) = 1 AND NULLIF(LTRIM(RTRIM(OrganizationName)), N'') IS NOT NULL
    ) AS s
      ON t.Source = s.Source AND t.MatchKind = s.MatchKind
     AND ISNULL(t.ExternalName, N'') = ISNULL(s.ExternalName, N'')
     AND ISNULL(t.ExternalId, N'') = ISNULL(s.ExternalId, N'')
    WHEN MATCHED THEN UPDATE SET t.CustomerCode = s.CustomerCode, t.Active = 1, t.Notes = s.Notes, t.UpdatedAtUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (Source, MatchKind, ExternalId, ExternalName, CustomerCode, Active, Notes)
      VALUES (s.Source, s.MatchKind, s.ExternalId, s.ExternalName, s.CustomerCode, 1, s.Notes);

  IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgAlias', N'U') IS NOT NULL
    MERGE dbo.Dim_ExternalIdentity AS t
    USING (
      SELECT N'PULSEWAY' AS Source, N'alias' AS MatchKind,
             CONVERT(nvarchar(80), OrganizationId) AS ExternalId,
             OrganizationName AS ExternalName, CustomerCode,
             N'from Dim_Pulseway_OrgAlias' AS Notes
      FROM dbo.Dim_Pulseway_OrgAlias
      WHERE Active = 1 AND NULLIF(LTRIM(RTRIM(OrganizationName)), N'') IS NOT NULL
    ) AS s
      ON t.Source = s.Source AND t.MatchKind = s.MatchKind
     AND ISNULL(t.ExternalName, N'') = ISNULL(s.ExternalName, N'')
     AND ISNULL(t.ExternalId, N'') = ISNULL(s.ExternalId, N'')
    WHEN MATCHED THEN UPDATE SET t.CustomerCode = s.CustomerCode, t.Active = 1, t.Notes = s.Notes, t.UpdatedAtUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (Source, MatchKind, ExternalId, ExternalName, CustomerCode, Active, Notes)
      VALUES (s.Source, s.MatchKind, s.ExternalId, s.ExternalName, s.CustomerCode, 1, s.Notes);

  IF OBJECT_ID(N'dbo.Dim_Freshdesk_CompanyMap', N'U') IS NOT NULL
    MERGE dbo.Dim_ExternalIdentity AS t
    USING (
      SELECT N'FRESHDESK' AS Source, N'name' AS MatchKind,
             CONVERT(nvarchar(80), CompanyId) AS ExternalId,
             CompanyName AS ExternalName, CustomerCode,
             N'from Dim_Freshdesk_CompanyMap' AS Notes
      FROM dbo.Dim_Freshdesk_CompanyMap
      WHERE Active = 1 AND NULLIF(LTRIM(RTRIM(CompanyName)), N'') IS NOT NULL
    ) AS s
      ON t.Source = s.Source AND t.MatchKind = s.MatchKind
     AND ISNULL(t.ExternalName, N'') = ISNULL(s.ExternalName, N'')
     AND ISNULL(t.ExternalId, N'') = ISNULL(s.ExternalId, N'')
    WHEN MATCHED THEN UPDATE SET t.CustomerCode = s.CustomerCode, t.Active = 1, t.Notes = s.Notes, t.UpdatedAtUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (Source, MatchKind, ExternalId, ExternalName, CustomerCode, Active, Notes)
      VALUES (s.Source, s.MatchKind, s.ExternalId, s.ExternalName, s.CustomerCode, 1, s.Notes);

  IF OBJECT_ID(N'dbo.Dim_Bitdefender_CompanyMap', N'U') IS NOT NULL
    MERGE dbo.Dim_ExternalIdentity AS t
    USING (
      SELECT N'EPP' AS Source, N'name' AS MatchKind,
             CONVERT(nvarchar(80), CompanyId) AS ExternalId,
             CompanyName AS ExternalName, CustomerCode,
             N'from Dim_Bitdefender_CompanyMap' AS Notes
      FROM dbo.Dim_Bitdefender_CompanyMap
      WHERE ISNULL(Active, 1) = 1 AND NULLIF(LTRIM(RTRIM(CompanyName)), N'') IS NOT NULL
    ) AS s
      ON t.Source = s.Source AND t.MatchKind = s.MatchKind
     AND ISNULL(t.ExternalName, N'') = ISNULL(s.ExternalName, N'')
     AND ISNULL(t.ExternalId, N'') = ISNULL(s.ExternalId, N'')
    WHEN MATCHED THEN UPDATE SET t.CustomerCode = s.CustomerCode, t.Active = 1, t.Notes = s.Notes, t.UpdatedAtUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (Source, MatchKind, ExternalId, ExternalName, CustomerCode, Active, Notes)
      VALUES (s.Source, s.MatchKind, s.ExternalId, s.ExternalName, s.CustomerCode, 1, s.Notes);

  IF OBJECT_ID(N'dbo.Dim_Bitdefender_NameMap', N'U') IS NOT NULL
    MERGE dbo.Dim_ExternalIdentity AS t
    USING (
      SELECT N'EPP' AS Source, N'host-prefix' AS MatchKind,
             CONVERT(nvarchar(80), NULL) AS ExternalId,
             CASE
               WHEN m.MatchType = N'Prefix'   THEN m.Pattern + CASE WHEN m.Pattern LIKE N'%[%]%' THEN N'' ELSE N'%' END
               WHEN m.MatchType = N'Contains' THEN N'%' + m.Pattern + N'%'
               ELSE m.Pattern
             END AS ExternalName,
             m.CustomerCode,
             N'from Dim_Bitdefender_NameMap' AS Notes
      FROM dbo.Dim_Bitdefender_NameMap AS m
      WHERE ISNULL(m.Active, 1) = 1 AND NULLIF(LTRIM(RTRIM(m.Pattern)), N'') IS NOT NULL
    ) AS s
      ON t.Source = s.Source AND t.MatchKind = s.MatchKind
     AND ISNULL(t.ExternalName, N'') = ISNULL(s.ExternalName, N'')
     AND ISNULL(t.ExternalId, N'') = ISNULL(s.ExternalId, N'')
    WHEN MATCHED THEN UPDATE SET t.CustomerCode = s.CustomerCode, t.Active = 1, t.Notes = s.Notes, t.UpdatedAtUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (Source, MatchKind, ExternalId, ExternalName, CustomerCode, Active, Notes)
      VALUES (s.Source, s.MatchKind, s.ExternalId, s.ExternalName, s.CustomerCode, 1, s.Notes);

  ;WITH hosts AS (
    SELECT * FROM (VALUES
      (N'HOST', N'host-prefix', N'AHI%',   N'AHIC',  N'hostname prefix'),
      (N'HOST', N'host-prefix', N'AHIC%',  N'AHIC',  N'hostname prefix'),
      (N'HOST', N'host-prefix', N'AT-%',   N'ABLE',  N'hostname prefix'),
      (N'HOST', N'host-prefix', N'ABLE%',  N'ABLE',  N'hostname prefix'),
      (N'HOST', N'host-prefix', N'UVSS%',  N'UVSS',  N'hostname prefix'),
      (N'HOST', N'host-prefix', N'BHF%',   N'BHF',   N'hostname prefix'),
      (N'HOST', N'host-prefix', N'PCNS%',  N'BHF',   N'hostname prefix'),
      (N'HOST', N'host-prefix', N'PNCS%',  N'BHF',   N'hostname prefix'),
      (N'HOST', N'host-prefix', N'HYDRA%', N'HYDRA', N'hostname prefix'),
      (N'HOST', N'host-prefix', N'RSR%',   N'RSR',   N'hostname prefix'),
      (N'HOST', N'host-prefix', N'RSS%',   N'RSS',   N'hostname prefix'),
      (N'HOST', N'host-prefix', N'SBS%',   N'SBS',   N'hostname prefix'),
      (N'HOST', N'host-prefix', N'SIRF%',  N'SIRF',  N'hostname prefix'),
      (N'HOST', N'host-prefix', N'SIRZA%', N'SIRF',  N'hostname prefix'),
      (N'HOST', N'host-prefix', N'RPM%',   N'RPMINT',N'hostname prefix'),
      (N'HOST', N'host-prefix', N'IB-%',   N'IB',    N'hostname prefix'),
      (N'HOST', N'host-prefix', N'IBSQL%', N'IB',    N'hostname prefix'),
      (N'HOST', N'host-prefix', N'METSI%', N'METSI', N'hostname prefix'),
      (N'HOST', N'host-prefix', N'YLJ%',   N'YLJ',   N'hostname prefix'),
      (N'HOST', N'host-prefix', N'MEDIPOS%', N'MEDIPOS', N'hostname prefix'),
      (N'HOST', N'host-prefix', N'VAULT%', N'VAULT', N'hostname prefix')
    ) v(Source, MatchKind, ExternalName, CustomerCode, Notes)
  )
  MERGE dbo.Dim_ExternalIdentity AS t
  USING hosts AS s
    ON t.Source = s.Source AND t.MatchKind = s.MatchKind AND t.ExternalName = s.ExternalName
  WHEN MATCHED THEN UPDATE SET
    t.CustomerCode = s.CustomerCode, t.Active = 1, t.Notes = s.Notes, t.UpdatedAtUtc = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (Source, MatchKind, ExternalName, CustomerCode, Active, Notes)
    VALUES (s.Source, s.MatchKind, s.ExternalName, s.CustomerCode, 1, s.Notes);

  DECLARE @n int;
  SELECT @n = COUNT(*) FROM dbo.Dim_ExternalIdentity WHERE Active = 1;
  PRINT CONCAT(N'External identity rows: ', @n);
END
GO


EXEC dbo.usp_RefreshExternalIdentityFromMaps;
GO

CREATE OR ALTER PROCEDURE dbo.usp_StampCoveFromIdentity
AS
BEGIN
  SET NOCOUNT ON;
  IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NULL RETURN;

  UPDATE d
  SET d.CustomerCode = x.CustomerCode
  FROM dbo.Cove_DeviceStatistics AS d
  CROSS APPLY (
    SELECT TOP 1 i.CustomerCode
    FROM dbo.Dim_ExternalIdentity AS i
    WHERE i.Active = 1
      AND (
        (i.Source = N'COVE' AND i.MatchKind IN (N'name', N'alias')
          AND i.ExternalName IS NOT NULL
          AND (
            UPPER(LTRIM(RTRIM(i.ExternalName))) = UPPER(LTRIM(RTRIM(ISNULL(d.Product, N''))))
            OR (
              LEN(LTRIM(RTRIM(i.ExternalName))) >= 3
              AND NULLIF(LTRIM(RTRIM(d.Product)), N'') IS NOT NULL
              AND (
                UPPER(d.Product) LIKE N'%' + UPPER(i.ExternalName) + N'%'
                OR UPPER(i.ExternalName) LIKE N'%' + UPPER(LTRIM(RTRIM(d.Product))) + N'%'
              )
            )
          )
        )
        OR (i.Source = N'COVE' AND i.MatchKind = N'id'
          AND i.ExternalId IS NOT NULL AND d.PartnerId IS NOT NULL
          AND i.ExternalId = CONVERT(nvarchar(80), d.PartnerId))
        OR (i.Source = N'HOST' AND i.MatchKind = N'host-prefix'
          AND (
            d.DeviceName LIKE i.ExternalName
            OR d.MachineName LIKE i.ExternalName
            OR d.Product LIKE i.ExternalName
          ))
      )
    ORDER BY CASE i.MatchKind WHEN N'id' THEN 0 WHEN N'name' THEN 1 WHEN N'alias' THEN 2 ELSE 3 END
  ) AS x
  WHERE d.CustomerCode IS NULL
     OR d.CustomerCode <> x.CustomerCode;

  DECLARE @stamped int = @@ROWCOUNT;
  PRINT CONCAT(N'Cove rows restamped from identity: ', @stamped);
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_StampPulsewayFromIdentity
AS
BEGIN
  SET NOCOUNT ON;
  IF OBJECT_ID(N'dbo.Pulseway_Devices', N'U') IS NULL RETURN;

  UPDATE d
  SET d.CustomerCode = x.CustomerCode
  FROM dbo.Pulseway_Devices AS d
  CROSS APPLY (
    SELECT TOP 1 i.CustomerCode
    FROM dbo.Dim_ExternalIdentity AS i
    WHERE i.Active = 1
      AND (
        (i.Source = N'PULSEWAY' AND i.MatchKind IN (N'name', N'alias')
          AND i.ExternalName IS NOT NULL
          AND UPPER(LTRIM(RTRIM(i.ExternalName))) = UPPER(LTRIM(RTRIM(ISNULL(d.OrganizationName, N'')))))
        OR (i.Source = N'HOST' AND i.MatchKind = N'host-prefix'
          AND (
            d.Name LIKE i.ExternalName
            OR ISNULL(d.OrganizationName, N'') LIKE i.ExternalName
          ))
      )
    ORDER BY CASE i.MatchKind WHEN N'id' THEN 0 WHEN N'name' THEN 1 WHEN N'alias' THEN 2 ELSE 3 END
  ) AS x
  WHERE d.CustomerCode IS NULL
     OR d.CustomerCode <> x.CustomerCode;

  DECLARE @dev int = @@ROWCOUNT;

  IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL
    UPDATE k
    SET k.CustomerCode = d.CustomerCode
    FROM dbo.Pulseway_Disks AS k
    INNER JOIN dbo.Pulseway_Devices AS d
      ON d.DeviceId = k.DeviceId
     AND d.SnapshotDate = k.SnapshotDate
    WHERE d.CustomerCode IS NOT NULL
      AND (k.CustomerCode IS NULL OR k.CustomerCode <> d.CustomerCode);

  IF OBJECT_ID(N'dbo.Pulseway_OrgSummary', N'U') IS NOT NULL
    UPDATE s
    SET s.CustomerCode = x.CustomerCode
    FROM dbo.Pulseway_OrgSummary AS s
    CROSS APPLY (
      SELECT TOP 1 i.CustomerCode
      FROM dbo.Dim_ExternalIdentity AS i
      WHERE i.Active = 1 AND i.Source = N'PULSEWAY'
        AND i.ExternalName IS NOT NULL
        AND UPPER(LTRIM(RTRIM(i.ExternalName))) = UPPER(LTRIM(RTRIM(ISNULL(s.OrganizationName, N''))))
      ORDER BY CASE i.MatchKind WHEN N'id' THEN 0 WHEN N'name' THEN 1 ELSE 2 END
    ) AS x
    WHERE s.CustomerCode IS NULL OR s.CustomerCode <> x.CustomerCode;

  PRINT CONCAT(N'Pulseway devices restamped from identity: ', @dev);
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_StampEppFromIdentity
AS
BEGIN
  SET NOCOUNT ON;
  IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NULL RETURN;

  IF COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'CompanyName') IS NOT NULL
    EXEC(N'
UPDATE e
SET e.CustomerCode = x.CustomerCode
FROM dbo.Bitdefender_Endpoints AS e
CROSS APPLY (
  SELECT TOP 1 i.CustomerCode
  FROM dbo.Dim_ExternalIdentity AS i
  WHERE i.Active = 1
    AND i.Source = N''EPP'' AND i.MatchKind = N''name''
    AND i.ExternalName IS NOT NULL
    AND UPPER(LTRIM(RTRIM(i.ExternalName))) = UPPER(LTRIM(RTRIM(ISNULL(e.CompanyName, N''''))))
) AS x
WHERE e.CustomerCode IS NULL OR e.CustomerCode <> x.CustomerCode;
');

  UPDATE e
  SET e.CustomerCode = x.CustomerCode
  FROM dbo.Bitdefender_Endpoints AS e
  CROSS APPLY (
    SELECT TOP 1 i.CustomerCode
    FROM dbo.Dim_ExternalIdentity AS i
    WHERE i.Active = 1
      AND i.MatchKind = N'host-prefix'
      AND i.Source IN (N'EPP', N'HOST')
      AND i.ExternalName IS NOT NULL
      AND (
        e.DeviceName LIKE i.ExternalName
        OR ISNULL(e.Fqdn, N'') LIKE i.ExternalName
      )
    ORDER BY CASE i.Source WHEN N'EPP' THEN 0 ELSE 1 END
  ) AS x
  WHERE e.CustomerCode IS NULL OR e.CustomerCode <> x.CustomerCode;

  PRINT CONCAT(N'EPP endpoints restamped from identity: ', @@ROWCOUNT);
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_StampFreshdeskFromIdentity
AS
BEGIN
  SET NOCOUNT ON;
  IF OBJECT_ID(N'dbo.Freshdesk_Tickets', N'U') IS NULL RETURN;

  UPDATE t
  SET t.CustomerCode = x.CustomerCode
  FROM dbo.Freshdesk_Tickets AS t
  CROSS APPLY (
    SELECT TOP 1 i.CustomerCode
    FROM dbo.Dim_ExternalIdentity AS i
    WHERE i.Active = 1
      AND i.Source = N'FRESHDESK'
      AND (
        (i.MatchKind = N'name' AND i.ExternalName IS NOT NULL
          AND UPPER(LTRIM(RTRIM(i.ExternalName))) = UPPER(LTRIM(RTRIM(ISNULL(t.CompanyName, N'')))))
        OR (i.MatchKind = N'id' AND i.ExternalId IS NOT NULL AND t.CompanyId IS NOT NULL
          AND i.ExternalId = CONVERT(nvarchar(80), t.CompanyId))
      )
    ORDER BY CASE i.MatchKind WHEN N'id' THEN 0 ELSE 1 END
  ) AS x
  WHERE t.CustomerCode IS NULL OR t.CustomerCode <> x.CustomerCode;

  PRINT CONCAT(N'Freshdesk tickets restamped from identity: ', @@ROWCOUNT);
END
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'Rpm_collect')
BEGIN
  GRANT SELECT, INSERT, UPDATE ON dbo.Dim_ExternalIdentity TO [Rpm_collect];
  GRANT EXECUTE ON dbo.usp_RefreshExternalIdentityFromMaps TO [Rpm_collect];
  GRANT EXECUTE ON dbo.usp_StampCoveFromIdentity TO [Rpm_collect];
  GRANT EXECUTE ON dbo.usp_StampPulsewayFromIdentity TO [Rpm_collect];
  GRANT EXECUTE ON dbo.usp_StampEppFromIdentity TO [Rpm_collect];
  GRANT EXECUTE ON dbo.usp_StampFreshdeskFromIdentity TO [Rpm_collect];
END
GO

PRINT N'530 Dim_ExternalIdentity ready';
GO
