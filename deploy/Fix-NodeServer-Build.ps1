# Force node-server production build (fixes missing .output\server\index.mjs)
$ErrorActionPreference = 'Stop'
Write-Host '=== Force node-server build ===' -ForegroundColor Cyan
$App = 'C:\RPM-Assure\App'
if (-not (Test-Path $App)) { throw "Missing $App" }

function Expand-GzB64([string]$b64) {
  $gz = [Convert]::FromBase64String(($b64 -replace '\s',''))
  $msIn = New-Object IO.MemoryStream(,$gz)
  $gzs = New-Object IO.Compression.GZipStream($msIn, [IO.Compression.CompressionMode]::Decompress)
  $msOut = New-Object IO.MemoryStream
  $gzs.CopyTo($msOut); $gzs.Close()
  return $msOut.ToArray()
}

$viteB64 = @'
H4sIANcbe2oC/5VV227bOBB991cMhH2QDFvKvgUO3N0i62ILdNvAbrsPhpHQEuUwoUiVpOwYif69Q1IXW00LFAEicy5nhmcuZEUp
lYFnyGjOBL2WIme7CXBJsoXYQw25kgUEe2ZocDVirbUhQhuSPq4MwXNr9XcrThQlqZlqq01KXu2YSM4h7GlpjVpXK3jQjfHU+ffW
hjB+YCJLte5DdaJkmJ1gRskuK3ca2JTE3LdqmdGZPffaXJ/qco2aUV6J1DApQFEt+Z5+tKg3eKAmjGbedKqp2lMVwAsyRlVKeQDP
I4AkgcVTyVnKDFBkFfPWKE4lsgUE5hCWSqZU6xi18fLmv9u3q9WX5eL24/vPy0+3N8vFavEZXhA1iGKjWBHiR36QB6quiaZhdNWh
bYdovwPBcggxnfl8eJ0XizsUR0iFqZQ4lw5wWhp6iEbSezeCK0/UO052kDNO4aCYMVTA9gjbivFsasPExYOGUFdqz/ZUw//YAfKg
HavfKqYedYQwRh0d7y0pucWcu6LHD5KJjqD0kIXRBIJYlQWZukaZlq6mgSPEXyVHJp+YNnp1FGlowaKowW8j7BEezbBts3eYe2eI
2JXJL3/BeRtk/zsED5x+RSlAjf9rSIlJ75uskzGwnZCKwjgZeQNk/qtzguv3TQVPu+jrYnm9+OCj/fnT2v1Dc1Jx5Fsq0JTn03uJ
3CBOVvnZcXXUcLindo6+VVQbmuEuIF4zs/cEKfjR44UlJ0zAnZ1db3EHuFOOGnzcaSoLLCrbYrfYmGhu8FvgMiu5PLpe+CHTejSi
T27Msybd09UXhs9Y0qIgIptAYdOpI5i/ccT5UttWm7cLMrQmExj2k+8em1LondaP9DiBPeEV3YDM4dP2gaYGqcW2oDpEzK6lBtRb
z40jvhI+0axvvh/tfIyTwo+6xEW/sdDutTXWzm5DgC+34z2ITgZKchpzuQvv1rYwceqI2zRbt2wD/PF8ErC+c+Aum6YiHq9JY9Zd
iXBGdH8EXPXBzI9uYxv6LR0X1JA4Y0qQgtoZTrRKg2jSONb+R/Pxs9PD2sbEpX0Ru7+gdbK4M7i8uLxoJRoLlJobJzeqopMuTY5z
nP2LOPpcc7CDdnoBP2rZDNbBeJxkxJBkPA4wYzy54eIyJTzYvJ65fxAxxrpRnzx8YXfbs/e4F8dx/Fox4S9Yu+Jgs/t6zc66o442
gAE3HU73WrfQLtkahwnL+h2PLgkHQwgAAA==
'@
$bnB64 = @'
H4sIANcbe2oC/8VW32/bNhB+z19xFfogZba8ri+FDTVbtwzYhjWB06IPWeAqEiUzoUiVpGwHqf/33VG0JSVumocBe4gjUvfju7vv
7jQ5Pj6CYzjXKm8yy5UEw0QxXipj4brhIp/Ce261AqlyNjZMr5iG8VuIVWPrxk7amwmXOdvE1Y0hY5/wpNZmbNKCTWGtuWUGYl1X
6ViSrXGtmWEWCpGW8AM6tAaYXMEq1SZGA5MjXtVKW7gHU6dreXEnM9hCoVUFAeGYZktEtqi1ypgxwWwvfwSQqfrudy4YKY3wzDbc
WLM7Vbc517uDZmneOzqgfdVGCi5v29PAfdHzWad22X9HZ3x7lCmJKdRKWUjAI42zdR5GM//OhZ84A/GN4jIk4REEjzMVoM4AXUi6
o9ajL8o/MsCLxhZvSNq7oKwmLi1xHO9A4CVFNz//e/HLxcXH+eni/R8f5meL8/npxemH6cBqQJJPvt56Z0qwWKgyDC4dbcYkdQUt
/qSv4uM/LE9xJRgI/acwJhOkJiuQc0JlqYAVJgGuuUz1HYTpSvHcgKw3YJZMCPjScH1rAEnsKRj5PJDaOy7x9lDCyfWiwgYQzFAS
SZr+o5/dMb4xwb5w3tpHyTfPMRf37JARgdQ3NrWNQe1XGCQvIOxoGnZgo8hT2lEJpfftEO6LuWHZOSIYwWWnR9gpqcHVyBkA9Jdz
hbXjcsmQSK6sAJ4J6GGNfe7gt9KUzSkUqTCMbraIGjrMOvaPJyeEfwsM5eBwFJSkJ8LoSWEE/wPqDlhW5b1OrUVqC6UrSJIEgjWX
r38K4ASLW29ilAxg6p6D2TcCQxkKaE+l/yCwp6A9I96WZ/7uBar+2JbFYiu1qLp5F/r+Q6OQpTZbeonJMfBSKs1oSONL/OuIyK23
Hjlv2Lo0i6EuBTXtOjXVJE9tCpJtLFgFfplcNzIXzLeW0dlvXD+nq35mgmVW82xsvgi6aP3QU44k7LrVprqkDZPAJcF9NG3bRUZ6
u5kGwULwa2z40UEFlMmYc9mpFo1029NBWyxaSzHdDsxdzR42exvwoEMKHPKugN162onF+M4yHbpihEUEyVsocKDn5hO3yzCIKctB
BF+/Dq8p7204rqjIHghbZznDH1XsshT5QhPKFz2YLgsIRqYVC0knQshowXLZsJlT2a9W9x6ZjgFkjTZ8hR8BVjfME3TgviDfLuBo
sLnDLu1t6LgSolGvGK2PIvIm+xvl83ADtfR7ee+8xILJ0i639Anz8p6MbD+3PCfKeg664v1pDu7mQ2zZf/wQ6R5mbmetV2ICyrRW
+sHyO53Pz+ZTqLgxXJZoea87+47mO3qGxrAcv2KULMF9PfjtC5juIsXoczD4K624i4Pvmvx1ybJb3LollWvabpcYFQpeXg3NJ/Bg
vT8YCq/cPPj2zj/7axjqbiA9Hkf9YTQYRU+Zz5V0a/dfCboEnOoKAAA=
'@

