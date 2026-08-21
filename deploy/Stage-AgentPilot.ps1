# ONE-HOST Agent candidate staging. Explicit operator invocation only.
# Does NOT update global C:\RPM-Assure\downloads\VERSION.
# Does NOT replace the globally published Agent ZIP/MSI.
# Does NOT trigger all Agents or enable auto-publish.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Stage-AgentPilot.ps1 `
#     -PilotHost RPMINT-TEST01 -CandidateVersion 2.10.1
param(
  [Parameter(Mandatory = $true)]
  [string]$PilotHost,
  [Parameter(Mandatory = $true)]
  [string]$CandidateVersion,
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$hostName = ($PilotHost | ForEach-Object { $_.Trim() })
if (-not $hostName) { throw 'PilotHost is required (exactly one host).' }
if ($hostName -match '[,\*;]') { throw 'Ambiguous PilotHost. Provide exactly one hostname.' }
if ($hostName -match '\s') { throw 'Ambiguous PilotHost. Provide exactly one hostname without spaces.' }
$cand = ($CandidateVersion -replace '\s', '')
if (-not $cand) { throw 'CandidateVersion is required.' }
if ($cand -eq '2.9.11') { throw 'CandidateVersion 2.9.11 is the current fleet pointer — not a pilot candidate.' }

$dl = Join-Path $Root 'downloads'
$verFile = Join-Path $dl 'VERSION'
function Read-Ver { if (Test-Path $verFile) { ((Get-Content $verFile -Raw) -replace '\s', '') } else { '?' } }
$verBefore = Read-Ver
$logDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ('agent-pilot_{0:yyyyMMdd}.log' -f (Get-Date))
function W([string]$m) {
  $line = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss') + 'Z host=' + $hostName + ' ver=' + $cand + ' ' + $m
  Add-Content -LiteralPath $log -Value $line -EA SilentlyContinue
  Write-Host $line
}

W ("STAGE start fleetVERSION=" + $verBefore)
$from = Join-Path $Pack 'sql\agent'
if (-not (Test-Path (Join-Path $from 'RpmAssure-Agent.ps1'))) { $from = Join-Path $Pack 'Sql\agent' }
$agentPs1 = Join-Path $from 'RpmAssure-Agent.ps1'
if (-not (Test-Path $agentPs1)) { throw "candidate package missing RpmAssure-Agent.ps1 under $from" }
foreach ($need in @('RpmAssure-Agent.ps1', 'Lib-RpmaHttps.ps1')) {
  $p = Join-Path $from $need
  if (-not (Test-Path $p)) { W ("WARN missing " + $need) }
}
$packVerF = Join-Path $from 'VERSION'
if (Test-Path $packVerF) {
  $packVer = ((Get-Content $packVerF -Raw) -replace '\s', '')
  if ($packVer -and $packVer -ne $cand) {
    throw "candidate VERSION mismatch: requested $cand pack $packVer"
  }
}

$dest = Join-Path $dl ("pilot\" + $cand + "\" + $hostName)
$rollback = Join-Path $dl ("pilot\_rollback\" + $cand + "\" + $hostName)
if ($DryRun) {
  W ("DRY-RUN would stage $from -> $dest ; fleet VERSION stays " + $verBefore)
  if ((Read-Ver) -ne $verBefore) { throw 'VERSION changed during dry-run' }
  exit 0
}

if (Test-Path $dest) {
  New-Item -ItemType Directory -Force -Path $rollback | Out-Null
  robocopy $dest $rollback /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  W ("rollback copy " + $rollback)
  Remove-Item $dest -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $dest | Out-Null
robocopy $from $dest /E /XF Agent.Secrets.bin Agent.Settings.json Agent.Config.ps1 /XD logs installer msi tray /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if (-not (Test-Path (Join-Path $dest 'RpmAssure-Agent.ps1'))) { throw 'stage failed: RpmAssure-Agent.ps1 missing in dest' }

@(
  'RPM Assure agent PILOT ' + $cand,
  'Target host (ONE): ' + $hostName,
  'Staged: ' + (Get-Date).ToUniversalTime().ToString('o'),
  'Fleet VERSION must remain ' + $verBefore,
  'Do not copy this over the global /downloads ZIP or VERSION.',
  '',
  'On that ONE host (Administrator PowerShell):',
  '  1. Stop-Service RPMAssure-Edge',
  '  2. robocopy this folder C:\RPM-Assure\Agent /E /XF Agent.Secrets.bin Agent.Settings.json Agent.Config.ps1 /XD logs',
  '  3. Set skipHttpsPackFetch=true in Agent.Settings.json (stops hourly fleet downgrade)',
  '  4. Start-Service RPMAssure-Edge',
  '  5. Confirm AgentVersion and CURRENT still works. No NEXT. No enrollment unless authorised.'
) | Set-Content -LiteralPath (Join-Path $dest 'PILOT-INSTALL.txt') -Encoding ASCII

$verAfter = Read-Ver
if ($verAfter -ne $verBefore) { throw "VERSION changed while staging pilot: $verBefore -> $verAfter" }
W ("STAGED dest=" + $dest + " fleetVERSION=" + $verAfter)
Write-Host 'PILOT isolation: global downloads/VERSION untouched. No fleet publication.'
exit 0
