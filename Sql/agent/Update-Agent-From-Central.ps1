# RPM Assure - apply agent files from the local git pack only.
# No downloads, no extra .cmd, no hidden process.
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Update-Agent-From-Central.ps1
param(
  [string]$AgentRoot = 'C:\RPM-Assure\Agent',
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack'
)

$ErrorActionPreference = 'Stop'
$git = 'C:\Program Files\Git\cmd\git.exe'
if (-not (Test-Path $git)) { throw 'Git not installed' }
if (-not (Test-Path (Join-Path $Pack '.git'))) { throw "Missing git pack $Pack" }

& $git -C $Pack fetch --all --prune
if ($LASTEXITCODE -ne 0) { throw 'git fetch failed' }
& $git -C $Pack reset --hard origin/main
if ($LASTEXITCODE -ne 0) { throw 'git reset failed' }

$from = Join-Path $Pack 'Sql\agent'
if (-not (Test-Path (Join-Path $from 'RpmAssure-Agent.ps1'))) { throw "Pack missing $from" }

New-Item -ItemType Directory -Force -Path $AgentRoot | Out-Null
robocopy $from $AgentRoot /E /XF Agent.Secrets.bin Agent.Config.ps1 status.json request-sync.flag Update-Agent-From-Central.ps1 /XD logs /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

$baseFrom = Join-Path $Pack 'Sql\base\syspro-direct'
$baseTo = Join-Path $Root 'Sql\base\syspro-direct'
if (Test-Path $baseFrom) {
  New-Item -ItemType Directory -Force -Path $baseTo | Out-Null
  robocopy $baseFrom $baseTo /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

Write-Output 'UPDATED from local git pack'
exit 0
