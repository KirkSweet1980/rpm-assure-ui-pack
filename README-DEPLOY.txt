RPM Assure - APP SERVER UPDATES
===============================

Git first. Nothing goes to Downloads.

Repo:
  https://github.com/KirkSweet1980/rpm-assure-ui-pack

On the APP server (Administrator):

  powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Update-AppServer.ps1

The script:
- Installs Git via winget if missing
- git clone or git pull into C:\RPM-Assure\deploy\ui-pack
- Backs up App\src
- Copies new UI
- Restarts RPMAssure-App

First time only, if Update-AppServer.ps1 is not on the server yet,
install Git then:

  git clone --depth 1 --branch main https://github.com/KirkSweet1980/rpm-assure-ui-pack.git C:\RPM-Assure\deploy\ui-pack
  copy C:\RPM-Assure\deploy\ui-pack\Update-AppServer.ps1 C:\RPM-Assure\deploy\Update-AppServer.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Update-AppServer.ps1
