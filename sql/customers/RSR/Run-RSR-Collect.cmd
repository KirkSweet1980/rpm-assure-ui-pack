@echo off
cd /d "C:\RPM-Assure\Sql\customers\RSR"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\RPM-Assure\Sql\customers\RSR\Run-RSR-Collect-Scheduled.ps1" %*
exit /b %ERRORLEVEL%
