# Copy to C:\RPM-Assure\Sql\customers\<CODE>\Customer.Config.ps1 and edit
$CustomerCode = 'RSR'
$DisplayName = 'Redsun Raisins'
$InstanceName = 'RSR-SQLSRV-DB'
# LOCAL sqlcmd user on customer SYSPRO SQL host
$LocalSqlUser = 'SYSPROAdmin'
$LocalSqlPassword = 'CHANGE_ME'
# CENTRAL (direct write - no linked server)
$CentralSqlUser = 'rpmassure'
$CentralSqlPassword = 'CHANGE_ME'
$CentralDataSource = '102.222.21.220,14333'
$CentralDatabase = 'RPMAssure_App'
$CollectDir = 'C:\RPM-Assure\Sql\customers\RSR'
$LogDir = 'C:\RPM-Assure\Sql\customers\RSR\logs'
