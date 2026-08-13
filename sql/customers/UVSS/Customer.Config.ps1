# UVSS direct collect config - protect this file
$CustomerCode = 'UVSS'
$DisplayName = 'Unique Ventilation Systems'
$InstanceName = 'UVSS-SYSPRO'
$LocalSqlUser = 'Rpm_collect'
$LocalSqlPassword = 'RpmCollect#AHIC2026'
$CentralSqlUser = 'rpmassure'
$CentralSqlPassword = '@ssuR3me!'
$CentralDataSource = '102.222.21.220,14333'
$CentralDatabase = 'RPMAssure_App'
$CollectDir = 'C:\RPM-Assure\Sql\customers\UVSS'
$LogDir = 'C:\RPM-Assure\Sql\customers\UVSS\logs'

# Optional: FinSight native fallback GL control accounts (when Datarapt missing)
# Run Discover-Gl-Control-Accounts.ps1 first, then set codes from chart of accounts.
# $GlControlMap = @{
#   INV = '1200'
#   AP  = '2000'
#   AR  = '1100'
#   WIP = '1300'
# }
# Or per company DB:
# $GlControlMapByDb = @{
#   'SysproCompanyU' = @{ INV = '1200'; AP = '2000'; AR = '1100'; WIP = '1300' }
# }
# Native FinSight for all customers (user policy). Optional host backup:
# $GlControlMapByDb = @{ 'SysproCompanyX' = @{ AP = @('..'); INV = @('..') } }

# Company DBs (native fallback)
$CompanyDatabases = @('SysproCompanyE','SysproCompanyI','SysproCompanyM','SysproCompanyR','SysproCompanyU')
