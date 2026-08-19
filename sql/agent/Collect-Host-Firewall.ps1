param(
  [string]$ConfigPath,
  [string]$AgentRoot = 'C:\RPM-Assure\Agent',
  [string]$AssureUrl = 'https://assure.rpmresources.co.za/api/firewall'
)
$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$secret = $env:RPM_ASSURE_IOPS_SECRET
if (-not $secret) { $secret = $env:RPM_ASSURE_AGENT_SECRET }
if (-not $secret) { $secret = 'xc9pDuhf7ldzcmkwsE+joSdgpuD5RJaz' }
$hostName = $env:COMPUTERNAME
Write-Host ('FW agent host=' + $hostName)

$active = @{}
try {
  foreach ($n in @(Get-NetConnectionProfile -ErrorAction Stop)) {
    if ($n.NetworkCategory) { $active[[string]$n.NetworkCategory] = $true }
  }
} catch {}

$enabled = @{}
try {
  foreach ($p in @(Get-NetFirewallProfile -ErrorAction Stop)) {
    $enabled[[string]$p.Name] = [bool]$p.Enabled
  }
} catch {}

$ports = @{ Domain = @(); Private = @(); Public = @() }
try {
  $rules = @(Get-NetFirewallRule -Direction Inbound -Action Allow -Enabled True -ErrorAction Stop)
  $byId = @{}
  foreach ($r in $rules) { $byId[[string]$r.InstanceID] = $r }
  foreach ($f in @(Get-NetFirewallPortFilter -ErrorAction SilentlyContinue)) {
    $rule = $byId[[string]$f.InstanceID]
    if (-not $rule) { continue }
    $lp = [string]$f.LocalPort
    if (-not $lp -or $lp -eq 'Any') { continue }
    $item = @{
      port = $lp
      proto = ($(if ($f.Protocol) { [string]$f.Protocol } else { 'TCP' }))
      name = [string]$rule.DisplayName
    }
    $prof = [string]$rule.Profile
    foreach ($name in @('Domain', 'Private', 'Public')) {
      if ($prof -eq 'Any' -or $prof -match $name) { $ports[$name] += $item }
    }
  }
} catch {}

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

$body = @{ hostName = $hostName; source = 'agent'; profiles = $profiles } | ConvertTo-Json -Compress -Depth 6
try {
  $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 45 -Uri $AssureUrl -Method POST `
    -Headers @{ 'X-Assure-Secret' = $secret; 'Content-Type' = 'application/json' } -Body $body
  Write-Host $r.Content
} catch {
  Write-Host ('FAIL ' + $_.Exception.Message)
  exit 1
}
