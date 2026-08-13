# RPM Assure — standard collect schedule

## One path for all customers

Use **base direct collect** (TCP to central). Do **not** rely on linked-server packs for new schedules.

| Customer | Host | Install (as Administrator) | Nightly |
|----------|------|----------------------------|---------|
| AHIC | AHIC-SSQL-SRV | `Sql\customers\AHIC\Install-AHIC-Schedule.ps1` | 02:15 |
| RSR | RSR-SQLSRV-DB | `Sql\customers\RSR\Install-RSR-Schedule.ps1` | 02:30 |
| RSS | RSS-PROD | `Sql\customers\RSS\Install-RSS-Schedule.ps1` | 02:45 |
| UVSS | UVSS-SYSPRO | `Sql\customers\UVSS\Install-UVSS-Schedule.ps1` | 03:00 |

Each installer calls:

`Sql\base\syspro-direct\Install-Schedule.ps1 -ConfigPath Customer.Config.ps1`

### Tasks created

- `RPMAssure-{CODE}-SysproCollect` — every **15 minutes**, jobs **errors-only**
- `RPMAssure-{CODE}-SysproJobs` — **nightly**, full job extract (capped)

### Manual test

```powershell
powershell -File C:\RPM-Assure\Sql\customers\RSS\Run-Collect-Direct.ps1
```

### PK / duplicate safety

Base runner clears the day (`SnapshotDate + InstanceName`) before insert for operators, license, hotfixes, etc.

### Logs

Customer `logs\` folder — rotated ~14 days via `Lib-Sqlcmd`.

### App host report tasks

| Task | When | Script |
|------|------|--------|
| RPMAssure-WeeklyReport | Mon 07:00 | `deploy\Install-Weekly-Report-Task.ps1` |
| RPMAssure-MonthlyReport | Day 1 07:15 | `deploy\Install-Monthly-Report-Task.ps1` |
