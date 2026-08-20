# RSS-PROD direct collect - protect this file
$CustomerCode = 'RSS'
$DisplayName = 'Remote Site Solutions'
$InstanceName = 'RSS-PROD'
$LocalSqlUser = 'rpmassure'
$LocalSqlPassword = ''
$CentralSqlUser = 'rpmassure'
$CentralSqlPassword = ''
$CentralDataSource = '102.222.21.220,14333'
$CentralDatabase = 'RPMAssure_App'
# Bootstrap only (create login) - not used for scheduled collect
$BootstrapSqlUser = 'SYSPROAdmin'
$BootstrapSqlPassword = '$y$pr0'
$CollectDir = 'C:\RPM-Assure\Sql\customers\RSS'
$LogDir = 'C:\RPM-Assure\Sql\customers\RSS\logs'

# Company DBs on RSS-PROD (no Datarapt; native Inv/Ap)
$CompanyDatabases = @('SysproCompanyF','SysproCompanyR','SysproCompanyS','SysproCompanyW')
