Sir Fruit (SIRF) - first collect after onboard
=============================================

Onboard already registered SIRF. This pack pulls SYSPRO data
into Assure and installs the 15-minute schedule.

On SIRZAAPSQL01 (elevated):

  $zip  = "$env:USERPROFILE\Downloads\RPMAssure-First-Collect-SIRF.zip"
  $dest = "C:\RPM-Assure\Sql\new-customer"
  Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force
  Unblock-File "$dest\Run-First-Collect.ps1"
  powershell -NoProfile -ExecutionPolicy Bypass -File "$dest\Run-First-Collect.ps1" -CustomerCode SIRF

Uses existing C:\RPM-Assure\Sql\customers\SIRF\Customer.Config.ps1

Sir Fruit has no Sysprodb - collector now finds SIR__SYS (AdmOperator).
Company DBs = SIR_SysCompany* (skips _SRS and SIR__SYS).

Success: FIRST COLLECT DONE  SIRF
Then hard-refresh Exco.
