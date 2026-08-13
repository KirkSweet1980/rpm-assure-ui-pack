# Install-Ams-Sla-DayEnd.ps1
# One-shot on the APP server: SLA clocks + Day end + Monthly AMS pack.
# Run elevated:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Ams-Sla-DayEnd.ps1
$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$Svc = 'RPMAssure-App'
$Port = 8081
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Here) { $Here = (Get-Location).Path }

function W($c,$m){ Write-Host $m -ForegroundColor $c }

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' RPM Assure - AMS / SLA / Day-end update'
Write-Host '========================================' -ForegroundColor Cyan

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run as Administrator.' }
if (-not (Test-Path $App)) { throw "Missing $App" }

$src = Join-Path $Here 'src'
if (-not (Test-Path $src)) { throw "Missing src next to this script. Extract the full zip first." }

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$bak = "C:\RPM-Assure\backup\ams-sla-dayend_$stamp"
New-Item -ItemType Directory -Force -Path $bak | Out-Null
$rel = @(
  'src\lib\data\sla-metrics.ts',
  'src\lib\data\day-end.ts',
  'src\lib\data\types.ts',
  'src\lib\data\exco-sla-stats.ts',
  'src\lib\data\fill-customer-panels.ts',
  'src\lib\data\live-portfolio.ts',
  'src\lib\data\demo-portfolio.ts',
  'src\lib\data\soft-customer.ts',
  'src\lib\data\ams-report-templates.ts',
  'src\lib\mail\ams-report-html.ts',
  'src\lib\mail\report-build.ts',
  'src\lib\settings\settings-api.ts',
  'src\components\customer\customer-sections.tsx',
  'src\components\nav\customer-workspace-nav.tsx',
  'src\routes\index.tsx',
  'src\routes\reports.tsx',
  'src\routes\customers.$code.tsx',
  'src\routes\customers.$code.syspro.day-end.tsx',
  'src\routeTree.gen.ts'
)
foreach ($r in $rel) {
  $from = Join-Path $App $r
  if (Test-Path -LiteralPath $from) {
    $dest = Join-Path $bak $r
    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
    Copy-Item -LiteralPath $from -Destination $dest -Force
  }
}
W Green "Backup $bak"

Copy-Item -Path (Join-Path $src '*') -Destination (Join-Path $App 'src') -Recurse -Force
W Green 'Source copied into C:\RPM-Assure\App\src'

$svc = Get-Service -Name $Svc -ErrorAction SilentlyContinue
if ($svc) {
  W Cyan "Restart-Service $Svc ..."
  Restart-Service -Name $Svc -Force
  $up = $false
  for ($i = 1; $i -le 40; $i++) {
    Start-Sleep -Seconds 1
    $l = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($l) { W Green ("LISTENING PID {0}" -f $l[0].OwningProcess); $up = $true; break }
  }
  if (-not $up) { throw "Service restarted but port $Port not listening." }
  Get-Service $Svc | Format-Table Name, Status, StartType -AutoSize
} else {
  W Yellow 'Service RPMAssure-App not found — files copied; start the app yourself.'
}

try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/login" -UseBasicParsing -TimeoutSec 8
  W Green ("PROOF OK: /login HTTP {0}" -f $r.StatusCode)
} catch {
  W Yellow ("PROOF: /login not ready yet — $($_.Exception.Message)")
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host ' INSTALLED'
Write-Host '  Hard-refresh Exco'
Write-Host '  Customer → SLA = RPM clocks (no 99.5%)'
Write-Host '  SYSPRO → Day end'
Write-Host '  Assure pack → Print monthly AMS pack'
Write-Host '========================================' -ForegroundColor Green
