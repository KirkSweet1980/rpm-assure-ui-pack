RPM Assure - automated deploy
=============================

One command (Administrator PowerShell on the APP server):

  powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Deploy-RpmAssure.ps1

Also sync Pulseway / Cove / Bitdefender / Graph after install:

  powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Deploy-RpmAssure.ps1 -SyncApis

First time only: copy Deploy-RpmAssure.ps1 to C:\RPM-Assure\deploy\
Then it always pulls the latest ZIP from:
  https://github.com/KirkSweet1980/rpm-assure-ui-pack

Auth (private repo) - first match wins:
  1) gh auth login   (GitHub CLI)
  2) $env:GITHUB_TOKEN
  3) git clone already present at C:\RPM-Assure\deploy\ui-pack
  4) ZIP already in Downloads\RPMAssure-Full-UI.zip

Or double-click:
  C:\RPM-Assure\deploy\Run-Deploy.cmd
