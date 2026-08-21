# THE ONLY approved global Agent promotion path.
# Explicit operator invocation only.
# Never called by Sync-UiPack-From-Git.ps1 or default Apply-UiPack.ps1.
# This is the only script that may intentionally change C:\RPM-Assure\downloads\VERSION.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Publish-AgentRelease.ps1 `
#     -CandidateVersion 2.10.1
param(
  [Parameter(Mandatory = $true)]
  [string]$CandidateVersion,
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack',
  [string]$PublicUrl = 'https://assure.rpmresources.co.za/downloads/VERSION',
  [switch]$SkipPublicVerify,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
if ($SkipPublicVerify -and $env:RPM_ASSURE_RELEASE_MODE -ne 'TEST') {
  throw 'SkipPublicVerify is TEST-only (RPM_ASSURE_RELEASE_MODE=TEST). A production Agent release MUST verify public HTTPS /downloads/VERSION.'
}
$cand = ($CandidateVersion -replace '\s', '')
if (-not $cand) { throw 'CandidateVersion is required.' }

$dl = Join-Path $Root 'downloads'
$verFile = Join-Path $dl 'VERSION'
function Read-Ver { if (Test-Path $verFile) { ((Get-Content $verFile -Raw) -replace '\s', '') } else { '?' } }
$verBefore = Read-Ver
Write-Host '=== Publish-AgentRelease (ONLY path that may change downloads/VERSION) ==='
Write-Host ("VERSION_BEFORE=" + $verBefore)
Write-Host ("CANDIDATE=" + $cand)

$from = Join-Path $Pack 'sql\agent'
if (-not (Test-Path (Join-Path $from 'RpmAssure-Agent.ps1'))) { $from = Join-Path $Pack 'Sql\agent' }
if (-not (Test-Path (Join-Path $from 'RpmAssure-Agent.ps1'))) { throw "candidate missing RpmAssure-Agent.ps1" }
$packVerF = Join-Path $from 'VERSION'
if (Test-Path $packVerF) {
  $packVer = ((Get-Content $packVerF -Raw) -replace '\s', '')
  if ($packVer -and $packVer -ne $cand) { throw "pack VERSION $packVer != candidate $cand" }
}
foreach ($need in @('RpmAssure-Agent.ps1', 'Deploy-Assure-Agent.ps1', 'Update-From-Https.ps1')) {
  $p = Join-Path $from $need
  if (-not (Test-Path $p)) { throw "required Agent script missing: $need" }
}

$pub = Join-Path $PSScriptRoot 'Publish-Agent-Pack.ps1'
if (-not (Test-Path $pub)) { $pub = Join-Path $Root 'deploy\Publish-Agent-Pack.ps1' }
if (-not (Test-Path $pub)) { throw 'Missing Publish-Agent-Pack.ps1 (legacy pack builder, called only from this release path)' }

if ($DryRun) {
  Write-Host ("DRY-RUN would promote $cand ; VERSION stays " + $verBefore + " until a successful non-dry run")
  exit 0
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$bak = Join-Path $Root ("backups\agent-release\" + $stamp)
New-Item -ItemType Directory -Force -Path $bak | Out-Null
foreach ($leaf in @('VERSION', 'rpm-assure-agent.zip', 'rpm-assure-agent.msi', 'Deploy-Assure-Agent.ps1')) {
  $src = Join-Path $dl $leaf
  if (Test-Path $src) { Copy-Item -Force $src (Join-Path $bak $leaf) }
}
Write-Host ("ROLLBACK_COPY=" + $bak)

Write-Host '--- promote pack (no retry on failure) ---'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $pub -Root $Root -Pack $Pack -PromoteVersion -PinVersion $cand
if ($LASTEXITCODE -ne 0) {
  Write-Host 'FAIL publish — VERSION must remain as before if pack builder aborted. No automatic retry.'
  exit $LASTEXITCODE
}

$zip = Join-Path $dl 'rpm-assure-agent.zip'
if (-not (Test-Path $zip)) { throw 'promotion failed: zip missing' }
if ((Get-Item $zip).Length -lt 1000) { throw 'promotion failed: zip too small' }

$verAfter = Read-Ver
Write-Host ("VERSION_AFTER=" + $verAfter)
if ($verAfter -ne $cand) {
  throw "local VERSION $verAfter != candidate $cand after promotion"
}

if (-not $SkipPublicVerify -or $env:RPM_ASSURE_RELEASE_MODE -ne 'TEST') {
  try {
    $public = (Invoke-WebRequest -Uri $PublicUrl -UseBasicParsing -TimeoutSec 30).Content
    $public = ($public -replace '\s', '')
    Write-Host ("PUBLIC_VERSION=" + $public)
    if ($public -ne $cand) { throw "public /downloads/VERSION $public != $cand" }
  } catch {
    Write-Host 'FAIL public VERSION verification. Restoring VERSION from rollback copy. No silent retry.'
    $bakVer = Join-Path $bak 'VERSION'
    if (Test-Path $bakVer) { Copy-Item -Force $bakVer $verFile }
    throw
  }
} else {
  Write-Host 'TEST MODE: public HTTPS VERSION verify skipped (RPM_ASSURE_RELEASE_MODE=TEST). Not a production release.'
}

Write-Host ("PROMOTED " + $verBefore + " -> " + $verAfter)
Write-Host 'Application deployment state was not modified.'
exit 0
