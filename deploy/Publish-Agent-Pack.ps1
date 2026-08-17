# Publish agent files to C:\RPM-Assure\downloads. No Temp copy of .ps1 (Defender locks those).

param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack'
)

$ErrorActionPreference = 'Stop'
$dl = Join-Path $Root 'downloads'
New-Item -ItemType Directory -Force -Path $dl | Out-Null

$ver = '2.8.0'
$vf = Join-Path $Pack 'Sql\agent\VERSION'
if (-not (Test-Path $vf)) { $vf = Join-Path $Pack 'sql\agent\VERSION' }
if (Test-Path $vf) { $ver = ((Get-Content $vf -Raw) -replace '\s', '') }
if (-not $ver) { $ver = '2.8.0' }
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

$zip = Join-Path $dl 'rpm-assure-agent.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }

$tar = Join-Path $env:WINDIR 'System32\tar.exe'
if (-not (Test-Path $tar)) { $tar = 'tar' }
$here = Get-Location
Set-Location $Pack
try {
  $parts = @()
  foreach ($rel in @('Sql\agent', 'Sql\base\syspro-direct', 'Sql\customers')) {
    if (Test-Path (Join-Path $Pack $rel)) { $parts += $rel }
  }
  if ($parts.Count -eq 0) { throw "No Sql\\agent under $Pack" }
  & $tar -a -c -f $zip @parts
  if ($LASTEXITCODE -ne 0) { throw "tar zip failed $LASTEXITCODE" }
} finally {
  Set-Location $here
}

$len = (Get-Item $zip).Length
Write-Host ('PUBLISHED v' + $ver + ' zip=' + $len)
Get-ChildItem $dl | Select-Object Name, Length | Format-Table -AutoSize
