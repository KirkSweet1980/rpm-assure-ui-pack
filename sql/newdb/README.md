# RPMAssure_App — clean database

| Item | Value |
|------|--------|
| Server (remote) | **`102.222.21.220,14333`** |
| Server (on box) | `rpmwinrm\RPMREPORTS` or `.\RPMREPORTS` |
| Database | **`RPMAssure_App`** |

```powershell
sqlcmd -S "102.222.21.220,14333" -E -C -b -i .\100_Create_RPMAssure_App.sql
sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -W -i .\101_Smoke_RPMAssure_App.sql
```

Port is **14333** (comma syntax: `IP,14333` — never `IP:14333`).
