# Central Assure box only. Pulls GitHub when origin/main moved, then Apply-UiPack
# (App + SQL + agent zip + restart). Agents never talk to Git.
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

W 'origin/main moved — Apply-UiPack'
$apply = Join-Path $Pack 'deploy\Apply-UiPack.ps1'
if (-not (Test-Path $apply)) { $apply = Join-Path $Root 'deploy\Apply-UiPack.ps1' }
if (-not (Test-Path $apply)) { throw "Missing Apply-UiPack.ps1" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $apply -Root $Root -Pack $Pack
if ($LASTEXITCODE -ne 0) { throw "Apply-UiPack exit=$LASTEXITCODE" }
W 'sync done'
exit 0
