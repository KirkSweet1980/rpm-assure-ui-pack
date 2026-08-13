@echo off
REM Launcher for Task Scheduler (reliable under SYSTEM)
cd /d C:\RPM-Assure\Sql\collect
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\RPM-Assure\Sql\collect\Run-AHIC-Collect-Scheduled.ps1" %*
exit /b %ERRORLEVEL%
