# Publish agent files to C:\RPM-Assure\downloads.
# Zip is a clean runtime pack only - no installer\ Git launchers (EPP flags those).

param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack'
)

$ErrorActionPreference = 'Stop'
$dl = Join-Path $Root 'downloads'
New-Item -ItemType Directory -Force -Path $dl | Out-Null

$ver = '2.8.3'
foreach ($vf in @(
    (Join-Path $Pack 'Sql\agent\VERSION'),
    (Join-Path $Pack 'sql\agent\VERSION')
  )) {
  if (Test-Path $vf) {
    $ver = ((Get-Content $vf -Raw) -replace '\s', '')
    if ($ver) { break }
  }
}
[IO.File]::WriteAllText((Join-Path $dl 'VERSION'), $ver)

foreach ($pair in @(
    @('Sql\agent\Deploy-Assure-Agent.ps1', 'Deploy-Assure-Agent.ps1'),
    @('sql\agent\Deploy-Assure-Agent.ps1', 'Deploy-Assure-Agent.ps1'),
    @('Sql\customers\IB\Onboard-IB-Syspro.ps1', 'Onboard-IB-Syspro.ps1'),
    @('sql\customers\IB\Onboard-IB-Syspro.ps1', 'Onboard-IB-Syspro.ps1')
  )) {
  $src = Join-Path $Pack $pair[0]
  if (Test-Path $src) { Copy-Item -Force -LiteralPath $src (Join-Path $dl $pair[1]) }
}

$stage = Join-Path $env:TEMP ('rpma-pack-clean-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $stage | Out-Null
$excludeDir = [regex]'\\installer\\|\\logs\\|\\\.git\\'
$excludeName = [regex]'(?i)(Launch-From-Git|Launch-ABLE|Launch-Fresh-Wizard|Repair-Pack-And-Launch|Bootstrap-Customer-Agent|Replace-Old-Agent)\.ps1$'

function Copy-Clean([string]$Rel) {
  $from = Join-Path $Pack $Rel
  if (-not (Test-Path $from)) { return $false }
  Get-ChildItem -LiteralPath $from -Recurse -File | ForEach-Object {
    if ($_.FullName -match $excludeDir) { return }
    if ($_.Name -match $excludeName) { return }
    $relFile = $_.FullName.Substring($from.Length).TrimStart('\')
    $dest = Join-Path (Join-Path $stage $Rel) $relFile
    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
    try { [IO.File]::Copy($_.FullName, $dest, $true) } catch {
      Write-Host ("SKIP locked " + $relFile)
    }
  }
  return $true
}

$any = $false
foreach ($rel in @('Sql\agent', 'sql\agent', 'Sql\base\syspro-direct', 'sql\base\syspro-direct', 'Sql\customers', 'sql\customers')) {
  if (Copy-Clean $rel) { $any = $true }
}
if (-not $any) { throw "No agent files under $Pack" }

$zip = Join-Path $dl 'rpm-assure-agent.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
$tar = Join-Path $env:WINDIR 'System32\tar.exe'
if (-not (Test-Path $tar)) { $tar = 'tar' }
$here = Get-Location
Set-Location $stage
try {
  & $tar -a -c -f $zip *
  if ($LASTEXITCODE -ne 0) { throw "tar zip failed $LASTEXITCODE" }
} finally {
  Set-Location $here
  Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
}

$len = (Get-Item $zip).Length
foreach ($extra in @(
    (Join-Path $Pack 'public\downloads\Pulseway-Collect-DiskIops.ps1'),
    (Join-Path $Pack 'public\downloads\Deploy-Assure-Agent.ps1')
  )) {
  if (Test-Path $extra) { Copy-Item -Force $extra (Join-Path $dl (Split-Path $extra -Leaf)) }
}
$caddy = Join-Path $PSScriptRoot 'Ensure-Caddy-Downloads.ps1'
if (Test-Path $caddy) {
  try { & $caddy } catch { Write-Host ('WARN caddy downloads ' + $_.Exception.Message) }
}
Write-Host ('PUBLISHED v' + $ver + ' zip=' + $len + ' (HTTPS pack, no Git)')
Get-ChildItem $dl | Select-Object Name, Length | Format-Table -AutoSize
