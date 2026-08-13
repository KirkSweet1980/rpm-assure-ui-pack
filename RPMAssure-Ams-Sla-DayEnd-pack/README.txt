RPM Assure — one-shot UI update
SLA clocks (Rev 5.0) + Day end tile + Monthly AMS pack

Run elevated on the APP server (RPMWINRM):

  powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Ams-Sla-DayEnd.ps1

This copies files into C:\RPM-Assure\App\src and restarts service RPMAssure-App.
Then hard-refresh the browser.

What you get
- Customer SLA page = signed Acknowledge / Remote / Restore (no 99.5%)
- SYSPRO → Day end tile (ran / failed / skipped / password risk)
- Reports → Monthly AMS pack + Print button on the Assure pack
