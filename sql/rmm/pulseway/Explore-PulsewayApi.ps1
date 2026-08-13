# Explore Pulseway REST API v3 for RPM RMM Ecosystem mapping
# Safe: read-only GETs only. Writes JSON samples under .\out\
# ASCII-only for Windows PowerShell 5.1

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$cfgPath = Join-Path $here 'Pulseway.Config.ps1'
if (-not (Test-Path -LiteralPath $cfgPath)) {
  throw "Missing $cfgPath - copy Pulseway.Config.example.ps1 and set TokenId/TokenSecret"
}
. $cfgPath

if ([string]::IsNullOrWhiteSpace($TokenId) -or $TokenId -like 'PASTE*') {
  throw 'Set $TokenId in Pulseway.Config.ps1'
}
if ([string]::IsNullOrWhiteSpace($TokenSecret) -or $TokenSecret -like 'PASTE*') {
  throw 'Set $TokenSecret in Pulseway.Config.ps1'
}
if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = 'https://rpmresourcesza.pulseway.com/api/v3'
}
$BaseUrl = $BaseUrl.TrimEnd('/')
if (-not $OutDir) { $OutDir = Join-Path $here 'out' }
if (-not $MaxDevicesSample) { $MaxDevicesSample = 25 }
if (-not $MaxNotificationsSample) { $MaxNotificationsSample = 50 }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$runDir = Join-Path $OutDir $stamp
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
$log = Join-Path $runDir 'explore.log'

function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

function Get-BasicAuthHeader {
  $pair = '{0}:{1}' -f $TokenId, $TokenSecret
  $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
  return @{ Authorization = "Basic $b64"; Accept = 'application/json' }
}

function Invoke-PwGet {
  param([string]$Path)
  $url = if ($Path.StartsWith('http')) { $Path } else { "$BaseUrl/$($Path.TrimStart('/'))" }
  $sw = [Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-WebRequest -Uri $url -Headers (Get-BasicAuthHeader) -Method GET -UseBasicParsing -TimeoutSec 120
    $sw.Stop()
    $body = $resp.Content
    $obj = $null
    try { $obj = $body | ConvertFrom-Json } catch { $obj = $null }
    return [pscustomobject]@{
      Ok = $true; Status = [int]$resp.StatusCode; Ms = $sw.ElapsedMilliseconds
      Url = $url; Raw = $body; Json = $obj; Error = $null; ApiMessage = $null
    }
  } catch {
    $sw.Stop()
    $status = $null
    $raw = $null
    $apiMsg = $null
    if ($_.Exception.Response) {
      try { $status = [int]$_.Exception.Response.StatusCode } catch {}
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $raw = $reader.ReadToEnd()
        }
      } catch {}
    }
    if ($raw) {
      try {
        $j = $raw | ConvertFrom-Json
        if ($j.Meta -and $j.Meta.ErrorMessage) { $apiMsg = [string]$j.Meta.ErrorMessage }
        elseif ($j.ErrorMessage) { $apiMsg = [string]$j.ErrorMessage }
        elseif ($j.message) { $apiMsg = [string]$j.message }
      } catch {}
    }
    return [pscustomobject]@{
      Ok = $false; Status = $status; Ms = $sw.ElapsedMilliseconds
      Url = $url; Raw = $raw; Json = $null
      Error = $_.Exception.Message; ApiMessage = $apiMsg
    }
  }
}

function Get-PropertyNames($obj, [int]$Depth = 0) {
  if ($null -eq $obj -or $Depth -gt 3) { return @() }
  $names = New-Object System.Collections.Generic.List[string]
  if ($obj -is [System.Collections.IEnumerable] -and -not ($obj -is [string])) {
    $arr = @($obj)
    if ($arr.Count -gt 0) { return Get-PropertyNames $arr[0] ($Depth + 1) }
    return @()
  }
  $obj.PSObject.Properties | ForEach-Object {
    [void]$names.Add($_.Name)
    if ($_.Value -is [psobject] -and $Depth -lt 1) {
      foreach ($c in (Get-PropertyNames $_.Value ($Depth + 1))) {
        [void]$names.Add(('{0}.{1}' -f $_.Name, $c))
      }
    }
  }
  return $names
}

function Save-Sample($name, $result) {
  $path = Join-Path $runDir ($name + '.json')
  if ($result.Raw) {
    Set-Content -LiteralPath $path -Value $result.Raw -Encoding UTF8
  } else {
    $fallback = @{ error = $result.Error; status = $result.Status; apiMessage = $result.ApiMessage } | ConvertTo-Json
    Set-Content -LiteralPath $path -Value $fallback -Encoding UTF8
  }
  return $path
}

