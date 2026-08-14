# HYDRA / Hydrasales - SQL host HydraSRV (192.168.196.1)
$CustomerCode = 'HYDRA'
$DisplayName = 'Hydrasales'
$InstanceName = 'HydraSRV'
$LocalSqlUser = 'rpmassure'
$LocalSqlPassword = '@ssuR3me!'
$CentralSqlUser = 'rpmassure'
$CentralSqlPassword = '@ssuR3me!'
$CentralDataSource = '102.222.21.220,14333'
$CentralDatabase = 'RPMAssure_App'
$CollectDir = 'C:\RPM-Assure\Sql\customers\HYDRA'
$LogDir = 'C:\RPM-Assure\Sql\customers\HYDRA\logs'
$CompanyDatabases = @(
  'Sysprodb',
  'Sysprodb1',
  'SYSPRODeployment',
  'SysproCompanyC',
  'SysproCompanyC_SRS',
  'SysproCompanyD',
  'SysproCompanyD_SRS',
  'SysproCompanyH',
  'SysproCompanyH_SRS'
)
