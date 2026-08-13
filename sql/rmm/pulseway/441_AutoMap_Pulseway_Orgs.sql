/*
  Auto-map Pulseway OrganizationName -> Dim_Customer (managed SYSPRO only)
  + re-stamp devices/notifications CustomerCode
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;

/* Aliases always win */
MERGE dbo.Dim_Pulseway_OrgMap AS t
USING (
  SELECT OrganizationName, CustomerCode, OrganizationId
  FROM dbo.Dim_Pulseway_OrgAlias WHERE Active = 1
) AS s ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  OrganizationId = COALESCE(s.OrganizationId, t.OrganizationId),
  Active = 1,
  UpdatedAtUtc = SYSUTCDATETIME(),
  Notes = COALESCE(t.Notes, N'from alias')
WHEN NOT MATCHED THEN INSERT (OrganizationName, OrganizationId, CustomerCode, Active, Notes, UpdatedAtUtc)
  VALUES (s.OrganizationName, s.OrganizationId, s.CustomerCode, 1, N'from alias', SYSUTCDATETIME());
GO

;WITH Unmapped AS (
  SELECT
    NULLIF(LTRIM(RTRIM(d.OrganizationName)), N'') AS OrganizationName,
    MAX(d.OrganizationId) AS OrganizationId,
    COUNT_BIG(*) AS DeviceCount
  FROM dbo.Pulseway_Devices AS d WITH (NOLOCK)
  WHERE d.SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
    AND (d.CustomerCode IS NULL OR LTRIM(RTRIM(d.CustomerCode)) = N'')
    AND NULLIF(LTRIM(RTRIM(d.OrganizationName)), N'') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM dbo.Dim_Pulseway_OrgMap m
      WHERE m.Active = 1 AND m.OrganizationName = NULLIF(LTRIM(RTRIM(d.OrganizationName)), N'')
    )
  GROUP BY NULLIF(LTRIM(RTRIM(d.OrganizationName)), N'')
),
Norm AS (
  SELECT
    u.*,
    LOWER(LTRIM(RTRIM(u.OrganizationName))) AS oname,
    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      LTRIM(RTRIM(u.OrganizationName)),
      N'(Pty) Ltd', N''), N'Pty Ltd', N''), N' Pty', N''), N' Limited', N''), N'.', N'')) AS oname_clean
  FROM Unmapped u
),
Cust AS (
  SELECT
    c.CustomerCode,
    c.DisplayName,
    LOWER(LTRIM(RTRIM(c.CustomerCode))) AS cc,
    LOWER(LTRIM(RTRIM(c.DisplayName))) AS dn,
    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      LTRIM(RTRIM(c.DisplayName)),
      N'(Pty) Ltd', N''), N'Pty Ltd', N''), N' Pty', N''), N' Limited', N''), N'.', N'')) AS dn_clean
  FROM dbo.Dim_Customer AS c WITH (NOLOCK)
  WHERE c.Active = 1
    AND NULLIF(LTRIM(RTRIM(c.SqlInstanceName)), N'') IS NOT NULL
),
Scored AS (
  SELECT
    n.OrganizationName,
    n.OrganizationId,
    c.CustomerCode,
    CASE
      WHEN n.oname = c.cc THEN 100
      WHEN n.oname = c.dn THEN 98
      WHEN n.oname_clean = c.dn_clean THEN 96
      WHEN n.oname_clean LIKE c.dn_clean + N'%' OR c.dn_clean LIKE n.oname_clean + N'%' THEN 90
      WHEN n.oname LIKE N'%' + c.cc + N'%' AND LEN(c.cc) >= 3 THEN 88
      ELSE 0
    END AS Score
  FROM Norm n
  CROSS JOIN Cust c
),
Best AS (
  SELECT *
  FROM (
    SELECT s.*, ROW_NUMBER() OVER (PARTITION BY s.OrganizationName ORDER BY s.Score DESC, s.CustomerCode) AS rn
    FROM Scored s
    WHERE s.Score >= 88
  ) x
  WHERE rn = 1
    AND NOT EXISTS (
      SELECT 1 FROM Scored s2
      WHERE s2.OrganizationName = x.OrganizationName
        AND s2.CustomerCode <> x.CustomerCode
        AND s2.Score >= 88
        AND s2.Score >= x.Score - 2
    )
)
MERGE dbo.Dim_Pulseway_OrgMap AS t
USING (
  SELECT b.*
  FROM Best b
  INNER JOIN dbo.Dim_Customer c WITH (NOLOCK)
    ON c.CustomerCode = b.CustomerCode AND c.Active = 1
) AS s ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET
  CustomerCode = s.CustomerCode,
  OrganizationId = COALESCE(s.OrganizationId, t.OrganizationId),
  Active = 1,
  UpdatedAtUtc = SYSUTCDATETIME(),
  Notes = CONCAT(N'auto score=', s.Score)
