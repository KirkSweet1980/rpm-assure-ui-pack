# Remote Site Solutions — standard collect credentials
$CustomerCode  = 'RSS'
$DisplayName   = 'Remote Site Solutions'
# CONFIRM InstanceName = exact SQL host name on customer site
$InstanceName  = 'RSS-SYSPRO'

$LocalSqlUser     = 'rpmassure'
$LocalSqlPassword = '@ssuR3me!'
$CentralSqlUser     = 'rpmassure'
$CentralSqlPassword = '@ssuR3me!'
$CentralDataSource  = '102.222.21.220,14333'
$CentralDatabase    = 'RPMAssure_App'

$CompanyDatabases = @(
  'Sysprodb'
)

$LinkedServerName   = 'RPM_CENTRAL'
$LinkedProvider     = 'MSOLEDBSQL'
$OutRoot            = 'C:\RPM-Assure\Sql\customers'
$SourceCollectDir   = 'C:\RPM-Assure\Sql\collect'
$SourceUvssDir      = 'C:\RPM-Assure\Sql\customers\UVSS'
$SourceAhicExtraDir = 'C:\RPM-Assure\Sql\customers\AHIC'
$CoreIntervalMinutes = 15
$JobsDailyTime       = '02:45'
