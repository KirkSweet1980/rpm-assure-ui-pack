# AHIC direct collect config - protect this file
$CustomerCode = 'AHIC'
$DisplayName = 'AHI Carrier'
$InstanceName = 'AHIC-SSQL-SRV'
$LocalSqlUser = 'Rpm_collect'
$LocalSqlPassword = ''
$CentralSqlUser = 'rpmassure'
$CentralSqlPassword = '@ssuR3me!'
$CentralDataSource = '102.222.21.220,14333'
$CentralDatabase = 'RPMAssure_App'
$CollectDir = 'C:\RPM-Assure\Sql\customers\AHIC'
$LogDir = 'C:\RPM-Assure\Sql\customers\AHIC\logs'

# Optional FinSight native GL map when Datarapt missing:
# $GlControlMap = @{ INV = '....'; AP = '....'; AR = '....'; WIP = '....' }
# Native FinSight for all customers (user policy). Optional host backup:
# $GlControlMapByDb = @{ 'SysproCompanyX' = @{ AP = @('..'); INV = @('..') } }

# AHIC company DBs (not SysproCompany* naming)
$CompanyDatabases = @('AHICAR_I','AHICAR_Y','AHICAR_Z')
