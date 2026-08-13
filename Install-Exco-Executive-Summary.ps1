# Install-Exco-Executive-Summary.ps1
# Full-width Exco, chrome tokens, tab highlight, scroll-to-top on click.
# Extract the zip, then (Administrator):
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Exco-Executive-Summary.ps1
$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$ServiceName = 'RPMAssure-App'
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Here) { $Here = (Get-Location).Path }

function W($c,$m){ Write-Host $m -ForegroundColor $c }

Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' Exco soft board + chart tooltips + chrome'
Write-Host '========================================' -ForegroundColor Cyan

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run as Administrator.' }
if (-not (Test-Path $App)) { throw "Missing $App" }

$files = @(
  'src\routes\index.tsx',
  'src\routes\settings.tsx',
  'src\routes\settings.chrome.tsx',
  'src\routes\settings.theme.tsx',
  'src\styles.css',
  'src\components\portfolio\app-shell.tsx',
  'src\components\nav\spa-link.tsx',
  'src\components\nav\customer-workspace-nav.tsx',
  'src\components\ui\tabs.tsx',
  'src\lib\nav\scroll-chrome.ts',
  'src\lib\nav\menu-style.ts',
  'src\lib\nav\site-tree.ts',
  'src\lib\theme.tsx',
  'src\lib\theme-tokens.ts',
  'src\components\theme\theme-chrome-preview.tsx',
  'src\components\exco\exco-visuals.tsx',
  'src\components\exco\download-pack-button.tsx',
  'public\theme-previews\ocean.png',
  'public\theme-previews\teal.png',
  'public\theme-previews\ink.png',
  'public\theme-previews\contrast.png',
  'public\theme-previews\lime.png',
  'public\theme-previews\dusk.png',
  'public\theme-previews\all.png'
)

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$bakDir = "C:\RPM-Assure\backup\exco-exec_$stamp"
New-Item -ItemType Directory -Force -Path $bakDir | Out-Null

foreach ($rel in $files) {
  $src = Join-Path $Here ("App\" + $rel)
  if (-not (Test-Path -LiteralPath $src)) { throw "Missing $src - extract the full zip." }
  $dest = Join-Path $App $rel
  $bak = Join-Path $bakDir ($rel -replace '\\','_')
  if (Test-Path -LiteralPath $dest) {
    Copy-Item -LiteralPath $dest -Destination $bak -Force
  }
  $destDir = Split-Path -Parent $dest
  if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
  Copy-Item -LiteralPath $src -Destination $dest -Force
  W Green ("Installed $rel")
}
W Green "Backup: $bakDir"

$svcObj = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svcObj) {
  W Cyan ("Restarting {0} (was {1}) ..." -f $ServiceName, $svcObj.Status)
  Restart-Service -InputObject $svcObj -Force
  $up = $false
  for ($i = 1; $i -le 40; $i++) {
    Start-Sleep -Seconds 1
    $l = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
    if ($l) { W Green ("LISTENING PID {0}" -f $l[0].OwningProcess); $up = $true; break }
  }
  if (-not $up) { W Yellow 'Service restarted but port 8081 not listening yet - wait about 10s then hard-refresh.' }
  Get-Service -Name $ServiceName | Format-Table Name, Status, StartType -AutoSize
} else {
  W Yellow 'Service RPMAssure-App not found - files installed; start the app yourself.'
}

try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8081/login' -UseBasicParsing -TimeoutSec 8
  W Green ("PROOF OK: /login HTTP {0}" -f $r.StatusCode)
} catch {
  $msg = $_.Exception.Message
  W Yellow ("PROOF: /login not ready yet - {0}" -f $msg)
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host ' INSTALLED'
Write-Host '  Soft analytics Exco board (donut / line / bars)'
Write-Host '  Chart and tile tooltips'
Write-Host '  Hard-refresh the browser'
Write-Host '========================================' -ForegroundColor Green
