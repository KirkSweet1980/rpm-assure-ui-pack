UVSS — Unique Ventilation Systems
================================
CustomerCode: UVSS
DisplayName: Unique Ventilation Systems
SqlInstanceName / host: UVSS-SYSPRO

DBs (reader grants):
  Sysprodb
  SysproCompanyE, I, M, R, U
  (SRS / SYSPRODeployment skipped for AMS collect)

ORDER:
1) CENTRAL: 301_Central_Register_UVSS.sql
2) UVSS-SYSPRO as sa: 302 then 303
3) Copy this folder to C:\RPM-Assure\Sql\customers\UVSS
4) Test: Run-UVSS-Collect-Scheduled.ps1
5) Schedule: Install-UVSS-Schedule.ps1 as Admin
6) Portfolio refresh — UVSS should appear

Password default: same as AHIC (<YOUR_COLLECT_PASSWORD>) — change if needed in 302/303/runner.
