RPM Assure - Weekly email schedule
==================================

1) Configure SMTP in the app: Settings -> SMTP
   - Enable outbound email
   - Host / user / password / From
   - Weekly report To (semicolon-separated)

2) Generate cron secret (app host):
   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\weekly-email\Set-Cron-Secret.ps1

3) Restart vite/app so RPM_ASSURE_CRON_SECRET is loaded.

4) Manual test:
   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\weekly-email\Run-Weekly-Email.ps1

5) Install Monday 07:00 schedule (Administrator):
   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\weekly-email\Install-Weekly-Email-Schedule.ps1

Email content: Red/Amber customers + mandatory hotfix gaps (waivers excluded).
Endpoint: POST http://127.0.0.1:8081/api/cron/weekly-report
Header: X-RPMA-Cron-Secret: <secret>
