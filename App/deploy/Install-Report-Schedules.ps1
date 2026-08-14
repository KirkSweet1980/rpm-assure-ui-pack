# RPM Assure - scheduled report email (app server)
# Creates cron secret if missing. Daily 18:00, Friday 07:00, 1st 07:00.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Install-Report-Schedules.ps1

$ErrorActionPreference = 'Stop'
$AppUrl = 'http://127.0.0.1:8081'
$AppDir = 'C:\RPM-Assure\App'
$DataDir = Join-Path $AppDir 'data'
New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

$Settings = Join-Path $DataDir 'rpma-settings.json'
if (-not (Test-Path -LiteralPath $Settings)) {
  $alt = 'C:\RPM-Assure\data\rpma-settings.json'
  if (Test-Path -LiteralPath $alt) { $Settings = $alt }
}

$secret = $env:RPM_ASSURE_CRON_SECRET
if (-not $secret) {
  $secFile = Join-Path $DataDir 'cron.secret'
  if (Test-Path -LiteralPath $secFile) {
    $secret = (Get-Content -LiteralPath $secFile -Raw).Trim()
  }
}
if (-not $secret -and (Test-Path -LiteralPath $Settings)) {
  try {
    $j0 = Get-Content -LiteralPath $Settings -Raw | ConvertFrom-Json
    $secret = [string]$j0.cronSecret
  } catch { }
}
if (-not $secret) { $secret = [guid]::NewGuid().ToString('N') }
$secret = $secret.Trim()
if (-not $secret) { throw 'Could not create cron secret.' }

[IO.File]::WriteAllText((Join-Path $DataDir 'cron.secret'), $secret)

if (Test-Path -LiteralPath $Settings) {
  $j = Get-Content -LiteralPath $Settings -Raw | ConvertFrom-Json
} else {
  $j = [pscustomobject]@{ version = 1; smtp = @{ enabled = $false }; sqlConnections = @() }
}
$j | Add-Member -NotePropertyName cronSecret -NotePropertyValue $secret -Force
$j | Add-Member -NotePropertyName updatedAt -NotePropertyValue ([datetime]::UtcNow.ToString('o')) -Force
($j | ConvertTo-Json -Depth 12) | Set-Content -LiteralPath $Settings -Encoding UTF8

$envPath = Join-Path $AppDir '.env.local'
$lines = @()
if (Test-Path -LiteralPath $envPath) {
  $lines = @(Get-Content -LiteralPath $envPath | Where-Object { $_ -notmatch '^\s*RPM_ASSURE_CRON_SECRET=' })
}
$lines += ('RPM_ASSURE_CRON_SECRET=' + $secret)
$lines | Set-Content -LiteralPath $envPath -Encoding ASCII

Write-Host ('cronSecret written length=' + $secret.Length)

function Register-Slot([string]$Name, [string]$Slot, [string]$Schedule, [string]$Start, [string]$Modifier) {
  $url = "$AppUrl/api/cron/weekly-report?slot=$Slot&secret=$secret"
  $tr = "powershell.exe -NoProfile -WindowStyle Hidden -Command `"try { Invoke-WebRequest -UseBasicParsing -Uri '$url' | Out-Null } catch {}\`""
  schtasks /Delete /TN $Name /F 2>$null | Out-Null
  if ($Modifier) {
    schtasks /Create /TN $Name /SC $Schedule /D $Modifier /ST $Start /RL LIMITED /F /TR $tr | Out-Null
  } else {
    schtasks /Create /TN $Name /SC $Schedule /ST $Start /RL LIMITED /F /TR $tr | Out-Null
  }
  Write-Host "Registered $Name $Schedule $Start slot=$Slot"
}

Register-Slot 'RPMAssure-Reports-Daily' 'daily' 'DAILY' '18:00' $null
Register-Slot 'RPMAssure-Reports-Weekly' 'weekly' 'WEEKLY' '07:00' 'FRI'
Register-Slot 'RPMAssure-Reports-Monthly' 'monthly' 'MONTHLY' '07:00' '1'
Write-Host 'OK. Configuration > Email: turn SMTP on and set Report To.'
Write-Host 'Then Configuration > Report Packs: Send daily now to prove.'
