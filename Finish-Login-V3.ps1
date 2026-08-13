# Finish-Login-V3.ps1  — run AFTER apply wrote the file (marker already on disk)
$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$Port = 8081
$Marker = 'OPTION-A-20260811-V3'

Write-Host '=== Finish Login V3 (restart + prove module) ===' -ForegroundColor Cyan

# Prove disk still has marker
$p = Join-Path $App 'src\routes\login.tsx'
$t = [IO.File]::ReadAllText($p)
if (-not $t.Contains($Marker)) { throw "Disk file lost marker: $p" }
Write-Host ("Disk OK size=" + (Get-Item $p).Length + " marker present") -ForegroundColor Green

# Kill node hard
Write-Host 'Stopping node / 8081...'
try { schtasks /End /TN 'RPMAssure-App-OnStart' 2>$null | Out-Null } catch {}
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host ("  kill node " + $_.Id)
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep 2
Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | ForEach-Object {
  Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep 2

$logDir = 'C:\RPM-Assure\deploy\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$outLog = Join-Path $logDir 'app-stdout.log'
$errLog = Join-Path $logDir 'app-stderr.log'
Add-Content $outLog ("`n===== finish-v3 " + (Get-Date -Format o) + " =====`n")
Add-Content $errLog ("`n===== finish-v3 " + (Get-Date -Format o) + " =====`n")

$cmd = 'cd /d "' + $App + '" && set NODE_ENV=development && npx.cmd vite dev --host 0.0.0.0 --port ' + $Port + ' >> "' + $outLog + '" 2>> "' + $errLog + '"'
Start-Process cmd.exe -ArgumentList '/c', $cmd -WorkingDirectory $App -WindowStyle Minimized
Write-Host 'Vite start issued...'

$pidUp = $null
for ($i = 1; $i -le 50; $i++) {
  Start-Sleep 1
  $l = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($l) {
    $pidUp = $l[0].OwningProcess
    Write-Host ("LISTENING PID " + $pidUp + " after " + $i + "s") -ForegroundColor Green
    break
  }
  if ($i % 5 -eq 0) { Write-Host ("  wait " + $i + "...") }
}
if (-not $pidUp) {
  Write-Host '--- stderr tail ---' -ForegroundColor Red
  if (Test-Path $errLog) { Get-Content $errLog -Tail 60 }
  throw 'Vite did not bind 8081'
}

Start-Sleep 5

# Prove module
Write-Host 'Fetching Vite module...'
try {
  $r = Invoke-WebRequest -Uri ("http://127.0.0.1:" + $Port + "/src/routes/login.tsx") -UseBasicParsing -TimeoutSec 30
  Write-Host ("module HTTP " + $r.StatusCode + " len=" + $r.RawContentLength)
  if ($r.Content -like ("*" + $Marker + "*")) {
    Write-Host ("CONTAINS MARKER " + $Marker) -ForegroundColor Green
  } else {
    Write-Host 'NO MARKER in module' -ForegroundColor Red
    Write-Host $r.Content.Substring(0, [Math]::Min(500, $r.Content.Length))
  }
} catch {
  Write-Host ("module fetch failed: " + $_.Exception.Message) -ForegroundColor Yellow
  Write-Host 'Trying /login page...'
  try {
    $r2 = Invoke-WebRequest -Uri ("http://127.0.0.1:" + $Port + "/login") -UseBasicParsing -TimeoutSec 30
    Write-Host ("login page HTTP " + $r2.StatusCode + " len=" + $r2.RawContentLength)
  } catch {
    Write-Host $_.Exception.Message
  }
  if (Test-Path $errLog) {
    Write-Host '--- stderr ---'
    Get-Content $errLog -Tail 40
  }
}

Write-Host ''
Write-Host 'Open NEW private window:  http://127.0.0.1:8081/login' -ForegroundColor Cyan
Write-Host 'Top of page must show: OPTION-A-20260811-V3'
Write-Host '=== Done ==='
