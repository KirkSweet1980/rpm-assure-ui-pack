# Pull Edge agent + native FinSight helpers from GitHub. Safe for Pulseway / scheduled.
param([string]$AgentRoot = 'C:\RPM-Assure\Agent')
$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = 'https://raw.githubusercontent.com/KirkSweet1980/rpm-assure-ui-pack/main'
function Get-RpmaFile([string]$Rel, [string]$Dest) {
  New-Item -ItemType Directory -Force -Path (Split-Path $Dest) | Out-Null
  Invoke-WebRequest -UseBasicParsing -Uri ($base + '/' + $Rel) -OutFile $Dest -TimeoutSec 60
  Write-Host ('ok ' + $Dest)
}
Get-RpmaFile 'Sql/agent/RpmAssure-Agent.ps1' (Join-Path $AgentRoot 'RpmAssure-Agent.ps1')
Get-RpmaFile 'Sql/agent/RpmAssure-Agent-Loop.ps1' (Join-Path $AgentRoot 'RpmAssure-Agent-Loop.ps1')
Get-RpmaFile 'Sql/agent/Start-Agent-Tray.ps1' (Join-Path $AgentRoot 'Start-Agent-Tray.ps1')
Get-RpmaFile 'Sql/agent/Collect-Windows-EventLog.ps1' (Join-Path $AgentRoot 'Collect-Windows-EventLog.ps1')
Get-RpmaFile 'Sql/agent/Collect-Host-Iops.ps1' (Join-Path $AgentRoot 'Collect-Host-Iops.ps1')
Get-RpmaFile 'Sql/agent/Probe-Assure-Link.ps1' (Join-Path $AgentRoot 'Probe-Assure-Link.ps1')
Get-RpmaFile 'Sql/agent/Lib-SecureConfig.ps1' (Join-Path $AgentRoot 'Lib-SecureConfig.ps1')
Get-RpmaFile 'Sql/agent/Lib-RpmaHttps.ps1' (Join-Path $AgentRoot 'Lib-RpmaHttps.ps1')
Get-RpmaFile 'Sql/agent/VERSION' (Join-Path $AgentRoot 'VERSION')
Get-RpmaFile 'Sql/base/syspro-direct/Collect-Dtr-Native-Fallback.ps1' 'C:\RPM-Assure\Sql\base\syspro-direct\Collect-Dtr-Native-Fallback.ps1'
Get-RpmaFile 'Sql/base/syspro-direct/Lib-Sqlcmd.ps1' 'C:\RPM-Assure\Sql\base\syspro-direct\Lib-Sqlcmd.ps1'
Write-Host ('VERSION ' + ((Get-Content (Join-Path $AgentRoot 'VERSION') -Raw).Trim()))
if (Get-Service RPMAssure-Edge -EA SilentlyContinue) {
  Restart-Service RPMAssure-Edge -Force
  Write-Host 'RPMAssure-Edge restarted'
}
exit 0
