NEW CUSTOMER — start here
=========================

PREFERRED (one shot, interactive — asks for current SQL auth):

  powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-NewCustomer-OneShot.ps1

  Run on the customer SQL box (e.g. SIRZAAPSQL01).
  Details: README_ONESHOT.txt

ALTERNATE (generate pack from a config file, then copy):

1) Copy CustomerOnboard.Config.example.ps1 to CustomerOnboard.Config.ps1
2) Fill CustomerCode, DisplayName, InstanceName
3) Set LocalSqlUser / LocalSqlPassword (customer DB)
4) Set CentralSqlUser / CentralSqlPassword (central write)
5) List CompanyDatabases (Sysprodb + company DBs)
6) Run:
     powershell -NoProfile -ExecutionPolicy Bypass -File .\New-CustomerOnboardPack.ps1 -ConfigFile .\CustomerOnboard.Config.ps1
7) Follow README.txt inside C:\RPM-Assure\Sql\customers\<CODE>\

Full detail: README_ONBOARD.txt
