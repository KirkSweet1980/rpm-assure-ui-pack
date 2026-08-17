# Apply-Sql-Allow-Ips.ps1
# Firewall only. Does NOT rotate secrets.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Apply-Sql-Allow-Ips.ps1
$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run as Administrator.' }

$Root = 'C:\RPM-Assure'
$CfgDir = Join-Path $Root 'config'
$AllowFile = Join-Path $CfgDir 'sql-allow-ips.txt'
$Seed = Join-Path $PSScriptRoot 'sql-allow-ips.txt'

if (-not (Test-Path $CfgDir)) { New-Item -ItemType Directory -Force -Path $CfgDir | Out-Null }
if (Test-Path -LiteralPath $Seed) {
  Copy-Item -Force -LiteralPath $Seed -Destination $AllowFile
}

$ips = New-Object 'System.Collections.Generic.List[string]'
if (Test-Path $AllowFile) {
  Get-Content $AllowFile | ForEach-Object {
    $t = $_.Trim()
    if ($t -and $t -notmatch '^#' -and $t -match '^\d{1,3}(\.\d{1,3}){3}$') { [void]$ips.Add($t) }
  }
}
if ($ips.Count -eq 0) { throw "No IPs in $AllowFile" }

Get-NetFirewallRule -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -like 'RPMAssure SQL *' } |
  Remove-NetFirewallRule -ErrorAction SilentlyContinue

foreach ($ip in ($ips | Sort-Object -Unique)) {
  New-NetFirewallRule -DisplayName ('RPMAssure SQL allow ' + $ip) `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 14333 `
    -RemoteAddress $ip -Profile Any | Out-Null
  Write-Host ('Allow 14333 from ' + $ip)
}

New-NetFirewallRule -DisplayName 'RPMAssure SQL default block' `
  -Direction Inbound -Action Block -Protocol TCP -LocalPort 14333 -Profile Public | Out-Null

Write-Host ('Trusted IPs: ' + (($ips | Sort-Object -Unique) -join ', '))
Write-Host 'Public 14333 blocked except this list. Local 127.0.0.1 still works.'
