# Deploy-SIRF-Agent.ps1
# Sir Fruit. No wizard. Administrator on that customer host.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Deploy-SIRF-Agent.ps1 -AgentSecret '<IOPS secret>'
#
param(
  [Parameter(Mandatory = $true)][string]$AgentSecret,
  [string]$AppHttpsUrl = 'https://assure.rpmresources.co.za'
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$deploy = Join-Path $env:TEMP 'Deploy-Assure-Agent.ps1'
Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 `
  -Uri 'https://raw.githubusercontent.com/KirkSweet1980/rpm-assure-ui-pack/main/Sql/agent/Deploy-Assure-Agent.ps1' `
  -OutFile $deploy
& $deploy -CustomerCode 'SIRF' -RoleTags 'syspro' -AgentSecret $AgentSecret -AppHttpsUrl $AppHttpsUrl
