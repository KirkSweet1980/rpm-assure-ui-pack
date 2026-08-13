Remote Site Solutions (RSS) - direct collect
SQL host: RSS-PROD
Collect:  rpmassure / @ssuR3me!
Bootstrap SYSPROAdmin / $y$pr0 (login create only)

CENTRAL once:
  sqlcmd -S "102.222.21.220,14333" -d RPMAssure_App -U rpmassure -P "@ssuR3me!" -C -b -i 301_Central_Register_RSS.sql

ON RSS-PROD:
  powershell -File Install-RSS-OnCustomer.ps1
  (creates rpmassure if needed, deploys runner, runs collect)

Schedule:
  powershell -File C:\RPM-Assure\Sql\customers\RSS\Run-Collect-Direct.ps1
