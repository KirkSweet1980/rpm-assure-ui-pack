/*
  460 — Disk IOPS + total offline time (servers / RMM)
  Columns on Pulseway_Disks + Pulseway_Devices
  OfflineHours7d derived from snapshot history when OnlinePct missing

  sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -i 460_Ensure_Iops_And_Offline.sql
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

PRINT N'=== 460 IOPS + offline time ===';

/* ---- Disk IOPS columns ---- */
IF OBJECT_ID(N'dbo.Pulseway_Disks', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.Pulseway_Disks', N'ReadIops') IS NULL
    ALTER TABLE dbo.Pulseway_Disks ADD ReadIops decimal(18,2) NULL;
  IF COL_LENGTH(N'dbo.Pulseway_Disks', N'WriteIops') IS NULL
    ALTER TABLE dbo.Pulseway_Disks ADD WriteIops decimal(18,2) NULL;
  IF COL_LENGTH(N'dbo.Pulseway_Disks', N'TotalIops') IS NULL
    ALTER TABLE dbo.Pulseway_Disks ADD TotalIops decimal(18,2) NULL;
  PRINT N'Pulseway_Disks IOPS columns ready';
END
ELSE
  PRINT N'WARN: Pulseway_Disks missing — run Pulseway collect schema first';
GO

/* ---- Device offline time columns ---- */
IF OBJECT_ID(N'dbo.Pulseway_Devices', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'OfflineHoursCurrent') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD OfflineHoursCurrent decimal(12,2) NULL;
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'OfflineHours7d') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD OfflineHours7d decimal(12,2) NULL;
  IF COL_LENGTH(N'dbo.Pulseway_Devices', N'OfflineHours30d') IS NULL
    ALTER TABLE dbo.Pulseway_Devices ADD OfflineHours30d decimal(12,2) NULL;
  PRINT N'Pulseway_Devices offline hour columns ready';
END
GO

/* Refresh latest disks view with IOPS */
IF OBJECT_ID(N'dbo.vw_Kpi_Rmm_Disks_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Kpi_Rmm_Disks_Latest;
GO
CREATE VIEW dbo.vw_Kpi_Rmm_Disks_Latest
AS
SELECT
  d.DeviceId,
  d.DriveLetter,
  d.TotalGb,
  d.FreeGb,
  d.UsedPct,
  d.CustomerCode,
  d.DeviceName,
  d.MediaType,
  d.ReadIops,
  d.WriteIops,
  d.TotalIops,
  d.SnapshotDate,
  d.ImportedAt
FROM dbo.Pulseway_Disks AS d WITH (NOLOCK)
INNER JOIN (
  SELECT DeviceId, DriveLetter, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Disks WITH (NOLOCK)
  GROUP BY DeviceId, DriveLetter
) m
  ON m.DeviceId = d.DeviceId
 AND m.DriveLetter = d.DriveLetter
 AND m.mx = d.SnapshotDate;
GO
PRINT N'vw_Kpi_Rmm_Disks_Latest includes IOPS';
GO

/* Devices latest view with offline hours */
IF OBJECT_ID(N'dbo.vw_Kpi_Rmm_Devices_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Kpi_Rmm_Devices_Latest;
GO
CREATE VIEW dbo.vw_Kpi_Rmm_Devices_Latest
AS
SELECT
  d.CustomerCode,
  d.DeviceId,
  d.Name,
  d.IsOnline,
  d.OsName,
  d.DeviceType,
  d.CriticalNotifications,
  d.ElevatedNotifications,
  d.LastSeenOnline,
  d.OrganizationName,
  d.IpAddress,
  d.CpuUsagePct,
  d.MemoryUsagePct,
  d.OnlinePct,
  d.UptimeDays,
  d.LastBootAt,
  d.PatchInstalledCount,
  d.PatchMissingCount,
  d.PatchPendingCount,
  d.OfflineHoursCurrent,
  d.OfflineHours7d,
  d.OfflineHours30d,
  d.SnapshotDate,
  d.ImportedAt
FROM dbo.Pulseway_Devices AS d WITH (NOLOCK)
INNER JOIN (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Pulseway_Devices WITH (NOLOCK)
  WHERE CustomerCode IS NOT NULL AND LTRIM(RTRIM(CustomerCode)) <> N''
  GROUP BY CustomerCode
) m ON m.CustomerCode = d.CustomerCode AND m.mx = d.SnapshotDate
WHERE d.CustomerCode IS NOT NULL;
GO
PRINT N'vw_Kpi_Rmm_Devices_Latest includes offline hours';
GO

/* Recompute offline hours for latest snap from history + current offline */
DECLARE @Snap date = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));
IF @Snap IS NULL
BEGIN
  PRINT N'No devices to recompute offline hours';
