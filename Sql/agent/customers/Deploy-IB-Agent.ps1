# Interbrand. Administrator on the SYSPRO host.
# Downloads deploy from Assure HTTPS. No Git.
param(
  [string]$AgentSecret = 'xc9pDuhf7ldzcmkwsE+joSdgpuD5RJaz',
  [string]$AppHttpsUrl = 'https://assure.rpmresources.co.za'
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$deploy = Join-Path $env:TEMP 'Deploy-Assure-Agent.ps1'
Invoke-WebRequest -UseBasicParsing -TimeoutSec 90 `
  -Uri ($AppHttpsUrl.TrimEnd('/') + '/downloads/Deploy-Assure-Agent.ps1') `
  -OutFile $deploy
& $deploy -CustomerCode 'IB' -RoleTags 'syspro,sql' -AgentSecret $AgentSecret -AppHttpsUrl $AppHttpsUrl
