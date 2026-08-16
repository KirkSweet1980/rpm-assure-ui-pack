# Fix a broken / permission-denied ui-pack, then launch wizard 2.7.
# Must be Administrator.
$ErrorActionPreference = "Continue"
$git = "C:\Program Files\Git\cmd\git.exe"
$Pack = "C:\RPM-Assure\deploy\ui-pack"
$Repo = "https://github.com/KirkSweet1980/rpm-assure-ui-pack.git"

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw "Right-click PowerShell -> Run as administrator, then run this again." }

if (-not (Test-Path $git)) { throw "Git not found at $git" }

Write-Host "Stopping hung git / wizard..."
Get-Process git, git-remote-https -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue
Get-Process powershell -EA SilentlyContinue | ForEach-Object {
  if ($_.Id -eq $PID) { return }
  $cl = (Get-CimInstance Win32_Process -Filter ("ProcessId=" + $_.Id) -EA SilentlyContinue).CommandLine
  if ($cl -match "Install-Customer-Pack-Wizard|Launch-Fresh|git.exe") {
    Stop-Process -Id $_.Id -Force -EA SilentlyContinue
  }
}

New-Item -ItemType Directory -Force -Path C:\RPM-Assure\deploy | Out-Null
if (Test-Path $Pack) {
  Write-Host "Taking ownership of pack..."
  cmd /c "takeown /F `"$Pack`" /R /D Y >nul 2>&1"
  cmd /c "icacls `"$Pack`" /grant Administrators:F /T /C /Q >nul 2>&1"
  Get-ChildItem $Pack -Force -Recurse -Filter "*.lock" -EA SilentlyContinue | Remove-Item -Force -EA SilentlyContinue
}

$needClone = $true
if (Test-Path "$Pack\.git") {
  Write-Host "Trying fetch..."
  cmd /c "`"$git`" -C `"$Pack`" fetch --all --prune"
  if ($LASTEXITCODE -eq 0) {
    cmd /c "`"$git`" -C `"$Pack`" reset --hard origin/main"
    if ($LASTEXITCODE -eq 0) { $needClone = $false }
  }
}

if ($needClone) {
  Write-Host "Pack is broken - remove and clone fresh..."
  if (Test-Path $Pack) { cmd /c "rmdir /s /q `"$Pack`"" }
  New-Item -ItemType Directory -Force -Path C:\RPM-Assure\deploy | Out-Null
  cmd /c "`"$git`" clone --depth 1 --branch main $Repo `"$Pack`""
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$Pack\Sql\agent\installer\Install-Customer-Pack-Wizard.ps1")) {
    throw "git clone failed. Check internet / GitHub from this host."
  }
}

cmd /c "`"$git`" -C `"$Pack`" log -1 --oneline"
$wiz = "$Pack\Sql\agent\installer\Install-Customer-Pack-Wizard.ps1"
Write-Host "Launching wizard 2.7..."
powershell -NoProfile -ExecutionPolicy Bypass -File $wiz -CustomerCode RSR -DisplayName "Redsun Raisins" -SqlHost RSR-SQLSRV-DB
