$ErrorActionPreference = 'Continue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $here 'RPMAssure-App.exe'
if (Test-Path $exe) {
  & $exe stop 2>$null
  & $exe uninstall 2>$null
}
sc.exe delete RPMAssure-App 2>$null | Out-Null
