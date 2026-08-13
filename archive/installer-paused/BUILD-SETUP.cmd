@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo === RPM Assure - materialize scripts + build Setup.exe ===

REM Convert every *.ps1.txt to *.ps1 under this tree (zip ships .txt only)
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = Get-Location; Get-ChildItem -LiteralPath $root -Recurse -Filter '*.ps1.txt' | ForEach-Object { $dest = $_.FullName -replace '\.ps1\.txt$','.ps1'; Copy-Item -LiteralPath $_.FullName -Destination $dest -Force; Write-Host ('WROTE ' + $dest) }"

if not exist "setup-wizard\RpmAssure.Setup.csproj" (
  echo ERROR: setup-wizard\RpmAssure.Setup.csproj missing
  dir /s /b *.csproj 2>nul
  pause
  exit /b 1
)

if not exist "scripts\Build-SetupExe.ps1" (
  echo ERROR: scripts\Build-SetupExe.ps1 missing
  dir /b scripts
  pause
  exit /b 1
)

if not exist "scripts\Build-True-Setup-Wizard.ps1" (
  echo WARN: Build-True-Setup-Wizard.ps1 missing - using Build-SetupExe.ps1 only
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Build-SetupExe.ps1" -AppSource "C:\RPM-Assure\App"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Build-True-Setup-Wizard.ps1"
)
set ERR=%ERRORLEVEL%
echo.
echo Exit %ERR%
if exist "%~dp0dist" dir /b "%~dp0dist"
pause
exit /b %ERR%
