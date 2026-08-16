RPM Assure Edge Agent - Hydrasales (HYDRA)
==========================================

On HydraSRV (or the target HYDRA host), as Administrator:

  1. Ensure pack is available:
       C:\RPM-Assure\deploy\ui-pack
     (git clone/pull happens automatically if Git is installed)

  2. Run:
       Install-Hydrasales-Agent.cmd
     or:
       powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Hydrasales-Agent.ps1

  3. Enter an agent admin password when prompted (min 8 chars).

What it does
------------
- Installs Windows service RPMAssure-Edge + optional tray icon
- Heartbeat to central = online status (cover does NOT gate online)
- Scans this host for:
    SQL Server  -> required before SYSPRO can be true
    SYSPRO      -> enables PillarSyspro
    Pulseway    -> enables PillarPulseway (RMM)
    Bitdefender -> enables PillarBitdefender (EPP)
    Cove        -> enables PillarCove
- If no SQL is present: SYSPRO is skipped, local SQL config is not required,
  install still completes (heartbeat + host jobs)
- Cover is only ENABLED from the agent, never cleared

Defaults (HYDRA)
----------------
  CustomerCode      = HYDRA
  DisplayName       = Hydrasales
  SqlHost/Instance  = HydraSRV
  Local SQL user    = rpmassure
  Central           = 102.222.21.220,14333 / RPMAssure_App / rpmassure

Logs
----
  C:\RPM-Assure\Agent\logs\wizard-install.log
  C:\RPM-Assure\Agent\logs\agent_*.log

After install
-------------
  Hard-refresh Assure Configuration > Edge Agents
  Confirm green / ONLINE after first heartbeat (~5 min)
