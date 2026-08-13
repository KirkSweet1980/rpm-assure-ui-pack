# Generate or set cron secret for /api/cron/weekly-report
# Writes: C:\RPM-Assure\App\data\cron.secret
#         C:\RPM-Assure\App\data\rpma-settings.json cronSecret
#         appends RPM_ASSURE_CRON_SECRET to .env.local
param(
  [string]$AppDir = 'C:\RPM-Assure\App',
  [string]$Secret = ''
)

$ErrorActionPreference = 'Stop'
$data = Join-Path $AppDir 'data'
New-Item -ItemType Directory -Force -Path $data | Out-Null

if (-not $Secret) {
  $Secret = [guid]::NewGuid().ToString('N')
}

$secFile = Join-Path $data 'cron.secret'
[IO.File]::WriteAllText($secFile, $Secret)

# settings json
$settingsPath = Join-Path $data 'rpma-settings.json'
if (Test-Path -LiteralPath $settingsPath) {
  $j = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
} else {
  $j = [pscustomobject]@{ version = 1; smtp = @{ enabled = $false }; sqlConnections = @() }
}
$j | Add-Member -NotePropertyName cronSecret -NotePropertyValue $Secret -Force
$j | Add-Member -NotePropertyName updatedAt -NotePropertyValue ([datetime]::UtcNow.ToString('o')) -Force
($j | ConvertTo-Json -Depth 12) | Set-Content -LiteralPath $settingsPath -Encoding UTF8

# env.local
$envPath = Join-Path $AppDir '.env.local'
$lines = @()
if (Test-Path -LiteralPath $envPath) {
  $lines = Get-Content -LiteralPath $envPath | Where-Object { $_ -notmatch '^\s*RPM_ASSURE_CRON_SECRET=' }
}
$lines += ('RPM_ASSURE_CRON_SECRET=' + $Secret)
$lines | Set-Content -LiteralPath $envPath -Encoding ASCII

Write-Host 'Cron secret written to:' -ForegroundColor Green
Write-Host ('  ' + $secFile)
Write-Host ('  ' + $settingsPath + ' (cronSecret)')
Write-Host ('  ' + $envPath + ' (RPM_ASSURE_CRON_SECRET)')
Write-Host 'Restart the app process so env is picked up.' -ForegroundColor Yellow
Write-Host ('Secret length=' + $Secret.Length + ' (not printed).')
