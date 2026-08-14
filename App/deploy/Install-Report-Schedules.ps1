# RPM Assure - scheduled report email (app server)
# Daily 18:00 SAST Day End, Friday 07:00 weekly, 1st 07:00 monthly.
$ErrorActionPreference = 'Stop'
$App = 'http://127.0.0.1:8081'
$Settings = 'C:\RPM-Assure\App\data\rpma-settings.json'
if (-not (Test-Path $Settings)) { $Settings = 'C:\RPM-Assure\data\rpma-settings.json' }
$secret = $env:RPM_ASSURE_CRON_SECRET
if (-not $secret -and (Test-Path $Settings)) {
  try {
    $j = Get-Content -LiteralPath $Settings -Raw | ConvertFrom-Json
    $secret = [string]$j.cronSecret
  } catch { }
}
if (-not $secret) { throw 'No cron secret. Save Email / Report Packs once so the app writes cronSecret.' }

function Register-Slot([string]$Name, [string]$Slot, [string]$Schedule, [string]$Start, [string]$Modifier) {
  $url = "$App/api/cron/weekly-report?slot=$Slot&secret=$secret"
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
Write-Host 'OK. Enable SMTP + Report To (kirk.sweet@rpmresources.co.za) under Configuration > Email.'
