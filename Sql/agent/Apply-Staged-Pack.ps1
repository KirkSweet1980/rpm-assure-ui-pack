# Copy staged agent files. No download, no hidden window, no TEMP.
# Scheduled as RPMAssure-ApplyPack every 1 minute. Safe for Bitdefender ATC.
param([string]$AgentRoot = "C:\RPM-Assure\Agent")

$ErrorActionPreference = "Continue"
$logDir = Join-Path $AgentRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "apply-pack.log"

function L([string]$m) {
  $line = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + "Z " + $m
  Add-Content -LiteralPath $log -Value $line -EA SilentlyContinue
}

$src = Join-Path $AgentRoot "_next"
if (-not (Test-Path (Join-Path $src "RpmAssure-Agent.ps1"))) {
  $src = "C:\RPM-Assure\deploy\ui-pack\Sql\agent"
}
if (-not (Test-Path (Join-Path $src "RpmAssure-Agent.ps1"))) {
  $src = "C:\RPM-Assure\deploy\ui-pack\sql\agent"
}
if (-not (Test-Path (Join-Path $src "RpmAssure-Agent.ps1"))) { exit 0 }

$want = $null
$wf = Join-Path $src "VERSION"
if (Test-Path $wf) { $want = (Get-Content $wf -Raw).Trim() }
$have = $null
$run = Join-Path $AgentRoot "RpmAssure-Agent.ps1"
if (Test-Path $run) {
  $m = Select-String -Path $run -Pattern 'AgentVersion\s*=\s*"([^"]+)"' | Select-Object -First 1
  if ($m) { $have = [string]$m.Matches[0].Groups[1].Value }
}
if ($want -and $have -and $want -eq $have) { exit 0 }

L ("apply $have -> $want from $src")
robocopy $src $AgentRoot /E /XF Agent.Secrets.bin Agent.Config.ps1 Agent.Settings.json status.json request-sync.flag /XD logs _next /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if (Test-Path (Join-Path $AgentRoot "_next\VERSION")) {
  Remove-Item (Join-Path $AgentRoot "_next") -Recurse -Force -EA SilentlyContinue
}
L "apply done"
exit 0
