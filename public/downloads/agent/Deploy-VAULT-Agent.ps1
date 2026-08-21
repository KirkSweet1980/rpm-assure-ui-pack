# Deploy-VAULT-Agent.ps1
# Vault Tech. No wizard. Administrator on that customer host.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Deploy-VAULT-Agent.ps1 -AgentSecret '<IOPS secret>'
#
param(
  [Parameter(Mandatory = $true)][string]$AgentSecret,
  [string]$AppHttpsUrl = 'https://assure.rpmresources.co.za'
)
$ErrorActionPreference = 'Stop'
if (-not $AgentSecret) { $AgentSecret = [string]$env:RPM_ASSURE_AGENT_SECRET }
if (-not $AgentSecret) { $AgentSecret = [string]$env:RPM_ASSURE_IOPS_SECRET }
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$deploy = Join-Path $env:TEMP 'Deploy-Assure-Agent.ps1'
Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 `
  -Uri 'https://raw.githubusercontent.com/KirkSweet1980/rpm-assure-ui-pack/main/Sql/agent/Deploy-Assure-Agent.ps1' `
  -OutFile $deploy
& $deploy -CustomerCode 'VAULT' -RoleTags 'sql' -AgentSecret $AgentSecret -AppHttpsUrl $AppHttpsUrl
