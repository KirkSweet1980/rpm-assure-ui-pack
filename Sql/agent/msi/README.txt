RPM Assure Edge - signed MSI

1) On the Assure box, install WiX (once):
     winget install --id WiXToolset.WiX -e
   and Windows SDK Signing Tools (signtool).

2) Build:
     powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\sql\agent\msi\Build-Agent-Msi.ps1

3) Sign (Authenticode PFX, not in git):
     $env:RPM_ASSURE_CODE_SIGN_PFX = 'C:\RPM-Assure\secrets\codesign.pfx'
     $env:RPM_ASSURE_CODE_SIGN_PASSWORD = '<pfx password>'
     powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\sql\agent\msi\Sign-Agent-Msi.ps1

   Or a cert already in LocalMachine\My:
     powershell ... Sign-Agent-Msi.ps1 -Thumbprint <sha1>

4) Publish is just the file in C:\RPM-Assure\downloads\rpm-assure-agent.msi
   (Apply-UiPack / Caddy /downloads already serves that folder).

5) On the customer host (Administrator):
     [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
     Invoke-WebRequest -UseBasicParsing -Uri 'https://assure.rpmresources.co.za/downloads/rpm-assure-agent.msi' -OutFile $env:TEMP\rpm-assure-agent.msi
     msiexec /i $env:TEMP\rpm-assure-agent.msi CUSTOMERCODE=AHIC /qb

Bitdefender GravityZone: exclude C:\RPM-Assure (On-Access + ATC) or the MSI extract still gets scanned.

Do not install on Interbrand (SYSPRO No Cover / No agent).
