# Probe-Pulseway-Orgs.ps1 - list EVERY Pulseway org from the live API (paged)
param()
$ErrorActionPreference = 'Stop'
$here = 'C:\RPM-Assure\Sql\rmm\pulseway'
if (-not (Test-Path (Join-Path $here 'Pulseway.Config.ps1'))) {
  $here = Split-Path -Parent $MyInvocation.MyCommand.Path
}
. (Join-Path $here 'Pulseway.Config.ps1')
if ([string]::IsNullOrWhiteSpace($BaseUrl)) { $BaseUrl = 'https://rpmresourcesza.pulseway.com/api/v3' }
$BaseUrl = $BaseUrl.TrimEnd('/')
$pair = '{0}:{1}' -f $TokenId, $TokenSecret
$hdr = @{ Authorization = ('Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))); Accept = 'application/json' }

function Get-Pw($path) {
  $url = if ($path.StartsWith('http')) { $path } else { "$BaseUrl/$($path.TrimStart('/'))" }
  try {
    $r = Invoke-WebRequest -Uri $url -Headers $hdr -UseBasicParsing -TimeoutSec 120
    return ($r.Content | ConvertFrom-Json)
  } catch {
    Write-Host ("FAIL $path " + $_.Exception.Message) -ForegroundColor Yellow
    return $null
  }
}
function Arr($j) {
  if ($null -eq $j) { return @() }
  if ($j -is [Array]) { return @($j) }
  foreach ($n in @('Data','data','Items','items','Organizations','organizations','Devices','devices')) {
    if ($j.PSObject.Properties.Name -contains $n -and $null -ne $j.$n) { return @($j.$n) }
  }
  return @($j)
}

Write-Host "API $BaseUrl" -ForegroundColor Cyan
$seen = @{}
$names = New-Object System.Collections.Generic.List[string]
for ($p = 1; $p -le 30; $p++) {
  $j = $null
  foreach ($u in @("organizations?page=$p", $(if ($p -eq 1) { 'organizations' } else { $null }))) {
    if (-not $u) { continue }
    $j = Get-Pw $u
    if ($j) { break }
  }
  $rows = @(Arr $j)
  if ($rows.Count -lt 1) { Write-Host "page $p empty"; break }
  $new = 0
  foreach ($o in $rows) {
    $n = $null
    foreach ($k in @('Name','OrganizationName','name')) {
      if ($o.PSObject.Properties.Name -contains $k -and $o.$k) { $n = [string]$o.$k; break }
    }
    if (-not $n) { continue }
    if ($seen.ContainsKey($n)) { continue }
    $seen[$n] = 1
    [void]$names.Add($n)
    $new++
  }
  Write-Host ("page $p rows=$($rows.Count) new=$new total=$($names.Count)")
  if ($new -eq 0) { break }
}

Write-Host ''
Write-Host '--- ALL Pulseway organizations ---' -ForegroundColor Green
$names | Sort-Object | ForEach-Object { Write-Host $_ }
Write-Host ''
$hit = @($names | Where-Object { $_ -match 'fruit|sirf|sir ' })
if ($hit.Count -gt 0) {
  Write-Host ('MATCH: ' + ($hit -join ', ')) -ForegroundColor Green
} else {
  Write-Host 'NO NAME MATCH for Fruit / SIRF in the live API.' -ForegroundColor Yellow
  Write-Host 'If they exist in Pulseway under another spelling, pick it from the list above.'
}
Write-Host ("TOTAL ORGS=" + $names.Count)
