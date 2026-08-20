# Collect Pulseway for the estate, then map Redsun Raisins -> RSR and stamp devices.
# Run on the APP server (Administrator):
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\rmm\pulseway\Collect-And-Map-Rsr.ps1

$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure'
$Collect = Join-Path $Root 'Sql\rmm\pulseway\Collect-Pulseway-To-RPMAssure.ps1'
if (-not (Test-Path -LiteralPath $Collect)) {
  throw "Missing $Collect - run Update-AppServer.ps1 first"
}

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' Pulseway collect + map Redsun Raisins (RSR)'
Write-Host '========================================' -ForegroundColor Cyan

Write-Host '--- Collect Pulseway API now ---' -ForegroundColor Cyan
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Collect
Write-Host ("Collect exit=" + $LASTEXITCODE)

$sqlcmd = $null
foreach ($c in @(
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
  'D:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE'
)) { if (Test-Path -LiteralPath $c) { $sqlcmd = $c; break } }
if (-not $sqlcmd) { $sqlcmd = (Get-Command sqlcmd.exe -ErrorAction Stop).Source }

$cfg = Join-Path $Root 'Sql\rmm\pulseway\Pulseway.Config.ps1'
$server = '102.222.21.220,14333'
$db = 'RPMAssure_App'
$user = 'rpmassure'
$pass = ''
if (Test-Path -LiteralPath $cfg) {
  . $cfg
  if ($SqlServer) { $server = $SqlServer }
  if ($SqlDatabase) { $db = $SqlDatabase }
  if ($SqlUser) { $user = $SqlUser }
  if ($SqlPassword) { $pass = $SqlPassword }
}

$sql = @'
SET NOCOUNT ON;
IF OBJECT_ID(N''dbo.Dim_Pulseway_OrgAlias'',N''U'') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Pulseway_OrgAlias AS t
  USING (SELECT N''Redsun Raisins'' OrganizationName, N''RSR'' CustomerCode) s
    ON t.OrganizationName = s.OrganizationName
  WHEN MATCHED THEN UPDATE SET CustomerCode=s.CustomerCode, Active=1, Notes=N''RSR Pulseway org'';
  WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
    VALUES (s.OrganizationName, s.CustomerCode, 1, N''RSR Pulseway org'');
END
IF OBJECT_ID(N''dbo.Dim_Pulseway_OrgMap'',N''U'') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Pulseway_OrgMap AS t
  USING (SELECT N''Redsun Raisins'' OrganizationName, N''RSR'' CustomerCode) s
    ON t.OrganizationName = s.OrganizationName
  WHEN MATCHED THEN UPDATE SET CustomerCode=s.CustomerCode, Active=1, Notes=N''RSR Pulseway org'', UpdatedAtUtc=SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes, UpdatedAtUtc)
    VALUES (s.OrganizationName, s.CustomerCode, 1, N''RSR Pulseway org'', SYSUTCDATETIME());
END
IF COL_LENGTH(N''dbo.Dim_Customer'', N''PulsewayOrgName'') IS NOT NULL
  UPDATE dbo.Dim_Customer SET PulsewayOrgName=N''Redsun Raisins'' WHERE CustomerCode=N''RSR'';
IF OBJECT_ID(N''dbo.Dim_Customer_AmsConfig'',N''U'') IS NOT NULL
  AND COL_LENGTH(N''dbo.Dim_Customer_AmsConfig'', N''PillarPulseway'') IS NOT NULL
  UPDATE dbo.Dim_Customer_AmsConfig SET PillarPulseway=1 WHERE CustomerCode=N''RSR'';
IF OBJECT_ID(N''dbo.Pulseway_Devices'',N''U'') IS NOT NULL
  UPDATE dbo.Pulseway_Devices SET CustomerCode=N''RSR''
  WHERE OrganizationName=N''Redsun Raisins'';
IF OBJECT_ID(N''dbo.Pulseway_Notifications'',N''U'') IS NOT NULL
  UPDATE dbo.Pulseway_Notifications SET CustomerCode=N''RSR''
  WHERE OrganizationName=N''Redsun Raisins'';
PRINT ''=== RSR map ==='';
SELECT OrganizationName, CustomerCode, Active FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK) WHERE CustomerCode=N''RSR'';
PRINT ''=== RSR devices (latest snap) ==='';
SELECT OrganizationName, COUNT(*) Devices,
  SUM(CASE WHEN IsOnline=1 THEN 1 ELSE 0 END) Online
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE CustomerCode=N''RSR''
  AND SnapshotDate=(SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
GROUP BY OrganizationName;
PRINT ''=== Orgs containing redsun ==='';
SELECT OrganizationName, COUNT(*) Devices
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate=(SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND OrganizationName LIKE N''%Redsun%''
GROUP BY OrganizationName;
'@

Write-Host '--- Map Redsun Raisins -> RSR ---' -ForegroundColor Cyan
& $sqlcmd -S $server -d $db -U $user -P $pass -C -Q $sql
if ($LASTEXITCODE -ne 0) { throw "sqlcmd map exit $LASTEXITCODE" }

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' Hard-refresh Redsun Raisins RMM in Assure'
Write-Host '========================================' -ForegroundColor Cyan
