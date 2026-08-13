# FinSight DTR L2/L3 — customer runbook

## Goal
Land **InformationLevel 1 + 2 + 3** into central `Syspro_Dtr*` so FinSight mid/detail tables fill and the amber banner goes away.

## Architecture (one sentence)
| Role | Machine | What lives there |
|------|---------|------------------|
| **Source** | Customer SYSPRO SQL host | Company DBs + Datarapt `Dtr*Balances` |
| **Landing** | App/central `.\RPMREPORTS` | `RPMAssure_App` facts + FinSight views |
| **App** | same central / Caddy | UI reads landing only |

**Never run source collect against `.\RPMREPORTS` expecting new L2/L3** — central has no Datarapt source tables.

---

## Files (deploy under `C:\RPM-Assure\Sql\`)

### Per customer (copy whole folder to that host or keep on central for deploy)

| Customer | Folder | All-levels SQL | Typical SQL host / instance |
|----------|--------|----------------|-----------------------------|
| AHIC | `customers\AHIC\` | `217c_Collect_AHIC_DtrAllLevels.sql` | `AHIC-SSQL-SRV` |
| UVSS | `customers\UVSS\` | `217c_Collect_UVSS_DtrAllLevels.sql` | `UVSS-SYSPRO` |
| RSR | `customers\RSR\` | `217c_Collect_RSR_DtrAllLevels.sql` | `RSR-SQLSRV-DB` |
| RSS | `customers\RSS\` | `217c_Collect_RSS_DtrAllLevels.sql` | `RSS-PROD` |
| HYDRA | — | **No cover for now** (marked no SYSPRO cover) | — |

### Shared runners (all hosts)

| File | Purpose |
|------|---------|
| `collect\Run-Dtr-AllLevels.ps1` | Run 217c with preflight (needs linked server `RPM_CENTRAL` on host) |
| `collect\Diagnose-Dtr-Sql-Target.ps1` | Why sqlcmd fails (named instance / wrong box) |
| `base\syspro-direct\Run-Syspro-Collect-Direct.ps1` | **Preferred** full collect incl. DTR L1–3 (no linked server) |
| `base\syspro-direct\Customer.Config.ps1` | Per-host config (copy from `Customer.Config.example.ps1`) |
| `base\syspro-direct\Install-OnThisHost.ps1` | Deploy + schedule on customer host |
| `central\462_Proof_Dtr_Levels.sql` | Proof counts on central |

---

## Path A — preferred (customer host, scheduled direct collect)

Use this if `RPMAssure-<CODE>-SysproCollect` already exists or you used Install-OnThisHost.

### On each customer SQL host

```powershell
# 1) Ensure config exists (edit once per host)
# C:\RPM-Assure\Sql\base\syspro-direct\Customer.Config.ps1
#   $CustomerCode = 'UVSS'          # AHIC | UVSS | RSR | RSS
#   $InstanceName = 'UVSS-SYSPRO'    # must match Dim_Customer.SqlInstanceName
#   $LocalSqlUser / $LocalSqlPassword  (or Windows)
#   $CentralDataSource = '102.222.21.220,14333'
#   $CentralSqlUser / $CentralSqlPassword / $CentralDatabase = 'RPMAssure_App'

# 2) One-shot L1-3 (+ ops/license/etc.)
powershell -NoProfile -ExecutionPolicy Bypass `
  -File "C:\RPM-Assure\Sql\base\syspro-direct\Run-Syspro-Collect-Direct.ps1" `
  -ConfigPath "C:\RPM-Assure\Sql\base\syspro-direct\Customer.Config.ps1"

# 3) Optional DTR-only force (same script; DTR is included unless -SkipDtr)
```

Log should show lines like `DTR <CompanyDb>.DtrApBalances L1-3 rows=...` and summary `DtrL2|n` `DtrL3|n`.

### Schedule (already installed on some hosts)

```powershell
Get-ScheduledTask | Where-Object { $_.TaskName -like 'RPMAssure-*-Syspro*' } |
  Format-Table TaskName, State
