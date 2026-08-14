# APP server: scan Pulseway tree Sir Fruit > Microsoft Azure > Servers,
# page with OData $top/$skip, pull devices by org id, stamp SIRF, collect.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\rmm\pulseway\Diagnose-Sirf-Rmm.ps1

$ErrorActionPreference = 'Stop'
function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' SIRF Pulseway scan (org > site > group)'
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
  $seen = @{}
  $top = 100
  $skip = 0
  for ($page = 1; $page -le 80; $page++) {
    $sep = '?'
    if ($Path -match '\?') { $sep = '&' }
    $uri = $base + '/' + $Path + $sep + '$top=' + $top + '&$skip=' + $skip
    try {
      $res = Invoke-RestMethod -Method GET -Uri $uri -Headers $headers -TimeoutSec 90
    } catch {
      if ($skip -eq 0) {
        try { $res = Invoke-RestMethod -Method GET -Uri ($base + '/' + $Path) -Headers $headers -TimeoutSec 90 }
        catch {
          Write-Host ("WARN GET $Path : " + $_.Exception.Message)
          break
        }
      } else { break }
    }
    $items = @()
    if ($res.Data) { $items = @($res.Data) }
    elseif ($res.organizations) { $items = @($res.organizations) }
    elseif ($res.devices) { $items = @($res.devices) }
    elseif ($res.systems) { $items = @($res.systems) }
    elseif ($res.sites) { $items = @($res.sites) }
    elseif ($res.groups) { $items = @($res.groups) }
    elseif ($res -is [System.Array]) { $items = @($res) }
    if (-not $items.Count) { break }
    $new = 0
    foreach ($it in $items) {
      $id = $null
      foreach ($n in @('Id','id','DeviceId','OrganizationId','Identifier')) {
        if ($it.PSObject.Properties.Name -contains $n -and $it.$n) { $id = [string]$it.$n; break }
      }
      $key = $id
      if (-not $key) { $key = 'row-' + $all.Count }
      if ($seen.ContainsKey($key)) { continue }
      $seen[$key] = 1
      $all.Add($it)
      $new++
    }
    Write-Host ("  $Path page=$page got=$($items.Count) new=$new total=$($all.Count)")
    if ($new -eq 0) { break }
    $skip += $items.Count
    if ($items.Count -lt $top) { break }
  }
  return ,$all.ToArray()
}

function Name-Of($o) {
  foreach ($n in @('Name','OrganizationName','organization_name','GroupName','SiteName','ComputerName','DisplayName','name')) {
    if ($o.PSObject.Properties.Name -contains $n -and $o.$n) { return [string]$o.$n }
  }
  return ''
}
function Org-Of($o) {
  foreach ($n in @('OrganizationName','Organization','organization_name','SiteName','GroupName','CustomerName')) {
    if ($o.PSObject.Properties.Name -contains $n -and $o.$n) { return [string]$o.$n }
  }
  return ''
}
function Id-Of($o) {
  foreach ($n in @('Id','id','OrganizationId','DeviceId')) {
    if ($o.PSObject.Properties.Name -contains $n -and $o.$n) { return [string]$o.$n }
  }
  return ''
}

W Cyan '--- Organizations (OData pages) ---'
$orgs = @(Get-PwAll 'organizations')
Write-Host ('API_ORG_COUNT=' + $orgs.Count)
$orgNames = @()
$sirfOrgs = @()
foreach ($o in $orgs) {
  $n = Name-Of $o
  $id = Id-Of $o
  if ($n) { $orgNames += $n }
  Write-Host ('  org id=' + $id + ' name=' + $n)
  if ($n -match 'fruit|sirf|sir fruit') { $sirfOrgs += $o }
}
Write-Host ('API_SIRF_ORG=' + ($(if ($sirfOrgs.Count) { ($sirfOrgs | ForEach-Object { (Name-Of $_) + '#' + (Id-Of $_) }) -join ', ' } else { 'NONE' })))

W Cyan '--- Sites / groups (Sir Fruit > Microsoft Azure > Servers) ---'
$sites = @(Get-PwAll 'sites')
$groups = @(Get-PwAll 'groups')
Write-Host ('API_SITE_COUNT=' + $sites.Count + ' API_GROUP_COUNT=' + $groups.Count)
foreach ($s in @($sites + $groups)) {
  $n = Name-Of $s
  $p = Org-Of $s
  $id = Id-Of $s
  $hit = ($n -match 'fruit|sirf|azure' -or $p -match 'fruit|sirf')
  if ($hit) { Write-Host ('  TREE id=' + $id + ' name=' + $n + ' parent=' + $p) }
}

W Cyan '--- Devices + systems (global list) ---'
$devices = @(Get-PwAll 'devices')
$systems = @(Get-PwAll 'systems')
Write-Host ('API_DEVICE_COUNT=' + $devices.Count + ' API_SYSTEM_COUNT=' + $systems.Count)

$sirfIds = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($o in $sirfOrgs) {
  $id = Id-Of $o
  if ($id) { [void]$sirfIds.Add($id) }
}

W Cyan '--- Devices by Sir Fruit organization id ---'
$byOrg = New-Object System.Collections.Generic.List[object]
foreach ($oid in @($sirfIds)) {
  foreach ($p in @("devices?organizationid=$oid", "organizations/$oid/devices")) {
    try { $extra = @(Get-PwAll $p) } catch { $extra = @() }
    Write-Host ('  ' + $p + ' count=' + $extra.Count)
    foreach ($d in $extra) { $byOrg.Add($d) }
  }
}

