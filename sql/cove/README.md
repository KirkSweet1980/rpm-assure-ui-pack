# RPM Cyber Backup - Cove API explore

**UI name:** RPM Cyber Backup  
**Technical:** N-able Cove Data Protection (`Cove_*` tables)

## Quick start (on central host)

```powershell
# After Install-Cove-Explore.ps1
cd C:\RPM-Assure\Sql\cove

powershell -NoProfile -ExecutionPolicy Bypass -File .\Write-CoveConfig.ps1 `
  -Partner 'YOUR_MSP_PARTNER_NAME' `
  -Username 'api_user' `
  -Password '***'

powershell -NoProfile -ExecutionPolicy Bypass -File .\Test-CoveLogin.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\Explore-CoveApi.ps1
```

## What to send back

- Login OK / error message  
- `summary.csv` from `out\<timestamp>\`  
- Field list or filter error text for `EnumerateAccountStatistics`  
- **Do not** paste the password  

## API user setup

1. Log into [backup.management](https://backup.management)  
2. Users -> add user -> enable **API** access  
3. Partner name = top-level company **Name** in Cove (exact spelling)

If Cove is N-central integrated, N-able may need to provision the API user.


## Auto map cleanup

After each collect (or on demand):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\cove\Auto-Map-Cove-Partners.ps1
# first time if CREATE denied:
powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\cove\Auto-Map-Cove-Partners.ps1 -UseWindowsAuth
```

Rules: `Dim_Cove_PartnerAlias` (manual aliases) + high-confidence name match to `Dim_Customer` (score >= 88, no ties). Re-stamps `Cove_DeviceStatistics.CustomerCode` from map.
Still-unmapped partners need a row in `Dim_Cove_PartnerAlias`.
