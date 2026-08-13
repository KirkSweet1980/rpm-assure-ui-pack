# RMM leg architecture (multitenant)

## Product stance

| Word | Meaning |
|------|---------|
| **Customer** | Multitenant entity (never Tenant / Domain) |
| **Leg / Source** | Product pillar under a customer |
| **RMM (UI)** | RPM RMM Ecosystem |
| **Pulseway (technical)** | API / table prefix for the primary RMM product |
| **Connection** | Settings → Integrations row (`Dim_Connection`) |

SYSPRO is **leg 1**. RMM is **leg 2**. Same spine, parallel UI tree.

## Spine join keys

```
Dim_Customer (CustomerCode PK)
│
├── SYSPRO leg
│     SqlInstanceName  ──►  Syspro_* .InstanceName
│     PillarSyspro = 1
│
└── RMM leg
      PulsewayOrgName / Dim_Pulseway_OrgMap
      CustomerCode     ──►  Pulseway_* .CustomerCode
      PillarPulseway = 1
```

**Do not** put RMM rows on `InstanceName`. Customer owns both legs.

## Schema (physical)

| Table | Role | SYSPRO analogue |
|-------|------|-----------------|
| `Dim_Pulseway_OrgMap` | Map external org → CustomerCode | Dim_Customer.SqlInstanceName |
| `Pulseway_OrgSummary` | Day snapshot rollup per customer | portfolio / health strip |
| `Pulseway_Devices` | Estate inventory | Syspro_Operators |
| `Pulseway_Notifications` | Alerts | Syspro_JobLogging (errors) |
| `Pulseway_Disks` | Capacity pressure | DTR pressure |
| `Pulseway_Groups` / `Sites` / `Organizations` | Structure | OperGroup / companies |

## KPI views (app reads these)

| View | Use |
|------|-----|
| `vw_Kpi_Rmm_OrgSummary_Latest` | Hub stats + RAG |
| `vw_Kpi_Rmm_Devices_Latest` | Devices page |
| `vw_Kpi_Rmm_Notifications_Latest` | Alerts page |
| `vw_Kpi_Rmm_Disks_Latest` | Disk pressure (≥85%) |
| `vw_Kpi_Rmm_Portfolio` | Future ExCo strip |

RAG (RMM): **Red** if critical alerts > 0 or offline ≥ 5; **Amber** if any offline / elevated / high disk; else **Green**.

## UI (mirrors SYSPRO)

```
Customer
  Executive brief
  SYSPRO          → health, operators, jobs, dtr, security, license, hotfixes, sql
  RMM             → overview, devices, alerts, mapping
  AMS pack        → incidents, risks, sla, change  (cross-leg)
```

Routes:

- `/customers/{code}/rmm` — hub
- `/customers/{code}/rmm/overview` — org summary + RAG
- `/customers/{code}/rmm/devices` — online/offline estate
- `/customers/{code}/rmm/alerts` — notifications
- `/customers/{code}/rmm/mapping` — OrgMap / Connection status

## Collect (next implementation)

1. API credentials on **central** (or per-connection) — not on customer SQL.
2. Map Pulseway org → `CustomerCode` (`Dim_Pulseway_OrgMap`).
3. Snapshot write: clear day for customer, insert OrgSummary + Devices + Notifications.
4. Enable `PillarPulseway = 1` when map + data present.
5. Optional demo: `421_Seed_Rmm_Sample_Demo.sql` for AHIC only.

## What stays out of RMM leg

- Cove backup → separate leg later  
- Bitdefender EPP → separate leg later  
- AMS facts (incidents/SLA) stay shared under AMS pack  

## Scripts

| Script | Purpose |
|--------|---------|
| `central/420_Ensure_Rmm_Leg.sql` | Tables + views |
| `central/421_Seed_Rmm_Sample_Demo.sql` | Optional AHIC demo |
| `central/410_Ensure_Integration_Connections.sql` | Connection catalogue |
