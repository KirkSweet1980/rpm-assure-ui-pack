# Password-protected agent settings. Run as Administrator on the SQL host.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Agent\Set-AgentSettings.ps1
param([string]$AgentRoot = 'C:\RPM-Assure\Agent')

$ErrorActionPreference = 'Stop'
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw 'Run as Administrator.' }

. (Join-Path $AgentRoot 'Lib-SecureConfig.ps1')
$script:RpmaAgentRoot = $AgentRoot

if (-not (Test-Path (Get-RpmaSecretsPath))) {
  throw 'No secrets store. Run Deploy-Customer-Sql-Agent.ps1 first.'
}

$sec = Read-Host 'Agent admin password' -AsSecureString
$b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
try { $pw = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
if (-not (Test-RpmaAdminPassword $pw)) { throw 'Invalid agent admin password.' }
$pw = $null

function Read-Default([string]$prompt, [string]$default) {
  $v = Read-Host ($prompt + ' [' + $default + ']')
  if ([string]::IsNullOrWhiteSpace($v)) { return $default }
  return $v.Trim()
}

$set = Get-RpmaAgentSettings
$secrets = Get-RpmaAgentSecrets

Write-Host ''
Write-Host '=== RPM Assure Edge Agent settings ==='
Write-Host ('  Central     : ' + $set.centralDataSource)
Write-Host ('  Database    : ' + $set.centralDatabase)
Write-Host ('  SQL user    : ' + $set.centralSqlUser)
Write-Host ('  Collect min : ' + $set.collectIntervalMin)
Write-Host ('  Full jobs   : every ' + $set.jobsIntervalMin + ' min')
Write-Host ('  Encrypt SQL : ' + $set.encryptSql)
Write-Host ''
Write-Host '1) Collect interval (minutes)'
Write-Host '2) Full-jobs interval (minutes)'
Write-Host '3) Central SQL host'
Write-Host '4) Central SQL login / password'
Write-Host '5) Change agent admin password'
Write-Host '6) Save and exit'
Write-Host '0) Exit without save'
$choice = Read-Host 'Choice'

switch ($choice) {
  '1' {
    $set.collectIntervalMin = [int](Read-Default 'Collect interval minutes' ([string]$set.collectIntervalMin))
    Save-RpmaAgentSettings $set
    Write-Host 'Saved. Restart-Service RPMAssure-Edge'
  }
  '2' {
    $set.jobsIntervalMin = [int](Read-Default 'Full jobs interval minutes (1440=daily)' ([string]$set.jobsIntervalMin))
    Save-RpmaAgentSettings $set
    Write-Host 'Saved. Restart-Service RPMAssure-Edge'
  }
  '3' {
    $set.centralDataSource = Read-Default 'Central host,port' ([string]$set.centralDataSource)
    $set.centralDatabase = Read-Default 'Database' ([string]$set.centralDatabase)
    Save-RpmaAgentSettings $set
    Write-Host 'Saved. Restart-Service RPMAssure-Edge'
  }
  '4' {
    $set.centralSqlUser = Read-Default 'SQL user' ([string]$set.centralSqlUser)
    $np = Read-Host 'New central SQL password (blank = keep)' -AsSecureString
    $b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($np)
    try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b2) }
    if ($plain) { $secrets.centralSqlPassword = $plain }
    Save-RpmaAgentSettings $set
    Save-RpmaAgentSecrets $secrets
    Write-Host 'Saved. Restart-Service RPMAssure-Edge'
  }
  '5' {
    $n1 = Read-Host 'New agent admin password' -AsSecureString
    $n2 = Read-Host 'Confirm' -AsSecureString
    $p1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($n1))
    $p2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($n2))
    if ($p1 -ne $p2 -or [string]::IsNullOrWhiteSpace($p1)) { throw 'Passwords did not match.' }
    $h = New-RpmaPasswordHash $p1
    $secrets.adminSalt = $h.adminSalt
    $secrets.adminHash = $h.adminHash
    $secrets.adminIter = $h.adminIter
    Save-RpmaAgentSecrets $secrets
    Write-Host 'Admin password updated.'
  }
  '6' {
    Save-RpmaAgentSettings $set
    Save-RpmaAgentSecrets $secrets
    Write-Host 'Saved.'
  }
  default { Write-Host 'No change.' }
}
