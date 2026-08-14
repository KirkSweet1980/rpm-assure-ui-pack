# RPM Assure Edge Agent

Windows **service** on each customer SQL host.

- Heartbeats to central `RPMAssure_App` (`Agent_Registry` / `Agent_Heartbeat`)
- Runs SYSPRO collect for **every** `customers\*\Customer.Config.ps1` on the box
- Light collect every **30 minutes** (`-JobsErrorsOnly`)
- Full jobs once per day (`-IncludeJobs`)
- Writes job results to `Agent_JobRun`

No Task Scheduler. NSSM wraps PowerShell as `RPMAssure-Edge`.

## Once on central SQL

```powershell
sqlcmd -S "102.222.21.220,14333" -d RPMAssure_App -U rpmassure -P "***" -C -i C:\RPM-Assure\Sql\agent\470_Ensure_Agent_Tables.sql
```

## On each SYSPRO SQL host (Administrator)

1. Copy `Sql\agent\*` plus `Sql\base\syspro-direct\*` and `Sql\customers\<CODE>\Customer.Config.ps1` if not already there.
2. Install:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\agent\Install-Agent-Service.ps1 -RunOnce
```

Same script on every customer. It discovers all configs on the box.

## Proof

```powershell
Get-Service RPMAssure-Edge
Get-Content C:\RPM-Assure\Agent\logs\service.log -Tail 20
```

Central:

```sql
SELECT * FROM dbo.vw_Agent_Status_Latest ORDER BY CustomerCode;
SELECT TOP 20 * FROM dbo.Agent_JobRun ORDER BY StartedUtc DESC;
```

Or Configuration > Agents in Assure.
