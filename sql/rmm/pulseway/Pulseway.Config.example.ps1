# Copy to Pulseway.Config.ps1 and fill in. Do NOT commit real secrets.
# Token: Pulseway -> Account / API Tokens (Token ID + Secret = HTTP Basic)
# ASCII-only for Windows PowerShell 5.1

# RPM Resources ZA tenant (self-hosted / branded)
$BaseUrl = 'https://rpmresourcesza.pulseway.com/api/v3'
# Cloud default (if you ever switch back):
# $BaseUrl = 'https://api.pulseway.com/v3'

$TokenId = 'PASTE_TOKEN_ID'
$TokenSecret = 'PASTE_TOKEN_SECRET'

# Explore sample limits (collect loads all pages it can)
$MaxDevicesSample = 25
$MaxNotificationsSample = 50

# Central SQL (collect writes here)
$SqlServer = '102.222.21.220,14333'
$SqlDatabase = 'RPMAssure_App'
$SqlUser = 'Rpm_collect'
$SqlPassword = 'RpmCollect#AHIC2026'

$OutDir = Join-Path $PSScriptRoot 'out'
