# RSR direct collect - local read + central write (no linked server)
# powershell -NoProfile -ExecutionPolicy Bypass -File .\Run-RSR-Collect-Direct.ps1 [-IncludeJobs]
$ErrorActionPreference = 'Stop'
$CollectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $CollectDir 'Customer.Config.ps1')
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$log = Join-Path $LogDir ("direct_{0}.log" -f $stamp)
function Log([string]$m) {
  $line = '{0:yyyy-MM-dd HH:mm:ss}Z {1}' -f (Get-Date).ToUniversalTime(), $m
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

$IncludeJobs = $false
foreach ($a in $args) { if ($a -eq '-IncludeJobs') { $IncludeJobs = $true } }

function Get-Sqlcmd {
  $c = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $paths = @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE'
  )
  foreach ($p in $paths) { if (Test-Path $p) { return $p } }
  throw 'sqlcmd not found'
}
$sqlcmd = Get-Sqlcmd
Log "START direct collect host=$env:COMPUTERNAME sqlcmd=$sqlcmd log=$log"

function Invoke-SqlFile {
  param(
    [string]$Server,
    [string]$User,
    [string]$Pass,
    [string]$Database,
    [string]$SqlText,
    [switch]$Tsv
  )
  $tmpSql = Join-Path $LogDir ("q_{0}.sql" -f [guid]::NewGuid().ToString('N'))
  $tmpOut = Join-Path $LogDir ("q_{0}.out" -f [guid]::NewGuid().ToString('N'))
  [IO.File]::WriteAllText($tmpSql, $SqlText, [Text.UTF8Encoding]::new($false))

  $argList = New-Object System.Collections.Generic.List[string]
  $argList.Add('-S'); $argList.Add($Server)
  if ($Database) { $argList.Add('-d'); $argList.Add($Database) }
  $argList.Add('-U'); $argList.Add($User)
  $argList.Add('-P'); $argList.Add($Pass)
  $argList.Add('-C'); $argList.Add('-b'); $argList.Add('-x'); $argList.Add('-I')
  $argList.Add('-i'); $argList.Add($tmpSql)
  $argList.Add('-o'); $argList.Add($tmpOut)
  if ($Tsv) {
    $argList.Add('-h'); $argList.Add('-1')
    $argList.Add('-W')
    $argList.Add('-s'); $argList.Add('|')
  }

  $old = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $sqlcmd @($argList.ToArray()) 2>&1 | Out-Null
  $ec = $LASTEXITCODE
  $ErrorActionPreference = $old

  $text = ''
  if (Test-Path -LiteralPath $tmpOut) {
    $text = [IO.File]::ReadAllText($tmpOut)
  }
  Remove-Item -LiteralPath $tmpSql, $tmpOut -Force -ErrorAction SilentlyContinue
  return [pscustomobject]@{ ExitCode = $ec; Text = $text }
}

function Get-DataRows([string]$text) {
  $rows = New-Object System.Collections.Generic.List[string]
  foreach ($line in ($text -split "`r?`n")) {
    $t = $line.Trim()
    if (-not $t) { continue }
    if ($t -match 'rows affected') { continue }
    if ($t -match '^Msg \d+') { continue }
    if ($t -match '^Sqlcmd:') { continue }
    if ($t -match '^\[Microsoft\]') { continue }
    if ($t -match '^Changed database') { continue }
    $rows.Add($t)
  }
  return $rows
}

function SqlLit([string]$s) {
  if ($null -eq $s -or $s -eq '') { return 'NULL' }
  return "N'" + ($s.Replace("'", "''")) + "'"
}

Log 'TEST local'
$r = Invoke-SqlFile -Server '.' -User $LocalSqlUser -Pass $LocalSqlPassword -Database $null -SqlText "SET NOCOUNT ON;`r`nSELECT SUSER_SNAME() AS Who, @@SERVERNAME AS Srv;"
if ($r.ExitCode -ne 0) { throw "Local login failed exit=$($r.ExitCode) $($r.Text)" }
Log ("local OK $($r.Text.Trim() -replace '\s+',' ')")

