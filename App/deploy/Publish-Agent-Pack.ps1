# Publish agent files to C:\RPM-Assure\downloads.
# Zip is a clean runtime pack only - no installer Git launchers (EPP flags those).
# Locked files (EPP / AV) are skipped so the pack still publishes.

param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack'
)

$ErrorActionPreference = 'Stop'
$dl = Join-Path $Root 'downloads'
New-Item -ItemType Directory -Force -Path $dl | Out-Null

$ver = '2.8.4'
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

function Copy-ShareRead([string]$From, [string]$To) {
  $in = $null; $out = $null
  try {
    $in = [IO.File]::Open($From, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    New-Item -ItemType Directory -Force -Path (Split-Path $To) | Out-Null
    $out = [IO.File]::Create($To)
    $in.CopyTo($out)
    return $true
  } catch {
    Write-Host ('SKIP locked ' + $From)
    return $false
  } finally {
    if ($out) { $out.Dispose() }
    if ($in) { $in.Dispose() }
  }
}

foreach ($pair in @(
    @('Sql\agent\Deploy-Assure-Agent.ps1', 'Deploy-Assure-Agent.ps1'),
    @('sql\agent\Deploy-Assure-Agent.ps1', 'Deploy-Assure-Agent.ps1'),
    @('Sql\agent\Update-From-Https.ps1', 'Update-From-Https.ps1'),
    @('sql\agent\Update-From-Https.ps1', 'Update-From-Https.ps1'),
    @('Sql\agent\Apply-Staged-Pack.ps1', 'Apply-Staged-Pack.ps1'),
    @('sql\agent\Apply-Staged-Pack.ps1', 'Apply-Staged-Pack.ps1'),
    @('sql\customers\IB\Onboard-IB-Syspro.ps1', 'Onboard-IB-Syspro.ps1'),
    @('Sql\agent\Uninstall-Assure-Agent.ps1', 'Uninstall-Assure-Agent.ps1'),
    @('sql\agent\Uninstall-Assure-Agent.ps1', 'Uninstall-Assure-Agent.ps1'),
    @('sql\agent\customers\Uninstall-IB-Agent.ps1', 'Uninstall-IB-Agent.ps1')
  )) {
  $src = Join-Path $Pack $pair[0]
  if (Test-Path $src) { [void](Copy-ShareRead $src (Join-Path $dl $pair[1])) }
}

$stage = Join-Path $env:TEMP ('rpma-pack-clean-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $stage | Out-Null
$excludeDir = [regex]'\\installer\\|\\logs\\|\\\.git\\'
$excludeName = [regex]'(?i)(Launch-From-Git|Launch-ABLE|Launch-Fresh-Wizard|Repair-Pack-And-Launch|Bootstrap-Customer-Agent|Replace-Old-Agent|Onboard-IB-Syspro)\.ps1$'

function Copy-Clean([string]$Rel) {
  $from = Join-Path $Pack $Rel
  if (-not (Test-Path $from)) { return $false }
  Get-ChildItem -LiteralPath $from -Recurse -File | ForEach-Object {
    if ($_.FullName -match $excludeDir) { return }
    if ($_.Name -match $excludeName) { return }
    $relFile = $_.FullName.Substring($from.Length).TrimStart('\')
    $dest = Join-Path (Join-Path $stage $Rel) $relFile
    [void](Copy-ShareRead $_.FullName $dest)
  }
  return $true
}

$any = $false
foreach ($rel in @('Sql\agent', 'sql\agent', 'Sql\base\syspro-direct', 'sql\base\syspro-direct', 'Sql\customers', 'sql\customers')) {
  if (Copy-Clean $rel) { $any = $true }
}
if (-not $any) { throw "No agent files under $Pack" }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = Join-Path $dl 'rpm-assure-agent.zip'
$zipTmp = Join-Path $env:TEMP ('rpma-agent-' + [guid]::NewGuid().ToString('N').Substring(0, 8) + '.zip')
if (Test-Path $zipTmp) { Remove-Item $zipTmp -Force }
$skipped = 0
$zf = [IO.Compression.ZipFile]::Open($zipTmp, [IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem -LiteralPath $stage -Recurse -File | ForEach-Object {
    $entry = $_.FullName.Substring($stage.Length).TrimStart('\').Replace('\', '/')
    try {
      $bytes = [IO.File]::ReadAllBytes($_.FullName)
      $e = $zf.CreateEntry($entry, [IO.Compression.CompressionLevel]::Optimal)
      $es = $e.Open()
      try { $es.Write($bytes, 0, $bytes.Length) } finally { $es.Dispose() }
    } catch {
      $script:skipped++
      Write-Host ('SKIP zip ' + $entry)
    }
  }
} finally {
  $zf.Dispose()
}
if (Test-Path $zip) { Remove-Item $zip -Force -ErrorAction SilentlyContinue }
Move-Item -Force $zipTmp $zip
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue

$len = (Get-Item $zip).Length
if ($len -lt 1000) { throw "zip too small: $len" }
foreach ($extra in @(
    (Join-Path $Pack 'public\downloads\Pulseway-Collect-DiskIops.ps1'),
    (Join-Path $Pack 'public\downloads\Deploy-Assure-Agent.ps1')
  )) {
  if (Test-Path $extra) { [void](Copy-ShareRead $extra (Join-Path $dl (Split-Path $extra -Leaf))) }
}
$caddy = Join-Path $PSScriptRoot 'Ensure-Caddy-Downloads.ps1'
if (Test-Path $caddy) {
  try { & $caddy } catch { Write-Host ('WARN caddy downloads ' + $_.Exception.Message) }
}
Write-Host ('PUBLISHED v' + $ver + ' zip=' + $len + ' skipped=' + $skipped)
Get-ChildItem $dl | Select-Object Name, Length | Format-Table -AutoSize
