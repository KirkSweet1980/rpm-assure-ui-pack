# Example only. Deploy-Assure-Agent.ps1 writes the live file.
# Agents talk HTTPS to Assure. Do not put a SQL password here.
$CustomerCode = 'AHIC'
$DisplayName = 'AHI'
$InstanceName = $env:COMPUTERNAME
$RoleTags = 'edge'
$CentralDataSource = ''
$CentralDatabase = 'RPMAssure_App'
$CentralSqlUser = ''
$SqlRoot = 'C:\RPM-Assure\Sql'
$AgentRoot = 'C:\RPM-Assure\Agent'
$LogDir = 'C:\RPM-Assure\Agent\logs'