Log "TEST central $CentralDataSource"
$r = Invoke-SqlFile -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText "SET NOCOUNT ON;`r`nSELECT DB_NAME() AS Db, SUSER_SNAME() AS Who;"
if ($r.ExitCode -ne 0) { throw "Central login failed exit=$($r.ExitCode) $($r.Text)" }
Log ("central OK $($r.Text.Trim() -replace '\s+',' ')")

$r = Invoke-SqlFile -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText "SET NOCOUNT ON;`r`nSELECT COUNT(*) AS C FROM dbo.Dim_Customer WHERE CustomerCode=N'RSR' AND Active=1;" -Tsv
$rows = Get-DataRows $r.Text
$active = 0
foreach ($x in $rows) { if ($x -match '^\d+$') { $active = [int]$x; break } }
if ($active -lt 1) { throw "RSR not active on central Dim_Customer. Out=$($r.Text)" }
Log 'Dim_Customer RSR active'

$snap = (Get-Date).ToString('yyyy-MM-dd')
Log "SnapshotDate=$snap Instance=$InstanceName"

Log 'COLLECT operators'
$opSql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'SysproDB.dbo.AdmOperator',N'U') IS NOT NULL
  SELECT LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))) AS OperatorCode,
         ISNULL(MAX(LTRIM(RTRIM(CONVERT(nvarchar(200), Name)))),N'') AS OperatorName
  FROM SysproDB.dbo.AdmOperator
  WHERE Operator IS NOT NULL AND LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))) <> N''
  GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), Operator)));
ELSE IF OBJECT_ID(N'Sysprodb.dbo.AdmOperator',N'U') IS NOT NULL
  SELECT LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))) AS OperatorCode,
         ISNULL(MAX(LTRIM(RTRIM(CONVERT(nvarchar(200), Name)))),N'') AS OperatorName
  FROM Sysprodb.dbo.AdmOperator
  WHERE Operator IS NOT NULL AND LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))) <> N''
  GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), Operator)));
ELSE
  SELECT CAST(NULL AS nvarchar(50)) AS OperatorCode, CAST(NULL AS nvarchar(200)) AS OperatorName WHERE 1=0;
"@

$r = Invoke-SqlFile -Server '.' -User $LocalSqlUser -Pass $LocalSqlPassword -Database $null -SqlText $opSql -Tsv
if ($r.ExitCode -ne 0) { throw "Local operators query failed: $($r.Text)" }
$ops = @()
foreach ($line in (Get-DataRows $r.Text)) {
  $p = $line -split '\|', 2
  $code = $p[0].Trim()
  if (-not $code -or $code -eq 'NULL') { continue }
  $name = if ($p.Count -gt 1) { $p[1].Trim() } else { '' }
  if ($name -eq 'NULL') { $name = '' }
  $ops += [pscustomobject]@{ Code = $code; Name = $name }
}
Log ("local operators=$($ops.Count)")
if ($ops.Count -eq 0) { throw "No local operators. Raw=$($r.Text)" }

$loginMap = @{}
$loginSql = @"
SET NOCOUNT ON;
DECLARE @db sysname = CASE WHEN OBJECT_ID(N'SysproDB.dbo.AdmOperatorLogin',N'U') IS NOT NULL THEN N'SysproDB' ELSE N'Sysprodb' END;
IF OBJECT_ID(@db + N'.dbo.AdmOperatorLogin',N'U') IS NULL
BEGIN
  SELECT CAST(NULL AS nvarchar(50)) AS c, CAST(NULL AS varchar(30)) AS d WHERE 1=0;
  RETURN;
