# Hydrasales (HYDRA) onboard - run on the Hydrasales SYSPRO SQL server.
# Administrator PowerShell:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Onboard-Hydrasales.ps1
#
# Then install the edge agent with Bootstrap-Customer-Agent.ps1
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$one = Join-Path $here 'Install-NewCustomer-OneShot.ps1'
if (-not (Test-Path $one)) { throw "Missing $one" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $one `
  -PreCustomerCode 'HYDRA' `
  -PreDisplayName 'Hydrasales'
