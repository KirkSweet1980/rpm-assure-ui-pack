# Explore Bitdefender GravityZone Public API (JSON-RPC)
# Auth: Basic Base64(API_KEY + ":")  password empty
# Docs: https://www.bitdefender.com/business/support/en/77209-125277-public-api.html

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$configPath = Join-Path $here 'Bitdefender.Config.ps1'
if (-not (Test-Path -LiteralPath $configPath)) {
  throw "Missing $configPath - copy Bitdefender.Config.example.ps1 and set ApiKey + AccessUrl"
}
. $configPath

if ([string]::IsNullOrWhiteSpace($ApiKey) -or $ApiKey -like 'PASTE*') {
  throw 'Set $ApiKey in Bitdefender.Config.ps1'
}
if ([string]::IsNullOrWhiteSpace($AccessUrl)) {
  # Common cloud defaults — override in config if your Control Center Access URL differs
  $AccessUrl = 'https://cloud.gravityzone.bitdefender.com'
}
$AccessUrl = $AccessUrl.TrimEnd('/')
if ($AccessUrl -notmatch '/api$') {
  # Accept either https://host or https://host/api
  if (Test-Path variable:PreferApiSuffix) { }
  $baseApi = $AccessUrl + '/api'
} else {
  $baseApi = $AccessUrl
}

$OutDir = Join-Path $here 'out'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$runDir = Join-Path $OutDir $stamp
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
$log = Join-Path $runDir 'explore.log'
$script:RpcId = 0

function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

function Get-AuthHeader {
  $pair = $ApiKey + ':'
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($pair))
  return ('Basic ' + $b64)
}

function ConvertTo-Text($content) {
  if ($null -eq $content) { return '' }
  if ($content -is [string]) { return $content }
  if ($content -is [byte[]]) {
    return [Text.Encoding]::UTF8.GetString($content)
  }
  try { return [Text.Encoding]::UTF8.GetString([byte[]]$content) } catch { return [string]$content }
}

function Invoke-GzRpc {
  param(
    [string]$Service,   # network | companies | quarantine | incidents | packages | accounts | reports
    [string]$Method,
    [hashtable]$Params = @{},
    [string]$ApiVersion = 'v1.0'
  )
  $script:RpcId++
  $uri = '{0}/{1}/jsonrpc/{2}' -f $baseApi, $ApiVersion, $Service.Trim('/')
  $bodyObj = [ordered]@{
    jsonrpc = '2.0'
    id      = [string]$script:RpcId
    method  = $Method
    params  = $Params
  }
  $json = $bodyObj | ConvertTo-Json -Depth 12 -Compress
  $headers = @{
    Authorization = (Get-AuthHeader)
    'Content-Type' = 'application/json'
  }
  $sw = [Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $json -UseBasicParsing -TimeoutSec 60
    $sw.Stop()
    $text = ConvertTo-Text $resp.Content
    return [pscustomobject]@{
      Ok = $true
      StatusCode = [int]$resp.StatusCode
      Ms = [int]$sw.ElapsedMilliseconds
      Uri = $uri
      Method = $Method
      Service = $Service
      Raw = $text
    }
  } catch {
    $sw.Stop()
    $errText = $_.Exception.Message
    $status = 0
    $raw = ''
    try {
      if ($_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
        $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
        $raw = $sr.ReadToEnd()
      }
    } catch {}
    return [pscustomobject]@{
      Ok = $false
      StatusCode = $status
      Ms = [int]$sw.ElapsedMilliseconds
      Uri = $uri
      Method = $Method
      Service = $Service
      Raw = $(if ($raw) { $raw } else { $errText })
      Error = $errText
    }
  }
}

