RPM Assure - APP SERVER UPDATES (canonical)
===========================================

Always this method. Do not use raw.githubusercontent.com.

1) I push the UI to:
   https://github.com/KirkSweet1980/rpm-assure-ui-pack

2) On the APP server (Administrator PowerShell) run:

   powershell -NoProfile -ExecutionPolicy Bypass -File $env:USERPROFILE\Downloads\Update-AppServer.ps1

   First time only, if that file is missing, paste the Deploy-NoGit / Update-AppServer
   writer block from chat (writes into Downloads, then runs).

What the script does:
- git pull if Git is installed, else GitHub zipball (codeload / github.com)
- Backs up C:\RPM-Assure\App\src
- Copies new UI
- Restarts RPMAssure-App
- ALWAYS copies scripts + zip into Downloads

Never save a GitHub webpage as a .ps1 (that causes xhtml / 503 errors).
