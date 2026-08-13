RPM Assure - Track C Production
================================

Goal: app always on (survives reboot), optional HTTPS on assure.rpmresources.co.za

STEP 1 - Always-on app (required)
---------------------------------
As Administrator:

  powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Install-TrackC-Production.ps1"

Or if already expanded:

  powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Install-TrackC-Production.ps1

This will:
  - Copy deploy scripts to C:\RPM-Assure\deploy
  - Install Windows service RPMAssure-App (NSSM) OR task RPMAssure-App-OnStart
  - Start app on port 8081

Verify:
  Get-Service RPMAssure-App
  netstat -ano | findstr :8081
  curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8081/

STEP 2 - HTTPS with Let's Encrypt (when DNS ready)
--------------------------------------------------
1) DNS: A record assure.rpmresources.co.za -> this server public IP
2) Firewall: open TCP 80 and 443
3) Install Caddy:
     winget install CaddyServer.Caddy
4) Run:
     powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Install-Caddy-SSL.ps1
     powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Install-Caddy-Service.ps1
     powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Patch-Env-Https.ps1
5) Restart app service so auth uses https URL:
     Restart-Service RPMAssure-App
     - or - schtasks /Run /TN RPMAssure-App-OnStart

Verify:
  https://assure.rpmresources.co.za/

STEP 3 - Optional NSSM (real service, cleaner than Task Scheduler)
------------------------------------------------------------------
Download NSSM, extract to C:\Tools\nssm\ (nssm.exe in win64 or root)
Re-run: Install-App-Service.ps1

Logs
----
  C:\RPM-Assure\deploy\logs\app-stdout.log
  C:\RPM-Assure\deploy\logs\app-stderr.log
  C:\RPM-Assure\deploy\logs\caddy-*.log

Notes
-----
- App still uses Vite on 8081 (proven with SQL + auth on this host).
- Production npm build passes (Vercel preset) for cloud deploy later.
- Caddy terminates TLS and proxies to 127.0.0.1:8081.
- Keep .env.local passwords out of git/zips.
