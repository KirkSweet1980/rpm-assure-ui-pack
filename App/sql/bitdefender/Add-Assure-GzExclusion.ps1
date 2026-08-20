# GravityZone: list policies and add C:\RPM-Assure folder exclusion (On-Access + On-Demand + ATC).
# Uses Bitdefender.Config.ps1 (same as the collector). Dry-run unless -Apply.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\sql\bitdefender\Add-Assure-GzExclusion.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\sql\bitdefender\Add-Assure-GzExclusion.ps1 -Apply
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$cfg = @(
  (Join-Path $here 'Bitdefender.Config.ps1'),
  'C:\RPM-Assure\Sql\bitdefender\Bitdefender.Config.ps1'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $cfg) { throw 'Missing Bitdefender.Config.ps1' }
. $cfg
if ([string]::IsNullOrWhiteSpace($AccessUrl)) { $AccessUrl = 'https://cloud.gravityzone.bitdefender.com' }
$AccessUrl = $AccessUrl.TrimEnd('/')
$baseApi = if ($AccessUrl -match '/api$') { $AccessUrl } else { $AccessUrl + '/api' }
$script:RpcId = 0
$Want = 'C:\RPM-Assure'

function Invoke-GzRpc([string]$Service, [string]$Method, $Params) {
  $script:RpcId++
  $uri = '{0}/v1.0/jsonrpc/{1}' -f $baseApi, $Service
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($ApiKey + ':')))
  $body = @{ jsonrpc = '2.0'; method = $Method; params = $Params; id = [string]$script:RpcId } | ConvertTo-Json -Depth 20 -Compress
  $r = Invoke-WebRequest -Uri $uri -Method POST -Headers @{ Authorization = ('Basic ' + $b64) } `
    -ContentType 'application/json' -Body $body -UseBasicParsing -TimeoutSec 60
  $raw = $r.Content
  if ($raw -is [byte[]]) { $raw = [Text.Encoding]::UTF8.GetString($raw) }
  return [string]$raw
}

Write-Host '=== GravityZone Assure path exclusion ==='
if (-not $Apply) { Write-Host 'DRY-RUN (pass -Apply to change policies)' }

$page = 1
$policies = @()
do {
  $raw = Invoke-GzRpc -Service 'policies' -Method 'getPoliciesList' -Params @{ page = $page; perPage = 50 }
  $j = $raw | ConvertFrom-Json
  $items = @()
  if ($j.result.items) { $items = @($j.result.items) }
  elseif ($j.result) { $items = @($j.result) }
  $policies += $items
  $pages = 1
  try { if ($j.result.pages) { $pages = [int]$j.result.pages } } catch {}
  if ($page -ge $pages -or $items.Count -eq 0) { break }
  $page++
} while ($page -le 30)
Write-Host ('policies=' + $policies.Count)

$missing = @()
foreach ($p in $policies) {
  $id = [string]$p.id
  $name = [string]$p.name
  if (-not $id) { continue }
  $rawD = Invoke-GzRpc -Service 'policies' -Method 'getPolicyDetails' -Params @{ policyId = $id }
  $has = $rawD -match 'RPM-Assure'
  Write-Host ('  ' + $(if ($has) { 'HAS' } else { 'MISS' }) + '  ' + $name + '  id=' + $id)
  if (-not $has) { $missing += @{ id = $id; name = $name; raw = $rawD } }
}

if ($missing.Count -eq 0) {
  Write-Host 'All listed policies already mention RPM-Assure. Done.'
  return
}

Write-Host ('Missing on ' + $missing.Count + ' policy(ies).')
if (-not $Apply) {
  Write-Host 'Would try policies.savePolicy / createPolicy merge for C:\RPM-Assure folder (modules 1,2,3).'
  Write-Host '=== dry-run done ==='
  return
}

$item = @{ type = 1; path = $Want; modules = @(1, 2, 3) }
foreach ($m in $missing) {
  $det = $m.raw | ConvertFrom-Json
  $settings = $null
  if ($det.result.settings) { $settings = $det.result.settings }
  elseif ($det.result.result.settings) { $settings = $det.result.result.settings }
  if (-not $settings) {
    Write-Host ('SKIP no settings ' + $m.name)
    continue
  }
  if (-not $settings.activateExclusions) {
    $settings | Add-Member -NotePropertyName activateExclusions -NotePropertyValue ([pscustomobject]@{}) -Force
  }
  $ax = $settings.activateExclusions
  $ax | Add-Member -NotePropertyName enable -NotePropertyValue $true -Force
  $cur = @()
  if ($ax.exclusionsItems) { $cur = @($ax.exclusionsItems) }
  $cur += $item
  $ax | Add-Member -NotePropertyName exclusionsItems -NotePropertyValue $cur -Force

  $try = @(
    @{ svc = 'policies'; meth = 'savePolicy'; par = @{ policyId = $m.id; settings = $settings } },
    @{ svc = 'policies'; meth = 'updatePolicy'; par = @{ policyId = $m.id; settings = $settings } },
    @{ svc = 'policies'; meth = 'setPolicySettings'; par = @{ policyId = $m.id; settings = $settings } },
    @{ svc = 'policies'; meth = 'createPolicy'; par = @{ name = ($m.name + ' (Assure excl)'); settings = $settings } }
  )
  $ok = $false
  foreach ($t in $try) {
    $raw = Invoke-GzRpc -Service $t.svc -Method $t.meth -Params $t.par
    $head = $raw
    if ($head.Length -gt 220) { $head = $head.Substring(0, 220) }
    if ($raw -match '"error"\s*:\s*\{') {
      Write-Host ('  ' + $t.meth + ' no  ' + $m.name + '  ' + $head)
      continue
    }
    Write-Host ('  ' + $t.meth + ' OK  ' + $m.name)
    $ok = $true
    break
  }
  if (-not $ok) {
    Write-Host ('FAIL API cannot edit ' + $m.name + ' - add C:\RPM-Assure in GravityZone like AHI (On-Access + ATC + On-Demand).')
  }
}
Write-Host '=== apply done ==='
Write-Host 'Agents also set Windows Defender exclusion on next pack (v2.9.1). Bitdefender still follows GZ policy.'
