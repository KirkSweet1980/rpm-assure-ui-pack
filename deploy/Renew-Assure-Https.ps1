# Renew-Assure-Https.ps1
# Watchdog for Caddy Let's Encrypt. Caddy renews by itself while running.
# This script: keep Caddy up, log days left, reload if under 21 days.
# Does NOT bind the cert to SQL Server.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Renew-Assure-Https.ps1

$ErrorActionPreference = 'Continue'
$HostName = 'assure.rpmresources.co.za'
$Root = 'C:\RPM-Assure'
$Deploy = Join-Path $Root 'deploy'
$Logs = Join-Path $Deploy 'logs'
$log = Join-Path $Logs ('https-renew_' + (Get-Date -Format 'yyyyMMdd') + '.log')
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

function L([string]$m) {
  $line = ((Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss') + 'Z ' + $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

function Get-PublicCertDays {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $req = [Net.HttpWebRequest]::Create('https://' + $HostName + '/')
  $req.Timeout = 20000
  $req.AllowAutoRedirect = $false
  try {
    $resp = $req.GetResponse()
    if ($resp) { $resp.Close() }
  } catch {}
  $raw = $req.ServicePoint.Certificate
  if (-not $raw) { return $null }
  $c = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 $raw
  $days = [int][math]::Floor(($c.NotAfter.ToUniversalTime() - [DateTime]::UtcNow).TotalDays)
  return [pscustomobject]@{
    Subject  = $c.Subject
    Issuer   = $c.Issuer
    NotAfter = $c.NotAfter
    DaysLeft = $days
  }
}

function Test-CaddyUp {
  $hit = netstat -ano | findstr 'LISTENING' | findstr ':443'
  return [bool]$hit
}

L '=== HTTPS renew check ==='
$info = $null
try { $info = Get-PublicCertDays } catch { L ('cert probe fail: ' + $_.Exception.Message) }

if ($info) {
  L ('subject=' + $info.Subject)
  L ('issuer=' + $info.Issuer)
  L ('notAfter=' + $info.NotAfter.ToString('u') + ' daysLeft=' + $info.DaysLeft)
} else {
  L 'WARN could not read public certificate'
}

if (-not (Test-CaddyUp)) {
  L '443 down - starting Ensure-Https-443'
  $ens = Join-Path $Deploy 'Ensure-Https-443.ps1'
  if (Test-Path $ens) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ens
  } else {
    L 'FAIL missing Ensure-Https-443.ps1'
    exit 1
  }
}

$needReload = $false
if ($info -and $info.DaysLeft -lt 21) { $needReload = $true }
if (-not $info) { $needReload = $true }

if ($needReload) {
  L 'reload Caddy so ACME can renew'
  $caddy = $null
  foreach ($p in @(
      (Join-Path $Deploy 'bin\caddy.exe'),
      (Join-Path $Deploy 'caddy.exe')
    )) {
    if (Test-Path $p) { $caddy = $p; break }
  }
  $cf = Join-Path $Deploy 'Caddyfile'
  if ($caddy -and (Test-Path $cf)) {
    & $caddy reload --config $cf
    if ($LASTEXITCODE -ne 0) {
      L 'reload failed - Ensure-Https-443'
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Deploy 'Ensure-Https-443.ps1')
    }
  } else {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Deploy 'Ensure-Https-443.ps1')
  }
  Start-Sleep -Seconds 8
  try { $info = Get-PublicCertDays } catch {}
  if ($info) { L ('after reload daysLeft=' + $info.DaysLeft + ' notAfter=' + $info.NotAfter.ToString('u')) }
}

if ($info -and $info.DaysLeft -lt 7) {
  L ('FAIL cert expires in ' + $info.DaysLeft + ' days - ACME did not renew')
  exit 2
}
if (-not (Test-CaddyUp)) {
  L 'FAIL 443 still down'
  exit 1
}
L 'HTTPS renew check OK'
exit 0
