# Recover MSI install v2 - fix nested .output and start app
# Run as Administrator
$ErrorActionPreference = 'Stop'
Write-Host '=== RPM Assure recovery v2 ===' -ForegroundColor Cyan

$pf = 'C:\Program Files\RPM Resources\RPM Assure'
$appSrc = 'C:\RPM-Assure\App'
$installer = 'C:\RPM-Assure\installer'
$logDir = Join-Path $env:ProgramData 'RPM Resources\RPM Assure\logs'
$cfgDir = Join-Path $env:ProgramData 'RPM Resources\RPM Assure\config'
New-Item -ItemType Directory -Force -Path $pf, $logDir, $cfgDir | Out-Null

function Find-IndexMjs([string]$root) {
  if (-not (Test-Path $root)) { return $null }
  Get-ChildItem -LiteralPath $root -Recurse -Filter 'index.mjs' -EA SilentlyContinue |
    Where-Object { $_.FullName -match '\\server\\index\.mjs$' } |
    Select-Object -First 1 -ExpandProperty FullName
}

function Fix-NestedOutput {
  $bad = Join-Path $pf 'app\.output\.output'
  $good = Join-Path $pf 'app\.output'
  if (Test-Path (Join-Path $bad 'server\index.mjs')) {
    Write-Host 'Fixing nested app\.output\.output -> app\.output' -ForegroundColor Yellow
    $tmp = Join-Path $env:TEMP ('rpma_out_' + [guid]::NewGuid().ToString('N'))
    Move-Item $bad $tmp -Force
    if (Test-Path $good) { Remove-Item $good -Recurse -Force }
    New-Item -ItemType Directory -Force -Path (Split-Path $good) | Out-Null
    Move-Item $tmp $good -Force
    Write-Host 'Nested output fixed' -ForegroundColor Green
  }
}

