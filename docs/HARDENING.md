# RPM Assure production hardening

Live box: `C:\RPM-Assure`. Pack: `C:\RPM-Assure\deploy\ui-pack`.

## 1. Lock bootstrap + seed secrets (done)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Harden-Production.ps1
Restart-Service RPMAssure-App
```

`/api/bootstrap-admin` is **404** unless `X-Assure-Bootstrap: <secret>`.

## 2. Box backup (do this before rotate)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Backup-Assure-Box.ps1
```

Writes `C:\RPM-Assure\backups\<stamp>\RPMAssure_App.bak` + `secrets.zip`. Copy off-box when you can.

## 3. Rotate `Rpm_collect` (this slice)

Dry-run first (lists current SQL sessions, does not change the login):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Rotate-SqlCollectPassword.ps1
```

Then apply:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Rotate-SqlCollectPassword.ps1 -Apply
```

Updates `secrets\sql-collect.json` + machine env. Central collectors keep working.

**Edge SYSPRO** that still logs in over TCP `102.222.21.220,14333` with the old password will fail until those machines use HTTPS ingest (`POST /api/agent/sql`) or their local Config.ps1 is updated. **Do not firewall 14333 until that is done.**

## 4. Still parked

| Item | Why it waits |
|------|----------------|
| Firewall SQL 14333 (`0.0.0.0`) | SYSPRO edge may still use it |
| `rpmassure` / other SQL logins | Separate from `Rpm_collect`; confirm app Settings user first |
| Single-box HA | App + SQL + Caddy on one host |
| Git history | Old password was committed; rotation is the fix |

**Rule:** agents fetch **only** `https://assure.rpmresources.co.za/downloads` (never GitHub).
