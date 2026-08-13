Redsun Raisins (RSR)
Server : RSR-SQLSRV-DB
DBs    : SysproDB, SysproCompanyRSL, SysproCompanyRST
Admin  : SYSPROAdmin / Syspr0SA
Collect: rpmassure / @ssuR3me!

CENTRAL first:
  208 + 208b (if not done)
  301_Central_Register_RSR.sql

ON RSR-SQLSRV-DB:
  1) Test-NetConnection 102.222.21.220 -Port 14333  (need True)
  2) Finish-RSR-OnCustomer.ps1 -InstallSchedule