function Save-Probe($result, [string]$name) {
  $safe = ($name -replace '[^a-zA-Z0-9_\-]', '_')
  $path = Join-Path $runDir ("probe_{0}.json" -f $safe)
  [IO.File]::WriteAllText($path, [string]$result.Raw, [Text.UTF8Encoding]::new($false))
  $prefix = if ($result.Raw.Length -gt 220) { $result.Raw.Substring(0, 220) } else { $result.Raw }
  if ($result.Ok -and $result.Raw -notmatch '"error"') {
    Write-Log ("OK {0}/{1} ms={2} size={3} preview={4}" -f $result.Service, $result.Method, $result.Ms, $result.Raw.Length, $prefix)
  } else {
    $msg = $result.Error
    if (-not $msg -and $result.Raw -match '"message"\s*:\s*"([^"]+)"') { $msg = $Matches[1] }
    Write-Log ("SKIP {0}/{1} status={2} err={3} preview={4}" -f $result.Service, $result.Method, $result.StatusCode, $msg, $prefix)
  }
}

Write-Log '=== Bitdefender GravityZone explore ==='
Write-Log ("AccessUrl baseApi=" + $baseApi)
Write-Log ("ApiKeyLen=" + $ApiKey.Length + " prefix=" + $ApiKey.Substring(0, [Math]::Min(8, $ApiKey.Length)) + "...")

# --- Probes useful for RPM End Point Protection (EPP) ---
$probes = @(
  @{ Service = 'network';    Method = 'getEndpointsList';       Params = @{ page = 1; perPage = 10 } },
  @{ Service = 'network';    Method = 'getCustomGroupsList';    Params = @{} },
  @{ Service = 'network';    Method = 'getNetworkInventoryItems'; Params = @{ page = 1; perPage = 10 } },
  @{ Service = 'companies';  Method = 'getCompaniesList';       Params = @{ page = 1; perPage = 50 } },
  @{ Service = 'companies';  Method = 'findCompaniesByName';    Params = @{ nameFilter = ''; page = 1; perPage = 20 } },
  @{ Service = 'quarantine'; Method = 'getQuarantineItemsList'; Params = @{ page = 1; perPage = 20 } },
  @{ Service = 'incidents';  Method = 'getIncidentsList';       Params = @{ page = 1; perPage = 20 } },
  @{ Service = 'incidents';  Method = 'getIncidents';           Params = @{ page = 1; perPage = 20 } },
  @{ Service = 'packages';   Method = 'getPackagesList';        Params = @{ page = 1; perPage = 20 } },
  @{ Service = 'accounts';   Method = 'getAccountsList';        Params = @{ page = 1; perPage = 10 } },
  @{ Service = 'reports';    Method = 'getReportsList';         Params = @{ page = 1; perPage = 10 } },
  @{ Service = 'licensing';  Method = 'getLicenseInfo';         Params = @{} },
  @{ Service = 'policies';   Method = 'getPoliciesList';        Params = @{ page = 1; perPage = 10 } }
)

$okMethods = New-Object System.Collections.Generic.List[string]
foreach ($p in $probes) {
  Write-Log ("Probe {0}/{1} ..." -f $p.Service, $p.Method)
  $r = Invoke-GzRpc -Service $p.Service -Method $p.Method -Params $p.Params
  Save-Probe $r ("{0}_{1}" -f $p.Service, $p.Method)
  if ($r.Ok -and $r.Raw -notmatch '"error"') {
    [void]$okMethods.Add(("{0}/{1}" -f $p.Service, $p.Method))
  }
}

# Try alternate cloud host if everything failed hard (401/404)
if ($okMethods.Count -eq 0 -and $AccessUrl -match 'cloud\.gravityzone') {
  Write-Log 'No methods OK on cloud.gravityzone — try gravityzone.bitdefender.com ...'
  $baseApi = 'https://gravityzone.bitdefender.com/api'
  $r = Invoke-GzRpc -Service 'network' -Method 'getEndpointsList' -Params @{ page = 1; perPage = 5 }
  Save-Probe $r 'alt_host_getEndpointsList'
}

Write-Log ("Working methods: " + ($(if ($okMethods.Count) { ($okMethods -join ', ') } else { '(none)' })))
Write-Log ("Out=" + $runDir)
Write-Log '=== Done ==='
Write-Host ''
Write-Host 'Next: open probe_*.json under out\ for company/endpoint shapes.'
Write-Host 'Map company names -> CustomerCode for EPP collect (like Cove PartnerMap).'
