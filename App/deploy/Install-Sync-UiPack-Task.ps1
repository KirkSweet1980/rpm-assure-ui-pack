# Registers a 10-minute SYSTEM task: git fetch ui-pack, apply only when origin/main moved.
param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack'
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $here 'Sync-UiPack-From-Git.ps1'
if (-not (Test-Path $src)) { $src = Join-Path $Pack 'deploy\Sync-UiPack-From-Git.ps1' }
$destDir = Join-Path $Root 'deploy'
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
$dest = Join-Path $destDir 'Sync-UiPack-From-Git.ps1'
Copy-Item -Force $src $dest
Copy-Item -Force (Join-Path (Split-Path $src) 'Install-Sync-UiPack-Task.ps1') (Join-Path $destDir 'Install-Sync-UiPack-Task.ps1') -EA SilentlyContinue

$tn = 'RPMAssure-Sync-UiPack'
$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $dest + '"'
cmd.exe /c ('schtasks /Create /TN "' + $tn + '" /SC MINUTE /MO 10 /RU SYSTEM /RL HIGHEST /F /TR "' + $tr + '"') | Out-Null
if ($LASTEXITCODE -ne 0) { throw "schtasks $tn failed" }
Write-Host "INSTALLED $tn every 10 min (git fetch; Apply-UiPack only when origin/main moved)"
Write-Host "  $dest"
schtasks /Query /TN $tn /FO LIST /V | Select-String -Pattern 'Task Name|Status|Next Run|Task To Run'
