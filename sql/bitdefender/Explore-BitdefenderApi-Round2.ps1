# Explore Bitdefender GravityZone — Round 2b
# Endpoints under Custom Groups; walk group tree; map by name/FQDN patterns.
# Fix: do not use $pid (reserved in PowerShell).

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
. (Join-Path $here 'Bitdefender.Config.ps1')

if ([string]::IsNullOrWhiteSpace($ApiKey) -or $ApiKey -like 'PASTE*') { throw 'Set $ApiKey' }
if ([string]::IsNullOrWhiteSpace($AccessUrl)) { $AccessUrl = 'https://cloud.gravityzone.bitdefender.com' }
$AccessUrl = $AccessUrl.TrimEnd('/')
$baseApi = if ($AccessUrl -match '/api$') { $AccessUrl } else { $AccessUrl + '/api' }

$OutDir = Join-Path $here 'out'
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$runDir = Join-Path $OutDir $stamp
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
$log = Join-Path $runDir 'explore2.log'
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
  param(
    [string]$Service,
    [string]$Method,
    [hashtable]$Params = @{},
    [string]$ApiVersion = 'v1.0'
  )
  $script:RpcId++
  $uri = '{0}/{1}/jsonrpc/{2}' -f $baseApi, $ApiVersion, $Service
  $body = (@{
      jsonrpc = '2.0'
      id      = [string]$script:RpcId
      method  = $Method
      params  = $Params
    } | ConvertTo-Json -Depth 12 -Compress)
  try {
    $resp = Invoke-WebRequest -Uri $uri -Method POST -Headers @{
      Authorization  = (Get-AuthHeader)
      'Content-Type' = 'application/json'
    } -Body $body -UseBasicParsing -TimeoutSec 90
    return [pscustomobject]@{
      Ok     = $true
      Status = [int]$resp.StatusCode
      Raw    = (ConvertTo-Text $resp.Content)
      Uri    = $uri
    }
  } catch {
    $raw = $_.Exception.Message
    $st = 0
    try {
      if ($_.Exception.Response) {
        $st = [int]$_.Exception.Response.StatusCode
        $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
        $raw = $sr.ReadToEnd()
      }
    } catch {}
    return [pscustomobject]@{ Ok = $false; Status = $st; Raw = $raw; Uri = $uri }
  }
}

function Save-Raw([string]$name, [string]$raw) {
  $p = Join-Path $runDir ($name + '.json')
  [IO.File]::WriteAllText($p, $raw, [Text.UTF8Encoding]::new($false))
}

function Suggest-Code([string]$name) {
  $n = ($name | Out-String).ToUpperInvariant()
  if ($n -match 'AHI|CARRIER') { return 'AHIC' }
  if ($n -match 'BHF|PCNS|HEALTHCARE|FUNDERS') { return 'BHF' }
  if ($n -match 'HYDRA') { return 'HYDRA' }
  if ($n -match 'REDSUN|RSR') { return 'RSR' }
  if ($n -match 'REMOTE.?SITE|RSS') { return 'RSS' }
  if ($n -match 'UVSS|VENTILATION') { return 'UVSS' }
  if ($n -match 'ABLE') { return 'ABLE' }
  if ($n -match 'RPM|RPMPET|RPM-') { return 'RPMINT' }
  if ($n -match 'SIMPLY|SBS') { return 'SBS' }
  if ($n -match 'METSI') { return 'METSI' }
  if ($n -match 'MEDIPOS') { return 'MEDIPOS' }
  if ($n -match 'INTERBRAND|\bIB\b') { return 'IB' }
  if ($n -match 'VAULT') { return 'VAULT' }
  if ($n -match 'YLJ') { return 'YLJ' }
  return ''
}

Write-Log '=== Bitdefender explore round 2b ==='
Write-Log ("baseApi=" + $baseApi)

# Inventory root
$inv = Invoke-GzRpc -Service 'network' -Method 'getNetworkInventoryItems' -Params @{ page = 1; perPage = 50 }
Save-Raw 'inventory_root' $inv.Raw
Write-Log ("inventory_root size=" + $inv.Raw.Length)

$customGroupsId = $null
$companiesFolderId = $null
try {
  $o = $inv.Raw | ConvertFrom-Json
  foreach ($it in @($o.result.items)) {
    Write-Log ("Root item: name=" + $it.name + " id=" + $it.id + " type=" + $it.type)
    if ($it.name -eq 'Companies') { $companiesFolderId = [string]$it.id }
    if ($it.name -eq 'Network') {
      # walk Network children for Custom Groups
      $netKids = Invoke-GzRpc -Service 'network' -Method 'getNetworkInventoryItems' -Params @{
        parentId = [string]$it.id
        page     = 1
        perPage  = 50
      }
      Save-Raw 'network_children' $netKids.Raw
      try {
        $nk = $netKids.Raw | ConvertFrom-Json
        foreach ($c in @($nk.result.items)) {
          Write-Log ("Network child: " + $c.name + " id=" + $c.id + " type=" + $c.type)
          if ($c.name -eq 'Custom Groups' -or $c.name -eq 'Computers and Groups') {
            $customGroupsId = [string]$c.id
          }
        }
      } catch {}
    }
  }
} catch {
  Write-Log ("inventory parse: " + $_.Exception.Message)
}

