@echo off
cd /d "C:\RPM-Assure\Sql\customers\RSS"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\RPM-Assure\Sql\customers\RSS\Run-RSS-Collect-Scheduled.ps1" %*
exit /b %ERRORLEVEL%
