# RPM Cyber Backup (N-able Cove) architecture

## Product stance

| Word | Meaning |
|------|---------|
| **Customer** | Multitenant entity (never Tenant / Domain) |
| **Leg / Source** | Product pillar under a customer |
| **UI product** | **RPM Cyber Backup** |
| **Technical / tables** | **Cove** (`Cove_*`, API host backup.management) |
| **Connection** | Settings -> Integrations row |

Legs on the same spine:

```
Dim_Customer
  |-- SYSPRO
  |-- RPM RMM Ecosystem (Pulseway)     [paused]
  |-- RPM Cyber Backup (Cove)          [this leg]
  |-- RPM End Point Protection (later)
  +-- Microsoft CSP (later)
```

## API (N-able Cove Data Protection)

| Item | Value |
|------|--------|
| Protocol | **JSON-RPC 2.0** over HTTPS POST |
| Base URL | `https://api.backup.management/jsonapi` |
| Auth | `Login` with partner name + API username + password |
| Session | Response **visa** token reused on later methods |
| Docs | [JSON-RPC API guide](https://documentation.n-able.com/covedataprotection/USERGUIDE/documentation/Content/service-management/json-api/home.htm) |

Create an **API user** in Backup Management (standalone) or request one via N-able (N-central integrated).

## Collect model

- **Central pull** (same as RMM): run on RPM host with outbound HTTPS.
- Map Cove partner / company name -> `CustomerCode` via `Dim_Cove_PartnerMap`.
- Snapshot day into `Cove_DeviceStatistics` (+ optional partners table).

```
Cove Login -> visa
    |
    v
EnumeratePartners / GetPartnerInfo
    |
    v
Dim_Cove_PartnerMap (PartnerName / PartnerId -> CustomerCode)
    |
    v
EnumerateAccountStatistics (devices / backup status)
    |
    v
Cove_DeviceStatistics (SnapshotDate, AccountId, CustomerCode, ...)
    |
    v
vw_Kpi_Cove_*  ->  UI: Customer -> RPM Cyber Backup
```

## Existing SQL (already in RPMAssure_App)

| Object | Role |
|--------|------|
| `Cove_DeviceStatistics` | Per-device day snapshot (AccountId, status, bytes, last success) |
| `vw_Kpi_Cove_DeviceLatest` | Latest devices per customer |
| `vw_Kpi_Cove_Summary` | Failed / RPO style rollups |

Add if missing:

| Object | Role |
|--------|------|
| `Dim_Cove_PartnerMap` | Partner/company -> CustomerCode |
| `Cove_Partners` | Optional partner tree snapshot |
| `PillarCove` on Dim_Customer | Enable leg in UI |

## Priority methods (explore)

1. `Login`
2. Partner tree (`EnumeratePartners` / variants)
3. `EnumerateAccountStatistics` (device backup health)
4. Optional history / storage later

## RAG (proposed for Cyber Backup)

| RAG | Condition |
|-----|-----------|
| Red | Any failed device on latest snapshot, or RPO breach count > 0 |
| Amber | No recent success window / stale last success |
| Green | All devices OK |

Tune after real field map.

## Explore first

1. Copy `Cove.Config.example.ps1` -> `Cove.Config.ps1`
2. Fill Partner, Username, Password (API user)
3. Run `Explore-CoveApi.ps1`
4. Paste summary (no password) + field names
