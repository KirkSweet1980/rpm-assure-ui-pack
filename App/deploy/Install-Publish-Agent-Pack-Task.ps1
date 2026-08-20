# Keep C:\RPM-Assure\downloads in sync with the git pack every 15 minutes.
# Central only. Agents never Git.
param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack'
)

$ErrorActionPreference = 'Stop'
$pub = Join-Path $Root 'deploy\Publish-Agent-Pack.ps1'
if (-not (Test-Path $pub)) { throw "Missing $pub" }

$watch = Join-Path $Root 'deploy\Publish-Agent-Pack-IfStale.ps1'
@'
param(
  [string]$Root = "C:\RPM-Assure",
  [string]$Pack = "C:\RPM-Assure\deploy\ui-pack"
)
$ErrorActionPreference = "Continue"
$dlVer = ""
$pkVer = ""
$dv = Join-Path $Root "downloads\VERSION"
foreach ($vf in @(
    (Join-Path $Pack "Sql\agent\VERSION"),
    (Join-Path $Pack "sql\agent\VERSION")
  )) {
  if (Test-Path $vf) { $pkVer = ((Get-Content $vf -Raw) -replace "\s", ""); break }
}
if (Test-Path $dv) { $dlVer = ((Get-Content $dv -Raw) -replace "\s", "") }
$zip = Join-Path $Root "downloads\rpm-assure-agent.zip"
$need = ($pkVer -and $pkVer -ne $dlVer) -or -not (Test-Path $zip) -or ((Test-Path $zip) -and (Get-Item $zip).Length -lt 1000)
$patch = Join-Path $Root "downloads\Collect-Host-Patches.ps1"
if (-not (Test-Path $patch)) { $need = $true }
if (-not $need) { exit 0 }
$pub = Join-Path $Root "deploy\Publish-Agent-Pack.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $pub -Root $Root -Pack $Pack
'@ | Set-Content -LiteralPath $watch -Encoding ASCII

schtasks /Create /TN "RPMAssure-Publish-AgentPack" /SC MINUTE /MO 15 /RU SYSTEM /RL HIGHEST /F `
  /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$watch`"" | Out-Null
Write-Host 'Scheduled RPMAssure-Publish-AgentPack every 15 min (publish only when VERSION stale or zip missing).'
