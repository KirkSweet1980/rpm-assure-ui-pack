# Hydrasales (HYDRA) - run ON HydraSRV as HYDRASRV\RPMAdmin (Windows).
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Onboard-Hydrasales.ps1
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$one = Join-Path $here 'Install-NewCustomer-OneShot.ps1'
if (-not (Test-Path $one)) { throw "Missing $one" }
Write-Host ('Windows user: ' + $env:USERDOMAIN + '\' + $env:USERNAME)
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $one `
  -PreCustomerCode 'HYDRA' `
  -PreDisplayName 'Hydrasales' `
  -PreInstanceName 'HydraSRV' `
  -PreAuthMode 'windows'
