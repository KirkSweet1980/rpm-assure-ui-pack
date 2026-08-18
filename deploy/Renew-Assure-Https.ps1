# Renew-Assure-Https.ps1
# Keep Let's Encrypt live for:
#   1) Application access   https://assure.rpmresources.co.za
#   2) Agent HTTPS          same host / same cert  (/downloads, /api/agent/*, /api/iops)
# Caddy renews ACME while it is running (TLS-ALPN-01 on 443).
# This watchdog: Caddy always up, cert < 30 days -> reload, < 21 days -> restart.
# Does NOT bind the cert to SQL Server (that broke MSSQL). Agents use HTTPS only.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Renew-Assure-Https.ps1

$ErrorActionPreference = 'Continue'
$HostName = 'assure.rpmresources.co.za'
$AcmeEmail = 'ops@rpmresources.co.za'
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

function Test-PortUp([int]$Port) {
  $hit = netstat -ano | findstr 'LISTENING' | findstr (':' + $Port)
  return [bool]$hit
}

function Get-CaddyExe {
  foreach ($p in @(
      (Join-Path $Deploy 'bin\caddy.exe'),
      (Join-Path $Deploy 'caddy.exe'),
      'C:\Program Files\Caddy\caddy.exe'
    )) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  $cmd = Get-Command caddy -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Get-PublicCert {
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
    Thumb    = $c.Thumbprint
  }
}

function Test-HttpsPath([string]$Path) {
  $uri = 'https://' + $HostName + $Path
  try {
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 20 -Uri $uri
    return [pscustomobject]@{ Ok = $true; Code = [int]$r.StatusCode; Bytes = $r.RawContentLength }
  } catch {
    $code = 0
    try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    return [pscustomobject]@{ Ok = $false; Code = $code; Bytes = 0 }
  }
}

function Ensure-CaddyAcmeEmail {
  $cf = Join-Path $Deploy 'Caddyfile'
  if (-not (Test-Path -LiteralPath $cf)) { return $false }
  $txt = [IO.File]::ReadAllText($cf)
  if ($txt -match '(?m)^\s*email\s+\S+') { return $false }
  $nl = "`r`n"
  $patched = $txt -replace '^\{', ('{' + $nl + "`temail " + $AcmeEmail)
  if ($patched -eq $txt) { return $false }
  [IO.File]::WriteAllText($cf, $patched)
  L ('Caddyfile ACME email set to ' + $AcmeEmail)
  return $true
}

