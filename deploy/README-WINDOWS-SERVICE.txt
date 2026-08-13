RPM Assure as a Windows service
===============================

This stops the start/stop fight (scheduled task vs Vite vs old .output).

Install ONCE (Administrator PowerShell on the APP server):

  $zip  = "$env:USERPROFILE\Downloads\RPMAssure-Windows-Service.zip"
  $dest = "C:\RPM-Assure\deploy"
  Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force
  Unblock-File "$dest\Install-RpmAssure-WindowsService.ps1"
  powershell -NoProfile -ExecutionPolicy Bypass -File "$dest\Install-RpmAssure-WindowsService.ps1"

After that, only use:

  Restart-Service RPMAssure-App
  Stop-Service    RPMAssure-App
  Start-Service   RPMAssure-App
  Get-Service     RPMAssure-App

Or:

  powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Restart-RpmAssure-Service.ps1

The old task RPMAssure-App-OnStart is deleted so it cannot restart the old app.

Service starts automatically after reboot.
Logs: C:\RPM-Assure\deploy\logs\app-stdout.log
      C:\RPM-Assure\deploy\logs\app-stderr.log
