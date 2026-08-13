/*
  459 — Reclass Pulseway DeviceType from OS/name (P1)
  - Windows 11/10/... -> Workstation
  - Windows Server / Server 20xx -> Server
  - Never leave raw "Windows"
  - Workstations do NOT count as servers (SLA / ServerCount)

  sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -i 459_Reclass_DeviceType_ServersOnly.sql
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

PRINT N'=== 459 reclass DeviceType (servers vs workstations) ===';

DECLARE @Snap date = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK));
IF @Snap IS NULL
BEGIN
  PRINT N'No Pulseway_Devices rows.';
  RETURN;
END

PRINT N'SnapshotDate=';
SELECT @Snap AS SnapshotDate;

/* Before */
SELECT ISNULL(DeviceType, N'(null)') AS DeviceType, COUNT(*) AS Cnt
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = @Snap
GROUP BY DeviceType
ORDER BY Cnt DESC;

/* Server first (OS or name cues) */
UPDATE dbo.Pulseway_Devices
SET DeviceType = N'Server'
WHERE SnapshotDate = @Snap
  AND (
    OsName LIKE N'%Windows Server%'
    OR OsName LIKE N'%Server 201%'
    OR OsName LIKE N'%Server 202%'
    OR OsName LIKE N'%Domain Controller%'
    OR DeviceType = N'Server'
    OR Name LIKE N'%-SQL%'
    OR Name LIKE N'%-SRV%'
    OR Name LIKE N'%SRV-%'
    OR Name LIKE N'%-TS0%'
    OR Name LIKE N'%-DC%'
  )
  AND NOT (
    OsName LIKE N'%Windows 11%'
    OR OsName LIKE N'%Windows 10%'
    OR OsName LIKE N'%Windows 8%'
    OR OsName LIKE N'%Windows 7%'
    OR OsName LIKE N'%macOS%'
    OR OsName LIKE N'%Mac OS%'
  );

/* Explicit workstations from client OS */
UPDATE dbo.Pulseway_Devices
SET DeviceType = N'Workstation'
WHERE SnapshotDate = @Snap
  AND (
    OsName LIKE N'%Windows 11%'
    OR OsName LIKE N'%Windows 10%'
    OR OsName LIKE N'%Windows 8%'
    OR OsName LIKE N'%Windows 7%'
    OR OsName LIKE N'%Windows Vista%'
    OR OsName LIKE N'%macOS%'
    OR OsName LIKE N'%Mac OS%'
    OR Name LIKE N'DESKTOP-%'
    OR Name LIKE N'LAPTOP-%'
  );

/* Anything still not Server/Workstation -> Workstation (never inflate server SLA) */
UPDATE dbo.Pulseway_Devices
SET DeviceType = N'Workstation'
WHERE SnapshotDate = @Snap
  AND (DeviceType IS NULL OR DeviceType NOT IN (N'Server', N'Workstation'));

/* After */
PRINT N'=== After reclass ===';
SELECT ISNULL(DeviceType, N'(null)') AS DeviceType, COUNT(*) AS Cnt
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = @Snap
GROUP BY DeviceType
ORDER BY Cnt DESC;

PRINT N'=== By customer (servers only matter for SLA) ===';
SELECT
  ISNULL(CustomerCode, N'(unmapped)') AS CustomerCode,
  COUNT(*) AS Devices,
  SUM(CASE WHEN DeviceType = N'Server' THEN 1 ELSE 0 END) AS Servers,
  SUM(CASE WHEN DeviceType = N'Workstation' THEN 1 ELSE 0 END) AS Workstations
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = @Snap
GROUP BY ISNULL(CustomerCode, N'(unmapped)')
ORDER BY Devices DESC;

/* Rebuild OrgSummary ServerCount / WorkstationCount for latest snap */
IF OBJECT_ID(N'dbo.Pulseway_OrgSummary', N'U') IS NOT NULL
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
    SUM(CASE WHEN d.IsOnline = 0 OR d.IsOnline IS NULL THEN 1 ELSE 0 END),
    0,
    SUM(ISNULL(d.CriticalNotifications, 0)),
    SUM(ISNULL(d.ElevatedNotifications, 0)),
    0, 0, 0,
    SUM(CASE WHEN d.DeviceType = N'Server' THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.DeviceType = N'Workstation' THEN 1 ELSE 0 END),
    0,
    SYSUTCDATETIME()
  FROM dbo.Pulseway_Devices AS d WITH (NOLOCK)
  WHERE d.SnapshotDate = @Snap
    AND d.CustomerCode IS NOT NULL
    AND LTRIM(RTRIM(d.CustomerCode)) <> N''
    AND EXISTS (SELECT 1 FROM dbo.Dim_Customer c WITH (NOLOCK) WHERE c.CustomerCode = d.CustomerCode)
  GROUP BY d.CustomerCode;

  PRINT N'OrgSummary rebuilt for snapshot.';
END

PRINT N'=== Done 459 ===';
PRINT N'Re-run Pulseway collect so future snaps stay classified.';
GO
