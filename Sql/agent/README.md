# RPM Assure Edge Agent

Windows service on each customer SYSPRO SQL host. One charter for every tenant.

## Responsibilities

| Job | Script | Interval |
|---|---|---|
| SYSPRO collect (core / jobs / FinSight) | `Run-Syspro-Collect-Direct.ps1` | 30 min / daily |
| Windows Critical + Error event logs | `Collect-Windows-EventLog.ps1` | 30 min |
| Disk IOPS on this host | `Collect-Host-Iops.ps1` | 30 min |
| Assure App server link | `Probe-Assure-Link.ps1` | 5 min |
| Heartbeat | built into `RpmAssure-Agent.ps1` | every cycle |

## Security

- Settings are **password protected** (`Set-AgentSettings.ps1`)
- SQL passwords in `Agent.Secrets.bin` (Windows DPAPI, this machine only)
- Folder locked to **SYSTEM + Administrators**

## Tray RAG (keep as-is)

| Light | State |
|---|---|
| Green | Connected — service up, heartbeat fresh |
| Amber | Watch — SYSPRO collect failed (IOPS / events do not trip this) |
| Red | Disconnected — service down or heartbeat stale |

## Install

Use the Windows wizard (same pack for every customer):

```cmd
C:\RPM-Assure\deploy\ui-pack\Sql\agent\installer\Start-Agent-Wizard.cmd
```
