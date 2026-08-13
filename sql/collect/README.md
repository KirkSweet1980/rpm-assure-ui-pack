# AHIC collect — one account `Rpm_collect`

| Place | Login | Password |
|-------|--------|----------|
| AHIC local | `Rpm_collect` | site secret (same on all hops) |
| Central | `Rpm_collect` | **same** |
| Linked server remote | `Rpm_collect` | **same** |

Set the password in **all four**: `AHI_Local_Config.ps1`, `207`, `208`, `209` (or env `RPM_COLLECT_PASSWORD`).  
**Never commit real passwords** to docs or git.

## Order

### Central (once)
```powershell
sqlcmd -S "your-central-host,14333" -E -C -b -i .\208_Central_Create_Rpm_collect.sql
# + ensure Dim_Customer has AHIC
```

### AHIC (once)
```powershell
.\Run-AHIC-Setup.ps1
# or: 207 as sa, then 209 as sa
```

### AHIC (daily)
```powershell
.\Run-AHIC-Collect.ps1
# = sqlcmd -S . -U Rpm_collect -P "<YOUR_COLLECT_PASSWORD>" -i 210_...
```

Local `sa` only for **setup** (create login + linked server), not daily collect.
