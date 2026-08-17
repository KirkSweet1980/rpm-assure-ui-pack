# Dump Recovery Testing fields for one device (AHIC-SSQL-SRV by default).
# Run on the app server. Paste the log tail (no password).
param([string]$Match = 'AHIC-SSQL-SRV')
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$cfg = $null
foreach ($c in @(
    (Join-Path $here 'Cove.Config.ps1'),
    'C:\RPM-Assure\Sql\cove\Cove.Config.ps1'
  )) { if (Test-Path $c) { $cfg = $c; break } }
if (-not $cfg) { throw 'Cove.Config.ps1 missing' }
. $cfg
if (-not $ApiUrl) { $ApiUrl = 'https://api.backup.management/jsonapi' }
if ([string]::IsNullOrWhiteSpace($Username) -or $Username -like 'PASTE*') { throw 'Set $Username in Cove.Config.ps1' }

function ConvertTo-Text($content) {
  if ($null -eq $content) { return '' }
  if ($content -is [byte[]]) { return [System.Text.Encoding]::UTF8.GetString($content) }
  if ($content -is [System.Array] -and $content.Length -gt 0 -and $content[0] -is [byte]) {
    return [System.Text.Encoding]::UTF8.GetString([byte[]]$content)
  }
  return [string]$content
}
function Raw($body) {
  $j = $body | ConvertTo-Json -Depth 12 -Compress
  $r = Invoke-WebRequest -Uri $ApiUrl -Method POST -Body ([Text.Encoding]::UTF8.GetBytes($j)) `
    -ContentType 'application/json; charset=utf-8' -UseBasicParsing -TimeoutSec 180
  return (ConvertTo-Text $r.Content)
}
function Visa-From([string]$raw) {
  $m = [regex]::Match($raw, '"visa"\s*:\s*"([^"]+)"')
  if ($m.Success) { return $m.Groups[1].Value }
  try {
    $j = $raw | ConvertFrom-Json
    if ($j.visa) { return [string]$j.visa }
    if ($j.Visa) { return [string]$j.Visa }
    if ($j.result.visa) { return [string]$j.result.visa }
    if ($j.result.result.visa) { return [string]$j.result.result.visa }
  } catch {}
  return ''
}

$loginBody = [ordered]@{
  jsonrpc = '2.0'
  method  = 'Login'
  params  = @{ username = $Username; password = $Password }
  id = '1'
}
if ($Partner -and $Partner -notlike 'PASTE*') { $loginBody.params['partner'] = $Partner }
$login = Raw $loginBody
$visa = Visa-From $login
if (-not $visa) {
  $prefix = $login
  if ($prefix.Length -gt 220) { $prefix = $prefix.Substring(0, 220) }
  throw ('login no visa prefix=' + $prefix)
}
$pid0 = 0
$pm = [regex]::Match($login, '"PartnerId"\s*:\s*(\d+)')
if ($pm.Success) { [void][int]::TryParse($pm.Groups[1].Value, [ref]$pid0) }
if ($pid0 -le 0 -and $visa) {
  $head = ($visa.Split('-')[0])
  [void][int]::TryParse($head, [ref]$pid0)
}
if ($pid0 -le 0) { $pid0 = 2601580 }
Write-Host "login ok partner=$pid0 visaLen=$($visa.Length)"

$stat = Raw @{
  jsonrpc='2.0'; visa=$visa; method='EnumerateAccountStatistics'; id='s'
  params=@{ query=@{
    PartnerId=$pid0; RecordsCount=1000; StartRecordNumber=0; Filter=''
    Columns=@('AU','AR','AN','MN','I80','I81','F19','F00','F18','RV0','RVJ','RVQ','RVO','RVL','RVK','RV7')
  }}
}
$obj = $stat | ConvertFrom-Json
$rows = @()
if ($obj.result.result) { $rows = @($obj.result.result) }
elseif ($obj.result) { $rows = @($obj.result) }
Write-Host "devices=$($rows.Count)"

function GS($row, $k) {
  foreach ($s in @($row.Settings)) {
    $p = $s.PSObject.Properties[$k]
    if ($p -and $null -ne $p.Value -and "$($p.Value)" -ne '') { return [string]$p.Value }
  }
  $p = $row.PSObject.Properties[$k]
  if ($p -and "$($p.Value)") { return [string]$p.Value }
  return ''
}

$hit = @($rows | Where-Object { ((GS $_ 'MN') + ' ' + (GS $_ 'AN')) -match [regex]::Escape($Match) } | Select-Object -First 3)
if ($hit.Count -eq 0) { $hit = @($rows | Where-Object { (GS $_ 'I80') -in @('1','2') } | Select-Object -First 3) }
Write-Host ("matched=" + $hit.Count)
foreach ($r in $hit) {
  Write-Host "----"
  Write-Host ("AN={0} MN={1} AU={2} I80={3} I81={4}" -f (GS $r 'AN'),(GS $r 'MN'),(GS $r 'AU'),(GS $r 'I80'),(GS $r 'I81'))
  Write-Host ("F19={0} F18={1} F00={2}" -f (GS $r 'F19'),(GS $r 'F18'),(GS $r 'F00'))
  Write-Host ("RV0={0} RVJ={1} RVQ={2} RVO={3} RVL={4} RVK={5}" -f (GS $r 'RV0'),(GS $r 'RVJ'),(GS $r 'RVQ'),(GS $r 'RVO'),(GS $r 'RVL'),(GS $r 'RVK'))
  $keys = @()
  foreach ($s in @($r.Settings)) { $keys += @($s.PSObject.Properties.Name) }
  Write-Host ("settingKeys=" + (($keys | Select-Object -Unique) -join ','))
  $au = GS $r 'AU'
  if (-not $au) { $au = [string]$r.AccountId }
  if (-not $au) { continue }
  foreach ($m in @('GetAccountInfo','EnumerateSessions')) {
    $raw2 = Raw @{ jsonrpc='2.0'; visa=$visa; method=$m; id='p'; params=@{ accountId=[long]$au; recordsCount=20 } }
    $ok = $raw2 -notmatch '"error"'
    $pre = $raw2
    if ($pre.Length -gt 280) { $pre = $pre.Substring(0, 280) }
    Write-Host ("probe {0} ok={1} len={2} prefix={3}" -f $m, $ok, $raw2.Length, $pre)
  }
}
Write-Host "done"