END
DECLARE @op sysname, @dt sysname;
SELECT TOP 1 @op = name FROM sys.columns WHERE object_id = OBJECT_ID(@db + N'.dbo.AdmOperatorLogin') AND name IN (N'Operator',N'OperatorCode');
SELECT TOP 1 @dt = c.name FROM sys.columns c JOIN sys.types t ON t.user_type_id=c.user_type_id
 WHERE c.object_id = OBJECT_ID(@db + N'.dbo.AdmOperatorLogin') AND t.name IN (N'datetime',N'datetime2',N'smalldatetime',N'date');
IF @op IS NULL OR @dt IS NULL
BEGIN
  SELECT CAST(NULL AS nvarchar(50)) AS c, CAST(NULL AS varchar(30)) AS d WHERE 1=0;
  RETURN;
END
DECLARE @q nvarchar(max) = N'
SELECT LTRIM(RTRIM(CONVERT(nvarchar(50),' + QUOTENAME(@op) + N'))),
       CONVERT(varchar(30), MAX(' + QUOTENAME(@dt) + N'), 126)
FROM ' + QUOTENAME(@db) + N'.dbo.AdmOperatorLogin
WHERE ' + QUOTENAME(@op) + N' IS NOT NULL
GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50),' + QUOTENAME(@op) + N')))';
EXEC sp_executesql @q;
"@

try {
  $r = Invoke-SqlFile -Server '.' -User $LocalSqlUser -Pass $LocalSqlPassword -Database $null -SqlText $loginSql -Tsv
  if ($r.ExitCode -eq 0) {
    foreach ($line in (Get-DataRows $r.Text)) {
      $p = $line -split '\|', 2
      if ($p.Count -ge 2 -and $p[0] -and $p[0] -ne 'NULL') { $loginMap[$p[0].Trim()] = $p[1].Trim() }
    }
  }
  Log ("login map=$($loginMap.Count)")
} catch {
  Log "login enrich skip: $($_.Exception.Message)"
}

$del = @"
SET NOCOUNT ON;
DELETE FROM dbo.Syspro_Operators
WHERE SnapshotDate = '$snap' AND InstanceName = $(SqlLit $InstanceName);
SELECT @@ROWCOUNT AS Deleted;
"@
$r = Invoke-SqlFile -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText $del
if ($r.ExitCode -ne 0) { throw "Central delete failed: $($r.Text)" }
Log 'central day cleared'

$batch = New-Object System.Text.StringBuilder
[void]$batch.AppendLine('SET NOCOUNT ON;')
$n = 0
foreach ($o in $ops) {
  $n++
  $llSql = 'NULL'
  if ($loginMap.ContainsKey($o.Code)) {
    $raw = $loginMap[$o.Code]
    if ($raw -and $raw -ne 'NULL') {
      $llSql = "'" + ($raw -replace 'T', ' ') + "'"
    }
  }
  $line = "INSERT INTO dbo.Syspro_Operators (SnapshotDate, InstanceName, OperatorCode, OperatorName, GroupCode, Email, LastLoginDate, OperatorStatus, ImportedAt) VALUES ('$snap', $(SqlLit $InstanceName), $(SqlLit $o.Code), $(SqlLit $o.Name), NULL, NULL, $llSql, N'Active', SYSUTCDATETIME());"
  [void]$batch.AppendLine($line)
  if (($n % 20) -eq 0) {
    $r = Invoke-SqlFile -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText $batch.ToString()
    if ($r.ExitCode -ne 0) { throw "Insert batch failed at $n : $($r.Text)" }
    Log "inserted $n ..."
    $batch = New-Object System.Text.StringBuilder
    [void]$batch.AppendLine('SET NOCOUNT ON;')
  }
}
if ($batch.ToString().Trim() -ne 'SET NOCOUNT ON;') {
  $r = Invoke-SqlFile -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText $batch.ToString()
  if ($r.ExitCode -ne 0) { throw "Insert final failed: $($r.Text)" }
}
Log "Operators written=$($ops.Count)"

