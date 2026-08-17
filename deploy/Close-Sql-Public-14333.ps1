# Close public SQL 14333. Agents write via HTTPS /api/agent/sql.
# Run AFTER Publish-Agent-Pack and a successful customer collect over HTTPS.
# App server still uses local .\RPMREPORTS — this only blocks inbound 14333 from the internet.
$ErrorActionPreference = 'Stop'
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run as Administrator.' }

Get-NetFirewallRule -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -like 'RPMAssure SQL *' } |
  Remove-NetFirewallRule -ErrorAction SilentlyContinue

New-NetFirewallRule -DisplayName 'RPMAssure SQL localhost only' `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 14333 `
  -RemoteAddress '127.0.0.1' -Profile Any | Out-Null

New-NetFirewallRule -DisplayName 'RPMAssure SQL default block' `
  -Direction Inbound -Action Block -Protocol TCP -LocalPort 14333 `
  -Profile Any | Out-Null

Write-Host '14333 is closed to the public. Localhost (Assure app) can still reach SQL.'
Write-Host 'Agents must use https://assure.rpmresources.co.za/api/agent/sql'
Get-NetFirewallRule | Where-Object { $_.DisplayName -like 'RPMAssure SQL *' } |
  Format-Table DisplayName, Action, Enabled -AutoSize
