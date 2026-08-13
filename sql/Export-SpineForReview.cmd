@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Export-SpineForReview.ps1" -ServerInstance "RPMWINRM\RPMREPORTS" -Database "RPMAssure"
echo.
pause
