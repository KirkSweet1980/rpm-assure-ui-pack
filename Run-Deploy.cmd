@echo off
REM Double-click on the APP server (will prompt for Administrator).
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"C:\RPM-Assure\deploy\Deploy-RpmAssure.ps1\"'"
