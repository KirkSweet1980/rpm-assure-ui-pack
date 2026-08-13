# 1 — Run Portfolio live (your network)

This Grok preview **cannot** open your central SQL host. Run the app on a PC/server that can.

## Checklist

| # | Check |
|---|--------|
| 1 | `Dim_Customer` AHIC → SqlInstanceName set |
| 2 | `Syspro_Operators` has rows for that instance |
| 3 | Host can `sqlcmd` to central as `Rpm_collect` |
| 4 | App started with SQL env vars set (no passwords in git) |

## A) Pre-check SQL (PowerShell)

```powershell
sqlcmd -S "your-central-host,14333" -d "RPMAssure_App" -U "Rpm_collect" -P "<YOUR_COLLECT_PASSWORD>" -C -Q "SELECT CustomerCode, SqlInstanceName, Active FROM dbo.Dim_Customer WHERE CustomerCode='AHIC'; SELECT COUNT(*) AS Ops FROM dbo.Syspro_Operators WHERE InstanceName='AHIC-SSQL-SRV';"
```

## B) Start app with live env

### Option — env file

In the **app project root** create `.env.local` (do not commit):

```
RPM_ASSURE_DATA_MODE=auto
RPM_ASSURE_SQL_SERVER=your-central-host,14333
RPM_ASSURE_SQL_DATABASE=RPMAssure_App
RPM_ASSURE_SQL_USER=Rpm_collect
RPM_ASSURE_SQL_PASSWORD=<YOUR_COLLECT_PASSWORD>
RPM_ASSURE_SQL_TRUST_CERT=true
```

```powershell
cd <app-root>
npm install
npm run dev
```

### Option — script (no file)

```powershell
cd <app-root>
.\scripts\run-live.ps1
```

## Troubleshooting

| Symptom | Check |
|---------|--------|
| SQL failed + error text | Network, password, firewall, or encrypt/trust cert |
| Login failed Rpm_collect | Reset login on central; re-enter password in Settings → SQL |
| Demo data | Mode is demo or SQL unreachable |
