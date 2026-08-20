# Rotate SQL login Rpm_collect. Dry-run unless -Apply.
# Does NOT close TCP 14333. Edge SYSPRO using 14333 + old password will fail until those Config.ps1 files are updated.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Rotate-SqlCollectPassword.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Rotate-SqlCollectPassword.ps1 -Apply
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure'
$SecDir = Join-Path $Root 'secrets'
$SecFile = Join-Path $SecDir 'sql-collect.json'
$Report = Join-Path $SecDir 'hardening-status.txt'
$sqlcmd = @(
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\SQLCMD.EXE'
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $sqlcmd) { $sqlcmd = 'sqlcmd' }
$inst = '.\RPMREPORTS'

function W([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Write-Host $line
  New-Item -ItemType Directory -Force -Path $SecDir | Out-Null
  Add-Content -LiteralPath $Report -Value $line
}

function Get-CurrentPwd {
  if ($env:RPM_ASSURE_SQL_PASSWORD) { return [string]$env:RPM_ASSURE_SQL_PASSWORD }
  if (Test-Path $SecFile) {
    try { return [string]((Get-Content $SecFile -Raw | ConvertFrom-Json).password) } catch {}
  }
  return $null
}

function New-CollectPassword {
  $bytes = New-Object byte[] 24
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $s = [Convert]::ToBase64String($bytes) -replace '[+/=]', 'A'
  return ($s.Substring(0, 20) + '#x9')
}

function Invoke-SqlFile([string]$text, [string[]]$auth) {
  $f = Join-Path $env:TEMP ('rpma_rotate_{0}.sql' -f [guid]::NewGuid().ToString('N'))
  [IO.File]::WriteAllText($f, $text)
  try {
    $out = & $sqlcmd -S $inst -d RPMAssure_App @auth -C -b -h -1 -W -i $f 2>&1 | Out-String
    return @{ Exit = [int]$LASTEXITCODE; Out = $out }
  } finally {
    Remove-Item -LiteralPath $f -Force -EA SilentlyContinue
  }
}

W '=== Rotate Rpm_collect start ==='
if (-not $Apply) { W 'DRY-RUN (pass -Apply to change the login)' }

$old = Get-CurrentPwd
if ($old) { W ('current secrets pwdLength=' + $old.Length + ' (not printed)') }
else { W 'no current secrets password - ALTER will still run with Windows auth' }

# Who is on 14333 right now (do not print passwords)
$whoSql = @"
SET NOCOUNT ON;
SELECT TOP 30
  CONVERT(varchar(30), s.login_time, 126) AS LoginTime,
  LEFT(s.login_name, 40) AS LoginName,
  LEFT(ISNULL(s.host_name,''), 40) AS HostName,
  LEFT(ISNULL(s.program_name,''), 60) AS ProgramName,
  c.client_net_address AS ClientIp
FROM sys.dm_exec_sessions s
JOIN sys.dm_exec_connections c ON c.session_id = s.session_id
WHERE s.is_user_process = 1
ORDER BY s.login_time DESC;
"@
$who = Invoke-SqlFile $whoSql @('-E')
W ('sessions exit=' + $who.Exit)
if ($who.Out) { ($who.Out -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -First 20) | ForEach-Object { W ('  ' + $_) } }

$newPwd = New-CollectPassword
W 'New password generated (not printed).'

if (-not $Apply) {
  W 'Would ALTER LOGIN [Rpm_collect], update secrets\sql-collect.json and machine env RPM_ASSURE_SQL_PASSWORD.'
  W 'Edge SYSPRO that still uses TCP 14333 + old password will fail after -Apply until those Config.ps1 files are updated (or they POST /api/agent/sql).'
  W '=== dry-run done ==='
  return
}

$esc = $newPwd.Replace("'", "''")
$alter = @"
SET NOCOUNT ON;
ALTER LOGIN [Rpm_collect] WITH PASSWORD = N'$esc';
PRINT 'Rpm_collect password rotated';
"@
$r = Invoke-SqlFile $alter @('-E')
if ($r.Exit -ne 0) { throw ("ALTER LOGIN failed: " + $r.Out) }
W 'ALTER LOGIN Rpm_collect OK'

$probe = Invoke-SqlFile "SET NOCOUNT ON; SELECT 'login-ok';" @('-U', 'Rpm_collect', '-P', $newPwd)
if ($probe.Exit -ne 0 -or $probe.Out -notmatch 'login-ok') {
  throw ('Probe failed after rotate (no rollback). Out=' + $probe.Out)
}
W 'Probe login-ok with new password'

$json = @{ password = $newPwd; user = 'Rpm_collect'; rotatedUtc = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json
[IO.File]::WriteAllText($SecFile, $json)
[Environment]::SetEnvironmentVariable('RPM_ASSURE_SQL_PASSWORD', $newPwd, 'Machine')
$env:RPM_ASSURE_SQL_PASSWORD = $newPwd
W 'secrets\sql-collect.json + machine env updated'

W '=== rotate done ==='
$fix = Join-Path $PSScriptRoot 'Fix-App-Sql-Password.ps1'
if (Test-Path -LiteralPath $fix) {
  W 'Syncing app Settings / NSSM from new secrets...'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $fix
} else {
  W 'Fix-App-Sql-Password.ps1 missing - run it after this'
}
