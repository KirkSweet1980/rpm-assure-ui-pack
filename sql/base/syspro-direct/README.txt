RPM Assure - SYSPRO automated collect (all SYSPRO customers)
===========================================================

Architecture
------------
On each customer SYSPRO SQL host:
  - Read local SYSPRO / Datarapt tables
  - Write central RPMAssure_App over TCP (102.222.21.220,14333)
  - No linked server required (direct collect)

Modules
-------
  Operators, License, Version/Hotfixes, Tasks, HealthLog, Security
  DTR InformationLevel 1+2+3 (when Datarapt Dtr*Balances exist)
  Jobs: errors-only every 15 min; full jobs nightly

Customers with configs
----------------------
  AHIC, RSR, UVSS, RSS  (ready)
  HYDRA                 (config stub - set InstanceName first)

Deploy + automate (per customer host)
-------------------------------------
1) On the customer SQL server, run:
     Deploy-Syspro-Collect-Automation.ps1
   (writes base pack + customer configs under C:\RPM-Assure\Sql)

2) Install schedule for this host's customer:
     powershell -File C:\RPM-Assure\Sql\base\syspro-direct\Install-OnThisHost.ps1 -CustomerCode AHIC -RunNow

   Repeat on RSR / UVSS / RSS hosts with matching -CustomerCode.

3) Verify estate from central:
     Check-Syspro-Collect-Freshness.ps1

Manual one-shot
---------------
  powershell -File C:\RPM-Assure\Sql\base\syspro-direct\Run-Syspro-Collect-Direct.ps1 `
    -ConfigPath C:\RPM-Assure\Sql\customers\AHIC\Customer.Config.ps1 -JobsErrorsOnly

Scheduled tasks created
-----------------------
  RPMAssure-<CODE>-SysproCollect   every 15 minutes (-JobsErrorsOnly)
  RPMAssure-<CODE>-SysproJobs      daily 02:30 (-IncludeJobs)

Logs
----
  C:\RPM-Assure\Sql\customers\<CODE>\logs\syspro_*.log