$viteBytes = Expand-GzB64 $viteB64
$bnBytes = Expand-GzB64 $bnB64
[IO.File]::WriteAllBytes((Join-Path $App 'vite.config.ts'), $viteBytes)
New-Item -ItemType Directory -Force -Path (Join-Path $App 'scripts') | Out-Null
[IO.File]::WriteAllBytes((Join-Path $App 'scripts\build-node.mjs'), $bnBytes)
Write-Host 'WROTE vite.config.ts + scripts\build-node.mjs' -ForegroundColor Green

# BOM fix package.json
$pkg = Join-Path $App 'package.json'
$b = [IO.File]::ReadAllBytes($pkg)
if ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) {
  [IO.File]::WriteAllBytes($pkg, $b[3..($b.Length-1)])
  Write-Host 'Stripped package.json BOM' -ForegroundColor Yellow
}

# Ensure scripts
$raw = [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($pkg))
if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 0xFEFF) { $raw = $raw.Substring(1) }
$j = $raw | ConvertFrom-Json
$j.scripts | Add-Member build:node 'node scripts/build-node.mjs' -Force
$j.scripts | Add-Member start:prod 'node .output/server/index.mjs' -Force
$j.scripts | Add-Member postbuild 'node scripts/copy-pglite-assets.mjs' -Force
$utf8 = New-Object System.Text.UTF8Encoding $false
[IO.File]::WriteAllText($pkg, ($j | ConvertTo-Json -Depth 30), $utf8)

# admin-audit must exist
$aa = Join-Path $App 'src\lib\settings\admin-audit.ts'
if (-not (Test-Path $aa)) {
  Write-Host 'WARNING: admin-audit.ts still missing - run Fix-AdminAudit-And-Go.ps1 first if build fails' -ForegroundColor Yellow
}

# Flag + env
[IO.File]::WriteAllText((Join-Path $App '.rpma-nitro-preset'), "node-server`n")
$env:RPM_ASSURE_NITRO_PRESET = 'node-server'
$env:NITRO_PRESET = 'node-server'

