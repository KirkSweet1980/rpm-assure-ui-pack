# APP server: prove whether Pulseway API has Sir Fruit systems, then stamp SQL + collect.
# Run as Administrator. Sequential. No else.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\rmm\pulseway\Diagnose-Sirf-Rmm.ps1

$ErrorActionPreference = 'Stop'
function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' SIRF Pulseway diagnose'
Write-Host '========================================' -ForegroundColor Cyan

$sqlcmd = $null
foreach ($c in @(
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE'
)) {
  if (-not $sqlcmd) {
    if (Test-Path $c) { $sqlcmd = $c }
  }
}
if (-not $sqlcmd) {
  $gc = Get-Command sqlcmd.exe -ErrorAction SilentlyContinue
  if ($gc) { $sqlcmd = $gc.Source }
}
if (-not $sqlcmd) { throw 'sqlcmd not found' }

$cfg = 'C:\RPM-Assure\Sql\rmm\pulseway\Pulseway.Config.ps1'
if (-not (Test-Path $cfg)) { throw "Missing $cfg" }
. $cfg

W Cyan '--- SQL map + latest devices ---'
$q = @'
SET NOCOUNT ON;
PRINT 'MAP';
SELECT OrganizationName, CustomerCode, Active FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK)
WHERE CustomerCode = N'SIRF' OR OrganizationName LIKE N'%Fruit%' OR OrganizationName LIKE N'%SIRF%';
PRINT 'DEVICES_BY_CODE';
SELECT OrganizationName, COUNT(*) Devices, MAX(SnapshotDate) LastSnap
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE CustomerCode = N'SIRF'
GROUP BY OrganizationName;
PRINT 'DEVICES_BY_NAME';
SELECT OrganizationName, CustomerCode, COUNT(*) Devices, MAX(SnapshotDate) LastSnap
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE OrganizationName LIKE N'%Fruit%' OR OrganizationName LIKE N'%SIRF%'
GROUP BY OrganizationName, CustomerCode;
PRINT 'LATEST_ORGS';
SELECT TOP 30 OrganizationName, COUNT(*) Devices
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
GROUP BY OrganizationName
ORDER BY OrganizationName;
'@
& $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -Q $q

W Cyan '--- Live Pulseway API organizations ---'
$pair = '{0}:{1}' -f $TokenId, $TokenSecret
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{ Authorization = "Basic $b64"; Accept = 'application/json' }
$base = $BaseUrl.TrimEnd('/')
$res = Invoke-RestMethod -Method GET -Uri "$base/organizations" -Headers $headers -TimeoutSec 60
$items = @()
if ($res.Data) { $items = @($res.Data) }
if (-not $items.Count -and $res.organizations) { $items = @($res.organizations) }
if (-not $items.Count -and $res -is [System.Array]) { $items = @($res) }
$names = @()
foreach ($o in $items) {
  $n = $o.Name
  if (-not $n) { $n = $o.OrganizationName }
  if (-not $n) { $n = $o.name }
  if ($n) { $names += [string]$n }
}
Write-Host ('API_ORG_COUNT=' + $names.Count)
$names | Sort-Object | ForEach-Object { Write-Host $_ }
$hit = @($names | Where-Object { $_ -match 'fruit|sirf|sir fruit' })
Write-Host ('API_SIRF_MATCH=' + ($(if ($hit.Count) { $hit -join ', ' } else { 'NONE' })))

W Cyan '--- Live Pulseway API devices (name contains fruit / sir) ---'
$dres = Invoke-RestMethod -Method GET -Uri "$base/devices" -Headers $headers -TimeoutSec 90
$devs = @()
if ($dres.Data) { $devs = @($dres.Data) }
if (-not $devs.Count -and $dres.devices) { $devs = @($dres.devices) }
if (-not $devs.Count -and $dres -is [System.Array]) { $devs = @($dres) }
Write-Host ('API_DEVICE_COUNT=' + $devs.Count)
$sirfDevs = @()
foreach ($d in $devs) {
  $on = [string]($d.OrganizationName)
  if (-not $on) { $on = [string]($d.Organization) }
  if (-not $on) { $on = [string]($d.organization_name) }
  $nm = [string]($d.Name)
  if (-not $nm) { $nm = [string]($d.ComputerName) }
  if ($on -match 'fruit|sirf|sir fruit' -or $nm -match 'fruit|sirf') {
    $sirfDevs += ('  ' + $nm + ' | org=' + $on + ' | type=' + $d.Type + $d.DeviceType + ' | id=' + $d.Id)
  }
}
Write-Host ('API_SIRF_DEVICES=' + $sirfDevs.Count)
$sirfDevs | ForEach-Object { Write-Host $_ }

W Cyan '--- Stamp map + CustomerCode ---'
$stamp = @'
SET NOCOUNT ON;
MERGE dbo.Dim_Pulseway_OrgMap AS t
USING (SELECT N'Sir Fruit' OrganizationName, N'SIRF' CustomerCode) s
ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1, Notes = N'diagnose stamp'
WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
VALUES (s.OrganizationName, s.CustomerCode, 1, N'diagnose stamp');
UPDATE dbo.Pulseway_Devices
SET CustomerCode = N'SIRF'
WHERE OrganizationName LIKE N'%Fruit%' OR OrganizationName LIKE N'%SIRF%' OR OrganizationName = N'Sir Fruit';
SELECT OrganizationName, CustomerCode, Active FROM dbo.Dim_Pulseway_OrgMap WHERE CustomerCode = N'SIRF';
SELECT OrganizationName, COUNT(*) Devices
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE CustomerCode = N'SIRF'
  AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
GROUP BY OrganizationName;
'@
& $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -Q $stamp

$collect = 'C:\RPM-Assure\Sql\rmm\pulseway\Collect-Pulseway-To-RPMAssure.ps1'
W Cyan '--- Run Pulseway collect ---'
if (Test-Path $collect) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $collect
  Write-Host ('collect_exit=' + $LASTEXITCODE)
}

W Cyan '--- Proof after collect ---'
& $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -Q @"
SET NOCOUNT ON;
SELECT OrganizationName, CustomerCode, COUNT(*) Devices, MAX(SnapshotDate) LastSnap
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE CustomerCode = N'SIRF' OR OrganizationName LIKE N'%Fruit%'
GROUP BY OrganizationName, CustomerCode;
"@

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' DONE. Hard-refresh Sir Fruit > RPM RMM > Servers'
Write-Host ' If API_SIRF_MATCH=NONE the org is not in Pulseway yet — create/rename it there.'
Write-Host ' If API_SIRF_DEVICES=0 the org exists but no agents have reported.'
Write-Host '========================================' -ForegroundColor Cyan