# Manual run:
schtasks /Run /TN "RPMAssure-UVSS-SysproCollect"
# AHIC / RSR / RSS: change the task name
```

---

## Path B — 217c all-levels SQL (customer host + linked server RPM_CENTRAL)

### Files on host

```
C:\RPM-Assure\Sql\customers\<CODE>\217c_Collect_<CODE>_DtrAllLevels.sql
C:\RPM-Assure\Sql\collect\Run-Dtr-AllLevels.ps1
```

### Run (on customer host)

```powershell
# Local default instance:
powershell -NoProfile -ExecutionPolicy Bypass `
  -File "C:\RPM-Assure\Sql\collect\Run-Dtr-AllLevels.ps1" `
  -CustomerCode UVSS -SqlServer "." -WindowsAuth

# Named instance on that host:
... -SqlServer ".\INSTANCENAME" -WindowsAuth

# SQL login:
... -CustomerCode AHIC -SqlServer "." -SqlUser Rpm_collect -SqlPassword "***"
```

Requires **linked server `RPM_CENTRAL`** pointing at central. If missing, use Path A.

---

## Path C — app server only (proof, not collect)

```powershell
# Local central instance name is RPMREPORTS (NOT ".")
sqlcmd -S ".\RPMREPORTS" -d "RPMAssure_App" -E -C `
  -i "C:\RPM-Assure\Sql\central\462_Proof_Dtr_Levels.sql"

# One-liner:
sqlcmd -S ".\RPMREPORTS" -d "RPMAssure_App" -E -C -Q "SET NOCOUNT ON; SELECT CustomerCode, InformationLevel, COUNT(*) Cnt FROM dbo.vw_FinSight_ControlBalances_All WITH (NOLOCK) GROUP BY CustomerCode, InformationLevel ORDER BY 1,2;"
```

Expect rows for levels **1, 2, and 3** after a good customer collect.

---

## Per-customer checklist

### AHIC
1. RDP → `AHIC-SSQL-SRV` (or actual SYSPRO SQL host)
2. Files: `customers\AHIC\217c_...` **or** `base\syspro-direct` + config with `CustomerCode=AHIC`, `InstanceName=AHIC-SSQL-SRV`
3. Run Path A or B
4. Task: `RPMAssure-AHIC-SysproCollect` if present

### UVSS
1. RDP → UVSS SYSPRO SQL host (`UVSS-SYSPRO`)
2. Files: `customers\UVSS\217c_Collect_UVSS_DtrAllLevels.sql`
3. Path A preferred (`Install-OnThisHost` already used there)
4. Task: `RPMAssure-UVSS-SysproCollect`

### RSR
1. RDP → `RSR-SQLSRV-DB`
2. Files: `customers\RSR\217c_Collect_RSR_DtrAllLevels.sql`
3. Path A or B; task `RPMAssure-RSR-SysproCollect` if installed
4. Old stub `217_Collect_RSR_DtrLevel1.sql` is L1-only — **do not use** for L2/L3

### RSS
1. RDP → `RSS-PROD`
2. Files: `customers\RSS\217c_Collect_RSS_DtrAllLevels.sql`
3. Path A or B; task `RPMAssure-RSS-SysproCollect` if installed

### HYDRA
- UI **No Cover** for SYSPRO until later — skip DTR collect

---

## After collect

1. On central: run Path C proof — need `InformationLevel` 2 and 3 counts > 0  
2. Hard-refresh FinSight for that customer  
3. Amber “L2 / L3 detail not on central yet” should clear when L2/L3 rows exist  

---

## Deploy pack from chat zip

Expand to central, then copy `Sql\customers\<CODE>` + `Sql\collect` + `Sql\base\syspro-direct` to each customer host (or robocopy).

```powershell
# On central after download
$zip = Get-ChildItem "$env:USERPROFILE\Downloads\RPMAssure-Dtr-Customer-Pack*.zip" |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
$tmp = Join-Path $env:TEMP ('dtrpack_' + [guid]::NewGuid().ToString('N'))
Expand-Archive $zip.FullName $tmp -Force
Copy-Item "$tmp\sql\*" "C:\RPM-Assure\Sql\" -Recurse -Force
```

Then robocopy `C:\RPM-Assure\Sql` to each customer host’s `C:\RPM-Assure\Sql`.
