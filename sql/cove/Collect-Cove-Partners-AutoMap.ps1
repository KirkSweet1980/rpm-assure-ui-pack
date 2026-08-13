# Collect Cove partner tree (EnumeratePartners) + merge into Dim_Cove_PartnerMap / Alias
# Run on central after Login works. ASCII only.
# Uses same Cove.Config.ps1 as Collect-Cove-To-RPMAssure.ps1

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
if (-not $here) { $here = 'C:\RPM-Assure\Sql\cove' }
. (Join-Path $here 'Cove.Config.ps1')

if ([string]::IsNullOrWhiteSpace($ApiUrl)) { $ApiUrl = 'https://api.backup.management/jsonapi' }
if ([string]::IsNullOrWhiteSpace($Username) -or $Username -like 'PASTE*') { throw 'Set $Username in Cove.Config.ps1' }
if ([string]::IsNullOrWhiteSpace($Password) -or $Password -like 'PASTE*') { throw 'Set $Password in Cove.Config.ps1' }
if (-not $FallbackPartnerId) { $FallbackPartnerId = 2601580 }
if (-not $SqlServer) { $SqlServer = '102.222.21.220,14333' }
if (-not $SqlDatabase) { $SqlDatabase = 'RPMAssure_App' }
if (-not $SqlUser) { $SqlUser = 'Rpm_collect' }
if (-not $SqlPassword) { $SqlPassword = 'RpmCollect#AHIC2026' }

$logDir = Join-Path $here 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("cove_partners_{0:yyyyMMdd_HHmmss}.log" -f (Get-Date))

function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

function ConvertTo-Text($content) {
  if ($null -eq $content) { return '' }
  if ($content -is [string]) { return $content }
  if ($content -is [byte[]]) { return [System.Text.Encoding]::UTF8.GetString($content) }
  try { return [System.Text.Encoding]::UTF8.GetString([byte[]]$content) } catch { return [string]$content }
}

function Get-JsonStringField([string]$Raw, [string]$FieldName) {
  if ([string]::IsNullOrWhiteSpace($Raw)) { return $null }
  $m = [regex]::Match($Raw, '"' + $FieldName + '"\s*:\s*"([^"]*)"')
  if ($m.Success) { return $m.Groups[1].Value }
  return $null
}

function Get-JsonIntField([string]$Raw, [string]$FieldName) {
  if ([string]::IsNullOrWhiteSpace($Raw)) { return 0 }
  $m = [regex]::Match($Raw, '"' + $FieldName + '"\s*:\s*(-?\d+)')
  if ($m.Success) { return [int]$m.Groups[1].Value }
  return 0
}

