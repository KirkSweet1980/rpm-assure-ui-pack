# Apply order — RPMAssure on rpmwinrm\RPMREPORTS

**Do not run** `001` / `002` (greenfield spine).

```powershell
cd C:\RPMAssure\sql

sqlcmd -S "rpmwinrm\RPMREPORTS" -d "RPMAssure" -E -C -i .\00_PreCheck.sql
sqlcmd -S "rpmwinrm\RPMREPORTS" -d "RPMAssure" -E -C -b -i .\003_RPMAssure_KpiViews.sql
sqlcmd -S "rpmwinrm\RPMREPORTS" -d "RPMAssure" -E -C -b -i .\004_RPMAssure_FactAddon_ExecPack.sql
sqlcmd -S "rpmwinrm\RPMREPORTS" -d "RPMAssure" -E -C -b -i .\005_RPMAssure_Datarapt_DtrBalances.sql
sqlcmd -S "rpmwinrm\RPMREPORTS" -d "RPMAssure" -E -C -W -i .\05_SmokeTest.sql
```

| Script | Purpose |
|--------|---------|
| 003 | KPI views (telemetry) |
| 004 | Fact_* exec pack |
| 005 | Datarapt DTR balances (all 10) + levels + variance views |

Or:

```powershell
.\Apply-RpmAssure-003-004.ps1 -ServerInstance "rpmwinrm\RPMREPORTS"
```
