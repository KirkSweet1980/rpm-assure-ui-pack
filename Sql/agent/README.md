# RPM Assure Edge Agent

Windows service on each customer host. Works with or without local SQL Server.

## Online / heartbeat policy

- **Online status is heartbeat-only.** Cover never gates online/offline.
- All collect scripts always deployed.
- Cover only influences default job schedule.

## Local product detection (install)

| Detected | Cover |
|---|---|
| **SQL Server** on host | Required before SYSPRO can be true |
| **SYSPRO** (only if SQL present) | `PillarSyspro = 1` |
| **Pulseway** | `PillarPulseway = 1` |
| **Bitdefender** | `PillarBitdefender = 1` |
| **Cove** | `PillarCove = 1` |

**No SQL on the machine → SYSPRO is assumed absent.** Local SQL credentials and SYSPRO config are not required; install continues for heartbeat + host jobs (IOPS, event log, link probe) and any RMM/EPP/Cove cover found.

Only **enables** cover. Never clears.

```powershell
powershell -File C:\RPM-Assure\Agent\Detect-Local-Services.ps1
```

## Error handling

- Cover lookup / enable: soft-fail (install continues)
- Local product scan: soft-fail
- Tray install: soft-fail
- Missing pack / secrets / service script: hard-fail with logged message
- Non-SQL hosts: write identity-only Customer.Config (no local SQL password required)

## Install

```cmd
C:\RPM-Assure\deploy\ui-pack\Sql\agent\installer\Start-Agent-Wizard.cmd
```
