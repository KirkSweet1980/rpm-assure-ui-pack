# Hydrasales onboard identity. Run Onboard-Hydrasales.ps1 on the SQL host
# so InstanceName is set from @@SERVERNAME. Then Bootstrap-Customer-Agent.ps1.
$CustomerCode  = 'HYDRA'
$DisplayName   = 'Hydrasales'
$InstanceName  = 'HYDRASRV'

$LocalSqlUser     = 'rpmassure'
$LocalSqlPassword = ''
$CentralSqlUser     = 'rpmassure'
$CentralSqlPassword = ''
$CentralDataSource  = '102.222.21.220,14333'
$CentralDatabase    = 'RPMAssure_App'
$LinkedServerName   = 'RPM_CENTRAL'
$OutRoot            = 'C:\RPM-Assure\Sql\customers'
$CollectDir         = 'C:\RPM-Assure\Sql\customers\HYDRA'
$LogDir             = 'C:\RPM-Assure\Sql\customers\HYDRA\logs'
