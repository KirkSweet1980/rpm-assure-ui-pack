# Explore N-able Cove JSON-RPC for RPM Cyber Backup (ASCII only)
# Visa on REQUEST ROOT. Safe text conversion (Content may be byte[]).

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
. (Join-Path $here 'Cove.Config.ps1')

if ([string]::IsNullOrWhiteSpace($ApiUrl)) { $ApiUrl = 'https://api.backup.management/jsonapi' }
if ([string]::IsNullOrWhiteSpace($Username) -or $Username -like 'PASTE*') { throw 'Set $Username' }
if ([string]::IsNullOrWhiteSpace($Password) -or $Password -like 'PASTE*') { throw 'Set $Password' }
if (-not $MaxDevicesSample) { $MaxDevicesSample = 30 }
if (-not $OutDir) { $OutDir = Join-Path $here 'out' }
if (-not $FallbackPartnerId) { $FallbackPartnerId = 2601580 }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$runDir = Join-Path $OutDir $stamp
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
$log = Join-Path $runDir 'explore.log'
$script:Visa = $null
$script:RpcId = 0

function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

function ConvertTo-Text($content) {
  if ($null -eq $content) { return '' }
  if ($content -is [string]) { return $content }
  if ($content -is [byte[]]) {
    return [System.Text.Encoding]::UTF8.GetString($content)
  }
  # PowerShell sometimes boxes Content as Object[] of bytes
  try {
    return [System.Text.Encoding]::UTF8.GetString([byte[]]$content)
  } catch {
    return [string]$content
  }
}

function Get-TextPrefix([string]$Text, [int]$MaxLen) {
  if ([string]::IsNullOrEmpty($Text)) { return '' }
  if ($Text.Length -le $MaxLen) { return $Text }
  return $Text.Substring(0, $MaxLen)
}

function Get-JsonStringField([string]$Raw, [string]$FieldName) {
  if ([string]::IsNullOrWhiteSpace($Raw)) { return $null }
  $pat = '"' + $FieldName + '"\s*:\s*"([^"]*)"'
  $m = [regex]::Match($Raw, $pat)
  if ($m.Success) { return $m.Groups[1].Value }
  return $null
}

function Get-JsonIntField([string]$Raw, [string]$FieldName) {
  if ([string]::IsNullOrWhiteSpace($Raw)) { return 0 }
  $pat = '"' + $FieldName + '"\s*:\s*(-?\d+)'
  $m = [regex]::Match($Raw, $pat)
  if ($m.Success) { return [int]$m.Groups[1].Value }
  return 0
}

function Get-PartnerIdFromVisa([string]$Visa) {
  if ([string]::IsNullOrWhiteSpace($Visa)) { return 0 }
  $m = [regex]::Match($Visa, '^(\d+)')
  if ($m.Success) { return [int]$m.Groups[1].Value }
  return 0
}

