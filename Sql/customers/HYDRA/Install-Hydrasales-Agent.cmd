@echo off
setlocal
net session >nul 2>&1
if not %errorlevel%==0 (
  powershell -NoProfile -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)
cd /d "%~dp0"
echo.
echo  RPM Assure Edge Agent - Hydrasales (HYDRA)
echo  Running on: %COMPUTERNAME%
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Hydrasales-Agent.ps1" %*
echo.
pause
endlocal
