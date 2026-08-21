# DEPRECATED. Do not install or enable RPMAssure-Publish-AgentPack.
# Auto-publish (pack VERSION != live VERSION -> publish Agent) is retired.
# Global Agent promotion is ONLY: deploy\Publish-AgentRelease.ps1
#
# This script refuses to create the scheduled task unless
#   -IUnderstandThisIsDeprecated
# is passed by an operator for emergency compatibility.
param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack',
  [switch]$IUnderstandThisIsDeprecated
)

$ErrorActionPreference = 'Stop'
Write-Host 'DEPRECATED: Install-Publish-Agent-Pack-Task.ps1'
Write-Host 'RPMAssure-Publish-AgentPack must stay DISABLED. Use Publish-AgentRelease.ps1 for fleet promotion.'
if (-not $IUnderstandThisIsDeprecated) {
  Write-Host 'Refusing to create/enable RPMAssure-Publish-AgentPack (no -IUnderstandThisIsDeprecated).'
  exit 0
}

$watch = Join-Path $Root 'deploy\Publish-Agent-Pack-IfStale.ps1'
@'
# DEPRECATED watchdog. Never promotes VERSION. Never rebuilds from pack.
param(
  [string]$Root = "C:\RPM-Assure"
)
Write-Host "DEPRECATED Publish-Agent-Pack-IfStale: auto-publish retired. Exit without publishing."
exit 0
'@ | Set-Content -LiteralPath $watch -Encoding ASCII

Write-Host 'WARN compatibility: task creation requested. Still will NOT promote VERSION.'
schtasks /Create /TN "RPMAssure-Publish-AgentPack" /SC MINUTE /MO 15 /RU SYSTEM /RL HIGHEST /F `
  /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$watch`"" | Out-Null
Write-Host 'Created RPMAssure-Publish-AgentPack as a no-op. Disable it: schtasks /Change /TN RPMAssure-Publish-AgentPack /DISABLE'
