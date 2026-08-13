# HYDRA - fill SqlInstanceName / LocalSql* before scheduling
$CustomerCode = 'HYDRA'
$DisplayName = 'Hydrasales'
$InstanceName = ''   # REQUIRED: exact warehouse InstanceName after Dim_Customer.SqlInstanceName is set
$LocalSqlUser = 'Rpm_collect'
$LocalSqlPassword = 'RpmCollect#AHIC2026'
$CentralSqlUser = 'rpmassure'
$CentralSqlPassword = '@ssuR3me!'
$CentralDataSource = '102.222.21.220,14333'
$CentralDatabase = 'RPMAssure_App'
$CollectDir = 'C:\RPM-Assure\Sql\customers\HYDRA'
$LogDir = 'C:\RPM-Assure\Sql\customers\HYDRA\logs'