# Also getCustomGroupsList
$cgl = Invoke-GzRpc -Service 'network' -Method 'getCustomGroupsList' -Params @{}
Save-Raw 'custom_groups_list' $cgl.Raw
Write-Log ("getCustomGroupsList size=" + $cgl.Raw.Length)
try {
  $cg = $cgl.Raw | ConvertFrom-Json
  foreach ($g in @($cg.result)) {
    Write-Log ("CustomGroupList: " + $g.name + " id=" + $g.id)
    if (-not $customGroupsId -and $g.name -match 'Custom|Computers') {
      $customGroupsId = [string]$g.id
    }
  }
} catch {}

# Walk inventory under Custom Groups (customer folders often live here)
$groupRows = New-Object System.Collections.Generic.List[object]
function Walk-Groups([string]$ParentId, [int]$Depth) {
  if ($Depth -gt 5) { return }
  if ([string]::IsNullOrWhiteSpace($ParentId)) { return }
  $r = Invoke-GzRpc -Service 'network' -Method 'getNetworkInventoryItems' -Params @{
    parentId = $ParentId
    page     = 1
    perPage  = 100
  }
  Save-Raw ("inv_depth{0}_{1}" -f $Depth, $ParentId) $r.Raw
  try {
    $jo = $r.Raw | ConvertFrom-Json
    foreach ($it in @($jo.result.items)) {
      $nm = [string]$it.name
      $id = [string]$it.id
      $tp = $it.type
      $code = Suggest-Code $nm
      Write-Log (("  " * $Depth) + "Group: " + $nm + " id=" + $id + " type=" + $tp + " suggest=" + $code)
      $groupRows.Add([pscustomobject]@{
          Id               = $id
          Name             = $nm
          Type             = $tp
          ParentId         = $ParentId
          Depth            = $Depth
          SuggestedCode    = $code
        })
      # type 1 often = group/folder — recurse
      if ($tp -eq 1 -or $tp -eq 2 -or $nm -match 'Group') {
        Walk-Groups -ParentId $id -Depth ($Depth + 1)
      }
    }
  } catch {
    Write-Log ("Walk-Groups fail parent=" + $ParentId + " " + $_.Exception.Message)
  }
}

if ($customGroupsId) {
  Write-Log ("Walking Custom Groups id=" + $customGroupsId)
  Walk-Groups -ParentId $customGroupsId -Depth 1
} elseif ($companiesFolderId) {
  Write-Log ("Walking Companies folder id=" + $companiesFolderId)
  Walk-Groups -ParentId $companiesFolderId -Depth 1
}

# Page all endpoints
$allEp = New-Object System.Collections.Generic.List[object]
$page = 1
$pages = 1
do {
  $r = Invoke-GzRpc -Service 'network' -Method 'getEndpointsList' -Params @{ page = $page; perPage = 50 }
  Save-Raw ("endpoints_p" + $page) $r.Raw
  try {
    $eo = $r.Raw | ConvertFrom-Json
    $pages = [int]$eo.result.pagesCount
    if ($pages -lt 1) { $pages = 1 }
    foreach ($it in @($eo.result.items)) { $allEp.Add($it) }
    Write-Log ("Endpoints page " + $page + "/" + $pages + " got=" + @($eo.result.items).Count + " total=" + $eo.result.total)
  } catch {
    Write-Log ("endpoints page fail: " + $_.Exception.Message)
    break
  }
  $page++
} while ($page -le $pages -and $page -le 40)

Write-Log ("Endpoints loaded=" + $allEp.Count)

if ($allEp.Count -gt 0) {
  $sample = $allEp[0]
  Write-Log ("Sample endpoint fields: " + (($sample.PSObject.Properties.Name) -join ','))
  $sampleJson = $sample | ConvertTo-Json -Depth 6 -Compress
  Save-Raw 'endpoint_sample' $sampleJson
  Write-Log ("Sample: " + $(if ($sampleJson.Length -gt 350) { $sampleJson.Substring(0, 350) } else { $sampleJson }))
}

