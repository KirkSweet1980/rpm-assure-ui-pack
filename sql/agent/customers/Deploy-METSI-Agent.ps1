# Metsi Water Solutions. Administrator on the customer host.
# Pack from Assure HTTPS only. No Git. No GitHub.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Deploy-METSI-Agent.ps1
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
& $deploy -CustomerCode 'METSI' -RoleTags 'syspro' -AgentSecret $AgentSecret -AppHttpsUrl $AppHttpsUrl
