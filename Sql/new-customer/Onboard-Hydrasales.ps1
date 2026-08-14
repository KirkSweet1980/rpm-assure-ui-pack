# Hydrasales (HYDRA) onboard - run ON the Hydrasales SYSPRO SQL server only.
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Onboard-Hydrasales.ps1
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$one = Join-Path $here 'Install-NewCustomer-OneShot.ps1'
if (-not (Test-Path $one)) { throw "Missing $one" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $one `
  -PreCustomerCode 'HYDRA' `
  -PreDisplayName 'Hydrasales' `
  -PreAuthMode 'sql' `
  -PreAdminUser 'RPMAdmin' `
  -PreAdminPwd 'RPM@dm1n2026#'
