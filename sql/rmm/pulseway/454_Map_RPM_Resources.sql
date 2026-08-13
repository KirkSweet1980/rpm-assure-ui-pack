/*
  RPM Internal (Pulseway org) = RPM Resources (customer).
  CustomerCode RPMINT, DisplayName RPM Resources.
  Maps both org names, stamps devices/notifications.
*/
SET NOCOUNT ON;
USE RPMAssure_App;

/* Customer */
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'RPMINT')
  INSERT INTO dbo.Dim_Customer (CustomerCode, DisplayName, Active)
  VALUES (N'RPMINT', N'RPM Resources', 1);
ELSE
  UPDATE dbo.Dim_Customer
  SET DisplayName = N'RPM Resources', Active = 1
  WHERE CustomerCode = N'RPMINT';

PRINT N'Dim_Customer RPMINT => RPM Resources';

/* Alias table (if present) */
IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgAlias', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Pulseway_OrgAlias WHERE OrganizationName = N'RPM Internal')
    INSERT INTO dbo.Dim_Pulseway_OrgAlias (OrganizationName, CustomerCode, Active)
    VALUES (N'RPM Internal', N'RPMINT', 1);
  ELSE
    UPDATE dbo.Dim_Pulseway_OrgAlias SET CustomerCode = N'RPMINT', Active = 1
    WHERE OrganizationName = N'RPM Internal';

  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Pulseway_OrgAlias WHERE OrganizationName = N'RPM Resources')
    INSERT INTO dbo.Dim_Pulseway_OrgAlias (OrganizationName, CustomerCode, Active)
    VALUES (N'RPM Resources', N'RPMINT', 1);
  ELSE
    UPDATE dbo.Dim_Pulseway_OrgAlias SET CustomerCode = N'RPMINT', Active = 1
    WHERE OrganizationName = N'RPM Resources';
END

/* Map table */
IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgMap', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Pulseway_OrgMap WHERE OrganizationName = N'RPM Internal')
    INSERT INTO dbo.Dim_Pulseway_OrgMap (OrganizationName, CustomerCode, Active)
    VALUES (N'RPM Internal', N'RPMINT', 1);
  ELSE
    UPDATE dbo.Dim_Pulseway_OrgMap SET CustomerCode = N'RPMINT', Active = 1
    WHERE OrganizationName = N'RPM Internal';

  IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Pulseway_OrgMap WHERE OrganizationName = N'RPM Resources')
    INSERT INTO dbo.Dim_Pulseway_OrgMap (OrganizationName, CustomerCode, Active)
    VALUES (N'RPM Resources', N'RPMINT', 1);
  ELSE
    UPDATE dbo.Dim_Pulseway_OrgMap SET CustomerCode = N'RPMINT', Active = 1
    WHERE OrganizationName = N'RPM Resources';
END

/* Stamp devices */
IF OBJECT_ID(N'dbo.Pulseway_Devices', N'U') IS NOT NULL
BEGIN
  UPDATE dbo.Pulseway_Devices
  SET CustomerCode = N'RPMINT'
  WHERE OrganizationName IN (N'RPM Internal', N'RPM Resources');
  PRINT N'Devices stamped: ' + CAST(@@ROWCOUNT AS nvarchar(12));
END

IF OBJECT_ID(N'dbo.Pulseway_Notifications', N'U') IS NOT NULL
BEGIN
  UPDATE dbo.Pulseway_Notifications
  SET CustomerCode = N'RPMINT'
  WHERE OrganizationName IN (N'RPM Internal', N'RPM Resources');
  PRINT N'Notifications stamped: ' + CAST(@@ROWCOUNT AS nvarchar(12));
END

IF OBJECT_ID(N'dbo.Pulseway_Organizations', N'U') IS NOT NULL
BEGIN
  UPDATE dbo.Pulseway_Organizations
  SET CustomerCode = N'RPMINT'
  WHERE OrganizationName IN (N'RPM Internal', N'RPM Resources');
END

PRINT N'=== Customer ===';
SELECT CustomerCode, DisplayName, Active FROM dbo.Dim_Customer WITH (NOLOCK) WHERE CustomerCode = N'RPMINT';

PRINT N'=== Org map ===';
SELECT OrganizationName, CustomerCode, Active
FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK)
WHERE OrganizationName LIKE N'RPM%'
ORDER BY 1;

PRINT N'=== Latest RPMINT device counts ===';
SELECT
  ISNULL(OrganizationName, N'(none)') AS OrganizationName,
  COUNT(*) AS Devices,
  SUM(CASE WHEN IsOnline = 1 THEN 1 ELSE 0 END) AS Online,
  SUM(CASE WHEN OsName IS NOT NULL AND LTRIM(RTRIM(OsName)) <> N'' THEN 1 ELSE 0 END) AS WithOs,
  SUM(CASE WHEN IpAddress IS NOT NULL AND LTRIM(RTRIM(IpAddress)) <> N'' THEN 1 ELSE 0 END) AS WithIp
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND CustomerCode = N'RPMINT'
GROUP BY OrganizationName;

PRINT N'Done. Open customer RPMINT (RPM Resources) in the app. Re-run Pulseway collect so new snapshots keep the map.';
