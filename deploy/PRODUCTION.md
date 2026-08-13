RPM Assure - Production readiness
=================================

Public URL
  https://assure.rpmresources.co.za
App (internal)
  http://127.0.0.1:8081  (Caddy reverse-proxies 443 -> 8081)

One-shot switch to production node-server
  powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Go-Production.ps1

What Go-Production does
  1. Ensures .env.local production keys (BETTER_AUTH_URL, SECRET, PORT)
  2. npm run build:node  (Nitro node-server + pglite assets)
  3. Installs/restarts Windows service (or ONSTART task) to run:
       node .output\server\index.mjs
  4. Health-checks http://127.0.0.1:8081/login

HTTPS (Caddy)
  powershell -File C:\RPM-Assure\deploy\Start-Caddy-Https-443.ps1
  Or service: Install-Caddy-Service.ps1

Required .env.local (App folder)
  RPM_ASSURE_DATA_MODE=auto
  RPM_ASSURE_SQL_SERVER=host,14333
  RPM_ASSURE_SQL_DATABASE=RPMAssure_App
  RPM_ASSURE_SQL_USER=Rpm_collect
  RPM_ASSURE_SQL_PASSWORD=***
  RPM_ASSURE_SQL_TRUST_CERT=true
  VITE_AUTH_ENABLED=true
  BETTER_AUTH_URL=https://assure.rpmresources.co.za
  BETTER_AUTH_TRUSTED_ORIGINS=https://assure.rpmresources.co.za
  BETTER_AUTH_SECRET=<32+ random hex>
  PORT=8081
  NITRO_PORT=8081
  HOST=0.0.0.0

Firewall
  - 443 inbound public (HTTPS)
  - Prefer 8081 only localhost (block public)

Data collects (keep scheduled)
  RPMAssure-Pulseway-Collect
  RPMAssure-Cove-CyberBackup
  RPMAssure-*-SysproCollect
  Bitdefender EPP collect (schedule if not already)

Post go-live checks
  1. Login page loads over HTTPS
  2. Sign-in works
  3. EXCO Insight loads
  4. Customer RMM / Cove / EPP pages show Cover vs No Cover correctly
  5. App auto-starts after reboot

Rollback to vite-dev (if needed)
  Remove/stop service, then:
    cd C:\RPM-Assure\App
    npx vite dev --host 0.0.0.0 --port 8081
  Or re-run Install-App-Service.ps1 after deleting .output
