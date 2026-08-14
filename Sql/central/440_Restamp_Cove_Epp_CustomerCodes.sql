/*
  Stamp Cove + Bitdefender CustomerCode from maps and display names.
  Only fills blank codes — never overwrites an existing stamp.
  Safe for every customer (Redsun, AHIC, UVSS, …).
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Cove_DeviceStatistics', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.Dim_Cove_PartnerMap', N'U') IS NOT NULL
BEGIN
  ;WITH hit AS (
    SELECT
      d.SnapshotDate,
      d.AccountId,
      m.CustomerCode,
      ROW_NUMBER() OVER (
        PARTITION BY d.SnapshotDate, d.AccountId
        ORDER BY LEN(LTRIM(RTRIM(m.PartnerName))) DESC
      ) AS rn
    FROM dbo.Cove_DeviceStatistics AS d
    INNER JOIN dbo.Dim_Cove_PartnerMap AS m
      ON ISNULL(m.Active, 1) = 1
     AND NULLIF(LTRIM(RTRIM(m.CustomerCode)), N'') IS NOT NULL
    WHERE (d.CustomerCode IS NULL OR LTRIM(RTRIM(d.CustomerCode)) = N'')
      AND (
        (m.PartnerId IS NOT NULL AND d.PartnerId IS NOT NULL AND m.PartnerId = d.PartnerId)
        OR UPPER(LTRIM(RTRIM(ISNULL(d.Product, N'')))) = UPPER(LTRIM(RTRIM(m.PartnerName)))
        OR (
          LEN(LTRIM(RTRIM(m.PartnerName))) >= 6
          AND UPPER(ISNULL(d.Product, N'')) LIKE N'%' + UPPER(LTRIM(RTRIM(m.PartnerName))) + N'%'
        )
      )
  )
  UPDATE d
  SET d.CustomerCode = h.CustomerCode
  FROM dbo.Cove_DeviceStatistics AS d
  INNER JOIN hit AS h
    ON h.SnapshotDate = d.SnapshotDate AND h.AccountId = d.AccountId AND h.rn = 1
  WHERE d.CustomerCode IS NULL OR LTRIM(RTRIM(d.CustomerCode)) = N'';

  IF OBJECT_ID(N'dbo.Dim_Customer', N'U') IS NOT NULL
  BEGIN
    ;WITH hit2 AS (
      SELECT
        d.SnapshotDate,
        d.AccountId,
        c.CustomerCode,
        ROW_NUMBER() OVER (
          PARTITION BY d.SnapshotDate, d.AccountId
          ORDER BY LEN(LTRIM(RTRIM(c.DisplayName))) DESC
        ) AS rn
      FROM dbo.Cove_DeviceStatistics AS d
      INNER JOIN dbo.Dim_Customer AS c
        ON ISNULL(c.Active, 1) = 1
       AND LEN(LTRIM(RTRIM(ISNULL(c.DisplayName, N'')))) >= 8
      WHERE (d.CustomerCode IS NULL OR LTRIM(RTRIM(d.CustomerCode)) = N'')
        AND (
          UPPER(ISNULL(d.Product, N'')) LIKE N'%' + UPPER(LTRIM(RTRIM(c.DisplayName))) + N'%'
          OR UPPER(ISNULL(d.DeviceName, N'')) LIKE N'%' + UPPER(LTRIM(RTRIM(c.DisplayName))) + N'%'
          OR UPPER(ISNULL(d.MachineName, N'')) LIKE N'%' + UPPER(LTRIM(RTRIM(c.DisplayName))) + N'%'
        )
    )
    UPDATE d
    SET d.CustomerCode = h.CustomerCode
    FROM dbo.Cove_DeviceStatistics AS d
    INNER JOIN hit2 AS h
      ON h.SnapshotDate = d.SnapshotDate AND h.AccountId = d.AccountId AND h.rn = 1
    WHERE d.CustomerCode IS NULL OR LTRIM(RTRIM(d.CustomerCode)) = N'';
  END
  PRINT 'Cove CustomerCode restamp done';
END
GO

IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.Dim_Bitdefender_CompanyMap', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.Bitdefender_Endpoints', N'CompanyName') IS NOT NULL
BEGIN
  ;WITH hit AS (
    SELECT
      e.SnapshotDate,
      e.EndpointId,
      m.CustomerCode,
      ROW_NUMBER() OVER (
        PARTITION BY e.SnapshotDate, e.EndpointId
        ORDER BY LEN(LTRIM(RTRIM(m.CompanyName))) DESC
      ) AS rn
    FROM dbo.Bitdefender_Endpoints AS e
    INNER JOIN dbo.Dim_Bitdefender_CompanyMap AS m
      ON ISNULL(m.Active, 1) = 1
     AND NULLIF(LTRIM(RTRIM(m.CustomerCode)), N'') IS NOT NULL
     AND m.CompanyName NOT LIKE N'Invalid%'
     AND m.CompanyName NOT LIKE N'%column name%'
    WHERE (e.CustomerCode IS NULL OR LTRIM(RTRIM(e.CustomerCode)) = N'')
      AND (
        UPPER(LTRIM(RTRIM(ISNULL(e.CompanyName, N'')))) = UPPER(LTRIM(RTRIM(m.CompanyName)))
        OR (
          LEN(LTRIM(RTRIM(m.CompanyName))) >= 6
          AND UPPER(ISNULL(e.CompanyName, N'')) LIKE N'%' + UPPER(LTRIM(RTRIM(m.CompanyName))) + N'%'
        )
      )
  )
  UPDATE e
  SET e.CustomerCode = h.CustomerCode
  FROM dbo.Bitdefender_Endpoints AS e
  INNER JOIN hit AS h
    ON h.SnapshotDate = e.SnapshotDate AND h.EndpointId = e.EndpointId AND h.rn = 1
  WHERE e.CustomerCode IS NULL OR LTRIM(RTRIM(e.CustomerCode)) = N'';
  PRINT 'EPP company-map restamp done';
END
GO

IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.Dim_Customer', N'U') IS NOT NULL
BEGIN
  ;WITH hit AS (
    SELECT
      e.SnapshotDate,
      e.EndpointId,
      c.CustomerCode,
      ROW_NUMBER() OVER (
        PARTITION BY e.SnapshotDate, e.EndpointId
        ORDER BY LEN(LTRIM(RTRIM(c.DisplayName))) DESC
      ) AS rn
    FROM dbo.Bitdefender_Endpoints AS e
    INNER JOIN dbo.Dim_Customer AS c
      ON ISNULL(c.Active, 1) = 1
     AND LEN(LTRIM(RTRIM(ISNULL(c.DisplayName, N'')))) >= 8
    WHERE (e.CustomerCode IS NULL OR LTRIM(RTRIM(e.CustomerCode)) = N'')
      AND (
        UPPER(ISNULL(e.DeviceName, N'')) LIKE N'%' + UPPER(LTRIM(RTRIM(c.DisplayName))) + N'%'
        OR UPPER(ISNULL(e.Fqdn, N'')) LIKE N'%' + UPPER(LTRIM(RTRIM(c.DisplayName))) + N'%'
      )
  )
  UPDATE e
  SET e.CustomerCode = h.CustomerCode
  FROM dbo.Bitdefender_Endpoints AS e
  INNER JOIN hit AS h
    ON h.SnapshotDate = e.SnapshotDate AND h.EndpointId = e.EndpointId AND h.rn = 1
  WHERE e.CustomerCode IS NULL OR LTRIM(RTRIM(e.CustomerCode)) = N'';
  PRINT 'EPP display-name restamp done';
END
GO
