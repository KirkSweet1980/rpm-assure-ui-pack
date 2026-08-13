$ErrorActionPreference = 'Continue'
Write-Host 'A) Direct central as rpmassure'
sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -U "rpmassure" -P "@ssuR3me!" -C -Q "SELECT SUSER_SNAME() Who, DB_NAME() Db; SELECT TOP 3 CustomerCode, Active FROM Dim_Customer ORDER BY 1;"

Write-Host 'B) Linked logins on local'
sqlcmd -S "." -U "SYSPROAdmin" -P "Syspr0SA" -C -Q "SELECT s.name, ISNULL(p.name,'(default)') LocalLogin, ll.remote_name, ll.uses_self_credential FROM sys.linked_logins ll JOIN sys.servers s ON s.server_id=ll.server_id LEFT JOIN sys.server_principals p ON p.principal_id=ll.local_principal_id WHERE s.name='RPM_CENTRAL';"

Write-Host 'C) Four-part as SYSPROAdmin'
sqlcmd -S "." -U "SYSPROAdmin" -P "Syspr0SA" -C -Q "SELECT TOP 3 CustomerCode FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer;"

Write-Host 'D) Four-part as rpmassure'
sqlcmd -S "." -U "rpmassure" -P "@ssuR3me!" -C -Q "SELECT TOP 3 CustomerCode FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer;"

Write-Host 'E) EXEC AT as SYSPROAdmin'
sqlcmd -S "." -U "SYSPROAdmin" -P "Syspr0SA" -C -Q "EXEC('SELECT TOP 1 CustomerCode FROM RPMAssure_App.dbo.Dim_Customer') AT RPM_CENTRAL;"
