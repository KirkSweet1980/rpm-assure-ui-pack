# RPM Assure production hardening

Live box: `C:\RPM-Assure`. Pack: `C:\RPM-Assure\deploy\ui-pack`.

## Done in this slice (run once)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Harden-Production.ps1
Restart-Service RPMAssure-App
```

| Control | What it does |
|---------|----------------|
| `/api/bootstrap-admin` | **404** unless `X-Assure-Bootstrap: <RPM_ASSURE_BOOTSTRAP_SECRET>`. Lock default **on**. |
| Admin reset | Only if `admin-bootstrap.json` has `"reset": true` **or** `RPM_ASSURE_RESET_ADMIN=1`. A leftover password file no longer resets login. |
| SQL password | Collectors read `RPM_ASSURE_SQL_PASSWORD` or `C:\RPM-Assure\secrets\sql-collect.json`. **Not in git.** |
| Collect SQL | Pulseway / Cove / Bitdefender / Freshdesk / all-API use `.\RPMREPORTS`, not the public `14333` listener. |
| Secrets ACL | `C:\RPM-Assure\secrets` = Administrators + SYSTEM. |

Emergency bootstrap (on the box only):

```powershell
$sec = Get-Content C:\RPM-Assure\secrets\bootstrap-secret.txt -Raw
Invoke-RestMethod -Uri http://127.0.0.1:8081/api/bootstrap-admin -Headers @{ 'X-Assure-Bootstrap' = $sec.Trim() }
```

## Still parked (do after a change window)

1. **Rotate `Rpm_collect` SQL password** — currently harvested from old Config.ps1 files. After rotate: update `secrets\sql-collect.json` + machine env + customer Config.ps1, then re-run collects.
2. **SQL TCP 14333** — still public for SYSPRO edge if they have not switched to HTTPS ingest. Restrict firewall to known customer IPs; then drop public.
3. **Git history** — `RpmCollect#AHIC2026` was in the ui-pack repo. Treat as leaked; rotation (1) is the fix.
4. **Single-box** — App + SQL + Caddy on one host. No HA. Back up `RPMAssure_App` + `C:\RPM-Assure\secrets`.
5. **Downloads zip** — public `/downloads/rpm-assure-agent.zip` is intentional (agents). Do not put secrets in the zip.

**Rule:** agents still fetch **only** `https://assure.rpmresources.co.za/downloads` (never GitHub).
