# Pulseway API → RPMAssure schema (RPM RMM Ecosystem)

```
                    ┌─────────────────────┐
                    │  Pulseway API v3    │
                    │  Basic Token auth   │
                    └──────────┬──────────┘
                               │ collect (central host)
                               ▼
                    ┌─────────────────────┐
                    │ Dim_Pulseway_OrgMap │  Organization → CustomerCode
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
 Pulseway_Organizations  Pulseway_Devices   Pulseway_Notifications
 Pulseway_Sites          (estate)           (alerts)
 Pulseway_Groups                │
                                ▼
                     Pulseway_OrgSummary (day rollup)
                                │
                                ▼
                     vw_Kpi_Rmm_*  →  UI: Customer → RPM RMM Ecosystem
```

## Priority collect order

1. **Auth** — `GET /environment`  
2. **Organizations** — map to customers  
3. **Devices** — main estate  
4. **Notifications** — alert pressure  
5. Sites / Groups — structure  
6. Assets / disks — later  

## Collect host

Unlike SYSPRO (agent on **customer SQL**), Pulseway is **central pull**:

- Run on RPM Assure app/SQL host with outbound HTTPS to `api.pulseway.com` (or your enterprise URL).
- Schedule every 15 min (align with SYSPRO collect cadence conceptually).
- Write into `RPMAssure_App` with `rpmassure` (or dedicated collector login).

## Rate limits

Call `GET /ratelimits` during explore; respect headers if present. Prefer one devices list call over N detail calls at first.
