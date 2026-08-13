# Pulseway -> RPM RMM Ecosystem

## Tenant API

| Item | Value |
|------|--------|
| Base URL | `https://rpmresourcesza.pulseway.com/api/v3` |
| Auth | HTTP Basic (Token ID + Token Secret) |
| Collect host | Central (RPM Assure / SQL host) |

## Quick start

```powershell
cd C:\RPM-Assure\Sql\rmm\pulseway

# 1) Config (once)
$env:PW_TOKEN_ID = 'YOUR_TOKEN_ID'
$env:PW_TOKEN_SECRET = 'YOUR_TOKEN_SECRET'
powershell -NoProfile -ExecutionPolicy Bypass -File .\Write-PulsewayConfig.ps1

# 2) Auth test
powershell -NoProfile -ExecutionPolicy Bypass -File .\Test-PulsewayAuth.ps1

# 3) Explore (optional - JSON samples under out\)
powershell -NoProfile -ExecutionPolicy Bypass -File .\Explore-PulsewayApi.ps1

# 4) Ensure SQL objects (admin once if Rpm_collect cannot CREATE)
sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -i .\440_Ensure_Pulseway_Collect.sql

# 5) Collect
powershell -NoProfile -ExecutionPolicy Bypass -File .\Collect-Pulseway-To-RPMAssure.ps1

# 6) Schedule every 15 min (Administrator)
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Pulseway-Schedule.ps1
```

## Map orgs to customers

- Auto: after collect (`441_AutoMap_Pulseway_Orgs.sql`)
- Manual alias:

```sql
INSERT INTO dbo.Dim_Pulseway_OrgAlias (OrganizationName, CustomerCode, Active, Notes)
VALUES (N'Exact Pulseway Org Name', N'AHIC', 1, N'manual');
```

Only **managed** customers (with `SqlInstanceName`) receive auto-maps.

## UI

Customer -> **RMM** tab (RPM RMM Ecosystem): Overview, Devices, Alerts, Org mapping.