function Invoke-CoveRaw([string]$Body) {
  $resp = Invoke-WebRequest -Uri $ApiUrl -Method POST -Body ([System.Text.Encoding]::UTF8.GetBytes($Body)) `
    -ContentType 'application/json; charset=utf-8' -UseBasicParsing -TimeoutSec 180
  return (ConvertTo-Text $resp.Content)
}

function Find-Sqlcmd {
  $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
    'D:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
  )) { if (Test-Path $p) { return $p } }
  throw 'sqlcmd not found'
}

function Sql-Escape([string]$s) {
  if ($null -eq $s) { return '' }
  return ($s -replace "'", "''")
}

function Get-Prop($obj, [string]$Name) {
  if ($null -eq $obj) { return $null }
  if ($obj.PSObject.Properties[$Name]) { return $obj.PSObject.Properties[$Name].Value }
  return $null
}

function Get-PartnerName($p) {
  # Cove shapes vary: Name, LevelName, Company.Name, Company.CompanyName, PartnerName
  foreach ($n in @('Name','LevelName','PartnerName','CompanyName','FullName','DisplayName')) {
    $v = Get-Prop $p $n
    if ($v -and "$v".Trim()) { return ("$v").Trim() }
  }
  $co = Get-Prop $p 'Company'
  if ($co) {
    foreach ($n in @('Name','CompanyName','LegalName','DisplayName')) {
      $v = Get-Prop $co $n
      if ($v -and "$v".Trim()) { return ("$v").Trim() }
    }
  }
  $info = Get-Prop $p 'PartnerInfo'
  if ($info) {
    foreach ($n in @('Name','CompanyName','PartnerName')) {
      $v = Get-Prop $info $n
      if ($v -and "$v".Trim()) { return ("$v").Trim() }
    }
  }
  return $null
}

function Get-PartnerIdValue($p) {
  foreach ($n in @('Id','PartnerId','id','partnerId')) {
    $v = Get-Prop $p $n
    if ($null -ne $v -and "$v" -match '^\d+$') { return [int]$v }
  }
  $co = Get-Prop $p 'Company'
  if ($co) {
    $v = Get-Prop $co 'Id'
    if ($null -ne $v -and "$v" -match '^\d+$') { return [int]$v }
  }
  return $null
}

Write-Log '=== Cove EnumeratePartners auto-map ==='
Write-Log ("User=" + $Username)

# Login
$loginBody = (@{
  jsonrpc = '2.0'
  method  = 'Login'
  params  = @{ username = $Username; password = $Password }
  id      = '1'
} | ConvertTo-Json -Depth 6 -Compress)
if ($Partner -and $Partner -notlike 'PASTE*') {
  $loginObj = $loginBody | ConvertFrom-Json
  $loginObj.params | Add-Member -NotePropertyName partner -NotePropertyValue $Partner -Force
  $loginBody = $loginObj | ConvertTo-Json -Depth 6 -Compress
}

$loginRaw = Invoke-CoveRaw $loginBody
$visa = Get-JsonStringField $loginRaw 'visa'
if (-not $visa) { throw 'Login returned no visa' }
$rootPartnerId = Get-JsonIntField $loginRaw 'PartnerId'
if ($rootPartnerId -le 0) { $rootPartnerId = [int]$FallbackPartnerId }
Write-Log ("Login OK visaLen={0} PartnerId={1}" -f $visa.Length, $rootPartnerId)

# EnumeratePartners - try a few param shapes
$enumBodies = @(
  (@{ jsonrpc='2.0'; method='EnumeratePartners'; visa=$visa; params=@{ parentPartnerId=[int]$rootPartnerId }; id='2' } | ConvertTo-Json -Depth 6 -Compress),
  (@{ jsonrpc='2.0'; method='EnumeratePartners'; visa=$visa; params=@{ ParentPartnerId=[int]$rootPartnerId }; id='2b' } | ConvertTo-Json -Depth 6 -Compress),
  (@{ jsonrpc='2.0'; method='EnumeratePartners'; visa=$visa; params=@{ partnerId=[int]$rootPartnerId }; id='2c' } | ConvertTo-Json -Depth 6 -Compress)
)

$enumRaw = $null
foreach ($body in $enumBodies) {
  try {
    $enumRaw = Invoke-CoveRaw $body
    if ($enumRaw -and $enumRaw -notmatch '"error"') { break }
  } catch {
    Write-Log ("EnumeratePartners try err: " + $_.Exception.Message)
  }
}

$enumPath = Join-Path $logDir ("partners_raw_{0:yyyyMMdd_HHmmss}.json" -f (Get-Date))
Set-Content -LiteralPath $enumPath -Value $enumRaw -Encoding UTF8
Write-Log ("EnumeratePartners saved " + $enumPath + " bytes=" + $(if ($enumRaw) { $enumRaw.Length } else { 0 }))

if (-not $enumRaw) { throw 'EnumeratePartners returned empty' }
if ($enumRaw -match '"error"\s*:') {
  $err = Get-JsonStringField $enumRaw 'message'
  Write-Log ("EnumeratePartners error note: " + $err)
}

$partners = New-Object System.Collections.Generic.List[object]
try {
  $j = $enumRaw | ConvertFrom-Json
  $list = @()
  if ($j.result -and $j.result.result) { $list = @($j.result.result) }
  elseif ($j.result -is [System.Array]) { $list = @($j.result) }
  elseif ($j.result) { $list = @($j.result) }

  # Sometimes nested under Partners / items
  if ($list.Count -eq 1) {
    $one = $list[0]
    if ((Get-Prop $one 'Partners')) { $list = @((Get-Prop $one 'Partners')) }
    elseif ((Get-Prop $one 'items')) { $list = @((Get-Prop $one 'items')) }
  }

  if ($list.Count -gt 0) {
    $sample = $list[0]
    $keys = ($sample.PSObject.Properties.Name) -join ','
    Write-Log ("First partner keys: " + $keys)
    $co = Get-Prop $sample 'Company'
    if ($co) {
      Write-Log ("Company keys: " + (($co.PSObject.Properties.Name) -join ','))
    }
  }

  foreach ($p in $list) {
    $id = Get-PartnerIdValue $p
    $name = Get-PartnerName $p
    if (-not $name -and $id) {
      # last resort: Name may be under ServiceGroup / Location
      $name = "Partner-$id"
    }
    if ($name) {
      [void]$partners.Add([pscustomobject]@{ PartnerId = $id; PartnerName = $name })
    }
  }

  # Regex fallback if ConvertFrom-Json structure is odd but raw has Id+Name pairs
  if ($partners.Count -eq 0 -and $enumRaw) {
    Write-Log 'Regex fallback parse on raw JSON...'
    # "Id":2602xxx ... "Name":"Something"  (non-greedy windows)
    $rx = [regex]'"Id"\s*:\s*(\d+)[\s\S]{0,400}?"Name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"'
    foreach ($m in $rx.Matches($enumRaw)) {
      $id = [int]$m.Groups[1].Value
      $name = $m.Groups[2].Value -replace '\\"','"'
      if ($name -and $name -notmatch '^(null|true|false)$') {
        [void]$partners.Add([pscustomobject]@{ PartnerId = $id; PartnerName = $name.Trim() })
      }
    }
    # also Company Name after Id
    if ($partners.Count -eq 0) {
      $rx2 = [regex]'"Id"\s*:\s*(\d+)[\s\S]{0,800}?"Company"\s*:\s*\{[\s\S]{0,200}?"Name"\s*:\s*"([^"]+)"'
      foreach ($m in $rx2.Matches($enumRaw)) {
        [void]$partners.Add([pscustomobject]@{ PartnerId = [int]$m.Groups[1].Value; PartnerName = $m.Groups[2].Value.Trim() })
      }
    }
  }
} catch {
  Write-Log ("Parse partners: " + $_.Exception.Message)
}

# de-dupe by name
$uniq = @{}
foreach ($p in $partners) {
  $k = $p.PartnerName.ToLowerInvariant()
  if (-not $uniq.ContainsKey($k)) { $uniq[$k] = $p }
  elseif ($null -eq $uniq[$k].PartnerId -and $p.PartnerId) { $uniq[$k] = $p }
}
$partners = @($uniq.Values)

Write-Log ("Partners parsed=" + $partners.Count)
foreach ($p in ($partners | Sort-Object PartnerName | Select-Object -First 40)) {
  Write-Log (("  {0} | {1}" -f $p.PartnerId, $p.PartnerName))
}

if ($partners.Count -eq 0) {
  Write-Log 'No partners from EnumeratePartners - still run SQL name auto-map + PartnerId stamp from devices'
} else {
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine('USE [RPMAssure_App];')
  [void]$sb.AppendLine('SET NOCOUNT ON;')
  [void]$sb.AppendLine('IF OBJECT_ID(N''tempdb..#p'') IS NOT NULL DROP TABLE #p;')
  [void]$sb.AppendLine('CREATE TABLE #p (PartnerName nvarchar(200) NOT NULL, PartnerId int NULL);')
  foreach ($p in $partners) {
    $n = Sql-Escape $p.PartnerName
    $idSql = if ($null -eq $p.PartnerId -or "$($p.PartnerId)" -eq '') { 'NULL' } else { [string][int]$p.PartnerId }
    [void]$sb.AppendLine(("INSERT INTO #p (PartnerName, PartnerId) VALUES (N'{0}', {1});" -f $n, $idSql))
  }
  [void]$sb.AppendLine(@'
-- Exact display-name match
MERGE dbo.Dim_Cove_PartnerMap AS t
USING (
  SELECT p.PartnerName, p.PartnerId, c.CustomerCode
  FROM #p p
  INNER JOIN dbo.Dim_Customer c WITH (NOLOCK)
    ON ISNULL(c.Active,1) = 1
   AND (
     LOWER(LTRIM(RTRIM(c.DisplayName))) = LOWER(LTRIM(RTRIM(p.PartnerName)))
     OR LOWER(LTRIM(RTRIM(c.CustomerCode))) = LOWER(LTRIM(RTRIM(p.PartnerName)))
   )
) s ON t.PartnerName = s.PartnerName
WHEN MATCHED THEN UPDATE SET
  PartnerId = COALESCE(s.PartnerId, t.PartnerId),
  CustomerCode = s.CustomerCode,
  Active = 1,
  Notes = N'EnumeratePartners exact name',
  UpdatedAtUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (PartnerName, PartnerId, CustomerCode, Active, Notes)
  VALUES (s.PartnerName, s.PartnerId, s.CustomerCode, 1, N'EnumeratePartners exact name');

-- Stamp PartnerId on existing map rows by name
UPDATE m SET m.PartnerId = p.PartnerId, m.UpdatedAtUtc = SYSUTCDATETIME()
FROM dbo.Dim_Cove_PartnerMap m
INNER JOIN #p p ON LOWER(LTRIM(RTRIM(m.PartnerName))) = LOWER(LTRIM(RTRIM(p.PartnerName)))
WHERE p.PartnerId IS NOT NULL AND (m.PartnerId IS NULL OR m.PartnerId <> p.PartnerId);

-- Stamp PartnerId from EnumeratePartners when map PartnerName already exists under different spelling via alias
UPDATE a SET a.PartnerId = p.PartnerId, a.UpdatedAtUtc = SYSUTCDATETIME()
FROM dbo.Dim_Cove_PartnerAlias a
INNER JOIN #p p ON LOWER(LTRIM(RTRIM(a.AliasName))) = LOWER(LTRIM(RTRIM(p.PartnerName)))
WHERE p.PartnerId IS NOT NULL AND (a.PartnerId IS NULL OR a.PartnerId <> p.PartnerId);

PRINT N'EnumeratePartners merge done';
SELECT COUNT(*) AS MapRows FROM dbo.Dim_Cove_PartnerMap WHERE Active = 1;
'@)

  $sqlFile = Join-Path $logDir ("cove_partners_merge_{0:yyyyMMdd_HHmmss}.sql" -f (Get-Date))
  [IO.File]::WriteAllText($sqlFile, $sb.ToString(), [Text.UTF8Encoding]::new($false))
  Write-Log ("SQL " + $sqlFile)

  $sqlcmd = Find-Sqlcmd
  & $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -b -i $sqlFile 2>&1 | ForEach-Object {
    Write-Log ("$_")
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Log 'sqlcmd failed with SqlUser - try Windows auth once'
    & $sqlcmd -S $SqlServer -d $SqlDatabase -E -C -b -i $sqlFile 2>&1 | ForEach-Object { Write-Log ("$_") }
  }
}

# Stamp BHF PartnerId from devices / known PCNS partner when NULL
$stampSql = @'
USE [RPMAssure_App];
SET NOCOUNT ON;
-- Fill NULL PartnerId on map from latest device rows (by Product name)
UPDATE m
SET m.PartnerId = x.PartnerId,
    m.UpdatedAtUtc = SYSUTCDATETIME(),
    m.Notes = CASE WHEN m.Notes IS NULL OR m.Notes = N'' THEN N'PartnerId from devices' ELSE m.Notes END
FROM dbo.Dim_Cove_PartnerMap m
INNER JOIN (
  SELECT LTRIM(RTRIM(Product)) AS PartnerName, MAX(PartnerId) AS PartnerId
  FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
  WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))
    AND PartnerId IS NOT NULL
    AND NULLIF(LTRIM(RTRIM(Product)), N'') IS NOT NULL
  GROUP BY LTRIM(RTRIM(Product))
) x ON LOWER(LTRIM(RTRIM(m.PartnerName))) = LOWER(x.PartnerName)
WHERE m.PartnerId IS NULL;

-- BHF family: use Board of Healthcare Funders / BHF (PNCS) PartnerId when still NULL
DECLARE @bhfId int =
  (SELECT TOP 1 PartnerId FROM dbo.Dim_Cove_PartnerMap WITH (NOLOCK)
   WHERE PartnerId IS NOT NULL AND CustomerCode IN (N'BHF', N'PCNS')
   ORDER BY CASE WHEN PartnerName LIKE N'%Healthcare%' THEN 0 WHEN PartnerName LIKE N'%PNCS%' THEN 1 ELSE 2 END);

IF @bhfId IS NULL
  SET @bhfId = (
    SELECT TOP 1 PartnerId FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
    WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))
      AND (Product LIKE N'%Healthcare Funders%' OR Product LIKE N'%PNCS%' OR Product LIKE N'BHF%')
      AND PartnerId IS NOT NULL
  );

IF @bhfId IS NOT NULL
BEGIN
  UPDATE dbo.Dim_Cove_PartnerMap
  SET PartnerId = @bhfId, UpdatedAtUtc = SYSUTCDATETIME()
  WHERE CustomerCode IN (N'BHF', N'PCNS') AND PartnerId IS NULL;
END

SELECT PartnerName, CustomerCode, PartnerId, Notes
FROM dbo.Dim_Cove_PartnerMap WITH (NOLOCK)
WHERE Active = 1
ORDER BY CustomerCode, PartnerName;
'@
$stampFile = Join-Path $logDir ("cove_partnerid_stamp_{0:yyyyMMdd_HHmmss}.sql" -f (Get-Date))
[IO.File]::WriteAllText($stampFile, $stampSql, [Text.UTF8Encoding]::new($false))
Write-Log ("Stamp PartnerId SQL " + $stampFile)
$sqlcmd = Find-Sqlcmd
& $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -b -i $stampFile 2>&1 | ForEach-Object { Write-Log ("$_") }

# Always run name fuzzy auto-map after partner tree
$auto = Join-Path $here 'Auto-Map-Cove-Partners.ps1'
if (Test-Path $auto) {
  Write-Log 'Running Auto-Map-Cove-Partners.ps1 ...'
  & powershell -NoProfile -ExecutionPolicy Bypass -File $auto
}

Write-Log ("log=" + $log)
Write-Log '=== Done ==='
Write-Host 'Re-run Collect-Cove-To-RPMAssure.ps1 so CustomerCode stamps refresh.' -ForegroundColor Cyan
