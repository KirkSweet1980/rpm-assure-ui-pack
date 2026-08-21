# DEPRECATED. Auto-publish retired.
# pack VERSION != live VERSION must NEVER automatically publish an Agent.
# Use Publish-AgentRelease.ps1 only.
param(
  [string]$Root = 'C:\RPM-Assure'
)
Write-Host 'DEPRECATED Publish-Agent-Pack-IfStale: no automatic Agent publish. Exit 0.'
exit 0
