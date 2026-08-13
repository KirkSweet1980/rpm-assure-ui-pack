# RPM Assure - production build + run from C:\RPM-Assure\App (NOT MSI)
# Run as Administrator.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Go-Production-NoMsi.ps1
param(
  [switch]$SkipBuild,
  [switch]$SkipTypecheck
)
$ErrorActionPreference = 'Stop'
$Root   = 'C:\RPM-Assure'
$App    = Join-Path $Root 'App'
$Deploy = Join-Path $Root 'deploy'
$Logs   = Join-Path $Deploy 'logs'
$Port   = 8081
$Task   = 'RPMAssure-App-OnStart'

function Write-Step([string]$m) { Write-Host $m -ForegroundColor Cyan }
function Write-Ok([string]$m)   { Write-Host $m -ForegroundColor Green }
function Write-Warn([string]$m) { Write-Host $m -ForegroundColor Yellow }

Write-Step '=== RPM Assure production (no MSI) ==='
Write-Host ("App root: {0}" -f $App)
Write-Host ("Port:     {0}" -f $Port)
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

$pkgJson = Join-Path $App 'package.json'
if (-not (Test-Path -LiteralPath $pkgJson)) {
  throw ("Missing {0} - copy the App tree to C:\RPM-Assure\App first." -f $pkgJson)
}

function Find-Node {
  $c = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $paths = @(
    'C:\Program Files\nodejs\node.exe',
    'C:\Nodejs\node.exe',
    'C:\Program Files\RPM Resources\RPM Assure\runtime\node\node.exe'
  )
  foreach ($p in $paths) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

$node = Find-Node
if (-not $node) {
  throw 'node.exe not found. Install Node 20+ LTS or put node on PATH.'
}
Write-Ok ("Node: {0}" -f $node)

$npmCmd = Join-Path (Split-Path $node -Parent) 'npm.cmd'
if (-not (Test-Path -LiteralPath $npmCmd)) {
  $n = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($n) { $npmCmd = $n.Source } else { $npmCmd = 'npm.cmd' }
}

$ensure = Join-Path $Deploy 'Ensure-Production-Env.ps1'
if (Test-Path -LiteralPath $ensure) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ensure
} else {
  Write-Warn 'Ensure-Production-Env.ps1 missing - ensure App\.env.local has SQL + PORT=8081'
}

# Strip UTF-8 BOM from package.json if present
$bytes = [System.IO.File]::ReadAllBytes($pkgJson)
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
  $newBytes = New-Object byte[] ($bytes.Length - 3)
  [Array]::Copy($bytes, 3, $newBytes, 0, $newBytes.Length)
  [System.IO.File]::WriteAllBytes($pkgJson, $newBytes)
  Write-Warn 'Stripped UTF-8 BOM from package.json'
}

Write-Step 'Stopping old processes on 8081 / vite / old node-server...'
try {
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.OwningProcess -gt 0) {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
} catch {}

Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.CommandLine -and (
      $_.CommandLine -like '*vite*' -or
      $_.CommandLine -like '*RPM-Assure*' -or
      $_.CommandLine -like '*8081*' -or
      $_.CommandLine -like '*.output*server*' -or
      $_.CommandLine -like '*index.mjs*'
    )
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
Start-Sleep -Seconds 2

$serverJs = Join-Path $App '.output\server\index.mjs'

if (-not $SkipBuild) {
  Push-Location $App
  try {
    if (-not (Test-Path -LiteralPath (Join-Path $App 'node_modules\vite'))) {
      Write-Step 'npm install...'
      & $npmCmd install
      if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
    }

    if (-not $SkipTypecheck) {
      Write-Step 'typecheck (soft)...'
      & $npmCmd run typecheck
      if ($LASTEXITCODE -ne 0) {
        Write-Warn 'typecheck reported errors - continuing build'
      }
    }

    Write-Step 'Building production node-server (Nitro)...'
    $env:RPM_ASSURE_NITRO_PRESET = 'node-server'
    $env:NITRO_PRESET = 'node-server'
    [System.IO.File]::WriteAllText((Join-Path $App '.rpma-nitro-preset'), "node-server`r`n")

    $bn = Join-Path $App 'scripts\build-node.mjs'
    if (Test-Path -LiteralPath $bn) {
      & $node $bn
      if ($LASTEXITCODE -ne 0) { throw 'build-node.mjs failed' }
    } else {
      & $npmCmd run build:node
      if ($LASTEXITCODE -ne 0) { throw 'npm run build:node failed' }
    }

    $copyPg = Join-Path $App 'scripts\copy-pglite-assets.mjs'
    if (Test-Path -LiteralPath $copyPg) {
      & $node $copyPg
    }

    # Flatten nested .output\.output if present
    $nested = Join-Path $App '.output\.output\server\index.mjs'
    if ((-not (Test-Path -LiteralPath $serverJs)) -and (Test-Path -LiteralPath $nested)) {
      Write-Warn 'Flattening nested .output\.output -> .output'
      $outer = Join-Path $App '.output'
      $inner = Join-Path $App '.output\.output'
      $tmp = Join-Path $App ('.output_flat_' + [guid]::NewGuid().ToString('N'))
      Move-Item -LiteralPath $inner -Destination $tmp -Force
      Remove-Item -LiteralPath $outer -Recurse -Force -ErrorAction SilentlyContinue
      Move-Item -LiteralPath $tmp -Destination $outer -Force
    }

    if (-not (Test-Path -LiteralPath $serverJs)) {
      Write-Warn 'Build outputs:'
      Get-ChildItem -LiteralPath $App -Force | Where-Object { $_.Name -match 'output|vercel' } | Format-Table Name
      throw ("Missing {0} after build" -f $serverJs)
    }
    Write-Ok ("BUILD OK: {0}" -f $serverJs)
    Remove-Item -LiteralPath (Join-Path $App '.rpma-nitro-preset') -Force -ErrorAction SilentlyContinue
  } finally {
    Pop-Location
  }
} else {
  if (-not (Test-Path -LiteralPath $serverJs)) {
    throw ("SkipBuild set but missing {0} - run without -SkipBuild first" -f $serverJs)
  }
  Write-Ok ("Using existing build: {0}" -f $serverJs)
}

