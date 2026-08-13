# STANDARD collect login (all new customers):
#   LocalSqlUser     = rpmassure
#   LocalSqlPassword = @ssuR3me!
#   CentralSqlUser   = rpmassure
#   CentralSqlPassword = @ssuR3me!
#
# Copy to CustomerOnboard.Config.ps1 and set identity + DBs.
#   .\New-CustomerOnboardPack.ps1 -ConfigFile .\CustomerOnboard.Config.ps1

$CustomerCode  = 'SFRUIT'
$DisplayName   = 'Sir Fruit'
$InstanceName  = 'SFRUIT-SQL'

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
