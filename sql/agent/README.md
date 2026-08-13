# RPM Assure Edge Agent (Phase 1)

Lightweight agent that sits on each customer / edge server:

1. **Heartbeats** to central `RPMAssure_App` (online / stale)
2. **Runs jobs** on a schedule (SYSPRO collect, FinSight native, ...)
3. **Pushes results** into `Agent_JobRun` + updates `Agent_Registry`

This is the durable pattern replacing ad-hoc Task Scheduler only setups.
Existing collect scripts are reused — the agent is the runner + reporter.

## Architecture

```
EDGE HOST (per customer)                  CENTRAL
------------------------                  -------
RPMAssure-Edge-Agent (every 5 min)
  |-- heartbeat ----------------SQL-----> Agent_Registry / Agent_Heartbeat
  |-- if due: syspro-core ------SQL-----> Syspro_* tables (existing collect)
  |-- if due: syspro-native ----SQL-----> FinSight L1-3
  +-- job result --------------SQL-----> Agent_JobRun
```

**API collects** (Pulseway / Cove / Bitdefender / Graph) stay on the **app host**
via `RPMAssure-All-Api-Collect` — those are not per-customer edge agents.

## Deploy

### Once on central SQL (admin)

```powershell
sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -i C:\RPM-Assure\Sql\agent\470_Ensure_Agent_Tables.sql
```

### On each edge / SYSPRO host

1. Copy `Sql\agent\*` to the host (or expand agent pack).
2. Ensure collect pack exists: `C:\RPM-Assure\Sql\base\syspro-direct\` + `customers\CODE\Customer.Config.ps1`
3. Install:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\agent\Install-Agent.ps1
# edit C:\RPM-Assure\Agent\Agent.Config.ps1
Start-ScheduledTask -TaskName "RPMAssure-Edge-Agent"
```

### Proof on central

```sql
SELECT * FROM dbo.vw_Agent_Status_Latest ORDER BY CustomerCode, HostName;
SELECT TOP 20 * FROM dbo.Agent_JobRun ORDER BY StartedUtc DESC;
```

## Phase 2 (later)

- Pull job definitions from `Agent_JobDefinition` (central control)
- HTTPS API instead of direct SQL (DMZ-friendly)
- File / script push from central
- UI panel under Settings > Agents
- WinSW Windows Service wrapper (vs Task Scheduler)

## Security

- Use `Rpm_collect` (least privilege) for central write
- Prefer a domain service account for the task instead of SYSTEM long-term
- Do not commit real passwords; use Agent.Config.ps1 only on host
