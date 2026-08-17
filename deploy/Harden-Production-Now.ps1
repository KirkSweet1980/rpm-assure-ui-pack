# Harden-Production-Now.ps1
# 1) Split + rotate IOPS secret (agents keep working on AGENT = old IOPS)
# 2) SQL 14333 allow-list (seed from current connections + file)
# 3) Public 443 only; 8081 loopback
# 4) ACL on .env.local and config
# Run elevated on RPMWINRM:
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Harden-Production-Now.ps1
$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run as Administrator.' }

$Root = 'C:\RPM-Assure'
$App = Join-Path $Root 'App'
$EnvFile = Join-Path $App '.env.local'
$CfgDir = Join-Path $Root 'config'
$AllowFile = Join-Path $CfgDir 'sql-allow-ips.txt'

function New-RpmaSecret {
  $bytes = New-Object byte[] 24
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return [Convert]::ToBase64String($bytes)
}

function Get-EnvMap([string]$path) {
  $map = @{}
  if (-not (Test-Path -LiteralPath $path)) { return $map }
  foreach ($line in (Get-Content -LiteralPath $path -ErrorAction SilentlyContinue)) {
    if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
    $i = $line.IndexOf('=')
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim()
    if ($k) { $map[$k] = $v }
  }
  return $map
}

function Write-EnvMap([string]$path, $map) {
  $dir = Split-Path $path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $lines = @()
  foreach ($k in ($map.Keys | Sort-Object)) {
    $lines += ($k + '=' + $map[$k])
  }
  Set-Content -LiteralPath $path -Value $lines -Encoding ASCII
}

Write-Host '=== 1. Secrets ===' -ForegroundColor Cyan
$map = Get-EnvMap $EnvFile
$oldIops = ''
foreach ($k in @('RPM_ASSURE_IOPS_SECRET', 'PULSEWAY_WEBHOOK_SECRET', 'RPM_ASSURE_INGEST_SECRET')) {
  if ($map.ContainsKey($k) -and $map[$k]) { $oldIops = $map[$k]; break }
}
$newIops = New-RpmaSecret
if (-not $map.ContainsKey('RPM_ASSURE_AGENT_SECRET') -or -not $map['RPM_ASSURE_AGENT_SECRET']) {
  $map['RPM_ASSURE_AGENT_SECRET'] = $(if ($oldIops) { $oldIops } else { New-RpmaSecret })
}
if ($oldIops) { $map['RPM_ASSURE_IOPS_SECRET_PREV'] = $oldIops }
$map['RPM_ASSURE_IOPS_SECRET'] = $newIops
if (-not $map.ContainsKey('RPM_ASSURE_CRON_SECRET') -or -not $map['RPM_ASSURE_CRON_SECRET']) {
  $map['RPM_ASSURE_CRON_SECRET'] = New-RpmaSecret
}
$map['RPM_ASSURE_HTTPS'] = 'true'
Write-EnvMap $EnvFile $map
Write-Host ('Wrote ' + $EnvFile)
Write-Host 'Pulseway IOPS secret ROTATED. Update the Pulseway script header X-Assure-Secret to:'
Write-Host $newIops -ForegroundColor Yellow
Write-Host 'Agents keep the previous secret (RPM_ASSURE_AGENT_SECRET). Heartbeats stay up.'
Write-Host 'PREV IOPS still accepted until you remove RPM_ASSURE_IOPS_SECRET_PREV from .env.local'

Write-Host '=== 2. ACL ===' -ForegroundColor Cyan
$aclTargets = @(
  $EnvFile,
  $CfgDir,
  (Join-Path $CfgDir 'settings.json'),
  (Join-Path $App '.env'),
  (Join-Path $Root 'Agent\Agent.Secrets.bin'),
  (Join-Path $Root 'Agent\Agent.Settings.json')
)
foreach ($p in $aclTargets) {
  if (-not (Test-Path -LiteralPath $p)) { continue }
  cmd /c ("icacls `"$p`" /inheritance:r /grant:r `"NT AUTHORITY\SYSTEM:F`" `"BUILTIN\Administrators:F`" >nul 2>&1")
  Write-Host ('ACL SYSTEM+Admins ' + $p)
}

