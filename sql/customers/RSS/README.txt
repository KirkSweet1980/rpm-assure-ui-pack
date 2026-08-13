Remote Site Solutions (RSS)
SQL host     : RSS-PROD
Bootstrap    : SYSPROAdmin / $y$pr0  (create rpmassure + linked server only)
Collect user : rpmassure / @ssuR3me!  (local + central write-back)

DBs granted: Sysprodb, SysproCompanyF/R/S/W (+ SRS), SYSPRODeployment

CENTRAL:
  1) 208_Central_Create_rpmassure.sql
  2) 208b_Grant_rpmassure_RPMAssure_App.sql
  3) 301_Central_Register_RSS.sql

CUSTOMER RSS-PROD:
  4) Copy C:\RPM-Assure\Sql\customers\RSS
  5) powershell -File Finish-RSS-OnCustomer.ps1 -InstallSchedule
     (or -SaUser SYSPROAdmin -SaPassword '$y$pr0' -InstallSchedule)

VERIFY:
  6) 304_Verify_RSS_Central.sql as rpmassure
  7) UI refresh

Scheduled collect never uses SYSPROAdmin - only rpmassure.