# Load .env.local into process
$envFile = Join-Path $App '.env.local'
if (Test-Path -LiteralPath $envFile) {
  Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_
    if ($line -match '^\s*#') { return }
    if ($line -notmatch '=') { return }
    $i = $line.IndexOf('=')
    if ($i -lt 1) { return }
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim()
    if ($k) { [Environment]::SetEnvironmentVariable($k, $v, 'Process') }
  }
  Write-Ok ("Loaded {0}" -f $envFile)
} else {
  Write-Warn 'No .env.local - SQL live mode may fail'
}

$env:PORT = "$Port"
$env:NITRO_PORT = "$Port"
$env:HOST = '0.0.0.0'
$env:NITRO_HOST = '0.0.0.0'

# Production start wrapper
$wrapper = Join-Path $Logs 'start-app-prod.cmd'
$outLog  = Join-Path $Logs 'app-stdout.log'
$errLog  = Join-Path $Logs 'app-stderr.log'
$envBat  = Join-Path $Logs 'load-env.cmd'

$envLines = New-Object System.Collections.Generic.List[string]
[void]$envLines.Add('@echo off')
if (Test-Path -LiteralPath $envFile) {
  Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_
    if ($line -match '^\s*#') { return }
    if ($line -notmatch '=') { return }
    $i = $line.IndexOf('=')
    if ($i -lt 1) { return }
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim()
    if ($k -match '^[A-Za-z_][A-Za-z0-9_]*$') {
      [void]$envLines.Add(('set "{0}={1}"' -f $k, $v))
    }
  }
}
[void]$envLines.Add('set PORT=8081')
[void]$envLines.Add('set NITRO_PORT=8081')
[void]$envLines.Add('set HOST=0.0.0.0')
[void]$envLines.Add('set NITRO_HOST=0.0.0.0')
$envLines | Set-Content -Path $envBat -Encoding ASCII

$wrapLines = @(
  '@echo off',
  ('cd /d "{0}"' -f $App),
  ('call "{0}"' -f $envBat),
  ('"{0}" ".output\server\index.mjs" >> "{1}" 2>> "{2}"' -f $node, $outLog, $errLog)
)
$wrapLines | Set-Content -Path $wrapper -Encoding ASCII
Write-Ok ("Wrapper: {0}" -f $wrapper)

Write-Step ("Installing / updating task {0} -> production node-server" -f $Task)
schtasks /Create /F /TN $Task /TR $wrapper /SC ONSTART /RU SYSTEM /RL HIGHEST /DELAY 0000:30 2>$null | Out-Null

Write-Step 'Starting production server...'
Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', ('"{0}"' -f $wrapper)) -WorkingDirectory $App -WindowStyle Minimized

Write-Step ("Waiting for http://127.0.0.1:{0}/login ..." -f $Port)
$ok = $false
for ($n = 1; $n -le 60; $n++) {
  Start-Sleep -Seconds 1
  $l = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
  if ($l.Count -lt 1) { continue }
  try {
    $r = Invoke-WebRequest -Uri ("http://127.0.0.1:{0}/login" -f $Port) -UseBasicParsing -TimeoutSec 4
    if ($r.StatusCode -eq 200) {
      Write-Ok ("HEALTHY status={0} len={1} PID={2}" -f $r.StatusCode, $r.RawContentLength, $l[0].OwningProcess)
      $ok = $true
      break
    }
  } catch {}
}

if (-not $ok) {
  Write-Warn 'Not healthy yet. Tail logs:'
  Write-Host ("  {0}" -f $outLog)
  Write-Host ("  {0}" -f $errLog)
  if (Test-Path -LiteralPath $errLog) {
    Write-Host '--- app-stderr (tail) ---' -ForegroundColor Yellow
    Get-Content -LiteralPath $errLog -Tail 30 -ErrorAction SilentlyContinue
  }
  if (Test-Path -LiteralPath $outLog) {
    Write-Host '--- app-stdout (tail) ---' -ForegroundColor Yellow
    Get-Content -LiteralPath $outLog -Tail 20 -ErrorAction SilentlyContinue
  }
  exit 1
}

Write-Host ''
Write-Ok '=== Production running (folder deploy, no MSI) ==='
Write-Host ("  Local:  http://127.0.0.1:{0}/login" -f $Port)
Write-Host '  Public: https://assure.rpmresources.co.za/login  (needs Caddy)'
Write-Host ("  Server: {0}" -f $serverJs)
Write-Host ("  Restart: schtasks /Run /TN {0}" -f $Task)
Write-Host ("       or: powershell -File C:\RPM-Assure\deploy\Restart-Production.ps1")
Write-Host '  Rebuild: re-run this script (omit -SkipBuild)'
Write-Host ''

$caddy = Get-Process caddy -ErrorAction SilentlyContinue
if ($caddy) {
  Write-Ok 'Caddy is running'
} else {
  Write-Warn 'Caddy not running - HTTPS front door off. Start:'
  Write-Host '  powershell -File C:\RPM-Assure\deploy\Start-Caddy-Https-443.ps1'
}
