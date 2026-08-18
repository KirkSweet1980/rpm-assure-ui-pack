# Dump why Continuity Recovery Testing (last session / boot / duration)
# is on the Cove console but not in EnumerateAccountStatistics.
# Run on RPMWINRM. Paste the log (no password).
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
    if ($j.result.visa) { return [string]$j.result.visa }
  } catch {}
  return ''
}

$loginBody = [ordered]@{
  jsonrpc = '2.0'; method = 'Login'; id = '1'
  params = @{ username = $Username; password = $Password }
}
if ($Partner -and $Partner -notlike 'PASTE*') { $loginBody.params['partner'] = $Partner }
$login = Raw $loginBody
$visa = Visa-From $login
if (-not $visa) { throw 'login no visa' }
$pid0 = 2601580
$pm = [regex]::Match($login, '"PartnerId"\s*:\s*(\d+)')
if ($pm.Success) { [void][int]::TryParse($pm.Groups[1].Value, [ref]$pid0) }
Write-Host "login ok partner=$pid0"

# Official codes + guessed Continuity / VDR extras
$cols = @(
  'AU','AR','AN','MN','I80','I81','I82',
  'F00','F09','F12','F15','F17','F18','F19',
  'RV0','RVJ','RVQ','RVO','RVL','RVK','RV7','RVA',
  'T00','T01','T02','T03','T04','T05','T06','T07','T08','T09','T10',
  'I83','I84','I85','I86','I87','I88','I89',
  'RT0','RT1','RT2','RT3','RT4','RT5','C00','C01','C02'
)
$stat = Raw @{
  jsonrpc='2.0'; visa=$visa; method='EnumerateAccountStatistics'; id='s'
  params=@{ query=@{
    PartnerId=$pid0; RecordsCount=1000; StartRecordNumber=0; Filter=''
    Columns=$cols
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

$hit = @($rows | Where-Object { ((GS $_ 'MN') + ' ' + (GS $_ 'AN')) -match [regex]::Escape($Match) } | Select-Object -First 2)
if ($hit.Count -eq 0) { $hit = @($rows | Where-Object { (GS $_ 'I80') -in @('1','2') } | Select-Object -First 2) }
Write-Host ("matched=" + $hit.Count)
foreach ($r in $hit) {
  Write-Host "==== STATS ===="
  Write-Host ("AN={0} MN={1} AU={2} I80={3} I81={4}" -f (GS $r 'AN'),(GS $r 'MN'),(GS $r 'AU'),(GS $r 'I80'),(GS $r 'I81'))
  $pairs = @()
  foreach ($s in @($r.Settings)) {
    foreach ($p in $s.PSObject.Properties) {
      if ($p.Name -in @('Count','Length') ) { continue }
      $v = [string]$p.Value
      if ($v) { $pairs += ($p.Name + '=' + $v) }
    }
  }
  Write-Host ("nonEmpty=" + ($pairs -join ' | '))
  $au = GS $r 'AU'
  if (-not $au) { continue }
  $methods = @(
    'EnumerateSessions','EnumerateRestoreSessions','GetAccountInfo',
    'GetRecoveryTestingInfo','EnumerateRecoverySessions','EnumerateRecoveryTesting',
    'GetRecoveryTestingOverview','EnumerateContinuityDevices','GetContinuityInfo',
    'EnumerateRecoveryTestingDevices','GetDeviceRecoveryTesting'
  )
  foreach ($m in $methods) {
    $raw2 = Raw @{ jsonrpc='2.0'; visa=$visa; method=$m; id='p'; params=@{ accountId=[long]$au; recordsCount=20 } }
    $err = ''
    $em = [regex]::Match($raw2, '"message"\s*:\s*"([^"]+)"')
    if ($em.Success) { $err = $em.Groups[1].Value }
    $ok = $raw2 -notmatch '"error"'
    $pre = $raw2
    if ($pre.Length -gt 220) { $pre = $pre.Substring(0, 220) }
    Write-Host ("METHOD {0} ok={1} err={2} prefix={3}" -f $m, $ok, $err, $pre)
  }
}
Write-Host "done"
