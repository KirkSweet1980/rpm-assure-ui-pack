# Git/app sync is not an Agent release mechanism.
# APPLICATION RELEASE != AGENT RELEASE
#
# May: fetch origin/main, apply application via Apply-UiPack.ps1 (no -PublishAgent).
# Must NOT: publish Agent ZIP/MSI, pass -PublishAgent, call Publish-Agent-Pack.ps1,
#           call Publish-AgentRelease.ps1, change downloads/VERSION, or install
#           RPMAssure-Publish-AgentPack.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Sync-UiPack-From-Git.ps1
param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack'
)

$ErrorActionPreference = 'Stop'
$logDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ('sync-uipack_{0:yyyyMMdd}.log' -f (Get-Date))
function W([string]$m) {
  $line = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss') + 'Z ' + $m
  Add-Content -LiteralPath $log -Value $line -EA SilentlyContinue
  Write-Host $line
}

$git = 'C:\Program Files\Git\cmd\git.exe'
if (-not (Test-Path $git)) { $git = 'git' }
if (-not (Test-Path (Join-Path $Pack '.git'))) { throw "Missing git pack $Pack" }

$verF = Join-Path $Root 'downloads\VERSION'
$verBefore = if (Test-Path $verF) { ((Get-Content $verF -Raw) -replace '\s', '') } else { '?' }
W ("VERSION_BEFORE=" + $verBefore)

W 'fetch origin main'
& $git -C $Pack fetch origin main
if ($LASTEXITCODE -ne 0) { throw 'git fetch failed' }

$local = ((& $git -C $Pack rev-parse HEAD) | Out-String).Trim()
$remote = ((& $git -C $Pack rev-parse origin/main) | Out-String).Trim()
W ("local=$local")
W ("remote=$remote")
if ($local -and $remote -and $local -eq $remote) {
  W 'already up to date — skip apply'
  exit 0
}

W 'origin/main moved — APPLICATION Apply-UiPack only (no -PublishAgent, no Agent VERSION promote)'
$apply = Join-Path $Root 'deploy\Apply-UiPack.ps1'
if (-not (Test-Path $apply)) {
  throw "Missing trusted controller $apply. Refusing pack Apply-UiPack.ps1. Install reviewed controllers into `$Root\deploy separately."
}
# Never pass -PublishAgent. Never call Publish-AgentRelease / Publish-Agent-Pack.
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $apply -Root $Root -Pack $Pack
if ($LASTEXITCODE -ne 0) { throw "Apply-UiPack exit=$LASTEXITCODE" }

$verAfter = if (Test-Path $verF) { ((Get-Content $verF -Raw) -replace '\s', '') } else { '?' }
W ("VERSION_AFTER=" + $verAfter)
if ($verBefore -ne '?' -and $verAfter -ne $verBefore) {
  throw "Sync-UiPack changed Agent VERSION ($verBefore -> $verAfter). Git/app sync is not an Agent release mechanism."
}
W 'sync done (Agent VERSION unchanged)'
exit 0