END
ELSE
BEGIN
  /* Current offline stretch: hours since LastSeenOnline when offline */
  UPDATE d
  SET OfflineHoursCurrent =
    CASE
      WHEN d.IsOnline = 0 AND d.LastSeenOnline IS NOT NULL
        THEN CAST(DATEDIFF(MINUTE, d.LastSeenOnline, SYSUTCDATETIME()) / 60.0 AS decimal(12,2))
      WHEN d.IsOnline = 0 THEN d.OfflineHoursCurrent
      WHEN d.IsOnline = 1 THEN 0
      ELSE d.OfflineHoursCurrent
    END
  FROM dbo.Pulseway_Devices AS d
  WHERE d.SnapshotDate = @Snap;

  /* Prefer OfflineHoursCurrent already set by collect from "Offline Xd Xh" (keep if larger / present) */
  /* no-op — collect is source of truth for Offline string duration */

  /* 7d / 30d from OnlinePct ONLY when present (real availability) — never invent from IsOnline */
  UPDATE d
  SET
    OfflineHours7d =
      CASE
        WHEN d.OnlinePct IS NOT NULL
          THEN CAST((100.0 - CASE WHEN d.OnlinePct < 0 THEN 0 WHEN d.OnlinePct > 100 THEN 100 ELSE d.OnlinePct END) / 100.0 * 7.0 * 24.0 AS decimal(12,2))
        ELSE d.OfflineHours7d
      END,
    OfflineHours30d =
      CASE
        WHEN d.OnlinePct IS NOT NULL
          THEN CAST((100.0 - CASE WHEN d.OnlinePct < 0 THEN 0 WHEN d.OnlinePct > 100 THEN 100 ELSE d.OnlinePct END) / 100.0 * 30.0 * 24.0 AS decimal(12,2))
        ELSE d.OfflineHours30d
      END
  FROM dbo.Pulseway_Devices AS d
  WHERE d.SnapshotDate = @Snap
    AND d.OnlinePct IS NOT NULL;


  /* Fallback 7d/30d from daily IsOnline history (1 sample/day) */
  ;WITH hist AS (
    SELECT
      DeviceId,
      SnapshotDate,
      IsOnline,
      CASE WHEN IsOnline = 0 OR IsOnline IS NULL THEN 1 ELSE 0 END AS OffDay
    FROM dbo.Pulseway_Devices WITH (NOLOCK)
    WHERE SnapshotDate >= DATEADD(day, -30, @Snap)
  ),
  agg AS (
    SELECT
      DeviceId,
      SUM(CASE WHEN SnapshotDate >= DATEADD(day, -7, @Snap) THEN OffDay ELSE 0 END) * 24.0 AS Hrs7,
      SUM(OffDay) * 24.0 AS Hrs30
    FROM hist
    GROUP BY DeviceId
  )
  UPDATE d
  SET
    OfflineHours7d = CASE WHEN d.OfflineHours7d IS NULL THEN CAST(a.Hrs7 AS decimal(12,2)) ELSE d.OfflineHours7d END,
    OfflineHours30d = CASE WHEN d.OfflineHours30d IS NULL THEN CAST(a.Hrs30 AS decimal(12,2)) ELSE d.OfflineHours30d END
  FROM dbo.Pulseway_Devices AS d
  INNER JOIN agg AS a ON a.DeviceId = d.DeviceId
  WHERE d.SnapshotDate = @Snap;

  PRINT N'Offline hours recomputed for latest snapshot';
END
GO

/* Grants */
BEGIN TRY
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Pulseway_Disks TO [Rpm_collect];
END TRY BEGIN CATCH END CATCH
BEGIN TRY
  GRANT SELECT ON dbo.vw_Kpi_Rmm_Disks_Latest TO [rpmassure];
  GRANT SELECT ON dbo.vw_Kpi_Rmm_Disks_Latest TO [Rpm_collect];
END TRY BEGIN CATCH END CATCH
GO

PRINT N'=== Done 460 ===';
GO
