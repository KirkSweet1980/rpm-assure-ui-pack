# Per-customer Edge deploy — Assure HTTPS only. No Git.

On the customer host (Administrator):

  Invoke-WebRequest -UseBasicParsing -TimeoutSec 90 `
    -Uri 'https://assure.rpmresources.co.za/downloads/Deploy-Assure-Agent.ps1' `
    -OutFile $env:TEMP\Deploy-Assure-Agent.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File $env:TEMP\Deploy-Assure-Agent.ps1 `
    -CustomerCode ABLE -AgentSecret 'xc9pDuhf7ldzcmkwsE+joSdgpuD5RJaz'

Or download the matching Deploy-<CODE>-Agent.ps1 from the same /downloads folder.

Interbrand SYSPRO (login + first collect):

  https://assure.rpmresources.co.za/downloads/Onboard-IB-Syspro.ps1

Never run Launch-From-Git.ps1. Never install Git on a customer host.
