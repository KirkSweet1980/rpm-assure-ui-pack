# RPM Assure agent - DPAPI secrets + admin password gate.
# Machine-scope DPAPI: only this Windows box (SYSTEM / local Administrators) can decrypt.

$script:RpmaAgentRoot = 'C:\RPM-Assure\Agent'
$script:RpmaEntropy = [Text.Encoding]::UTF8.GetBytes('RPM-Assure-Edge-v2|' + $env:COMPUTERNAME)

function Get-RpmaAgentRoot {
  if ($AgentRoot) { return $AgentRoot }
  return $script:RpmaAgentRoot
}

function Get-RpmaSecretsPath { Join-Path (Get-RpmaAgentRoot) 'Agent.Secrets.bin' }
function Get-RpmaSettingsPath { Join-Path (Get-RpmaAgentRoot) 'Agent.Settings.json' }

function Protect-RpmaFolder {
  param([string]$Path = (Get-RpmaAgentRoot))
  if (-not (Test-Path $Path)) { return }
  $old = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  foreach ($name in @('Agent.Secrets.bin', 'Agent.Settings.json', 'Agent.Config.ps1')) {
    $p = Join-Path $Path $name
    if (-not (Test-Path $p)) { continue }
    cmd /c "icacls `"$p`" /inheritance:r /grant:r `"NT AUTHORITY\SYSTEM:F`" `"BUILTIN\Administrators:F`" >nul 2>&1"
    if ($name -eq 'Agent.Secrets.bin') { cmd /c "attrib +H `"$p`" >nul 2>&1" }
  }
  $ErrorActionPreference = $old
}

function ConvertTo-RpmaSecureBytes([string]$plain) {
  Add-Type -AssemblyName System.Security -EA SilentlyContinue
  $raw = [Text.Encoding]::UTF8.GetBytes([string]$plain)
  return [Security.Cryptography.ProtectedData]::Protect($raw, $script:RpmaEntropy, 'LocalMachine')
}

function ConvertFrom-RpmaSecureBytes([byte[]]$blob) {
  Add-Type -AssemblyName System.Security -EA SilentlyContinue
  $raw = [Security.Cryptography.ProtectedData]::Unprotect($blob, $script:RpmaEntropy, 'LocalMachine')
  return [Text.Encoding]::UTF8.GetString($raw)
}

function Get-RpmaAgentSettings {
  $p = Get-RpmaSettingsPath
  $def = [ordered]@{
    collectIntervalMin = 2
    jobsIntervalMin    = 1440
    tickSeconds        = 120
    centralDataSource  = '102.222.21.220,14333'
    centralDatabase    = 'RPMAssure_App'
    centralSqlUser     = 'rpmassure'
    encryptSql         = $true
    appHttpsUrl        = ''
  }
  if (-not (Test-Path $p)) { return [pscustomobject]$def }
  try {
    $j = Get-Content -LiteralPath $p -Raw | ConvertFrom-Json
    foreach ($k in $def.Keys) {
      if ($null -eq $j.$k) { $j | Add-Member -NotePropertyName $k -NotePropertyValue $def[$k] -Force }
    }
    $migrated = $false
    try {
      if ([int]$j.collectIntervalMin -eq 30) { $j.collectIntervalMin = 2; $migrated = $true }
      if ([int]$j.tickSeconds -eq 60) { $j.tickSeconds = 120; $migrated = $true }
    } catch {}
    if ($migrated) { try { Save-RpmaAgentSettings $j } catch {} }
    return $j
  } catch { return [pscustomobject]$def }
}

function Save-RpmaAgentSettings($obj) {
  $p = Get-RpmaSettingsPath
  ($obj | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $p -Encoding UTF8
  Protect-RpmaFolder
}

function Get-RpmaAgentSecrets {
  $p = Get-RpmaSecretsPath
  if (-not (Test-Path $p)) { return $null }
  try {
    $blob = [IO.File]::ReadAllBytes($p)
    $json = ConvertFrom-RpmaSecureBytes $blob
    return ($json | ConvertFrom-Json)
  } catch {
    Write-Warning "Could not decrypt Agent.Secrets.bin: $($_.Exception.Message)"
    return $null
  }
}

function Save-RpmaAgentSecrets($obj) {
  $json = $obj | ConvertTo-Json -Depth 6 -Compress
  $blob = ConvertTo-RpmaSecureBytes $json
  $p = Get-RpmaSecretsPath
  [IO.File]::WriteAllBytes($p, $blob)
  Protect-RpmaFolder
}

function New-RpmaPasswordHash([string]$password) {
  $salt = New-Object byte[] 16
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)
  $iter = 120000
  $pbk = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($password, $salt, $iter, [Security.Cryptography.HashAlgorithmName]::SHA256)
  try {
    $hash = $pbk.GetBytes(32)
    return @{
      adminSalt = [Convert]::ToBase64String($salt)
      adminHash = [Convert]::ToBase64String($hash)
      adminIter = $iter
    }
  } finally { $pbk.Dispose() }
}

function Test-RpmaAdminPassword([string]$password) {
  $s = Get-RpmaAgentSecrets
  if (-not $s -or -not $s.adminHash) { return $false }
  $salt = [Convert]::FromBase64String([string]$s.adminSalt)
  $iter = [int]$s.adminIter
  if ($iter -lt 10000) { $iter = 120000 }
  $pbk = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($password, $salt, $iter, [Security.Cryptography.HashAlgorithmName]::SHA256)
  try {
    $got = $pbk.GetBytes(32)
    $want = [Convert]::FromBase64String([string]$s.adminHash)
    if ($got.Length -ne $want.Length) { return $false }
    $ok = $true
    for ($i = 0; $i -lt $got.Length; $i++) { if ($got[$i] -ne $want[$i]) { $ok = $false } }
    return $ok
  } finally { $pbk.Dispose() }
}

function Initialize-RpmaSecureStore {
  param(
    [string]$AdminPassword,
    [string]$CentralSqlPassword,
    [string]$LocalSqlPassword,
    [string]$CentralDataSource,
    [string]$CentralDatabase,
    [string]$CentralSqlUser
  )
  $h = New-RpmaPasswordHash $AdminPassword
  $sec = [pscustomobject]@{
    adminSalt           = $h.adminSalt
    adminHash           = $h.adminHash
    adminIter           = $h.adminIter
    centralSqlPassword  = [string]$CentralSqlPassword
    localSqlPassword    = [string]$LocalSqlPassword
  }
  Save-RpmaAgentSecrets $sec
  $set = Get-RpmaAgentSettings
  if ($CentralDataSource) { $set.centralDataSource = $CentralDataSource }
  if ($CentralDatabase) { $set.centralDatabase = $CentralDatabase }
  if ($CentralSqlUser) { $set.centralSqlUser = $CentralSqlUser }
  Save-RpmaAgentSettings $set
  Protect-RpmaFolder
}

function Import-RpmaAgentSecrets {
  $s = Get-RpmaAgentSecrets
  $t = Get-RpmaAgentSettings
  if ($t) {
    if ($t.centralDataSource -and -not $CentralDataSource) { $script:CentralDataSource = $t.centralDataSource; Set-Variable -Name CentralDataSource -Value $t.centralDataSource -Scope 1 -EA SilentlyContinue }
    if ($t.centralDatabase) { Set-Variable -Name CentralDatabase -Value $t.centralDatabase -Scope 1 -EA SilentlyContinue }
    if ($t.centralSqlUser) { Set-Variable -Name CentralSqlUser -Value $t.centralSqlUser -Scope 1 -EA SilentlyContinue }
    if ($t.collectIntervalMin) { Set-Variable -Name CollectIntervalMin -Value ([int]$t.collectIntervalMin) -Scope 1 -EA SilentlyContinue }
    if ($t.jobsIntervalMin) { Set-Variable -Name JobsIntervalMin -Value ([int]$t.jobsIntervalMin) -Scope 1 -EA SilentlyContinue }
  }
  if ($s) {
    if ($s.centralSqlPassword) { Set-Variable -Name CentralSqlPassword -Value ([string]$s.centralSqlPassword) -Scope 1 -EA SilentlyContinue }
    if ($s.localSqlPassword) { Set-Variable -Name LocalSqlPassword -Value ([string]$s.localSqlPassword) -Scope 1 -EA SilentlyContinue }
  }
}
