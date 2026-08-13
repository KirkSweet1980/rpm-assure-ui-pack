# Copy to Cove.Config.ps1 and fill in. Do NOT commit real secrets.
# ASCII-only for Windows PowerShell 5.1
#
# Create API user in Backup Management Console (backup.management)
# Partner = top-level company Name in Cove (MSP partner name)

$ApiUrl = 'https://api.backup.management/jsonapi'

# Partner name as shown in Cove (not customer code)
$Partner = 'PASTE_PARTNER_NAME'

# API username / password
$Username = 'PASTE_API_USERNAME'
$Password = 'PASTE_API_PASSWORD'

# Optional: limit rows printed in explore
$MaxDevicesSample = 30

$OutDir = Join-Path $PSScriptRoot 'out'
