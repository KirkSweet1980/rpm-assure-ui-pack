# RPM Assure - scheduled report email (app server)
# Creates cron secret if missing. Daily 18:00, Friday 07:00, 1st 07:00.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Install-Report-Schedules.ps1

$ErrorActionPreference = "Continue"
$AppDir = "C:\RPM-Assure\App"
$DataDir = Join-Path $AppDir "data"
$Deploy = "C:\RPM-Assure\deploy"
New-Item -ItemType Directory -Force -Path $DataDir, $Deploy | Out-Null

$Settings = Join-Path $DataDir "rpma-settings.json"
if (-not (Test-Path -LiteralPath $Settings)) {
  $alt = "C:\RPM-Assure\data\rpma-settings.json"
  if (Test-Path -LiteralPath $alt) { $Settings = $alt }
}

$secret = $env:RPM_ASSURE_CRON_SECRET
if (-not $secret) {
  $secFile = Join-Path $DataDir "cron.secret"
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
if (-not $secret) { $secret = [guid]::NewGuid().ToString("N") }
$secret = $secret.Trim()
if (-not $secret) { throw "Could not create cron secret." }

[IO.File]::WriteAllText((Join-Path $DataDir "cron.secret"), $secret)

if (Test-Path -LiteralPath $Settings) {
  $j = Get-Content -LiteralPath $Settings -Raw | ConvertFrom-Json
} else {
  $j = [pscustomobject]@{ version = 1; smtp = @{ enabled = $false }; sqlConnections = @() }
}
$j | Add-Member -NotePropertyName cronSecret -NotePropertyValue $secret -Force
$j | Add-Member -NotePropertyName updatedAt -NotePropertyValue ([datetime]::UtcNow.ToString("o")) -Force
($j | ConvertTo-Json -Depth 12) | Set-Content -LiteralPath $Settings -Encoding UTF8

$envPath = Join-Path $AppDir ".env.local"
$lines = @()
if (Test-Path -LiteralPath $envPath) {
  $lines = @(Get-Content -LiteralPath $envPath | Where-Object { $_ -notmatch "^\s*RPM_ASSURE_CRON_SECRET=" })
}
$lines += ("RPM_ASSURE_CRON_SECRET=" + $secret)
$lines | Set-Content -LiteralPath $envPath -Encoding ASCII

$runnerSrc = Join-Path $PSScriptRoot "Run-Report-Slot.ps1"
if (-not (Test-Path -LiteralPath $runnerSrc)) {
  $runnerSrc = "C:\RPM-Assure\deploy\ui-pack\deploy\Run-Report-Slot.ps1"
}
$runner = Join-Path $Deploy "Run-Report-Slot.ps1"
$srcFull = $null
$dstFull = $null
try { if (Test-Path $runnerSrc) { $srcFull = (Get-Item -LiteralPath $runnerSrc).FullName } } catch {}
try { if (Test-Path $runner) { $dstFull = (Get-Item -LiteralPath $runner).FullName } } catch {}
if ($srcFull -and $srcFull -ne $dstFull) {
  Copy-Item -LiteralPath $runnerSrc -Destination $runner -Force
}
if (-not (Test-Path -LiteralPath $runner)) { throw "Missing $runner" }

Write-Host ("cronSecret written length=" + $secret.Length)
Write-Host ("runner " + $runner)

function Register-Slot([string]$Name, [string]$Slot, [string]$Schedule, [string]$Start, [string]$Modifier) {
  $tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $runner + '" -Slot ' + $Slot
  cmd.exe /c ("schtasks /Delete /TN `"" + $Name + "`" /F >nul 2>&1") | Out-Null
  if ($Modifier) {
    $cmd = 'schtasks /Create /F /TN "' + $Name + '" /TR "' + $tr + '" /SC ' + $Schedule + ' /D ' + $Modifier + ' /ST ' + $Start + ' /RU SYSTEM /RL HIGHEST'
  } else {
    $cmd = 'schtasks /Create /F /TN "' + $Name + '" /TR "' + $tr + '" /SC ' + $Schedule + ' /ST ' + $Start + ' /RU SYSTEM /RL HIGHEST'
  }
  cmd.exe /c $cmd
  if ($LASTEXITCODE -eq 0) {
    Write-Host ("Registered " + $Name + " " + $Schedule + " " + $Start + " slot=" + $Slot)
  } else {
    Write-Host ("FAILED " + $Name + " exit=" + $LASTEXITCODE)
  }
}

Register-Slot "RPMAssure-Reports-Daily" "daily" "DAILY" "18:00" $null
Register-Slot "RPMAssure-Reports-Weekly" "weekly" "WEEKLY" "07:00" "FRI"
Register-Slot "RPMAssure-Reports-Monthly" "monthly" "MONTHLY" "07:00" "1"
schtasks /Query /FO TABLE | Select-String -Pattern "RPMAssure-Reports"
Write-Host "OK. Configuration > Email: turn SMTP on and set Report To."
Write-Host "Then Configuration > Report Packs: Send daily now to prove."
