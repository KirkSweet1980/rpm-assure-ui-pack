RPM Assure - new customer 1-shot install
========================================

Run this ON the customer SQL server (example from SSMS: SIRZAAPSQL01).

  powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-NewCustomer-OneShot.ps1

It will ASK you:

  1. Customer code + display name
       Sir Fruit site (SIR_SysCompany* / SIRZAAPSQL01):
         code  SIRF     (matches Assure UI)
         name  Sir Fruit
         instance  SIRZAAPSQL01

  2. How YOU connect today
       1 = Windows (current user, e.g. SIR\KirkS)   <-- screenshot
       2 = existing SQL login + password (sa / SYSPROAdmin)

  3. Which company databases to grant
       Discovers Sysprodb, SYSPRODeployment, *SysCompany*, SIR_* automatically
       Default = ALL found

  4. Assure collect login to CREATE (read-only)
       Standard:  rpmassure  /  @ssuR3me!
       Also creates legacy Rpm_collect with the same password (Y)

  5. Central Assure write-back
       102.222.21.220,14333  /  RPMAssure_App  /  rpmassure

Then it:

  - Proves your admin access
  - Creates rpmassure (db_datareader on selected DBs + msdb backup/job reads)
  - Creates linked server RPM_CENTRAL
  - INSERT/UPDATE Dim_Customer + Dim_Customer_AmsConfig (PillarSyspro=1)
  - Writes C:\RPM-Assure\Sql\customers\<CODE>\Customer.Config.ps1
  - Writes ONBOARD_PROOF.txt

After success (optional collect pack):

  Then on the APP server, map RMM / Cove / Bitdefender / M365:

  powershell -NoProfile -ExecutionPolicy Bypass -File .\Complete-Customer-Cover.ps1 -CustomerCode SIRF


  cd C:\RPM-Assure\Sql\new-customer
  powershell -File .\New-CustomerOnboardPack.ps1 `
    -ConfigFile C:\RPM-Assure\Sql\customers\SIRF\Customer.Config.ps1

  Or copy sql\base\syspro-direct to the customer host and run
  Install-OnThisHost.ps1 once Customer.Config.ps1 exists.

Protect Customer.Config.ps1 (contains passwords).