function Invoke-CoveRpc {
  param(
    [string]$Method,
    [hashtable]$Params = @{},
    [switch]$UseVisa
  )
  $script:RpcId++
  $bodyObj = [ordered]@{
    jsonrpc = '2.0'
    method  = $Method
    params  = @{}
    id      = ('{0}' -f $script:RpcId)
  }
  foreach ($k in $Params.Keys) { $bodyObj.params[$k] = $Params[$k] }
  if ($UseVisa -and $script:Visa) {
    $bodyObj['visa'] = $script:Visa
  }
  $json = $bodyObj | ConvertTo-Json -Depth 12 -Compress
  $sw = [Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-WebRequest -Uri $ApiUrl -Method POST -Body ([System.Text.Encoding]::UTF8.GetBytes($json)) `
      -ContentType 'application/json; charset=utf-8' -UseBasicParsing -TimeoutSec 180
    $sw.Stop()
    $raw = ConvertTo-Text $resp.Content
    $v = Get-JsonStringField $raw 'visa'
    if (-not $v) { $v = Get-JsonStringField $raw 'Visa' }
    if ($v) { $script:Visa = $v }
    $obj = $null
    try { $obj = $raw | ConvertFrom-Json } catch {}
    if ($obj -and $obj.visa) { $script:Visa = [string]$obj.visa }
    $errMsg = $null
    if ($obj -and $obj.error) { $errMsg = [string]$obj.error.message }
    elseif ($raw -match '"error"\s*:') {
      $errMsg = Get-JsonStringField $raw 'message'
      if (-not $errMsg) { $errMsg = 'error present in payload' }
    }
    return [pscustomobject]@{
      Ok = ($null -eq $errMsg)
      Status = [int]$resp.StatusCode
      Ms = $sw.ElapsedMilliseconds
      Method = $Method
      Raw = $raw
      Json = $obj
      Error = $errMsg
      Bytes = $raw.Length
    }
  } catch {
    $sw.Stop()
    return [pscustomobject]@{
      Ok = $false; Status = $null; Ms = $sw.ElapsedMilliseconds
      Method = $Method; Raw = ''; Json = $null; Error = $_.Exception.Message; Bytes = 0
    }
  }
}

function Save-Sample($name, $result) {
  $path = Join-Path $runDir ($name + '.json')
  $text = if ($result.Raw) { [string]$result.Raw } else { (@{ error = $result.Error } | ConvertTo-Json) }
  Set-Content -LiteralPath $path -Value $text -Encoding UTF8
}

function Summarize-Payload([string]$Name, $result) {
  $raw = [string]$result.Raw
  $len = $raw.Length
  $snippet = Get-TextPrefix $raw 120
  $snippet = $snippet -replace '[\r\n]+',' '
  Write-Log (("  size={0} bytes preview={1}" -f $len, $snippet))
}

Write-Log '=== Cove explore (RPM Cyber Backup) ==='
Write-Log ("ApiUrl=" + $ApiUrl)
Write-Log ("User=" + $Username)

$loginParams = @{ username = $Username; password = $Password }
if ($Partner -and $Partner -notlike 'PASTE*') {
  $loginParams['partner'] = $Partner
  Write-Log ("Partner=" + $Partner)
}

$login = Invoke-CoveRpc -Method 'Login' -Params $loginParams
Save-Sample '01_Login' $login
if (-not $login.Ok) { throw ("Login failed: " + $login.Error) }

if (-not $script:Visa -and $login.Raw) {
  $script:Visa = Get-JsonStringField ([string]$login.Raw) 'visa'
  if (-not $script:Visa) { $script:Visa = Get-JsonStringField ([string]$login.Raw) 'Visa' }
}
if (-not $script:Visa) {
  Write-Log ('Login raw prefix: ' + (Get-TextPrefix ([string]$login.Raw) 300))
  throw 'Login returned no visa (see 01_Login.json)'
}
Write-Log ("Login OK visaLen=" + $script:Visa.Length)

$partnerId = 0
if ($login.Raw) { $partnerId = Get-JsonIntField ([string]$login.Raw) 'PartnerId' }
try {
  if ($partnerId -le 0 -and $login.Json.result.result.PartnerId) {
    $partnerId = [int]$login.Json.result.result.PartnerId
  }
} catch {}
if ($partnerId -le 0) {
  $partnerId = Get-PartnerIdFromVisa $script:Visa
  if ($partnerId -gt 0) { Write-Log ("PartnerId from visa prefix=" + $partnerId) }
}
if ($partnerId -le 0 -and $FallbackPartnerId -gt 0) {
  $partnerId = [int]$FallbackPartnerId
  Write-Log ("PartnerId fallback=" + $partnerId)
}
if ($partnerId -le 0) { throw 'Could not resolve PartnerId' }
Write-Log ("PartnerId=" + $partnerId)

Write-Log 'EnumerateAccountStatistics ...'
$stat = Invoke-CoveRpc -Method 'EnumerateAccountStatistics' -UseVisa -Params @{
  query = @{
    PartnerId = [int]$partnerId
    RecordsCount = 1000
    StartRecordNumber = 0
    Columns = @('AU','AR','AN','MN','CD','TS','TL','US','TB','I80','I81','F19','F00','RV0','RVJ','RVO','RVL','RVK','RV7')
    Filter = ''
  }
}
Save-Sample '02_AccountStatistics' $stat
if (-not $stat.Ok) { throw ("EnumerateAccountStatistics failed: " + $stat.Error) }
Summarize-Payload 'AccountStatistics' $stat

$rows = @()
try {
  if ($stat.Json.result.result) { $rows = @($stat.Json.result.result) }
  elseif ($stat.Json.result) { $rows = @($stat.Json.result) }
} catch {}
Write-Log ("Devices=" + $rows.Count)

$byAr = @{}
foreach ($row in $rows) {
  $ar = ''
  foreach ($s in @($row.Settings)) {
    if ($s.AR) { $ar = [string]$s.AR }
  }
  if (-not $byAr.ContainsKey($ar)) { $byAr[$ar] = New-Object System.Collections.Generic.List[object] }
  $mn = ''; $an = ''; $au = $row.AccountId; $us = $null; $ts = $null
  foreach ($s in @($row.Settings)) {
    if ($s.MN) { $mn = [string]$s.MN }
    if ($s.AN) { $an = [string]$s.AN }
    if ($s.AU) { $au = $s.AU }
    if ($s.US) { $us = $s.US }
    if ($s.TS) { $ts = $s.TS }
  }
  [void]$byAr[$ar].Add([pscustomobject]@{ AccountId = $au; Machine = $mn; Account = $an; UsedBytes = $us; LastSuccessEpoch = $ts; PartnerId = $row.PartnerId })
}

$summaryLines = New-Object System.Collections.Generic.List[string]
[void]$summaryLines.Add('PartnerAR,DeviceCount,SampleMachines')
Write-Log '--- Partners (map these to CustomerCode) ---'
foreach ($k in ($byAr.Keys | Sort-Object)) {
  $devs = $byAr[$k]
  $samples = ($devs | Select-Object -First 5 | ForEach-Object { $_.Machine }) -join ';'
  Write-Log (("  n={0} AR={1} sample={2}" -f $devs.Count, $k, $samples))
  [void]$summaryLines.Add(('"{0}",{1},"{2}"' -f ($k -replace '"','""'), $devs.Count, $samples))
}

$summaryLines | Set-Content (Join-Path $runDir 'partner_summary.csv') -Encoding UTF8
($rows | Select-Object -First $MaxDevicesSample | ConvertTo-Json -Depth 8) |
  Set-Content (Join-Path $runDir 'devices_sample.json') -Encoding UTF8

function Try-Method([string]$Name, [hashtable]$Params) {
  Write-Log ("Probe " + $Name + " ...")
  $r = Invoke-CoveRpc -Method $Name -UseVisa -Params $Params
  Save-Sample ('probe_' + $Name) $r
  if ($r.Ok) {
    Write-Log ("  OK " + $Name + " ms=" + $r.Ms)
    Summarize-Payload $Name $r
  } else {
    Write-Log ("  SKIP " + $Name + " err=" + $r.Error)
  }
  return $r
}

[void](Try-Method 'EnumeratePartners' @{ parentPartnerId = [int]$partnerId })
[void](Try-Method 'GetPartnerInfo' @{ partnerId = [int]$partnerId })
[void](Try-Method 'GetPartnerInfo' @{ PartnerId = [int]$partnerId })

[void](Try-Method 'EnumerateAccountStatistics' @{
  query = @{
    PartnerId = [int]$partnerId
    RecordsCount = 5
    StartRecordNumber = 0
    Columns = @('AU','AR','AN','MN','CD','TS','TL','US','TB','I80','I81','F19','F00','RV0','RVJ','RVO','RVL','RVK','RV7','T0','T1','T2','T3')
    Filter = ''
  }
})

foreach ($m in @(
  'EnumerateSessions',
  'GetSessionHistory',
  'EnumerateRestoreSessions',
  'GetAccountInfo',
  'EnumerateStorageNodes',
  'GetPartnerStorageUsage'
)) {
  [void](Try-Method $m @{ PartnerId = [int]$partnerId })
}

Write-Log ("Out=" + $runDir)
Write-Log '=== Done ==='
Write-Host 'Review partner_summary.csv and probe_*.json sizes.' -ForegroundColor Cyan
