# APPLICATION RELEASE ONLY.
# Git/app sync is not an Agent release mechanism.
# Default: deploy App + SQL, restart, health. NEVER publish Agent ZIP/MSI,
# NEVER update downloads/VERSION, NEVER install RPMAssure-Publish-AgentPack.
#
# APPLICATION RELEASE != AGENT RELEASE
#
# Exceptional (manual only, not used by Sync-UiPack):
#   -PublishAgent   -> delegates to Publish-AgentRelease.ps1
# Prefer invoking Publish-AgentRelease.ps1 directly.
param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack',
  [switch]$PublishAgent,
  [string]$CandidateVersion = '',
  [switch]$SkipGitReset
)

$ErrorActionPreference = 'Stop'
$git = 'C:\Program Files\Git\cmd\git.exe'
if (-not (Test-Path $git)) { $git = 'git' }

Write-Host '=== RPM Assure APPLICATION apply (Agent VERSION immutable by default) ==='
if (-not (Test-Path (Join-Path $Pack '.git'))) { throw "Missing git pack $Pack" }

$dl = Join-Path $Root 'downloads'
$verF = Join-Path $dl 'VERSION'
function Read-DownloadsVersion([string]$path) {
  if (-not (Test-Path $path)) { return '?' }
  return ((Get-Content $path -Raw) -replace '\s', '')
}
$verBefore = Read-DownloadsVersion $verF
Write-Host ("VERSION_BEFORE=" + $verBefore)

if (-not $SkipGitReset) {
  & $git -C $Pack fetch origin main
  if ($LASTEXITCODE -ne 0) { throw 'git fetch failed' }
  & $git -C $Pack reset --hard origin/main
  if ($LASTEXITCODE -ne 0) { throw 'git reset failed' }
}
$head = (& $git -C $Pack log -1 --oneline | Out-String).Trim()
Write-Host ("HEAD $head")

$appSrc = Join-Path $Pack 'App\src'
if (-not (Test-Path $appSrc)) { $appSrc = Join-Path $Pack 'src' }
robocopy $appSrc (Join-Path $Root 'App\src') /MIR /R:2 /W:2 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

$sqlFrom = Join-Path $Pack 'sql'
if (-not (Test-Path $sqlFrom)) { $sqlFrom = Join-Path $Pack 'Sql' }
if (Test-Path $sqlFrom) {
  robocopy $sqlFrom (Join-Path $Root 'Sql') /E /XO /R:2 /W:2 /NFL /NDL /NJH /NJS /nc /ns /np `
    /XF *.Config.ps1 Agent.Secrets.bin Agent.Settings.json Freshdesk.Config.ps1 Bitdefender.Config.ps1 Cove.Config.ps1 `
    /XD logs installer | Out-Null
}

$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
if (-not (Test-Path $sqlcmd)) { $sqlcmd = 'sqlcmd' }
foreach ($rel in @(
    'Sql\central\530_Dim_ExternalIdentity.sql',
    'Sql\cove\466_Cove_Gold_Views.sql',
    'Sql\cove\467_Cove_Raw.sql',
    'Sql\rmm\pulseway\468_Rmm_Gold_Views.sql',
    'Sql\bitdefender\469_Epp_Gold_Views.sql',
    'Sql\freshdesk\470_Tickets_Gold.sql',
    'Sql\agent\471_Agent_Secret_Migration.sql',
    'Sql\agent\472_Agent_Enrollment.sql',
    'Sql\freshdesk\519_Ensure_Freshdesk_Sla.sql',
    'Sql\central\521_IB_Syspro_NoCover.sql',
    'Sql\central\531_App_UserCustomer_Pillars.sql',
    'Sql\central\532_Fact_AuditEvent.sql',
    'Sql\central\533_Dim_Service.sql',
    'Sql\central\534_Dim_Customer_ServiceConfig.sql',
    'Sql\central\535_Resolve_Effective_Service_Config.sql',
    'Sql\central\536_Dim_ServiceMetric.sql',
    'Sql\central\537_Dim_Customer_ServiceThreshold.sql',
    'Sql\central\538_Dim_Customer_ServiceTicketPolicy.sql',
    'Sql\central\539_Fact_ExternalTicketLink.sql',
    'Sql\central\540_Dim_Customer_ServiceSla.sql',
    'Sql\central\541_Dim_BusinessHoursProfile.sql',
    'Sql\central\542_Fact_ServiceSlaEvent.sql',
    'Sql\central\543_Seed_TicketAutomation_TestTenant.sql',
    'Sql\central\544_ExternalTicketLink_LifecycleSync.sql',
    'Sql\central\545_Seed_SlaEvaluation_TestTenant.sql'
  )) {
  $sf = Join-Path $Root $rel
  if (-not (Test-Path $sf)) { continue }
  Write-Host ("--- SQL " + $rel + " ---")
  & $sqlcmd -S '.\RPMREPORTS' -d RPMAssure_App -E -C -b -i $sf
  if ($LASTEXITCODE -ne 0) { Write-Host ("WARN " + $rel + " exit=" + $LASTEXITCODE) }
}

New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null
foreach ($leaf in @(
    'Apply-UiPack.ps1',
    'Sync-UiPack-From-Git.ps1',
    'Publish-AgentRelease.ps1',
    'Stage-AgentPilot.ps1',
    'Sanitise-Downloads-DeployScript.ps1',
    'Publish-Agent-Pack.ps1',
    'Ensure-Caddy-Downloads.ps1'
  )) {
  $src = Join-Path $Pack ('deploy\' + $leaf)
  if (Test-Path $src) { Copy-Item -Force $src (Join-Path $Root ('deploy\' + $leaf)) -EA SilentlyContinue }
}

# Do NOT copy-run Install-Publish-Agent-Pack-Task.ps1.
# Do NOT install or enable RPMAssure-Publish-AgentPack.
# Do NOT re-enable RPMAssure-Sync-UiPack (containment: operator-controlled).

if ($PublishAgent) {
  Write-Host 'WARN -PublishAgent is exceptional/manual only. Delegating to Publish-AgentRelease.ps1'
  if (-not $CandidateVersion) { throw '-PublishAgent requires -CandidateVersion. Prefer invoking Publish-AgentRelease.ps1 directly.' }
  $rel = Join-Path $Root 'deploy\Publish-AgentRelease.ps1'
  if (-not (Test-Path $rel)) { $rel = Join-Path $Pack 'deploy\Publish-AgentRelease.ps1' }
  if (-not (Test-Path $rel)) { throw 'Publish-AgentRelease.ps1 missing' }
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $rel -Root $Root -Pack $Pack -CandidateVersion $CandidateVersion
  if ($LASTEXITCODE -ne 0) { throw "Publish-AgentRelease failed: $LASTEXITCODE" }
} else {
  Write-Host '--- Skip Agent publish (default). Fleet pointer unchanged. ---'
}

$verAfter = Read-DownloadsVersion $verF
Write-Host ("VERSION_AFTER=" + $verAfter)
if (-not $PublishAgent) {
  if ($verBefore -ne '?' -and $verAfter -ne $verBefore) {
    throw "VERSION changed without explicit Agent release (before=$verBefore after=$verAfter). APPLICATION RELEASE != AGENT RELEASE"
  }
  if ($verAfter -ne '?' -and $verBefore -ne '?' ) {
    Write-Host ("VERSION_IMMUTABLE " + $verBefore + " == " + $verAfter)
  }
}

Restart-Service RPMAssure-App -Force -ErrorAction SilentlyContinue

Write-Host '=== application apply done — Agent VERSION not promoted ==='
Write-Host $head
exit 0
