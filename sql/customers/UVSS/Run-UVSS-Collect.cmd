@echo off
cd /d "C:\RPM-Assure\Sql\customers\UVSS"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\RPM-Assure\Sql\customers\UVSS\Run-UVSS-Collect-Scheduled.ps1" %*
exit /b %ERRORLEVEL%
