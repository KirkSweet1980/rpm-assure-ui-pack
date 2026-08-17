# Interbrand. Prefer Onboard-IB-Syspro.ps1 on the SYSPRO SQL host
# (agent + rpmassure login + Customer.Config). This file is agent-only.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Deploy-IB-Agent.ps1
param(
  [string]$AgentSecret = 'xc9pDuhf7ldzcmkwsE+joSdgpuD5RJaz',
  [string]$AppHttpsUrl = 'https://assure.rpmresources.co.za'
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$deploy = Join-Path $env:TEMP 'Deploy-Assure-Agent.ps1'
Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 `
  -Uri 'https://raw.githubusercontent.com/KirkSweet1980/rpm-assure-ui-pack/main/Sql/agent/Deploy-Assure-Agent.ps1' `
  -OutFile $deploy
& $deploy -CustomerCode 'IB' -RoleTags 'syspro,sql' -AgentSecret $AgentSecret -AppHttpsUrl $AppHttpsUrl
