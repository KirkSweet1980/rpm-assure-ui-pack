# Microsoft 365 Tenant (CSP)

## Recommendation (do this)

**Do not embed Graph secrets inside the collect script.**  
Put auth in a private config file on the app server, same pattern as Bitdefender / Cove.

| Piece | Path |
|-------|------|
| Collect | `Collect-Csp-Graph-To-RPMAssure.ps1` |
| Secrets | `Csp.Config.ps1` (created by you - not in git) |
| Template | `Csp.Config.example.ps1` |
| Wizard | `Write-Csp-Config.ps1` |
| Schedule | `Install-Csp-Schedule.ps1` (daily 05:30) |

## Why not "embedded auth" in one .ps1?

1. Scripts get copied, emailed, and zip'd - secrets leak.  
2. Updates overwrite the collect file and wipe hard-coded secrets.  
3. Scheduled task under SYSTEM can still read a locked-down `Csp.Config.ps1`.

## One-time: Entra app

1. [Entra admin](https://entra.microsoft.com) → **App registrations** → **New registration** (single tenant).  
2. **API permissions** → **Application** permissions + **Grant admin consent**:
   - `Organization.Read.All`
   - `User.Read.All`
   - `Directory.Read.All`
   - Optional: `ServiceHealth.Read.All`  
3. **Certificates & secrets** → **New client secret** → copy **Value** once.  
4. Note **Directory (tenant) ID** and **Application (client) ID**.

## One-time: write config on app server

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\csp\Write-Csp-Config.ps1
```

Or manually:

```powershell
Copy-Item C:\RPM-Assure\Sql\csp\Csp.Config.example.ps1 C:\RPM-Assure\Sql\csp\Csp.Config.ps1
notepad C:\RPM-Assure\Sql\csp\Csp.Config.ps1
```

## Run live collect (replaces pilot seed for that day)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\csp\Collect-Csp-Graph-To-RPMAssure.ps1 -WindowsAuth -SkipSchema
```

Expect log: `Graph token... SKUs=N users=N` and proof row for RPMINT with real counts.

## Schedule daily

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\csp\Install-Csp-Schedule.ps1
Start-ScheduledTask -TaskName "RPMAssure-Csp-GraphCollect"
```

## Pilot seed only (no Graph)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\csp\Collect-Csp-Graph-To-RPMAssure.ps1 -SeedOnly -WindowsAuth
```

## UI

**RPM Internal → Microsoft 365 Tenant** after collect + app restart (if needed; HMR may not apply SQL).


## EXCO posture (461)

Aggregates only (one row/day/customer): Secure Score %, MFA registered %, Global Admins, guests, failed sign-ins (capped sample).

```powershell
sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -i C:\RPM-Assure\Sql\csp\461_Ensure_Csp_Exco_Posture.sql
```

Extra Graph permissions: SecurityEvents.Read.All, AuditLog.Read.All, RoleManagement.Read.Directory
