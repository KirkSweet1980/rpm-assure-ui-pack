# Automate Cove partner map cleanup on central SQL.
# ASCII only. Safe to re-run after every collect.
param(
  [string]$SqlServer = '',
  [string]$SqlDatabase = 'RPMAssure_App',
  [string]$SqlUser = 'Rpm_collect',
  [string]$SqlPassword = '',
  [switch]$UseWindowsAuth
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
if (-not $here) { $here = 'C:\RPM-Assure\Sql\cove' }
if (-not $SqlServer -or $SqlServer -match '14333|102\.222\.21\.220') {
  if (Get-Service -Name 'MSSQL$RPMREPORTS' -ErrorAction SilentlyContinue) { $SqlServer = '.\RPMREPORTS' }
}
if (-not $SqlServer) { $SqlServer = '.\RPMREPORTS' }
if (-not $UseWindowsAuth) {
  $gp = @(
    (Join-Path $here '..\ops\Get-RpmSqlPassword.ps1'),
    'C:\RPM-Assure\Sql\ops\Get-RpmSqlPassword.ps1'
  ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($gp) { . $gp; $SqlPassword = Get-RpmSqlPassword -Current $SqlPassword }
}
$sqlFile = Join-Path $here '434_AutoMap_Cove_Partners.sql'
if (-not (Test-Path -LiteralPath $sqlFile)) {
  throw "Missing $sqlFile"
}

$logDir = Join-Path $here 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("automap_{0:yyyyMMdd_HHmmss}.log" -f (Get-Date))

function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

function Find-Sqlcmd {
  $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @(
    'D:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
  )) {
    if (Test-Path $p) { return $p }
  }
  throw 'sqlcmd not found'
}

Write-Log '=== Cove auto-map start ==='
Write-Log ("SQL=" + $SqlServer + " / " + $SqlDatabase)
$sqlcmd = Find-Sqlcmd
$args = @('-S', $SqlServer, '-d', $SqlDatabase, '-C', '-b', '-i', $sqlFile)
if ($UseWindowsAuth) {
  $args = @('-S', $SqlServer, '-d', $SqlDatabase, '-E', '-C', '-b', '-i', $sqlFile)
} else {
  $args = @('-S', $SqlServer, '-d', $SqlDatabase, '-U', $SqlUser, '-P', $SqlPassword, '-C', '-b', '-i', $sqlFile)
}

& $sqlcmd @args *>&1 | ForEach-Object {
  $t = "$_"
  Add-Content -LiteralPath $log -Value $t
  Write-Host $t
}
if ($LASTEXITCODE -ne 0) {
  Write-Log ("sqlcmd failed " + $LASTEXITCODE + " - if CREATE TABLE denied, re-run once with -UseWindowsAuth")
  throw ("sqlcmd failed " + $LASTEXITCODE + " see " + $log)
}

# Summary query
$q = @"
SET NOCOUNT ON;
SELECT COUNT(*) AS MapRows FROM dbo.Dim_Cove_PartnerMap WHERE Active = 1;
SELECT COUNT(*) AS UnmappedPartners FROM (
  SELECT Product FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
  WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))
    AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = '')
    AND NULLIF(LTRIM(RTRIM(Product)), '') IS NOT NULL
  GROUP BY Product
) x;
SELECT TOP 20 Product AS PartnerName, COUNT(*) AS Devices
FROM dbo.Cove_DeviceStatistics WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Cove_DeviceStatistics WITH (NOLOCK))
  AND (CustomerCode IS NULL OR LTRIM(RTRIM(CustomerCode)) = '')
GROUP BY Product
ORDER BY Devices DESC;
"@
$tmp = Join-Path $logDir 'automap_summary.sql'
[IO.File]::WriteAllText($tmp, $q, [Text.UTF8Encoding]::new($false))
if ($UseWindowsAuth) {
  & $sqlcmd -S $SqlServer -d $SqlDatabase -E -C -i $tmp
} else {
  & $sqlcmd -S $SqlServer -d $SqlDatabase -U $SqlUser -P $SqlPassword -C -i $tmp
}

Write-Log ('=== Cove auto-map done log=' + $log)
