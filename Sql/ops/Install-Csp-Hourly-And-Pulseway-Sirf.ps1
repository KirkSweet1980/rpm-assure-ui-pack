# APP server: Microsoft 365 Graph every 60 minutes + Pulseway collect now (Sir Fruit).
# Run as Administrator. Pure ASCII. No else.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\ops\Install-Csp-Hourly-And-Pulseway-Sirf.ps1

param(
  [string]$Root = "C:\RPM-Assure",
  [int]$CspMinutes = 60
)

$ErrorActionPreference = "Stop"
function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "Run this in an Administrator PowerShell." }

if ($CspMinutes -lt 15) { $CspMinutes = 15 }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " M365 hourly + Pulseway collect (SIRF)"
Write-Host "========================================" -ForegroundColor Cyan

$cspDir = Join-Path $Root "Sql\csp"
$cspInstall = Join-Path $cspDir "Install-Csp-Schedule.ps1"
$cspRunner = Join-Path $cspDir "Run-Csp-Collect-Scheduled.ps1"
$pwCollect = Join-Path $Root "Sql\rmm\pulseway\Collect-Pulseway-To-RPMAssure.ps1"

if (-not (Test-Path -LiteralPath $cspInstall)) { throw ("Missing " + $cspInstall) }
if (-not (Test-Path -LiteralPath $pwCollect)) { throw ("Missing " + $pwCollect) }

W Cyan "--- Microsoft 365 Graph: every $CspMinutes minutes ---"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $cspInstall -Minutes $CspMinutes
if ($LASTEXITCODE -ne 0) { throw "CSP schedule install failed" }

# Keep the 15-min all-API runner from also hitting Graph every cycle.
$allRunner = Join-Path $Root "Sql\ops\Run-All-Api-Collects-Scheduled.ps1"
if (Test-Path -LiteralPath $allRunner) {
  $t = [IO.File]::ReadAllText($allRunner)
  $t2 = $t.Replace('$SkipCsp = $false', '$SkipCsp = $true')
  if ($t2 -ne $t) {
    [IO.File]::WriteAllText($allRunner, $t2, [Text.UTF8Encoding]::new($false))
    W Yellow "All-API runner: CSP skipped (hourly task owns Graph)."
  }
}

W Cyan "--- Pulseway collect now (full estate, maps SIRF) ---"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $pwCollect
W Green ("Pulseway collect exit=" + $LASTEXITCODE)

W Cyan "--- Microsoft 365 Graph collect now ---"
if (Test-Path -LiteralPath $cspRunner) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $cspRunner
  W Green ("CSP collect exit=" + $LASTEXITCODE)
}

W Cyan "--- Proof: SIRF Pulseway map + devices ---"
$sqlcmd = $null
foreach ($c in @(
  "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE",
  "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE"
)) {
  if (-not $sqlcmd) {
    if (Test-Path $c) { $sqlcmd = $c }
  }
}
if (-not $sqlcmd) {
  $gc = Get-Command sqlcmd.exe -ErrorAction SilentlyContinue
  if ($gc) { $sqlcmd = $gc.Source }
}
if ($sqlcmd) {
  $q = @"
SET NOCOUNT ON;
SELECT OrganizationName, CustomerCode, Active
FROM dbo.Dim_Pulseway_OrgMap WITH (NOLOCK)
WHERE CustomerCode = N'SIRF' OR OrganizationName LIKE N'%Fruit%' OR OrganizationName LIKE N'%SIRF%';
SELECT OrganizationName, COUNT(*) Devices
FROM dbo.Pulseway_Devices WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Pulseway_Devices WITH (NOLOCK))
  AND (CustomerCode = N'SIRF' OR OrganizationName LIKE N'%Fruit%' OR OrganizationName LIKE N'%SIRF%')
GROUP BY OrganizationName;
SELECT TaskName = N'RPMAssure-Csp-GraphCollect';
"@
  & $sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -Q $q
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " DONE"
Write-Host "  M365 Graph : every $CspMinutes min (RPMAssure-Csp-GraphCollect)"
Write-Host "  Pulseway   : collect just ran"
Write-Host "  Hard-refresh Customer Eco-System / Sir Fruit RMM"
Write-Host "========================================" -ForegroundColor Cyan