Write-Host '=== 3. Firewall 443 / 8081 ===' -ForegroundColor Cyan
function Set-RpmaFw([string]$name, [scriptblock]$create) {
  $exist = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
  if ($exist) { return }
  & $create
  Write-Host ('Added rule ' + $name)
}
Set-RpmaFw 'RPMAssure HTTPS 443' {
  New-NetFirewallRule -DisplayName 'RPMAssure HTTPS 443' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443 -Profile Any | Out-Null
}
Set-RpmaFw 'RPMAssure block 8081 public' {
  New-NetFirewallRule -DisplayName 'RPMAssure block 8081 public' -Direction Inbound -Action Block -Protocol TCP -LocalPort 8081 -Profile Public | Out-Null
}
& (Join-Path $PSScriptRoot 'Harden-Https-Only.ps1') -ErrorAction SilentlyContinue

Write-Host '=== 4. SQL 14333 allow-list ===' -ForegroundColor Cyan
if (-not (Test-Path $CfgDir)) { New-Item -ItemType Directory -Force -Path $CfgDir | Out-Null }
$ips = New-Object 'System.Collections.Generic.List[string]'
if (Test-Path $AllowFile) {
  Get-Content $AllowFile | ForEach-Object {
    $t = $_.Trim()
    if ($t -and $t -notmatch '^#' -and $t -match '^\d+\.\d+\.\d+\.\d+') { [void]$ips.Add($t) }
  }
}
try {
  $q = "SET NOCOUNT ON; SELECT DISTINCT client_net_address FROM sys.dm_exec_connections WHERE client_net_address IS NOT NULL AND client_net_address NOT IN (N'<local machine>', N'127.0.0.1', N'::1');"
  $raw = & sqlcmd -S '.\RPMREPORTS' -d master -E -C -h -1 -W -Q $q 2>$null
  foreach ($line in @($raw)) {
    $t = ([string]$line).Trim()
    if ($t -match '^\d+\.\d+\.\d+\.\d+$' -and -not $ips.Contains($t)) { [void]$ips.Add($t) }
  }
} catch {}
$ips | Sort-Object -Unique | Set-Content -LiteralPath $AllowFile -Encoding ASCII
Write-Host ('Allow file ' + $AllowFile)
Get-NetFirewallRule -DisplayName 'RPMAssure SQL *' -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
foreach ($ip in ($ips | Sort-Object -Unique)) {
  $n = 'RPMAssure SQL allow ' + $ip
  New-NetFirewallRule -DisplayName $n -Direction Inbound -Action Allow -Protocol TCP -LocalPort 14333 -RemoteAddress $ip -Profile Any | Out-Null
  Write-Host ('Allow 14333 from ' + $ip)
}
if ($ips.Count -gt 0) {
  New-NetFirewallRule -DisplayName 'RPMAssure SQL default block' -Direction Inbound -Action Block -Protocol TCP -LocalPort 14333 -Profile Public | Out-Null
  Write-Host 'Public 14333 blocked except allow-list. Edit config\sql-allow-ips.txt and re-run this script to add sites.'
} else {
  Write-Host 'No remote SQL clients seen. 14333 not blocked. Add IPs to config\sql-allow-ips.txt and re-run.' -ForegroundColor Yellow
}

Write-Host '=== 5. Restart app (load new secrets) ===' -ForegroundColor Cyan
Restart-Service RPMAssure-App -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Get-Service RPMAssure-App, RPMAssure-Edge -ErrorAction SilentlyContinue | Format-Table Name, Status -AutoSize

Write-Host '=== 2FA ===' -ForegroundColor Cyan
Write-Host 'After Update-AppServer: sign in, Configuration > Security and 2FA, scan the QR.'
Write-Host ''
Write-Host 'Pulseway: replace X-Assure-Secret with the yellow value above.'
Write-Host 'DONE harden 1-5.'