Push-Location $App
try {
  Write-Host 'Running node scripts\build-node.mjs ...' -ForegroundColor Cyan
  & node scripts\build-node.mjs
  if ($LASTEXITCODE -ne 0) { throw 'build-node failed' }
  $serverJs = Join-Path $App '.output\server\index.mjs'
  if (-not (Test-Path $serverJs)) { throw "Still missing $serverJs" }
  Write-Host "BUILD OK: $serverJs" -ForegroundColor Green
} finally {
  Pop-Location
}

# Continue service install via Go-Production if available (skip rebuild if we pass flag)
$go = 'C:\RPM-Assure\deploy\Go-Production.ps1'
# Install service directly for speed
$Logs = 'C:\RPM-Assure\deploy\logs'
New-Item -ItemType Directory -Force -Path $Logs | Out-Null
$Port = 8081

# Stop old
try {
  Get-NetTCPConnection -LocalPort $Port -State Listen -EA SilentlyContinue | % {
    if ($_.OwningProcess -gt 0) { Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue }
  }
} catch {}
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -EA SilentlyContinue |
  ? { $_.CommandLine -match 'vite|RPM-Assure|\.output\\server' } |
  % { Stop-Process -Id $_.ProcessId -Force -EA SilentlyContinue }
Start-Sleep 2

function Find-Nssm {
  $cmd = Get-Command nssm -EA SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @('C:\Tools\nssm\win64\nssm.exe','C:\Tools\nssm\nssm.exe','C:\nssm\win64\nssm.exe')) {
    if (Test-Path $p) { return $p }
  }
  return $null
}
function Find-Node {
  $cmd = Get-Command node -EA SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @('C:\Program Files\nodejs\node.exe')) { if (Test-Path $p) { return $p } }
  return $null
}

$node = Find-Node
$serverJs = Join-Path $App '.output\server\index.mjs'
$nssm = Find-Nssm
$svc = 'RPMAssure-App'

if ($nssm) {
  Write-Host "Installing NSSM service $svc ..." -ForegroundColor Cyan
  & $nssm stop $svc 2>$null
  & $nssm remove $svc confirm 2>$null
  & $nssm install $svc $node
  & $nssm set $svc AppDirectory $App
  & $nssm set $svc AppParameters ('"' + $serverJs + '"')
  & $nssm set $svc AppStdout (Join-Path $Logs 'app-stdout.log')
  & $nssm set $svc AppStderr (Join-Path $Logs 'app-stderr.log')
  & $nssm set $svc AppRotateFiles 1
  & $nssm set $svc AppRotateBytes 8000000
  & $nssm set $svc Start SERVICE_AUTO_START
  & $nssm set $svc AppEnvironmentExtra "PORT=8081`nNITRO_PORT=8081`nHOST=0.0.0.0`nRPM_ASSURE_DATA_MODE=auto"
  & $nssm start $svc
  Write-Host 'Service started' -ForegroundColor Green
} else {
  Write-Host 'NSSM missing - scheduled task fallback' -ForegroundColor Yellow
  $wrapper = Join-Path $Logs 'start-app-prod.cmd'
  $logFile = Join-Path $Logs 'app-task.log'
  @(
    '@echo off',
    'cd /d ' + $App,
    'set PORT=8081',
    'set NITRO_PORT=8081',
    'set HOST=0.0.0.0',
    'call node .output\server\index.mjs >> "' + $logFile + '" 2>&1'
  ) | Set-Content $wrapper -Encoding ASCII
  schtasks /Create /F /TN RPMAssure-App-OnStart /TR $wrapper /SC ONSTART /RU SYSTEM /RL HIGHEST /DELAY 0001:00 | Out-Null
  schtasks /Run /TN RPMAssure-App-OnStart | Out-Null
}

Write-Host 'Waiting for :8081 ...' -ForegroundColor Cyan
$ok = $false
1..45 | % {
  Start-Sleep 1
  try {
    $r = Invoke-WebRequest "http://127.0.0.1:$Port/login" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) {
      "HEALTHY status=200 len=$($r.RawContentLength)"
      $ok = $true
      break
    }
  } catch {}
}
if (-not $ok) {
  Write-Host 'Not healthy yet - check logs:' -ForegroundColor Yellow
  Write-Host "  $Logs\app-stdout.log"
  Write-Host "  $Logs\app-stderr.log"
} else {
  Write-Host 'Production node-server is up on 8081' -ForegroundColor Green
  Write-Host 'Open https://assure.rpmresources.co.za/login (private window)' -ForegroundColor Cyan
}
Write-Host '=== Done ==='
