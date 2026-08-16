@echo off
:: RPM Assure Edge Agent - Hydrasales (HYDRA) one-click
:: Right-click > Run as administrator  (or double-click; script self-elevates)
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Hydrasales-Agent.ps1" %*
if errorlevel 1 (
  echo.
  echo INSTALL FAILED - see C:\RPM-Assure\Agent\logs\wizard-install.log
  pause
  exit /b 1
)
echo.
pause
