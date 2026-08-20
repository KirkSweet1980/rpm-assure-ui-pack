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

Required columns on both views: AccountId, DeviceName, MachineName, PartnerName, RecoveryPlanType, RecoveryPlanLabel, RecoveryTestStatus, RecoveryColorBar, RecoveryStatus, RecoveryErrors, LastCompletedSessionAt, BackupSessionAt, RecoveryDurationSec, RecoveryDurationLabel, BootStatus, ScreenshotPresented, ScreenshotPath.

**Rule:** new UI column → migration + view first, then collector fills it.

## Bronze

`Cove_Raw` (Kind, ExternalId, ExternalName, Payload JSON). Not queried by the UI.