function Get-DataArray($json) {
  if ($null -eq $json) { return @() }
  if ($json -is [System.Array]) { return @($json) }
  $propNames = @(
    'Data', 'data', 'Items', 'items', 'Results', 'results',
    'Devices', 'devices', 'Organizations', 'organizations',
    'Notifications', 'notifications', 'Groups', 'groups', 'Sites', 'sites'
  )
  foreach ($prop in $propNames) {
    if ($json.PSObject.Properties.Name -contains $prop -and $null -ne $json.$prop) {
      return @($json.$prop)
    }
  }
  if ($json.PSObject.Properties.Count -gt 0) { return @($json) }
  return @()
}

Write-Log '=== Pulseway explore start ==='
Write-Log ("BaseUrl=" + $BaseUrl)
Write-Log ("Out=" + $runDir)
Write-Log ("TokenId length=" + $TokenId.Length + " (secret not logged)")

$endpoints = @(
  @{ Name = 'environment'; Path = 'environment'; Map = 'sanity' },
  @{ Name = 'organizations'; Path = 'organizations'; Map = 'Dim_Pulseway_OrgMap' },
  @{ Name = 'sites'; Path = 'sites'; Map = 'Pulseway_Sites' },
  @{ Name = 'groups'; Path = 'groups'; Map = 'Pulseway_Groups' },
  @{ Name = 'devices'; Path = 'devices'; Map = 'Pulseway_Devices' },
  @{ Name = 'notifications'; Path = 'notifications'; Map = 'Pulseway_Notifications' },
  @{ Name = 'assets'; Path = 'assets'; Map = 'optional' },
  @{ Name = 'ratelimits'; Path = 'ratelimits'; Map = 'ops' }
)

$summary = New-Object System.Collections.Generic.List[object]
$sawWs17 = $false

foreach ($ep in $endpoints) {
  Write-Log ("GET " + $ep.Path + " ...")
  $r = Invoke-PwGet -Path $ep.Path
  [void](Save-Sample $ep.Name $r)
  $arr = Get-DataArray $r.Json
  $fields = @()
  if ($arr.Count -gt 0) { $fields = @(Get-PropertyNames $arr[0]) }
  $row = [pscustomobject]@{
    Endpoint  = $ep.Name
    MapTo     = $ep.Map
    Status    = $r.Status
    Ok        = $r.Ok
    Ms        = $r.Ms
    ItemCount = $arr.Count
    ApiMessage = $r.ApiMessage
    Fields    = ($fields -join ', ')
  }
  [void]$summary.Add($row)
  if ($r.Ok) {
    Write-Log ("  OK status=" + $r.Status + " items=" + $arr.Count + " ms=" + $r.Ms)
    if ($fields.Count -gt 0) {
      Write-Log ("  fields: " + (($fields | Select-Object -First 25) -join ', '))
    }
  } else {
    Write-Log ("  FAIL status=" + $r.Status + " err=" + $r.Error)
    if ($r.ApiMessage) {
      Write-Log ("  API: " + $r.ApiMessage)
      if ($r.ApiMessage -like '*ws17*') { $sawWs17 = $true }
    }
  }
}

if ($sawWs17 -and $BaseUrl -like '*api.pulseway.com*') {
  Write-Log 'HINT: API points at ws17.pulseway.com - try BaseUrl https://ws17.pulseway.com/api/v3'
  Write-Log 'Run Diagnose-Pulseway-500.ps1 then Write-PulsewayConfig.ps1 -BaseUrl that URL'
}

# device sample only if list worked
$devResult = Invoke-PwGet -Path 'devices'
$devs = Get-DataArray $devResult.Json
if ($devs.Count -gt 0) {
  $sampleDevs = $devs | Select-Object -First $MaxDevicesSample
  ($sampleDevs | ConvertTo-Json -Depth 8) | Set-Content (Join-Path $runDir 'devices_sample.json') -Encoding UTF8
  $idProp = @('Id', 'id', 'DeviceId', 'deviceId', 'InstanceId', 'instanceId', 'Identifier') |
    Where-Object { $sampleDevs[0].PSObject.Properties.Name -contains $_ } |
    Select-Object -First 1
  if ($idProp) {
    $did = [string]$sampleDevs[0].$idProp
    Write-Log ("GET devices/" + $did + " ...")
    $one = Invoke-PwGet -Path ("devices/{0}" -f $did)
    [void](Save-Sample 'device_one' $one)
    Write-Log ("  device detail status=" + $one.Status)
    $dn = Invoke-PwGet -Path ("devices/{0}/notifications" -f $did)
    [void](Save-Sample 'device_notifications' $dn)
    Write-Log ("  device notifications status=" + $dn.Status)
  }
}

$summary | Export-Csv -LiteralPath (Join-Path $runDir 'summary.csv') -NoTypeInformation -Encoding UTF8
$summary | Format-Table Endpoint, Status, Ok, ItemCount, ApiMessage -AutoSize | Out-String | Write-Host

Write-Log '=== Done ==='
Write-Log ("Folder: " + $runDir)
Write-Host ''
Write-Host 'If all 500: run Diagnose-Pulseway-500.ps1 and paste its output (no secrets).' -ForegroundColor Yellow
