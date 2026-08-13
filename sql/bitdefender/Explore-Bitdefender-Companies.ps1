# Explore GravityZone multi-company tree + per-company endpoint counts
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File Explore-Bitdefender-Companies.ps1

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
. (Join-Path $here 'Bitdefender.Config.ps1')

if ([string]::IsNullOrWhiteSpace($ApiKey) -or $ApiKey -like 'PASTE*') { throw 'Set $ApiKey' }
if ([string]::IsNullOrWhiteSpace($AccessUrl)) { $AccessUrl = 'https://cloud.gravityzone.bitdefender.com' }
$AccessUrl = $AccessUrl.TrimEnd('/')
$baseApi = if ($AccessUrl -match '/api$') { $AccessUrl } else { $AccessUrl + '/api' }

$OutDir = Join-Path $here 'out'
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$runDir = Join-Path $OutDir ("companies_" + $stamp)
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
$log = Join-Path $runDir 'companies.log'
$script:RpcId = 0

function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}
function Get-AuthHeader {
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($ApiKey + ':')))
  return ('Basic ' + $b64)
}
function ConvertTo-Text($c) {
  if ($null -eq $c) { return '' }
  if ($c -is [string]) { return $c }
  if ($c -is [byte[]]) { return [Text.Encoding]::UTF8.GetString($c) }
  try { return [Text.Encoding]::UTF8.GetString([byte[]]$c) } catch { return [string]$c }
}
function Invoke-GzRpc {
  param([string]$Service, [string]$Method, [hashtable]$Params = @{}, [string]$ApiVersion = 'v1.0')
  $script:RpcId++
  $uri = '{0}/{1}/jsonrpc/{2}' -f $baseApi, $ApiVersion, $Service
  $body = (@{ jsonrpc = '2.0'; id = [string]$script:RpcId; method = $Method; params = $Params } | ConvertTo-Json -Depth 12 -Compress)
  try {
    $resp = Invoke-WebRequest -Uri $uri -Method POST -Headers @{
      Authorization = (Get-AuthHeader); 'Content-Type' = 'application/json'
    } -Body $body -UseBasicParsing -TimeoutSec 90
    return [pscustomobject]@{ Ok = $true; Raw = (ConvertTo-Text $resp.Content) }
  } catch {
    $raw = $_.Exception.Message
    try {
      if ($_.Exception.Response) {
        $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
        $raw = $sr.ReadToEnd()
      }
    } catch {}
    return [pscustomobject]@{ Ok = $false; Raw = $raw }
  }
}
function Save-Raw([string]$name, [string]$raw) {
  [IO.File]::WriteAllText((Join-Path $runDir ($name + '.json')), $raw, [Text.UTF8Encoding]::new($false))
}

Write-Log '=== Bitdefender multi-company explore ==='
Write-Log ("baseApi=" + $baseApi)

$companies = New-Object System.Collections.Generic.List[object]
foreach ($filt in @(
    @{},
    @{ filters = @{ companyType = 1 } },
    @{ filters = @{ companyType = 0 } }
  )) {
  $r = Invoke-GzRpc -Service 'companies' -Method 'getCompaniesList' -Params $filt
  $tag = if ($filt.filters) { "type$($filt.filters.companyType)" } else { 'default' }
  Save-Raw ("getCompaniesList_" + $tag) $r.Raw
  if ($r.Raw -match '"error"') {
    $prev = if ($r.Raw.Length -gt 160) { $r.Raw.Substring(0, 160) } else { $r.Raw }
    Write-Log ("getCompaniesList $tag ERROR: " + $prev)
    continue
  }
  try {
    $jo = $r.Raw | ConvertFrom-Json
    $items = @()
    if ($jo.result.items) { $items = @($jo.result.items) }
    elseif ($jo.result -is [System.Array]) { $items = @($jo.result) }
    elseif ($jo.result.result) { $items = @($jo.result.result) }
    Write-Log ("getCompaniesList $tag count=" + $items.Count)
    foreach ($it in $items) {
      $companies.Add([pscustomobject]@{ Id = [string]$it.id; Name = [string]$it.name; Source = 'getCompaniesList' })
      Write-Log ("  Company: " + $it.name + " id=" + $it.id)
    }
  } catch {
    Write-Log ("parse fail: " + $_.Exception.Message)
  }
}

