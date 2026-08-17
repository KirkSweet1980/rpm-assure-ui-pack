# Run on the Assure app server only. Writes C:\RPM-Assure\downloads\*
# Windows paths are case-insensitive — copy each physical folder once.

param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack'
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'downloads') | Out-Null
$dl = Join-Path $Root 'downloads'

$ver = '2.8.0'
foreach ($vf in @((Join-Path $Pack 'Sql\agent\VERSION'), (Join-Path $Pack 'sql\agent\VERSION'))) {
  if (Test-Path $vf) { $ver = (Get-Content $vf -Raw).Trim(); break }
}
Set-Content -LiteralPath (Join-Path $dl 'VERSION') -Value $ver -Encoding ASCII

foreach ($name in @('Deploy-Assure-Agent.ps1', 'Onboard-IB-Syspro.ps1')) {
  $src = @(
    (Join-Path $Pack ('Sql\agent\' + $name)),
    (Join-Path $Pack ('sql\agent\' + $name)),
    (Join-Path $Pack ('Sql\customers\IB\' + $name)),
    (Join-Path $Pack ('sql\customers\IB\' + $name))
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($src) { Copy-Item -Force -LiteralPath $src (Join-Path $dl $name) }
}

$seen = @{}
$stage = Join-Path $env:TEMP ('rpma-pack-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $stage | Out-Null
Set-Content -LiteralPath (Join-Path $stage 'VERSION') -Value $ver -Encoding ASCII

foreach ($rel in @('Sql\agent', 'Sql\base\syspro-direct', 'Sql\customers')) {
  $from = Join-Path $Pack $rel
  if (-not (Test-Path $from)) { $from = Join-Path $Pack ($rel.ToLower()) }
  if (-not (Test-Path $from)) { continue }
  $key = (Resolve-Path $from).Path.ToLowerInvariant()
  if ($seen.ContainsKey($key)) { continue }
  $seen[$key] = $true
  $to = Join-Path $stage $rel
  New-Item -ItemType Directory -Force -Path $to | Out-Null
  robocopy $from $to /E /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns /np /XF *.log Agent.Secrets.bin status.json | Out-Null
}

$zip = Join-Path $dl 'rpm-assure-agent.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue

$len = (Get-Item $zip).Length
Write-Host ('PUBLISHED v' + $ver + ' zip=' + $len + ' bytes -> ' + $dl)
Get-ChildItem $dl | Select-Object Name, Length | Format-Table -AutoSize
if ($len -lt 20000) { Write-Host 'WARN zip still small' }
