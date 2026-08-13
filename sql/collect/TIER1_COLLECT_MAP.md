# Tier 1 collect map (AHIC)

| # | Script | Source | Central | Status |
|---|--------|--------|---------|--------|
| 212 | Operators + LastLogin | AdmOperator + AdmOperatorLogin | Syspro_Operators | Live |
| 213 | Job logging (full) | AHICAR_I.AdmJobLogging | Syspro_JobLogging | Live (slow) |
| 214 | System license | Sysprodb.AdmSystemLicense | Syspro_SystemLicense | New |
| 215 | Task groups/items | AdmTaskGroup / AdmTaskItem | Syspro_TaskGroup/Item | New |
| 216 | Health log | AdmSysHealthLog | Syspro_HealthLog | New |
| 217 | DTR L1 (later) | AHICAR_I.Dtr*Balances | Syspro_Dtr* | Mapped; build next |
| 213b | Jobs error-only | ProgErrorCode <> 0 | Syspro_JobLogging | Planned |

## Column maps (discovered)

### 214 AdmSystemLicense
ImportDate, LicenseXml, LicenseType, Users, UserType, CompanyCount, LicenseStart, LicenseExpiry,
ProductName, ProductVersion, LicenseRegion, Customer, LicenseSite, CustomerName, CustomerId, SaaS,
ExcessUserFlag, ExcessUserExpiry

### 215 AdmTaskGroup
Operator, TaskGroup, AutoRun, AutoCheck, AutoMarkComplete, PromptBetTasks, SuppressErrors,
StopIfError, AutoLockout, KillAll, EmailLogFile

### 215 AdmTaskItem
Operator, TaskGroup, StartDate, SequenceNumber, Description, Comment, TaskType, Program, StartFolder, Occurrance

### 216 AdmSysHealthLog
RunDateTime, Operator, HealthFunction, Description, StatusFlag, Message (+ LicensedUsers, LoggedOnUsers on source)

### 217 DtrInvBalances (pattern for all Dtr*Balances)
GlYear, GlPeriod, GlCode, Warehouse/dims, InformationLevel, Description, *Open/Close balances, Variance, RefreshDate

## Run order (manual)
1. Central: 230_Ensure_Tier1_Tables.sql
2. AHIC: 214, 215, 216
3. UI: wire license/health tiles later
