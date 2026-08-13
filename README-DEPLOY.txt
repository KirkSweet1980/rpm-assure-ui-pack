RPM Assure - automated deploy
=============================

The ZIP and scripts are ALWAYS written to your Downloads folder:
  %USERPROFILE%\Downloads\RPMAssure-Full-UI.zip
  %USERPROFILE%\Downloads\Deploy-RpmAssure.ps1
  %USERPROFILE%\Downloads\Install-RpmAssure-Full-UI.ps1
  %USERPROFILE%\Downloads\Sync-All-Apis-Now.ps1

One command (Administrator PowerShell):

  powershell -NoProfile -ExecutionPolicy Bypass -File $env:USERPROFILE\Downloads\Deploy-RpmAssure.ps1

With API sync:

  powershell -NoProfile -ExecutionPolicy Bypass -File $env:USERPROFILE\Downloads\Deploy-RpmAssure.ps1 -SyncApis
