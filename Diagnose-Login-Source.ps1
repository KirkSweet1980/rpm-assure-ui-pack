# Diagnose-Login-Source.ps1
$ErrorActionPreference = 'Continue'
Write-Host '=== Diagnose which login.tsx Vite serves ==='
$paths = @(
  'C:\RPM-Assure\App\src\routes\login.tsx',
  'C:\RPM-Assure\src\routes\login.tsx'
)
foreach ($p in $paths) {
  if (Test-Path $p) {
    $fi = Get-Item $p
    Write-Host ("FILE " + $p + " size=" + $fi.Length + " time=" + $fi.LastWriteTime)
    Select-String -Path $p -Pattern 'OPTION-A-|Estate source|data-login-skin|Sign in' | Select-Object -First 8 | ForEach-Object { '  ' + $_.Line.Trim() }
  } else { Write-Host "MISSING $p" }
}
Write-Host '--- port 8081 ---'
Get-NetTCPConnection -LocalPort 8081 -State Listen -EA SilentlyContinue | Format-Table OwningProcess
Write-Host '--- node ---'
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Select ProcessId, CommandLine | Format-List
Write-Host '--- fetch module ---'
try {
  $r = Invoke-WebRequest 'http://127.0.0.1:8081/src/routes/login.tsx' -UseBasicParsing -TimeoutSec 15
  Write-Host ("module status=" + $r.StatusCode + " len=" + $r.RawContentLength)
  if ($r.Content -match 'OPTION-A-20260811-V3') { Write-Host 'MODULE HAS V3 MARKER' -ForegroundColor Green }
  elseif ($r.Content -match 'Estate source of truth') { Write-Host 'MODULE HAS Estate text' -ForegroundColor Yellow }
  else {
    Write-Host 'MODULE HAS NEITHER - first 500 chars:' -ForegroundColor Red
    Write-Host $r.Content.Substring(0, [Math]::Min(500, $r.Content.Length))
  }
} catch { Write-Host $_.Exception.Message }
Write-Host '=== Done ==='