$hits = New-Object System.Collections.Generic.List[string]
$foundOrgs = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($d in @($devices + $systems + $byOrg)) {
  $nm = Name-Of $d
  $on = Org-Of $d
  $oid = ''
  foreach ($n in @('OrganizationId','organization_id')) {
    if ($d.PSObject.Properties.Name -contains $n -and $d.$n) { $oid = [string]$d.$n }
  }
  $isSirf = $false
  if ($on -match 'fruit|sirf|sir fruit') { $isSirf = $true }
  if ($nm -match 'fruit|sirfruit|^sirza') { $isSirf = $true }
  if ($oid -and $sirfIds.Contains($oid)) { $isSirf = $true }
  if ($isSirf) {
    $hits.Add(('  ' + $nm + ' | org=' + $on + ' | orgId=' + $oid))
    if ($on) { [void]$foundOrgs.Add($on) }
    if (-not $on) { [void]$foundOrgs.Add('Sir Fruit') }
  }
}
Write-Host ('API_SIRF_DEVICES=' + $hits.Count)
$hits | ForEach-Object { Write-Host $_ }

W Cyan '--- Stamp Sir Fruit org + org id (not Azure/Servers globally) ---'
$mapRows = New-Object System.Collections.Generic.List[string]
$mapRows.Add("SELECT N'Sir Fruit' OrganizationName, CAST(NULL AS int) OrganizationId, N'SIRF' CustomerCode")
foreach ($o in $sirfOrgs) {
  $n = (Name-Of $o).Replace("'", "''")
  $id = Id-Of $o
  if ($id -match '^\d+$') {
    $mapRows.Add("SELECT N'$n', $id, N'SIRF'")
  } else {
    $mapRows.Add("SELECT N'$n', CAST(NULL AS int), N'SIRF'")
  }
}
$union = ($mapRows | Select-Object -Unique) -join "`nUNION ALL`n"
$stamp = @"
SET NOCOUNT ON;
MERGE dbo.Dim_Pulseway_OrgMap AS t
USING (
  $union
) s
ON t.OrganizationName = s.OrganizationName
WHEN MATCHED THEN UPDATE SET CustomerCode = s.CustomerCode, Active = 1,
  OrganizationId = COALESCE(s.OrganizationId, t.OrganizationId), Notes = N'sirf tree scan'
WHEN NOT MATCHED THEN INSERT (OrganizationName, OrganizationId, CustomerCode, Active, Notes)
VALUES (s.OrganizationName, s.OrganizationId, s.CustomerCode, 1, N'sirf tree scan');

IF COL_LENGTH(N'dbo.Dim_Customer', N'PulsewayOrgName') IS NOT NULL
  UPDATE dbo.Dim_Customer SET PulsewayOrgName = N'Sir Fruit' WHERE CustomerCode = N'SIRF';

IF OBJECT_ID(N'dbo.Dim_Customer_AmsConfig', N'U') IS NOT NULL
  UPDATE dbo.Dim_Customer_AmsConfig SET PillarPulseway = 1 WHERE CustomerCode = N'SIRF';

UPDATE dbo.Pulseway_Devices
SET CustomerCode = N'SIRF'
WHERE OrganizationName LIKE N'%Fruit%'
   OR OrganizationName LIKE N'%SIRF%'
   OR Name LIKE N'SIRZA%'
   OR Name LIKE N'%SirFruit%'
   OR Name LIKE N'%Sir Fruit%';

SELECT OrganizationName, OrganizationId, CustomerCode, Active FROM dbo.Dim_Pulseway_OrgMap WHERE CustomerCode = N'SIRF';
"@
& $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -Q $stamp

$collect = 'C:\RPM-Assure\Sql\rmm\pulseway\Collect-Pulseway-To-RPMAssure.ps1'
W Cyan '--- Pulseway collect ---'
if (Test-Path $collect) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $collect
  Write-Host ('collect_exit=' + $LASTEXITCODE)
}

W Cyan '--- Proof ---'
& $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -Q @"
SET NOCOUNT ON;
PRINT 'SIRF_MAP';
SELECT OrganizationName, OrganizationId, CustomerCode, Active FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK) WHERE CustomerCode = N'SIRF';
PRINT 'SIRF_DEVICES';
SELECT OrganizationName, CustomerCode, COUNT(*) Devices, SUM(CASE WHEN IsOnline=1 THEN 1 ELSE 0 END) Online, MAX(SnapshotDate) LastSnap
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE CustomerCode = N'SIRF' OR OrganizationName LIKE N'%Fruit%' OR Name LIKE N'SIRZA%'
GROUP BY OrganizationName, CustomerCode;
PRINT 'SIRF_SUMMARY';
SELECT TOP 5 CustomerCode, OrganizationName, DeviceCount, OnlineCount, OfflineCount, ImportedAt
FROM dbo.Pulseway_OrgSummary WITH (NOLOCK)
WHERE CustomerCode = N'SIRF'
ORDER BY SnapshotDate DESC;
"@

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' DONE. Hard-refresh Sir Fruit > RPM RMM'
Write-Host ' API_SIRF_ORG=NONE means the token cannot see that org yet.'
Write-Host ' API_SIRF_DEVICES=0 means org exists but no agent has checked in under it.'
Write-Host '========================================' -ForegroundColor Cyan
