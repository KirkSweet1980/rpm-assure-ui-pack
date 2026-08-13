# Apply Microsoft 365 CSP schema + RPM Resources (RPMINT) pilot seed
param(
  [string]$Server = "102.222.21.220,14333",
  [string]$Database = "RPMAssure_App",
  [switch]$WindowsAuth
)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $here "460_Ensure_Csp_M365.sql"
if (-not (Test-Path -LiteralPath $sqlFile)) { throw "Missing $sqlFile" }

function Find-Sqlcmd {
  $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    "${env:ProgramFiles}\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE",
    "${env:ProgramFiles}\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE"
  )
  foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
  throw "sqlcmd not found"
}

$sqlcmd = Find-Sqlcmd
Write-Host "=== Apply CSP M365 pilot (RPMINT) ==="
Write-Host "SQL=$Server / $Database"
Write-Host "File=$sqlFile"

if ($WindowsAuth) {
  & $sqlcmd -S $Server -d $Database -E -C -b -i $sqlFile
} else {
  $u = $env:RPM_ASSURE_SQL_USER
  $p = $env:RPM_ASSURE_SQL_PASSWORD
  if (-not $u) { $u = "Rpm_collect" }
  if (-not $p) {
    Write-Host "No RPM_ASSURE_SQL_PASSWORD - trying Windows auth (-E)"
    & $sqlcmd -S $Server -d $Database -E -C -b -i $sqlFile
  } else {
    & $sqlcmd -S $Server -d $Database -U $u -P $p -C -b -i $sqlFile
  }
}
if ($LASTEXITCODE -ne 0) { throw "sqlcmd exit $LASTEXITCODE" }

Write-Host "Proof:"
$q = @"
SELECT CustomerCode, PrimaryDomain, SkuCount, TotalSeats, AssignedSeats, UserCount, HealthScore
FROM dbo.vw_Kpi_Csp_Summary ORDER BY 1;
"@
if ($WindowsAuth -or -not $env:RPM_ASSURE_SQL_PASSWORD) {
  & $sqlcmd -S $Server -d $Database -E -C -Q $q -W
} else {
  & $sqlcmd -S $Server -d $Database -U $env:RPM_ASSURE_SQL_USER -P $env:RPM_ASSURE_SQL_PASSWORD -C -Q $q -W
}
Write-Host "=== Done - open RPM Internal > Microsoft 365 Tenant ==="
