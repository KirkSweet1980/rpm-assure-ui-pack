# Pulseway Automation body. No file path. Posts firewall profiles + inbound ports.
# Pulseway -> Automation -> Scripts -> New (PowerShell). Inputs:
#   AssureUrl    = https://assure.rpmresources.co.za/api/firewall
#   AssureSecret = same value as PULSEWAY_WEBHOOK_SECRET / RPM_ASSURE_IOPS_SECRET
# Schedule hourly on Windows servers (and workstations you want on this pane).
# ASCII only. Windows PowerShell 5.1.

$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
if (-not $AssureUrl) { $AssureUrl = 'https://assure.rpmresources.co.za/api/firewall' }
if (-not $AssureSecret) { $AssureSecret = $env:RPM_ASSURE_IOPS_SECRET }
if (-not $AssureSecret) { $AssureSecret = $env:PULSEWAY_WEBHOOK_SECRET }
if (-not $AssureSecret) { $AssureSecret = 'xc9pDuhf7ldzcmkwsE+joSdgpuD5RJaz' }
$hostName = $env:COMPUTERNAME
Write-Host ('FW start host=' + $hostName)

$active = @{}
try {
  foreach ($n in @(Get-NetConnectionProfile -ErrorAction Stop)) {
    $cat = [string]$n.NetworkCategory
    if ($cat) { $active[$cat] = $true }
  }
} catch {
  Write-Host ('conn profile skip ' + $_.Exception.Message)
}

$enabled = @{}
try {
  foreach ($p in @(Get-NetFirewallProfile -ErrorAction Stop)) {
    $enabled[[string]$p.Name] = [bool]$p.Enabled
  }
} catch {
  Write-Host ('fw profile skip ' + $_.Exception.Message)
}

$ports = @{ Domain = @(); Private = @(); Public = @() }
try {
  $rules = @(Get-NetFirewallRule -Direction Inbound -Action Allow -Enabled True -ErrorAction Stop)
  $byId = @{}
  foreach ($r in $rules) { $byId[[string]$r.InstanceID] = $r }
  $filters = @(Get-NetFirewallPortFilter -ErrorAction SilentlyContinue)
  foreach ($f in $filters) {
    $rid = [string]$f.InstanceID
    $rule = $byId[$rid]
    if (-not $rule) { continue }
    $lp = [string]$f.LocalPort
    if (-not $lp -or $lp -eq 'Any') { continue }
    $proto = [string]$f.Protocol
    if (-not $proto) { $proto = 'TCP' }
    $prof = [string]$rule.Profile
    $item = @{ port = $lp; proto = $proto; name = ([string]$rule.DisplayName) }
    foreach ($name in @('Domain', 'Private', 'Public')) {
      if ($prof -eq 'Any' -or $prof -match $name) {
        $ports[$name] += $item
      }
    }
  }
} catch {
  Write-Host ('rules skip ' + $_.Exception.Message)
}

function Dedup($arr) {
  $seen = @{}
  $out = @()
  foreach ($x in @($arr)) {
    $k = ([string]$x.port) + '|' + ([string]$x.proto)
    if ($seen.ContainsKey($k)) { continue }
    $seen[$k] = $true
    $out += $x
    if ($out.Count -ge 60) { break }
  }
  return $out
}

$profiles = @()
foreach ($name in @('Domain', 'Private', 'Public')) {
  $profiles += @{
    name = $name
    enabled = [bool]$enabled[$name]
    active = [bool]($active[$name] -or ($name -eq 'Domain' -and $active['DomainAuthenticated']))
    ports = @(Dedup $ports[$name])
  }
}

$body = @{
  hostName = $hostName
  source = 'pulseway'
  profiles = $profiles
} | ConvertTo-Json -Compress -Depth 6

try {
  $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 45 -Uri $AssureUrl -Method POST `
    -Headers @{ 'X-Assure-Secret' = $AssureSecret; 'Content-Type' = 'application/json' } `
    -Body $body
  Write-Host ('POST ' + $r.StatusCode + ' ' + $r.Content)
} catch {
  Write-Host ('POST FAIL ' + $_.Exception.Message)
  try {
    $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host $sr.ReadToEnd()
  } catch {}
  exit 1
}
Write-Host 'FW done'
