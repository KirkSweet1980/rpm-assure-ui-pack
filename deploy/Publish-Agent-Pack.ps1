# DEPRECATED as a standalone release command.
# Pack builder used ONLY by Publish-AgentRelease.ps1 (-PromoteVersion).
# Without -PromoteVersion this script MUST NOT rewrite zip or VERSION.
# Auto-publish (VERSION mismatch -> publish) is retired.

param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack',
  [switch]$PromoteVersion,
  [string]$PinVersion = ''
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

if (-not $PromoteVersion) {
  Write-Host 'Publish-Agent-Pack: no -PromoteVersion — refusing to rewrite zip or VERSION.'
  Write-Host 'Use Publish-AgentRelease.ps1 to promote the fleet pointer, or Sanitise-Downloads-DeployScript.ps1 to replace Deploy-Assure-Agent.ps1 only.'
  exit 0
}
if ($PinVersion) { $ver = ($PinVersion -replace '\s', '') }

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

$loose = @(
  'Deploy-Assure-Agent.ps1',
  'Update-From-Https.ps1',
  'Apply-Staged-Pack.ps1',
  'Uninstall-Assure-Agent.ps1',
  'Start-Agent-Tray.ps1',
  'Install-Agent-Tray.ps1',
  'Install-Agent-Service.ps1'
)
foreach ($leaf in $loose) {
  foreach ($rel in @("Sql\agent\$leaf", "sql\agent\$leaf")) {
    $src = Join-Path $Pack $rel
    if (Test-Path $src) { [void](Copy-ShareRead $src (Join-Path $dl $leaf)); break }
  }
}

$stage = Join-Path $env:TEMP ('rpma-pack-clean-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $stage | Out-Null
$excludeDir = [regex]'\\installer\\|\\logs\\|\\\.git\\'
$excludeName = [regex]'(?i)(Launch-From-Git|Launch-ABLE|Launch-Fresh-Wizard|Repair-Pack-And-Launch|Bootstrap-Customer-Agent|Replace-Old-Agent|Onboard-IB-Syspro|Deploy-Customer-Sql-Agent|Deploy-IB-Agent)\.ps1$'

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

Add-Type -AssemblyName System.IO.Compression.FileSystem
$check = [IO.Compression.ZipFile]::OpenRead($zip)
$names = @($check.Entries | ForEach-Object { $_.FullName.Replace('\', '/').ToLowerInvariant() })
$check.Dispose()
function Test-ZipHas([string]$leaf) {
  return [bool]($names | Where-Object { $_ -like ('*/' + $leaf) -or $_ -eq $leaf })
}
if ($PinVersion) { $ver = ($PinVersion -replace '\s', '') }

if (-not (Test-ZipHas 'collect-host-patches.ps1')) { throw 'zip missing Collect-Host-Patches.ps1 - not publishing a broken pack' }
if (-not (Test-ZipHas 'rpmassure-agent.ps1')) { throw 'zip missing RpmAssure-Agent.ps1 - not publishing a broken pack' }
if (-not (Test-ZipHas 'update-from-https.ps1')) { throw 'zip missing Update-From-Https.ps1 - not publishing a broken pack' }
if (-not (Test-ZipHas 'start-agent-tray.ps1')) { throw 'zip missing Start-Agent-Tray.ps1 - not publishing a broken pack' }

$verFile = Join-Path $dl 'VERSION'
$existingVer = if (Test-Path $verFile) { ((Get-Content $verFile -Raw) -replace '\s', '') } else { '' }
if ($PromoteVersion) {
  [IO.File]::WriteAllText($verFile, $ver)
  Write-Host ('PROMOTED downloads VERSION=' + $ver)
} elseif ($existingVer) {
  Write-Host ('KEPT downloads VERSION=' + $existingVer + ' (pass -PromoteVersion to set ' + $ver + ')')
} else {
  throw 'downloads\VERSION missing. Refusing to invent a fleet pointer. Restore 2.9.11 or pass -PromoteVersion.'
}

foreach ($extra in @(
    (Join-Path $Pack 'public\downloads\Pulseway-Collect-DiskIops.ps1'),
    (Join-Path $Pack 'public\downloads\Deploy-Assure-Agent.ps1'),
    (Join-Path $Pack 'public\downloads\Collect-Host-Patches.ps1'),
    (Join-Path $Pack 'Sql\agent\Collect-Host-Patches.ps1'),
    (Join-Path $Pack 'sql\agent\Collect-Host-Patches.ps1')
  )) {
  if (Test-Path $extra) { [void](Copy-ShareRead $extra (Join-Path $dl (Split-Path $extra -Leaf))) }
}
$caddy = Join-Path $PSScriptRoot 'Ensure-Caddy-Downloads.ps1'
if (Test-Path $caddy) {
  try { & $caddy } catch { Write-Host ('WARN caddy downloads ' + $_.Exception.Message) }
}
Write-Host ('PUBLISHED v' + $ver + ' zip=' + $len + ' skipped=' + $skipped)
Get-ChildItem $dl | Select-Object Name, Length | Format-Table -AutoSize
