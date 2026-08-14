# APP server: scan live Pulseway for Sir Fruit (orgs, devices, systems, groups),
# stamp maps, collect, rebuild RMM for SIRF.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\rmm\pulseway\Diagnose-Sirf-Rmm.ps1

$ErrorActionPreference = 'Stop'
function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' SIRF Pulseway scan + RMM fix'
Write-Host '========================================' -ForegroundColor Cyan

$sqlcmd = $null
foreach ($c in @(
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE',
  'D:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
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

$pair = '{0}:{1}' -f $TokenId, $TokenSecret
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{ Authorization = "Basic $b64"; Accept = 'application/json' }
$base = $BaseUrl.TrimEnd('/')

function Get-PwAll([string]$Path) {
  $all = New-Object System.Collections.Generic.List[object]
  $page = 1
  while ($page -le 40) {
    $uri = "$base/$Path"
    if ($page -gt 1) { $uri = "$base/${Path}?page=$page" }
    try {
      $res = Invoke-RestMethod -Method GET -Uri $uri -Headers $headers -TimeoutSec 90
    } catch {
      if ($page -eq 1) { Write-Host ("WARN GET $Path : " + $_.Exception.Message) }
      break
    }
    $items = @()
    if ($res.Data) { $items = @($res.Data) }
    elseif ($res.organizations) { $items = @($res.organizations) }
    elseif ($res.devices) { $items = @($res.devices) }
    elseif ($res.systems) { $items = @($res.systems) }
    elseif ($res -is [System.Array]) { $items = @($res) }
    if (-not $items.Count) { break }
    foreach ($it in $items) { $all.Add($it) }
    $metaPages = $null
    if ($res.Meta -and $res.Meta.TotalPages) { $metaPages = [int]$res.Meta.TotalPages }
    if ($metaPages -and $page -ge $metaPages) { break }
    if (-not $metaPages -and $items.Count -lt 50) { break }
    $page++
  }
  return ,$all.ToArray()
}

function Name-Of($o) {
  foreach ($n in @('Name','OrganizationName','organization_name','GroupName','ComputerName','DisplayName','name')) {
    if ($o.PSObject.Properties.Name -contains $n -and $o.$n) { return [string]$o.$n }
  }
  return ''
}
function Org-Of($o) {
  foreach ($n in @('OrganizationName','Organization','organization_name','GroupName','CustomerName')) {
    if ($o.PSObject.Properties.Name -contains $n -and $o.$n) { return [string]$o.$n }
  }
  return ''
}

W Cyan '--- Live Pulseway organizations ---'
$orgs = @(Get-PwAll 'organizations')
$orgNames = @()
foreach ($o in $orgs) {
  $n = Name-Of $o
  if ($n) { $orgNames += $n }
}
Write-Host ('API_ORG_COUNT=' + $orgNames.Count)
$orgNames | Sort-Object | ForEach-Object { Write-Host $_ }
$orgHit = @($orgNames | Where-Object { $_ -match 'fruit|sirf|sir fruit|sirza' })
Write-Host ('API_SIRF_ORG=' + ($(if ($orgHit.Count) { $orgHit -join ', ' } else { 'NONE' })))

W Cyan '--- Live Pulseway groups (if any) ---'
$groups = @(Get-PwAll 'groups')
$gHit = @()
foreach ($g in $groups) {
  $n = Name-Of $g
  if ($n -match 'fruit|sirf|sir fruit|sirza') { $gHit += $n }
}
Write-Host ('API_GROUP_COUNT=' + $groups.Count + ' SIRF=' + ($(if ($gHit.Count) { $gHit -join ', ' } else { 'NONE' })))

W Cyan '--- Live Pulseway devices + systems ---'
$devices = @(Get-PwAll 'devices')
$systems = @(Get-PwAll 'systems')
Write-Host ('API_DEVICE_COUNT=' + $devices.Count + ' API_SYSTEM_COUNT=' + $systems.Count)
$hits = New-Object System.Collections.Generic.List[string]
$foundOrgs = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($d in @($devices + $systems)) {
  $nm = Name-Of $d
  $on = Org-Of $d
  if (-not $on) { $on = Name-Of $d }
  if ($on -match 'fruit|sirf|sir fruit' -or $nm -match 'fruit|sirfruit|^sirza') {
    $hits.Add(('  ' + $nm + ' | org=' + $on))
    if ($on) { [void]$foundOrgs.Add($on) }
  }
}
Write-Host ('API_SIRF_DEVICES=' + $hits.Count)
$hits | ForEach-Object { Write-Host $_ }
if ($foundOrgs.Count) {
  Write-Host ('API_SIRF_DEVICE_ORGS=' + (($foundOrgs | ForEach-Object { $_ }) -join ', '))
}

W Cyan '--- Stamp every Fruit / SIRF / SIRZA name onto SIRF ---'
$mapRows = New-Object System.Collections.Generic.List[string]
$mapRows.Add("SELECT N'Sir Fruit', N'SIRF'")
foreach ($n in @($orgHit + $gHit + @($foundOrgs))) {
  if ($n) {
    $esc = ([string]$n).Replace("'", "''")
    $mapRows.Add("SELECT N'$esc', N'SIRF'")
  }
}
$union = ($mapRows | Select-Object -Unique) -join "`nUNION ALL`n"
$stamp = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Dim_Pulseway_OrgAlias', N'U') IS NOT NULL
BEGIN
  MERGE dbo.Dim_Pulseway_OrgAlias AS t
  USING (
    $union
  ) s(OrganizationName, CustomerCode)
  ON t.OrganizationName = s.OrganizationName
  WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1, Notes = N'sirf scan'
  WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
  VALUES (s.OrganizationName, s.CustomerCode, 1, N'sirf scan');
END
MERGE dbo.Dim_Pulseway_OrgMap AS t
USING (
  $union
) s(OrganizationName, CustomerCode)
ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1, Notes = N'sirf scan'
WHEN NOT MATCHED THEN INSERT (OrganizationName, CustomerCode, Active, Notes)
VALUES (s.OrganizationName, s.CustomerCode, 1, N'sirf scan');

IF COL_LENGTH(N'dbo.Dim_Customer', N'PulsewayOrgName') IS NOT NULL
  UPDATE dbo.Dim_Customer SET PulsewayOrgName = N'Sir Fruit' WHERE CustomerCode = N'SIRF' AND (PulsewayOrgName IS NULL OR PulsewayOrgName = N'');

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
  UPDATE dbo.Dim_Customer_AmsConfig SET PillarPulseway = 1, UpdatedAt = SYSUTCDATETIME() WHERE CustomerCode = N'SIRF';

UPDATE dbo.Pulseway_Devices
SET CustomerCode = N'SIRF'
WHERE OrganizationName LIKE N'%Fruit%'
   OR OrganizationName LIKE N'%SIRF%'
   OR Name LIKE N'SIRZA%'
   OR Name LIKE N'%SirFruit%'
   OR Name LIKE N'%Sir Fruit%';

SELECT OrganizationName, CustomerCode, Active, Notes FROM dbo.Dim_Pulseway_OrgMap WHERE CustomerCode = N'SIRF';
"@
& $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -Q $stamp

$collect = 'C:\RPM-Assure\Sql\rmm\pulseway\Collect-Pulseway-To-RPMAssure.ps1'
W Cyan '--- Run Pulseway collect (full estate) ---'
if (Test-Path $collect) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $collect
  Write-Host ('collect_exit=' + $LASTEXITCODE)
}

W Cyan '--- Proof after collect ---'
& $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -Q @"
SET NOCOUNT ON;
PRINT 'SIRF_MAP';
SELECT OrganizationName, CustomerCode, Active FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK) WHERE CustomerCode = N'SIRF';
PRINT 'SIRF_DEVICES';
SELECT OrganizationName, CustomerCode, COUNT(*) Devices, SUM(CASE WHEN IsOnline=1 THEN 1 ELSE 0 END) Online, MAX(SnapshotDate) LastSnap
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE CustomerCode = N'SIRF' OR OrganizationName LIKE N'%Fruit%' OR Name LIKE N'SIRZA%'
GROUP BY OrganizationName, CustomerCode;
PRINT 'SIRF_SUMMARY';
SELECT CustomerCode, OrganizationName, DeviceCount, OnlineCount, OfflineCount, ImportedAt
FROM dbo.Pulseway_OrgSummary WITH (NOLOCK)
WHERE CustomerCode = N'SIRF'
ORDER BY SnapshotDate DESC;
"@

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' DONE. Hard-refresh Sir Fruit > RPM RMM'
Write-Host ' API_SIRF_ORG=NONE and API_SIRF_DEVICES=0 means Pulseway has no Sir Fruit agent yet.'
Write-Host '========================================' -ForegroundColor Cyan
