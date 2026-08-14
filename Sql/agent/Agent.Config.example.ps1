# Non-secret only. Copy to Agent.Config.ps1
# Passwords: Agent.Secrets.bin (DPAPI). Edit via Set-AgentSettings.ps1
$CustomerCode = 'SIRF'
$DisplayName = 'Sir Fruit'
$InstanceName = 'SIRZAAPSQL01'
$RoleTags = 'syspro'
$CentralDataSource = '102.222.21.220,14333'
$CentralDatabase = 'RPMAssure_App'
$CentralSqlUser = 'rpmassure'
$SqlRoot = 'C:\RPM-Assure\Sql'
$AgentRoot = 'C:\RPM-Assure\Agent'
$LogDir = 'C:\RPM-Assure\Agent\logs'
