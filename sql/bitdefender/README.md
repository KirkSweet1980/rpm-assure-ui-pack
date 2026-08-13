# Bitdefender GravityZone → RPM End Point Protection

## Explore
```powershell
powershell -File C:\RPM-Assure\Sql\bitdefender\Explore-BitdefenderApi.ps1
powershell -File C:\RPM-Assure\Sql\bitdefender\Explore-BitdefenderApi-Round2.ps1
```

## Collect (daily)
Requires `Bitdefender.Config.ps1` with `$ApiKey` and optional `$AccessUrl`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\bitdefender\Collect-Bitdefender-To-RPMAssure.ps1
```

## Map unmapped endpoints
```sql
INSERT INTO dbo.Dim_Bitdefender_NameMap (Pattern, CustomerCode, MatchType, Priority, Notes)
VALUES (N'BATMAN', N'RPMINT', N'Contains', 50, N'staff device');
```
Then re-run collect.

## Tables
- `Bitdefender_Endpoints` — daily snapshot
- `Dim_Bitdefender_NameMap` — hostname patterns → CustomerCode
- `vw_Kpi_Epp_Summary` — per-customer device counts
- `vw_Bitdefender_Unmapped_Latest` — needs mapping
