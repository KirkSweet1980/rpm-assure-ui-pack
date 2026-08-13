# RPM Assure — SQL Server schema

**Database:** `[RPMAssure]`  
**Product:** RPM Assure (RPMA)  
**Tagline:** Data → Decision → Assured

## Apply (SSMS / sqlcmd)

```text
1. Run 001_RPMAssure_Insight_Schema.sql   (creates DB + objects)
2. Run 002_RPMAssure_Insight_Seed.sql     (admin, pilots, demo rows)
```

```bash
sqlcmd -S YourSqlHost -E -i 001_RPMAssure_Insight_Schema.sql
sqlcmd -S YourSqlHost -E -i 002_RPMAssure_Insight_Seed.sql
```

## Seed summary

| Item | Value |
|------|--------|
| Admin user | `administrator` (`IsPlatformAdmin = 1`) |
| Password | Set `PasswordHash` from the app — seed is a placeholder |
| CUS-00001 | AHI Carriers |
| CUS-00002 | Sir Fruit |
| CUS-00003 | Redsun Raisins |

## Time

- Stored as **SAST (UTC+2)** in `*Sast` columns  
- UI displays as **`20:30 PM`**  
- API uses ISO **`+02:00`**

## v1 out of scope

- SYSPRO tables  
- Customer portal  
- Entra login (column reserved: `EntraObjectId`)  
- Cross-customer migration / domains  

## Files

| File | Purpose |
|------|---------|
| `001_RPMAssure_Insight_Schema.sql` | DDL |
| `002_RPMAssure_Insight_Seed.sql` | Seed + demo |
| `README.md` | This file |