Log 'COLLECT license (simple)'
$licProbe = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'SysproDB.dbo.AdmSystemLicense',N'U') IS NOT NULL SELECT N'SysproDB' AS Db;
ELSE IF OBJECT_ID(N'Sysprodb.dbo.AdmSystemLicense',N'U') IS NOT NULL SELECT N'Sysprodb' AS Db;
ELSE SELECT N'NONE' AS Db;
"@
$r = Invoke-SqlFile -Server '.' -User $LocalSqlUser -Pass $LocalSqlPassword -Database $null -SqlText $licProbe -Tsv
$licDb = (Get-DataRows $r.Text | Select-Object -First 1)
if ($licDb -and $licDb -ne 'NONE') {
  $licSql = @"
SET NOCOUNT ON;
SELECT TOP 1
  ISNULL(CONVERT(varchar(30), ImportDate, 126), '') AS ImportDate,
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(20), LicenseType))), '') AS LicenseType,
  ISNULL(CONVERT(varchar(20), Users), '') AS Users,
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(200), CustomerName))), '') AS CustomerName
FROM $($licDb).dbo.AdmSystemLicense;
"@
  $r = Invoke-SqlFile -Server '.' -User $LocalSqlUser -Pass $LocalSqlPassword -Database $null -SqlText $licSql -Tsv
  $line = (Get-DataRows $r.Text | Select-Object -First 1)
  if ($line) {
    $p = $line -split '\|'
    $id = if ($p[0]) { "'" + $p[0] + "'" } else { 'NULL' }
    $lt = if ($p.Count -gt 1) { SqlLit $p[1] } else { 'NULL' }
    $us = if ($p.Count -gt 2 -and $p[2] -match '^\d+$') { $p[2] } else { 'NULL' }
    $cn = if ($p.Count -gt 3) { SqlLit $p[3] } else { 'NULL' }
    $q = @"
SET NOCOUNT ON;
DELETE FROM dbo.Syspro_SystemLicense WHERE SnapshotDate='$snap' AND InstanceName=$(SqlLit $InstanceName);
INSERT INTO dbo.Syspro_SystemLicense
(SnapshotDate, InstanceName, ImportDate, LicenseType, Users, CustomerCode, CustomerName, RawXml, ImportedAt)
VALUES ('$snap', $(SqlLit $InstanceName), $id, $lt, $us, $(SqlLit $CustomerCode), $cn, NULL, SYSUTCDATETIME());
"@
    $r2 = Invoke-SqlFile -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText $q
    if ($r2.ExitCode -ne 0) { Log "license write fail $($r2.Text)" } else { Log 'license OK' }
  } else { Log 'license empty' }
} else { Log 'license none' }

if ($IncludeJobs) {
  Log 'jobs count only'
  $jobSql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'SysproDB.dbo.AdmJobLogging',N'U') IS NOT NULL SELECT COUNT(*) FROM SysproDB.dbo.AdmJobLogging;
ELSE IF OBJECT_ID(N'Sysprodb.dbo.AdmJobLogging',N'U') IS NOT NULL SELECT COUNT(*) FROM Sysprodb.dbo.AdmJobLogging;
ELSE SELECT 0;
"@
  $r = Invoke-SqlFile -Server '.' -User $LocalSqlUser -Pass $LocalSqlPassword -Database $null -SqlText $jobSql -Tsv
  Log ("local job rows ~ $((Get-DataRows $r.Text) -join ',')")
}

$v = Invoke-SqlFile -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText @"
SET NOCOUNT ON;
SELECT COUNT(*) AS Ops, CONVERT(varchar(30), MAX(ImportedAt), 126) AS LastAt
FROM dbo.Syspro_Operators
WHERE InstanceName = $(SqlLit $InstanceName) AND SnapshotDate = '$snap';
"@ -Tsv
Log ("VERIFY $($v.Text.Trim() -replace '\s+',' | ')")
Log 'DONE direct collect'
Write-Host ''
Write-Host 'SUCCESS - operators pushed to central (no linked server).' -ForegroundColor Green
exit 0
