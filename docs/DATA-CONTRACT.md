# RPM Assure data contract

UI screens read **gold views** only. Collectors stamp `CustomerCode` from `Dim_ExternalIdentity`. Raw vendor JSON lands in `*_Raw` for replay.

## Spine

`Dim_Customer.CustomerCode` is the only tenant key the UI uses.

## Identity

`Dim_ExternalIdentity` (Source, MatchKind, ExternalId, ExternalName, CustomerCode)

| Source | MatchKind | Comes from |
|--------|-----------|------------|
| COVE | name / alias / id | `Dim_Cove_PartnerMap` / Alias |
| PULSEWAY | name / alias | Org map |
| FRESHDESK | name | Company map |
| EPP | name | Bitdefender company map |
| HOST | host-prefix | `AHI%` → AHIC, `AT-%` → ABLE, … |

Refresh: `EXEC dbo.usp_RefreshExternalIdentityFromMaps;`
Stamp Cove: `EXEC dbo.usp_StampCoveFromIdentity;`

New customer mapping = **one row** in `Dim_ExternalIdentity`. Do not add `LIKE` clauses to TypeScript.

## Gold views (Cove)

| Screen | View | Filter |
|--------|------|--------|
| Backup Agents | `vw_Cove_Devices_Latest` | `CustomerCode = @code` |
| Recovery Testing | `vw_Cove_Recovery_Latest` | `CustomerCode = @code` |
| 7-day backup history | `vw_Cove_History_7d` | `CustomerCode = @code` |

Required columns on device/recovery views: AccountId, DeviceName, MachineName, PartnerName, RecoveryPlanType, RecoveryPlanLabel, RecoveryTestStatus, RecoveryColorBar, RecoveryStatus, RecoveryErrors, LastCompletedSessionAt, BackupSessionAt, RecoveryDurationSec, RecoveryDurationLabel, BootStatus, ScreenshotPresented, ScreenshotPath.

Stamp Cove: `EXEC dbo.usp_StampCoveFromIdentity;`

## Gold views (RMM / Pulseway)

| Screen | View | Filter |
|--------|------|--------|
| Servers / workstations | `vw_Rmm_Devices_Latest` | `CustomerCode = @code` |
| Disks / IOPS | `vw_Rmm_Disks_Latest` | `CustomerCode = @code` |
| Org summary | `vw_Rmm_OrgSummary_Latest` | `CustomerCode = @code` |

Stamp RMM: `EXEC dbo.usp_StampPulsewayFromIdentity;`

## Gold views (EPP / Bitdefender)

| Screen | View | Filter |
|--------|------|--------|
| Endpoints | `vw_Epp_Endpoints_Latest` | `CustomerCode = @code` |
| Summary | `vw_Kpi_Epp_Summary` | `CustomerCode = @code` |

Stamp EPP: `EXEC dbo.usp_StampEppFromIdentity;`

**Rule:** new UI column → migration + view first, then collector fills it. UI does not `LIKE` vendor names.

## Bronze

`Cove_Raw` (Kind, ExternalId, ExternalName, Payload JSON). Not queried by the UI.
