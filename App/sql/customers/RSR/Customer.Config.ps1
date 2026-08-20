$CustomerCode = 'RSR'
$DisplayName = 'Redsun Raisins'
$InstanceName = 'RSR-SQLSRV-DB'
# LOCAL sqlcmd user on RSR-SQLSRV-DB (must exist here)
$LocalSqlUser = 'SYSPROAdmin'
$LocalSqlPassword = 'Syspr0SA'
# CENTRAL (direct checks only)
$CentralSqlUser = 'rpmassure'
$CentralSqlPassword = ''
$CentralDataSource = '102.222.21.220,14333'
$CentralDatabase = 'RPMAssure_App'
$CollectDir = 'C:\RPM-Assure\Sql\customers\RSR'
$LogDir = 'C:\RPM-Assure\Sql\customers\RSR\logs'

# FinSight native GL control map (backup if central Dim_FinSight_GlControlMap empty)
# RSL: AP 00-72010 matches ApControl CurBalance1; AR debtors; INV stock GLs; WIP 00-80115
$GlControlMapByDb = @{
  'SysproCompanyRSL' = @{
    AP  = @('00-72010')
    AR  = @('00-82000', '00-82005')
    INV = @('00-80190', '00-80160', '00-80185', '00-80165')
    WIP = @('00-80115')
  }
  'SysproCompanyRST' = @{
    INV = @('00-81000', '00-81100', '00-81600', '00-81650')
    WIP = @('00-81750', '00-81800')
    AP  = @('00-91000', '00-91100', '00-91200')
    AR  = @('01-82000', '01-82100')
  }
}

$CompanyDatabases = @('SysproCompanyRSL','SysproCompanyRST')