function Start-CaddyNow {
  $ens = Join-Path $Deploy 'Ensure-Https-443.ps1'
  $svc = Get-Service -Name 'RPMAssure-Caddy' -ErrorAction SilentlyContinue
  if ($svc) {
    if ($svc.Status -eq 'Running') {
      L 'Restart service RPMAssure-Caddy'
      Restart-Service -Name 'RPMAssure-Caddy' -Force -ErrorAction SilentlyContinue
    } else {
      L 'Start service RPMAssure-Caddy'
      Start-Service -Name 'RPMAssure-Caddy' -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 8
    if (Test-PortUp 443) { return $true }
  }
  if (Test-Path -LiteralPath $ens) {
    L 'Ensure-Https-443.ps1'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ens
    return (Test-PortUp 443)
  }
  return $false
}

function Reload-Caddy {
  $caddy = Get-CaddyExe
  $cf = Join-Path $Deploy 'Caddyfile'
  if ($caddy -and (Test-Path -LiteralPath $cf)) {
    L ('caddy reload ' + $caddy)
    & $caddy reload --config $cf --adapter caddyfile
    if ($LASTEXITCODE -eq 0) { Start-Sleep -Seconds 6; return $true }
    L ('reload exit=' + $LASTEXITCODE)
  }
  return (Start-CaddyNow)
}

L '=== HTTPS renew check (app + agent) ==='

$emailChanged = $false
try { $emailChanged = Ensure-CaddyAcmeEmail } catch { L ('email patch: ' + $_.Exception.Message) }

if (-not (Test-PortUp 443)) {
  L '443 down - starting Caddy (ACME cannot renew if Caddy is stopped)'
  if (-not (Start-CaddyNow)) {
    L 'FAIL 443 still down'
    exit 1
  }
} else {
  L '443 LISTENING'
}

$svc = Get-Service -Name 'RPMAssure-Caddy' -ErrorAction SilentlyContinue
if ($svc) { L ('service RPMAssure-Caddy=' + $svc.Status + ' start=' + $svc.StartType) }

$info = $null
try { $info = Get-PublicCert } catch { L ('cert probe fail: ' + $_.Exception.Message) }

if ($info) {
  L ('subject=' + $info.Subject)
  L ('issuer=' + $info.Issuer)
  L ('thumb=' + $info.Thumb)
  L ('notAfter=' + $info.NotAfter.ToString('u') + ' daysLeft=' + $info.DaysLeft)
  if ($info.Issuer -notmatch 'Let.s Encrypt|ISRG|R[0-9]+') {
    L 'WARN issuer is not Let''s Encrypt - confirm Caddy ACME, not a stale own-cert'
  }
} else {
  L 'WARN could not read public certificate'
}

$needReload = $false
$needRestart = $false
if ($emailChanged) { $needReload = $true }
if (-not $info) { $needRestart = $true }
if ($info -and $info.DaysLeft -lt 30) { $needReload = $true }
if ($info -and $info.DaysLeft -lt 21) { $needRestart = $true }

if ($needRestart) {
  L 'cert missing or under 21 days - restart Caddy so ACME can obtain/renew'
  [void](Start-CaddyNow)
} elseif ($needReload) {
  L 'cert under 30 days (or email added) - reload Caddy so ACME can renew'
  [void](Reload-Caddy)
}

Start-Sleep -Seconds 4
try { $info = Get-PublicCert } catch {}
if ($info) { L ('after action daysLeft=' + $info.DaysLeft + ' notAfter=' + $info.NotAfter.ToString('u')) }

L '--- app HTTPS ---'
$app = Test-HttpsPath '/healthz'
if (-not $app.Ok) { $app = Test-HttpsPath '/login' }
L ('app  code=' + $app.Code + ' ok=' + $app.Ok)

L '--- agent HTTPS (same LE cert) ---'
$ver = Test-HttpsPath '/downloads/VERSION'
$zip = Test-HttpsPath '/downloads/rpm-assure-agent.zip'
L ('agent VERSION code=' + $ver.Code + ' ok=' + $ver.Ok)
L ('agent ZIP     code=' + $zip.Code + ' ok=' + $zip.Ok + ' bytes=' + $zip.Bytes)

$status = Join-Path $Logs 'https-renew-status.json'
$obj = @{
  utc          = (Get-Date).ToUniversalTime().ToString('o')
  host         = $HostName
  daysLeft     = if ($info) { $info.DaysLeft } else { $null }
  notAfter     = if ($info) { $info.NotAfter.ToUniversalTime().ToString('o') } else { $null }
  issuer       = if ($info) { $info.Issuer } else { $null }
  appOk        = [bool]$app.Ok
  agentVersion = [bool]$ver.Ok
  agentZip     = [bool]$zip.Ok
  port443      = [bool](Test-PortUp 443)
}
try { ($obj | ConvertTo-Json -Compress) | Set-Content -LiteralPath $status -Encoding ASCII } catch {}

if (-not (Test-PortUp 443)) {
  L 'FAIL 443 still down'
  exit 1
}
if ($info -and $info.DaysLeft -lt 7) {
  L ('FAIL cert expires in ' + $info.DaysLeft + ' days - ACME did not renew')
  exit 2
}
if (-not $app.Ok) {
  L 'WARN app HTTPS probe failed (Caddy may still be renewing; check again in a minute)'
}
L 'HTTPS renew check OK  app+agent share this Let''s Encrypt cert'
exit 0
