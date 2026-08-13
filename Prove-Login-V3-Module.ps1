# Prove-Login-V3-Module.ps1
$ErrorActionPreference = 'Stop'
$Port = 8081
$Marker = 'OPTION-A-20260811-V3'

Write-Host '=== Prove TanStack split module has V3 ===' -ForegroundColor Cyan

# Disk
$disk = 'C:\RPM-Assure\App\src\routes\login.tsx'
Write-Host ("Disk: " + (Select-String -Path $disk -Pattern $Marker | Select-Object -First 1).Line.Trim())

# Wrapper (we already know this is thin)
try {
  $w = Invoke-WebRequest "http://127.0.0.1:$Port/src/routes/login.tsx" -UseBasicParsing -TimeoutSec 20
  Write-Host ("wrapper len=" + $w.RawContentLength)
  if ($w.Content -match 'tsr-split=component') { Write-Host 'wrapper is TanStack lazy split (expected)' -ForegroundColor Yellow }
} catch { Write-Host $_.Exception.Message }

# THE actual component chunk
$urls = @(
  "http://127.0.0.1:$Port/src/routes/login.tsx?tsr-split=component",
  "http://127.0.0.1:$Port/src/routes/login.tsx?tsr-split=component&t=$(Get-Random)"
)
foreach ($u in $urls) {
  try {
    $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 30
    Write-Host ("GET " + $u)
    Write-Host ("  status=" + $r.StatusCode + " len=" + $r.RawContentLength)
    if ($r.Content -like ("*" + $Marker + "*")) {
      Write-Host ("  CONTAINS MARKER " + $Marker) -ForegroundColor Green
    } else {
      Write-Host '  NO MARKER' -ForegroundColor Red
      Write-Host $r.Content.Substring(0, [Math]::Min(600, $r.Content.Length))
    }
  } catch {
    Write-Host ("  FAIL: " + $_.Exception.Message) -ForegroundColor Red
  }
}

# Also try login HTML
try {
  $h = Invoke-WebRequest "http://127.0.0.1:$Port/login" -UseBasicParsing -TimeoutSec 20
  Write-Host ("login page status=" + $h.StatusCode + " len=" + $h.RawContentLength)
} catch { Write-Host $_.Exception.Message }

Write-Host ''
Write-Host 'If CONTAINS MARKER on tsr-split=component:' -ForegroundColor Cyan
Write-Host '  1. Open PRIVATE window: http://127.0.0.1:8081/login?v=3'
Write-Host '  2. Top of page: OPTION-A-20260811-V3'
Write-Host '  3. F12 Console: document.body.innerText.includes("OPTION-A-20260811-V3")'
Write-Host '=== Done ==='
