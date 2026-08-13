# What we extract (RPMAssure_App)

| # | Destination table | Purpose / KPI |
|---|-------------------|---------------|
| 1 | `Syspro_Operators` | Active Users (30-day logins) |
| 2 | `Syspro_JobLogging` | SYSPRO job errors → Health RAG |
| 3 | `Syspro_HealthLog` | Health drivers (optional) |
| 4 | `Syspro_DtrApBalances` … `Wpi` (10) | Datarapt control variance |
| 5 | `Dim_Customer_SyncLog` | Run audit |

## Source objects (defaults — change per site)

| Variable | Default | Notes |
|----------|---------|--------|
| `@SrcOperator` | `AdmOperator` | Common SYSPRO operator master |
| `@SrcJobLog` | `AdmJobLogging` | **Often different** on real sites |
| `@SrcHealthLog` | `AdmHealthLog` | Optional |
| `@SrcDtrPrefix` | `Dtr` | → `DtrApBalances`, etc. |

If Operators/JobLog fail, list tables:

```sql
SELECT name FROM sys.tables WHERE name LIKE '%Oper%' OR name LIKE '%Job%' OR name LIKE '%Log%' ORDER BY 1;
SELECT name FROM sys.tables WHERE name LIKE 'Dtr%' ORDER BY 1;
```

Send that list and we map columns exactly.

## Prerequisites on Dim_Customer

```sql
-- RPMAssure_App
UPDATE Dim_Customer
SET SqlInstanceName = N'CUSTOMER_SQL\INSTANCE', UpdatedAt = SYSUTCDATETIME()
WHERE CustomerCode = N'AHIC';
```

`@InstanceName` in the collect script must match `SqlInstanceName`.