$r = Invoke-GzRpc -Service 'network' -Method 'getNetworkInventoryItems' -Params @{ page = 1; perPage = 50 }
Save-Raw 'inventory_root' $r.Raw
$companiesFolderId = $null
try {
  $jo = $r.Raw | ConvertFrom-Json
  foreach ($it in @($jo.result.items)) {
    Write-Log ("Root: name=$($it.name) id=$($it.id) type=$($it.type)")
    if ([string]$it.name -eq 'Companies') { $companiesFolderId = [string]$it.id }
  }
} catch {}

if ($companiesFolderId) {
  $page = 1; $pages = 1
  do {
    $r = Invoke-GzRpc -Service 'network' -Method 'getNetworkInventoryItems' -Params @{
      parentId = $companiesFolderId; page = $page; perPage = 50
    }
    Save-Raw ("inventory_companies_p" + $page) $r.Raw
    if ($r.Raw -match '"error"') {
      Write-Log ("inventory under Companies ERROR: " + $r.Raw.Substring(0, [Math]::Min(160, $r.Raw.Length)))
      break
    }
    $jo = $r.Raw | ConvertFrom-Json
    $pages = [int]$jo.result.pagesCount
    if ($pages -lt 1) { $pages = 1 }
    foreach ($it in @($jo.result.items)) {
      Write-Log ("  Under Companies: name=$($it.name) id=$($it.id) type=$($it.type)")
      if ($it.id -and $it.name) {
        $companies.Add([pscustomobject]@{ Id = [string]$it.id; Name = [string]$it.name; Source = 'inventory_Companies' })
      }
    }
    $page++
  } while ($page -le $pages -and $page -le 20)
}

$byId = @{}
foreach ($c in $companies) {
  if (-not $c.Id) { continue }
  if (-not $byId.ContainsKey($c.Id)) { $byId[$c.Id] = $c }
}
Write-Log ("Unique company/container ids=" + $byId.Count)

$csv = New-Object System.Collections.Generic.List[string]
[void]$csv.Add('companyId,companyName,source,endpointTotal,sampleNames')
$grand = 0
foreach ($id in ($byId.Keys | Sort-Object)) {
  $c = $byId[$id]
  $total = -1
  $samples = New-Object System.Collections.Generic.List[string]
  try {
    $r = Invoke-GzRpc -Service 'network' -Method 'getEndpointsList' -Params @{
      parentId = $id; page = 1; perPage = 50
    }
    Save-Raw ("endpoints_" + ($id -replace '[^a-zA-Z0-9]', '_')) $r.Raw
    if ($r.Raw -match '"error"') {
      Write-Log ("Endpoints FAIL company=$($c.Name): " + $r.Raw.Substring(0, [Math]::Min(120, $r.Raw.Length)))
    } else {
      $jo = $r.Raw | ConvertFrom-Json
      $total = [int]$jo.result.total
      foreach ($ep in @($jo.result.items)) {
        if ($samples.Count -lt 5 -and $ep.name) { [void]$samples.Add([string]$ep.name) }
      }
      Write-Log ("Endpoints OK company=$($c.Name) total=$total samples=$($samples -join ';')")
      if ($total -gt 0) { $grand += $total }
    }
  } catch {
    Write-Log ("Endpoints exception $($c.Name): " + $_.Exception.Message)
  }
  [void]$csv.Add(('"{0}","{1}","{2}",{3},"{4}"' -f $id, ($c.Name -replace '"',''''), $c.Source, $total, ($samples -join ';')))
}

$r = Invoke-GzRpc -Service 'network' -Method 'getEndpointsList' -Params @{ page = 1; perPage = 10 }
Save-Raw 'endpoints_flat' $r.Raw
try {
  $jo = $r.Raw | ConvertFrom-Json
  Write-Log ("Flat getEndpointsList (no parentId) total=" + $jo.result.total)
} catch {}

[IO.File]::WriteAllLines((Join-Path $runDir 'company_endpoint_counts.csv'), $csv.ToArray(), [Text.UTF8Encoding]::new($false))
Write-Log ("Sum of per-company totals (where >0)~" + $grand)
Write-Log ("Out=" + $runDir)
Write-Log '=== Done ==='
Write-Host ''
Write-Host 'Paste: company lines with total>0 and flat total.'
Write-Host 'If only one company has endpoints, ABLE/BHF/RSS agents are not under this API key tree.'
