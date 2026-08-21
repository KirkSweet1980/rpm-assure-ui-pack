# Simply Bright. Administrator on the customer host.
# Pack from Assure HTTPS only. No Git. No GitHub.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Deploy-SBS-Agent.ps1
param(
  [string]$AgentSecret = '',
  [string]$AppHttpsUrl = 'https://assure.rpmresources.co.za'
)
$ErrorActionPreference = 'Stop'
if (-not $AgentSecret) { $AgentSecret = [string]$env:RPM_ASSURE_AGENT_SECRET }
if (-not $AgentSecret) { $AgentSecret = [string]$env:RPM_ASSURE_IOPS_SECRET }
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$deploy = Join-Path $env:TEMP 'Deploy-Assure-Agent.ps1'
Invoke-WebRequest -UseBasicParsing -TimeoutSec 90 `
  -Uri ($AppHttpsUrl.TrimEnd('/') + '/downloads/Deploy-Assure-Agent.ps1') `
  -OutFile $deploy
& $deploy -CustomerCode 'SBS' -RoleTags 'syspro' -AgentSecret $AgentSecret -AppHttpsUrl $AppHttpsUrl