# endpoints.csv with suggested customer from name/fqdn
$csv = Join-Path $runDir 'endpoints.csv'
$elines = New-Object System.Collections.Generic.List[string]
[void]$elines.Add('id,name,fqdn,ip,groupId,os,isManaged,suggestedCustomerCode')
$codeCounts = @{}
foreach ($ep in $allEp) {
  $nm = [string]$ep.name
  $fq = [string]$ep.fqdn
  $code = Suggest-Code ($nm + ' ' + $fq)
  if (-not $code) { $code = 'UNMAPPED' }
  if (-not $codeCounts.ContainsKey($code)) { $codeCounts[$code] = 0 }
  $codeCounts[$code]++
  $os = ''
  if ($ep.operatingSystemVersion) { $os = [string]$ep.operatingSystemVersion }
  $ip = ''
  if ($ep.ip) { $ip = [string]$ep.ip }
  $gid = ''
  if ($ep.groupId) { $gid = [string]$ep.groupId }
  $managed = ''
  if ($null -ne $ep.isManaged) { $managed = [string]$ep.isManaged }
  $nmEsc = $nm -replace '"', "'"
  $fqEsc = $fq -replace '"', "'"
  $osEsc = $os -replace '"', "'"
  [void]$elines.Add(('"{0}","{1}","{2}","{3}","{4}","{5}","{6}","{7}"' -f $ep.id, $nmEsc, $fqEsc, $ip, $gid, $osEsc, $managed, $code))
}
[IO.File]::WriteAllLines($csv, $elines.ToArray(), [Text.UTF8Encoding]::new($false))
Write-Log ("Wrote " + $csv)
Write-Log '--- Endpoints by suggested CustomerCode ---'
foreach ($k in ($codeCounts.Keys | Sort-Object)) {
  Write-Log ("  " + $k + " n=" + $codeCounts[$k])
}

# groups.csv
$gcsv = Join-Path $runDir 'groups.csv'
$gl = New-Object System.Collections.Generic.List[string]
[void]$gl.Add('id,name,type,parentId,depth,suggestedCustomerCode')
foreach ($g in $groupRows) {
  $nm = $g.Name -replace '"', "'"
  [void]$gl.Add(('"{0}","{1}",{2},"{3}",{4},"{5}"' -f $g.Id, $nm, $g.Type, $g.ParentId, $g.Depth, $g.SuggestedCode))
}
[IO.File]::WriteAllLines($gcsv, $gl.ToArray(), [Text.UTF8Encoding]::new($false))
Write-Log ("Wrote " + $gcsv + " rows=" + $groupRows.Count)

# Incidents — use parentId not $pid
$parentIds = New-Object System.Collections.Generic.List[string]
if ($customGroupsId) { [void]$parentIds.Add($customGroupsId) }
foreach ($g in $groupRows) {
  if ($g.Id -and $g.Depth -le 2) { [void]$parentIds.Add($g.Id) }
}
$incOk = $false
foreach ($parentId in $parentIds) {
  if ($incOk) { break }
  $r = Invoke-GzRpc -Service 'incidents' -Method 'getIncidentsList' -Params @{
    parentId = $parentId
    page     = 1
    perPage  = 10
  }
  $safeName = $parentId -replace '[^a-zA-Z0-9]', '_'
  Save-Raw ("incidents_" + $safeName) $r.Raw
  if ($r.Raw -notmatch '"error"') {
    Write-Log ("Incidents OK parentId=" + $parentId + " size=" + $r.Raw.Length)
    $incOk = $true
  } else {
    $preview = if ($r.Raw.Length -gt 140) { $r.Raw.Substring(0, 140) } else { $r.Raw }
    Write-Log ("Incidents parentId=" + $parentId + " " + $preview)
  }
}
if (-not $incOk) { Write-Log 'Incidents: no working parentId (enable Incidents API on key if needed)' }

# Quarantine
foreach ($ver in @('v1.0', 'v1.1')) {
  $script:RpcId++
  $uri = '{0}/{1}/jsonrpc/quarantine' -f $baseApi, $ver
  $body = (@{
      jsonrpc = '2.0'
      id      = [string]$script:RpcId
      method  = 'getQuarantineItemsList'
      params  = @{ page = 1; perPage = 10 }
    } | ConvertTo-Json -Compress)
  try {
    $resp = Invoke-WebRequest -Uri $uri -Method POST -Headers @{
      Authorization  = (Get-AuthHeader)
      'Content-Type' = 'application/json'
    } -Body $body -UseBasicParsing -TimeoutSec 45
    $raw = ConvertTo-Text $resp.Content
    Save-Raw ("quarantine_" + $ver) $raw
    if ($raw -notmatch '"error"') {
      Write-Log ("Quarantine OK " + $ver + " size=" + $raw.Length)
    } else {
      Write-Log ("Quarantine " + $ver + " " + $(if ($raw.Length -gt 100) { $raw.Substring(0, 100) } else { $raw }))
    }
  } catch {
    Write-Log ("Quarantine " + $ver + " fail=" + $_.Exception.Message)
  }
}

$lic = Invoke-GzRpc -Service 'licensing' -Method 'getLicenseInfo' -Params @{}
Save-Raw 'license' $lic.Raw
Write-Log ("License preview: " + $(if ($lic.Raw.Length -gt 180) { $lic.Raw.Substring(0, 180) } else { $lic.Raw }))

Write-Log ("Out=" + $runDir)
Write-Log '=== Done round 2b ==='
Write-Host ''
Write-Host 'Key outputs: endpoints.csv (suggestedCustomerCode), groups.csv, explore2.log'
Write-Host 'Paste: Endpoints by suggested CustomerCode + any Group: lines with suggest= codes'