WHEN NOT MATCHED THEN INSERT (OrganizationName, OrganizationId, CustomerCode, Active, Notes, UpdatedAtUtc)
  VALUES (s.OrganizationName, s.OrganizationId, s.CustomerCode, 1, CONCAT(N'auto score=', s.Score), SYSUTCDATETIME());
GO

/* Re-stamp devices */
UPDATE d
SET d.CustomerCode = m.CustomerCode
FROM dbo.Pulseway_Devices AS d
INNER JOIN dbo.Dim_Pulseway_OrgMap AS m
  ON m.Active = 1
 AND (
      m.OrganizationName = d.OrganizationName
   OR (d.OrganizationId IS NOT NULL AND m.OrganizationId = d.OrganizationId)
 )
WHERE d.CustomerCode IS NULL
   OR LTRIM(RTRIM(d.CustomerCode)) = N''
   OR d.CustomerCode <> m.CustomerCode;
PRINT CONCAT(N'Devices re-stamped: ', @@ROWCOUNT);
GO

UPDATE n
SET n.CustomerCode = m.CustomerCode
FROM dbo.Pulseway_Notifications AS n
INNER JOIN dbo.Dim_Pulseway_OrgMap AS m
  ON m.Active = 1 AND m.OrganizationName = n.OrganizationName
WHERE n.CustomerCode IS NULL OR LTRIM(RTRIM(n.CustomerCode)) = N'';
PRINT CONCAT(N'Notifications re-stamped: ', @@ROWCOUNT);
GO

/* Rebuild summary for latest snap */
DECLARE @Snap date = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));
IF @Snap IS NOT NULL
BEGIN
  DELETE FROM dbo.Pulseway_OrgSummary WHERE SnapshotDate = @Snap;
  INSERT INTO dbo.Pulseway_OrgSummary (
    SnapshotDate, CustomerCode, OrganizationName, DeviceCount, OnlineCount, OfflineCount,
    MaintenanceCount, CriticalAlerts, ElevatedAlerts, NormalAlerts, LowAlerts,
    DiskHighCount, ServerCount, WorkstationCount, NotificationCount, ImportedAt
  )
  SELECT
    @Snap,
    d.CustomerCode,
    MAX(d.OrganizationName),
    COUNT_BIG(*),
    SUM(CASE WHEN d.IsOnline = 1 THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.IsOnline = 0 THEN 1 ELSE 0 END),
    0,
    SUM(ISNULL(d.CriticalNotifications, 0)),
    SUM(ISNULL(d.ElevatedNotifications, 0)),
    0, 0, 0,
    SUM(CASE WHEN d.DeviceType = N'Server' THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.DeviceType = N'Workstation' THEN 1 ELSE 0 END),
    0,
    SYSUTCDATETIME()
  FROM dbo.Pulseway_Devices AS d
  WHERE d.SnapshotDate = @Snap
    AND d.CustomerCode IS NOT NULL AND LTRIM(RTRIM(d.CustomerCode)) <> N''
  GROUP BY d.CustomerCode;
END
GO

PRINT '=== Org map ===';
SELECT OrganizationName, CustomerCode, OrganizationId, Notes FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK) WHERE Active = 1 ORDER BY CustomerCode, OrganizationName;

PRINT '=== Still unmapped orgs ===';
SELECT * FROM dbo.vw_Pulseway_UnmappedOrgs WITH (NOLOCK) ORDER BY DeviceCount DESC;
GO
