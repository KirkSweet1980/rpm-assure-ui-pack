HTTPS-only for assure.rpmresources.co.za (Let's Encrypt via Caddy)
==================================================================

Architecture
  Internet --:443 only--> Caddy (TLS) --proxy--> Node/Vite on 127.0.0.1:8081
  Port 80 is NOT used (no HTTP listener, no HTTP-01 challenge).

ONE-SHOT (Administrator on app server)
--------------------------------------
1) DNS: create A record
     assure.rpmresources.co.za  ->  public IP of this Windows host

2) Firewall: allow TCP 443 inbound only (do not open 80)

3) Download RPMAssure_SSL_Pack.zip to Downloads, then:

   $ErrorActionPreference = 'Stop'
   $zip = Get-ChildItem "$env:USERPROFILE\Downloads\RPMAssure_SSL_Pack*.zip" |
     Sort-Object LastWriteTime -Descending | Select-Object -First 1
   if (-not $zip) { throw 'Put RPMAssure_SSL_Pack.zip in Downloads' }
   New-Item -ItemType Directory -Force -Path C:\RPM-Assure\deploy | Out-Null
   Expand-Archive $zip.FullName C:\RPM-Assure\deploy -Force
   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Preflight-SSL.ps1
   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Install-SSL-All.ps1

4) Restart the app so auth cookies use HTTPS URL

5) Open: https://assure.rpmresources.co.za

Let's Encrypt note
------------------
  HTTP-01 (port 80) is disabled. Caddy uses TLS-ALPN-01 on port 443.
  DNS A-record + open 443 from the internet are required.

Own certificate
---------------
  Settings → Platform → SSL / HTTPS → Own certificate → upload PEM → Apply Caddyfile

Troubleshooting
---------------
  Cert fails:
    - DNS not pointing to this public IP
    - Port 443 blocked (cloud NSG / ISP)
    - Check C:\RPM-Assure\deploy\logs\caddy-*.log
  Login fails after HTTPS:
    - Re-run Patch-Env-Https.ps1 and restart Node
