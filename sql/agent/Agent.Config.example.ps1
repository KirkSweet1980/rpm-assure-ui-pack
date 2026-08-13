# Copy to C:\RPM-Assure\Agent\Agent.Config.ps1 on the customer host
$CustomerCode = 'UVSS'
$DisplayName = 'Unique Ventilation Systems'
$InstanceName = 'UVSS-SYSPRO'
$RoleTags = 'syspro'   # syspro | api | file | all

# Central RPM Assure SQL (same as collect)
$CentralDataSource = '102.222.21.220,14333'
$CentralDatabase = 'RPMAssure_App'
$CentralSqlUser = 'Rpm_collect'
$CentralSqlPassword = 'CHANGE_ME'

# Paths on this host
$SqlRoot = 'C:\RPM-Assure\Sql'
$AgentRoot = 'C:\RPM-Assure\Agent'
$LogDir = 'C:\RPM-Assure\Agent\logs'

# Optional: override job list (else auto for RoleTags=syspro)
# $AgentJobs = @(
#   @{ Name='syspro-core'; IntervalMin=15; Script='C:\RPM-Assure\Sql\base\syspro-direct\Run-Syspro-Collect-Direct.ps1'; Args=@('-ConfigPath','C:\RPM-Assure\Sql\customers\UVSS\Customer.Config.ps1','-JobsErrorsOnly') }
# )
