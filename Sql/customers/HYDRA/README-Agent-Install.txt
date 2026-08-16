RPM Assure Edge Agent - Hydrasales (HYDRA)
==========================================

One-click install for the SYSPRO SQL host (HydraSRV).

QUICK START
-----------
1. Copy this whole HYDRA folder (or just the two Install-Hydrasales-Agent.* files)
   to the SQL server, e.g. C:\Temp\HYDRA\
2. Right-click Install-Hydrasales-Agent.cmd  ->  Run as administrator
3. Enter an Agent admin password when prompted (min 8 chars).
   This password protects later changes via Set-AgentSettings.ps1.
4. Wait for "INSTALL COMPLETE" / service RPMAssure-Edge Running.
5. On the Assure app server: hard-refresh Configuration and confirm heartbeat.

SILENT / SCRIPT
---------------
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Hydrasales-Agent.ps1 `
  -AdminPassword "YourAgentPass8+" `
  -LocalSqlPassword "@ssuR3me!" `
  -CentralSqlPassword "@ssuR3me!"

Optional switches:
  -SkipGit     Use already-present C:\RPM-Assure\deploy\ui-pack (no git)
  -NoTray      Do not install the system-tray RAG icon
  -NoStart     Install service but leave it stopped
  -LockFiles   ACL the Agent folder to SYSTEM + Administrators only

PRE-REQUISITES
--------------
- Windows Administrator on the HYDRA SQL host
- Local SQL login "rpmassure" already exists (created by onboard)
- Outbound TCP 14333 to 102.222.21.220 (central) OR use -Skip central checks later
- Prefer: C:\RPM-Assure\deploy\ui-pack already present (from Bootstrap / Deploy-Syspro)

AFTER INSTALL
-------------
Service name : RPMAssure-Edge
Agent root   : C:\RPM-Assure\Agent
Config       : C:\RPM-Assure\Sql\customers\HYDRA\Customer.Config.ps1
Secrets      : C:\RPM-Assure\Agent\Agent.Secrets.bin  (DPAPI, this machine only)
Tray         : green = OK / amber = job error / red = disconnected

Change settings later:
  powershell -File C:\RPM-Assure\Agent\Set-AgentSettings.ps1

Version note: uses the same engine as the general wizard (Install-Assure-Agent.ps1).
