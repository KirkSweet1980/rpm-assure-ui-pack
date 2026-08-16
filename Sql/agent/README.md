# RPM Assure Edge Agent

Windows service on each customer SYSPRO SQL host. One charter for every tenant.

## Online / heartbeat policy

- **Online status is heartbeat-only.** It does **not** depend on which services (SYSPRO, RMM, Cove, EPP, CSP) are on cover.
- Every agent always has the full set of collect scripts on disk.
- Cover only influences which jobs the agent *schedules by default*.
- Central can later enable or deploy any script for any agent.

## Responsibilities

| Job | Script | Interval |
|---|---|---|
| Heartbeat to central | built into `RpmAssure-Agent.ps1` | every cycle |
| SYSPRO collect (when on cover) | `Run-Syspro-Collect-Direct.ps1` | 30 min / daily |
| Windows Critical + Error event logs | `Collect-Windows-EventLog.ps1` | ~2–30 min |
| Disk IOPS on this host | `Collect-Host-Iops.ps1` | ~2–30 min |
| Assure App server link | `Probe-Assure-Link.ps1` | ~2–30 min |

## Security

- Settings are **password protected** (`Set-AgentSettings.ps1`)
- SQL passwords in `Agent.Secrets.bin` (Windows DPAPI, this machine only)
- Folder locked to **SYSTEM + Administrators** when LockFiles is used

## Tray RAG

| Light | State |
|---|---|
| Green | Connected — service up, heartbeat fresh |
| Amber | Error — connected but last job failed |
| Red | Disconnected — service down or heartbeat stale |

## Install

Use the Windows wizard (same pack for every customer):

```cmd
C:\RPM-Assure\deploy\ui-pack\Sql\agent\installer\Start-Agent-Wizard.cmd
```

Or Hydrasales one-click:

```cmd
C:\RPM-Assure\deploy\ui-pack\Sql\customers\HYDRA\Install-Hydrasales-Agent.cmd
```
