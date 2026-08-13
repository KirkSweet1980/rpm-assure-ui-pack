# RPM Assure — connection config (locked)

| Item | Value |
|------|--------|
| Central host | `102.222.21.220` |
| Central port | **`14333`** (not 1433) |
| **sqlcmd / SSMS server** | **`102.222.21.220,14333`** |
| Named instance (on-box only) | `rpmwinrm\RPMREPORTS` |
| App database | **`RPMAssure_App`** |
| Warehouse (legacy) | `RPMAssure` (optional) |
| Linked server name (on customer) | **`RPM_CENTRAL`** |
| Linked server data source | **`102.222.21.220,14333`** |
| Collect login | **`Rpm_collect`** |
| Four-part target from customer | `[RPM_CENTRAL].[RPMAssure_App]` |

## Format rules

```text
CORRECT:  102.222.21.220,14333
WRONG:    102.222.21.220:14333
WRONG:    102.222.21.220,1433
```

SQL Server uses a **comma** before the port.

## Examples

```powershell
# Central (admin)
sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -Q "SELECT @@SERVERNAME, DB_NAME();"

# Central as collector
sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -U "Rpm_collect" -P "<<local>>" -C -Q "SELECT SUSER_SNAME(), DB_NAME();"
```

```sql
-- Linked server datasrc
@datasrc = N'102.222.21.220,14333'

-- From customer scripts
FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer
```


## Dual authentication (customer collect)

| Hop | Server | Auth | Purpose |
|-----|--------|------|---------|
| 1 Local | Customer SQL (e.g. AHIC-SSQL-SRV) | **Windows** (`-E` / RPMAdmin) | Read Sysprodb / company DBs |
| 2 Remote | `102.222.21.220,14333` | **SQL** `Rpm_collect` via linked server | Write `RPMAssure_App` |

Linked server setting (on customer):

```sql
@useself     = N'false'     -- do NOT send Windows user to central
@rmtuser     = N'Rpm_collect'
@rmtpassword = N'<<password>>'
@datasrc     = N'102.222.21.220,14333'
```

Wrong: `sqlcmd -S "102.222.21.220,14333" -E` from AHIC as local Windows user.  
Right: `sqlcmd -S "." -E -i 210_...sql` so local is Windows; remote is Rpm_collect via `RPM_CENTRAL`.

## AHIC local (non-prod)

| Item | Value |
|------|--------|
| Local SQL user | `sa` |
| Local password | see `collect/AHI_Local_Config.ps1` (not for central) |
| Central user | `Rpm_collect` only |
| Central address | `102.222.21.220,14333` |

```powershell
# On AHIC-SSQL-SRV
cd C:\RPM-Assure\Sql\collect
.\Run-AHIC-LinkedServer.ps1   # once (set Rpm_collect pwd in 209 first)
.\Run-AHIC-Collect.ps1        # daily
```