function Deploy-FromAppSource {
  Write-Host "Deploying production build from $appSrc ..." -ForegroundColor Cyan
  $src = Join-Path $appSrc '.output\server\index.mjs'
  if (-not (Test-Path $src)) {
    Write-Host 'Building node-server first...' -ForegroundColor Yellow
    $node = @(
      'C:\Nodejs\node.exe',
      'C:\Program Files\nodejs\node.exe'
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $node) { $node = (Get-Command node -EA SilentlyContinue).Source }
    if (-not $node) { throw 'node.exe not found' }
    $env:RPM_ASSURE_NITRO_PRESET = 'node-server'
    $env:NITRO_PRESET = 'node-server'
    Push-Location $appSrc
    try {
      if (Test-Path 'scripts\build-node.mjs') {
        & $node 'scripts\build-node.mjs'
      } else {
        cmd /c "`"$node`" node_modules\vite\bin\vite.js build"
      }
      if ($LASTEXITCODE -ne 0) { throw 'build failed' }
    } finally { Pop-Location }
  }
  if (-not (Test-Path $src)) { throw "Still missing $src" }

  $destOut = Join-Path $pf 'app\.output'
  if (Test-Path $destOut) { Remove-Item $destOut -Recurse -Force }
  New-Item -ItemType Directory -Force -Path (Join-Path $pf 'app') | Out-Null
  # correct copy: contents into app\.output
  New-Item -ItemType Directory -Force -Path $destOut | Out-Null
  Copy-Item -Path (Join-Path $appSrc '.output\*') -Destination $destOut -Recurse -Force
  if (Test-Path (Join-Path $appSrc 'package.json')) {
    Copy-Item (Join-Path $appSrc 'package.json') (Join-Path $pf 'app\package.json') -Force
  }
  if (-not (Test-Path (Join-Path $destOut 'server\index.mjs'))) {
    throw 'Copy failed - no server\index.mjs'
  }
  Write-Host 'App .output deployed' -ForegroundColor Green
}

function Ensure-NodeRuntime {
  $node = Join-Path $pf 'runtime\node\node.exe'
  if (Test-Path $node) { Write-Host "Runtime node OK: $node"; return $node }
  # copy from system or from installer stage
  $sys = @('C:\Nodejs\node.exe','C:\Program Files\nodejs\node.exe') | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $sys) { $sys = (Get-Command node -EA SilentlyContinue).Source }
  if (-not $sys) { throw 'No node.exe available for runtime' }
  $dir = Join-Path $pf 'runtime\node'
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  # copy whole node distribution if possible
  $sysDir = Split-Path $sys
  Copy-Item (Join-Path $sysDir '*') $dir -Recurse -Force -EA SilentlyContinue
  if (-not (Test-Path $node)) { Copy-Item $sys $node -Force }
  Write-Host "Runtime node installed: $node" -ForegroundColor Green
  return $node
}

function Ensure-Scripts {
  foreach ($sub in @('service','wizard')) {
    $src = Join-Path $installer $sub
    $dst = Join-Path $pf $sub
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    if (Test-Path $src) {
      Copy-Item (Join-Path $src '*') $dst -Recurse -Force -EA SilentlyContinue
    }
  }
  # write soft-fail Start-Service
  $start = @'
$ErrorActionPreference = "Continue"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path $here -Parent
$logs = Join-Path $env:ProgramData "RPM Resources\RPM Assure\logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$cfg = Join-Path $env:ProgramData "RPM Resources\RPM Assure\config\app.env"
$app = Join-Path $root "app"
if ((Test-Path $cfg) -and (Test-Path $app)) { Copy-Item $cfg (Join-Path $app ".env.local") -Force }

$node = Join-Path $root "runtime\node\node.exe"
if (-not (Test-Path $node)) { $node = (Get-Command node -EA SilentlyContinue).Source }
$entry = Join-Path $root "app\.output\server\index.mjs"
if (-not (Test-Path $entry)) {
  $found = Get-ChildItem -LiteralPath $root -Recurse -Filter "index.mjs" -EA SilentlyContinue |
    Where-Object { $_.FullName -match "\\server\\index\.mjs$" } | Select-Object -First 1
  if ($found) { $entry = $found.FullName }
}
if (-not ((Test-Path $node) -and (Test-Path $entry))) {
  Write-Host "Missing node or entry. node=$node entry=$entry"
  exit 1
}
try {
  Get-NetTCPConnection -LocalPort 8081 -State Listen -EA SilentlyContinue | ForEach-Object {
    if ($_.OwningProcess -gt 0) { Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue }
  }
} catch {}
$env:PORT="8081"; $env:NITRO_PORT="8081"; $env:HOST="0.0.0.0"
$stdout = Join-Path $logs "app-stdout.log"
$stderr = Join-Path $logs "app-stderr.log"
$work = Split-Path (Split-Path $entry -Parent) -Parent
if (-not (Test-Path (Join-Path $work "package.json"))) { $work = $app }
$cmd = "cd /d `"$work`" && set PORT=8081&& set NITRO_PORT=8081&& set HOST=0.0.0.0&& `"$node`" `"$entry`" >> `"$stdout`" 2>> `"$stderr`""
Start-Process cmd.exe -ArgumentList "/c", $cmd -WorkingDirectory $work -WindowStyle Hidden
Write-Host "Started: $entry"
'@
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [IO.File]::WriteAllText((Join-Path $pf 'service\Start-Service.ps1'), $start, $utf8)
}

# --- main ---
Write-Host 'Scanning for server\index.mjs ...'
$found = Find-IndexMjs $pf
if ($found) {
  Write-Host "Found: $found" -ForegroundColor Green
  Fix-NestedOutput
  $found = Find-IndexMjs $pf
} else {
  Write-Host 'Not found under Program Files - checking nested / redeploy' -ForegroundColor Yellow
}

# If still wrong path after expand from bad zip, redeploy from App
$marker = Join-Path $pf 'app\.output\server\index.mjs'
if (-not (Test-Path $marker)) {
  Fix-NestedOutput
}
if (-not (Test-Path $marker)) {
  $found = Find-IndexMjs $pf
  if ($found -and $found -ne $marker) {
    Write-Host "Relocating $found -> $marker" -ForegroundColor Yellow
    $srcDir = Split-Path (Split-Path $found -Parent) -Parent  # .output folder that contains server
    # if found is ...\app\.output\.output\server\index.mjs, srcDir is ...\app\.output\.output
    $destOut = Join-Path $pf 'app\.output'
    if (Test-Path $destOut) { Remove-Item $destOut -Recurse -Force }
    New-Item -ItemType Directory -Force -Path (Split-Path $destOut) | Out-Null
    Copy-Item $srcDir $destOut -Recurse -Force
  }
}
if (-not (Test-Path $marker)) {
  Deploy-FromAppSource
}
if (-not (Test-Path $marker)) { throw "Cannot establish $marker" }
Write-Host "OK $marker" -ForegroundColor Green

$nodePath = Ensure-NodeRuntime
Ensure-Scripts

# Config
$envFile = Join-Path $cfgDir 'app.env'
if (-not (Test-Path $envFile)) {
  $srcEnv = Join-Path $appSrc '.env.local'
  if (Test-Path $srcEnv) {
    Copy-Item $srcEnv $envFile -Force
    Write-Host "Copied config from App .env.local" -ForegroundColor Green
  } else {
    Write-Host 'No app.env yet - launch wizard if available' -ForegroundColor Yellow
    $wiz = Join-Path $pf 'wizard\RpmAssure-ConfigWizard.ps1'
    if (-not (Test-Path $wiz)) { $wiz = Join-Path $installer 'wizard\RpmAssure-ConfigWizard.ps1' }
    if (Test-Path $wiz) {
      & powershell -NoProfile -ExecutionPolicy Bypass -File $wiz -InstallDir $pf
    }
  }
}
if (Test-Path $envFile) {
  Copy-Item $envFile (Join-Path $pf 'app\.env.local') -Force
}

# Start
Write-Host 'Starting...' -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $pf 'service\Start-Service.ps1')
Start-Sleep 5

$ok = $false
try {
  $r = Invoke-WebRequest 'http://127.0.0.1:8081/login' -UseBasicParsing -TimeoutSec 15
  if ($r.StatusCode -eq 200) {
    $ok = $true
    Write-Host "HEALTHY status=200 len=$($r.RawContentLength)" -ForegroundColor Green
  }
} catch {
  Write-Host "Health: $($_.Exception.Message)" -ForegroundColor Yellow
  $err = Join-Path $logDir 'app-stderr.log'
  if (Test-Path $err) {
    Write-Host '--- app-stderr tail ---' -ForegroundColor Yellow
    Get-Content $err -Tail 40
  }
}

Write-Host ''
Write-Host "App:    $marker"
Write-Host "Node:   $nodePath"
Write-Host "Config: $envFile"
Write-Host "Logs:   $logDir"
if ($ok) { Write-Host 'Open http://127.0.0.1:8081/login' -ForegroundColor Green }
Write-Host '=== Done ==='
