RPM Assure — full client onboard export pack
============================================

WHAT THIS PACK DOES
-------------------
Generates a complete per-customer folder:
  C:\RPM-Assure\Sql\customers\<CODE>\
with:
  - 301 central Dim_Customer register
  - 302 create YOUR chosen SQL login + db_datareader on listed DBs
  - 303 linked server RPM_CENTRAL (remote user/password YOU set)
  - Collect scripts (operators, jobs, license, tasks, health, DTR, security,
    audit, diag, sql health, backups, version/hotfixes, deployment HF when templates exist)
  - Run-*-Collect-Scheduled.ps1 (uses your LocalSqlUser / LocalSqlPassword)
  - Install-*-Schedule.ps1 (15 min core + daily jobs)
  - Finish-*-OnCustomer.ps1 one-shot
  - Customer.Config.ps1 (credentials — protect it)

YOU STIPULATE
-------------
  CustomerCode, DisplayName, InstanceName
  LocalSqlUser + LocalSqlPassword     (customer DB)
  CentralSqlUser + CentralSqlPassword (central write via linked server)
  CompanyDatabases[]
  CentralDataSource (default 102.222.21.220,14333)

STEPS
-----
1) Ensure templates exist on central/app host:
     C:\RPM-Assure\Sql\collect\          (AHIC 212-218...)
     C:\RPM-Assure\Sql\customers\UVSS\   (optional extras)
     C:\RPM-Assure\Sql\customers\AHIC\   (optional extras)

2) Fill CustomerOnboard.Config.example.ps1 -> CustomerOnboard.Config.ps1

3) Generate:
   cd C:\RPM-Assure\Sql\new-customer
   powershell -NoProfile -ExecutionPolicy Bypass -File .\New-CustomerOnboardPack.ps1 `
     -ConfigFile .\CustomerOnboard.Config.ps1

   Or inline passwords:
   powershell -NoProfile -ExecutionPolicy Bypass -File .\New-CustomerOnboardPack.ps1 `
     -CustomerCode 'SFRUIT' `
     -DisplayName 'Sir Fruit' `
     -InstanceName 'SFRUIT-SQL' `
     -LocalSqlUser 'Rpm_collect' `
     -LocalSqlPassword 'YourLocalPwd' `
     -CentralSqlUser 'Rpm_collect' `
     -CentralSqlPassword 'YourCentralPwd' `
     -CompanyDatabases @('Sysprodb','SysproCompanyA')

4) Central: run 301_*.sql

5) Copy C:\RPM-Assure\Sql\customers\<CODE>\ to customer SQL server same path

6) Customer (Admin):
   powershell -File Finish-<CODE>-OnCustomer.ps1 -SaPassword 'saPwd' -InstallSchedule

7) Central: run 304_Verify_*.sql ; refresh UI

SECURITY
--------
- Do not email Customer.Config.ps1 or generated 302/303 with live passwords over insecure channels.
- Prefer generating on a secure admin PC then USB/RDP.
- Local and central passwords may differ; linked server uses Central* credentials.

LEGACY
------
Generate-CustomerCollectPack.ps1 still works for a lighter AHIC-only template set.
Prefer New-CustomerOnboardPack.ps1 for full onboard.
