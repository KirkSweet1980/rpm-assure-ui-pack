# Sync rotated Rpm_collect password into the running app (Settings, .env.local, NSSM).
# Services do not see new machine env until reboot unless NSSM AppEnvironmentExtra is set.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Fix-App-Sql-Password.ps1
$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure'
$App = Join-Path $Root 'App'
$SecFile = Join-Path $Root 'secrets\sql-collect.json'
$nssm = @(
  (Join-Path $Root 'Tools\nssm.exe'),
  'C:\Program Files\nssm\win64\nssm.exe',
  'C:\Program Files\nssm\nssm.exe'
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not (Test-Path $SecFile)) { throw "Missing $SecFile — rotate / Harden first" }
$pwd = [string]((Get-Content $SecFile -Raw | ConvertFrom-Json).password)
if ([string]::IsNullOrWhiteSpace($pwd)) { throw 'secrets\sql-collect.json has empty password' }
Write-Host ("secrets pwdLength=" + $pwd.Length + " (not printed)")

$sqlcmd = @(
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\SQLCMD.EXE'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $sqlcmd) { $sqlcmd = 'sqlcmd' }

$probe = & $sqlcmd -S '127.0.0.1,14333' -d RPMAssure_App -U Rpm_collect -P $pwd -C -Q "SET NOCOUNT ON; SELECT 'login-ok';" 2>&1 | Out-String
if ($probe -notmatch 'login-ok') {
  $probe2 = & $sqlcmd -S '.\RPMREPORTS' -d RPMAssure_App -U Rpm_collect -P $pwd -C -Q "SET NOCOUNT ON; SELECT 'login-ok';" 2>&1 | Out-String
  if ($probe2 -notmatch 'login-ok') { throw "secrets password does not log in: $probe $probe2" }
  Write-Host 'Probe .\RPMREPORTS login-ok'
} else {
  Write-Host 'Probe 127.0.0.1,14333 login-ok'
}

$sf = Join-Path $App 'data\rpma-settings.json'
if (Test-Path $sf) {
  Copy-Item $sf ($sf + '.bak') -Force
  $j = Get-Content $sf -Raw -Encoding UTF8 | ConvertFrom-Json
  $n = 0
  foreach ($c in @($j.sqlConnections)) {
    $c | Add-Member -NotePropertyName password -NotePropertyValue $pwd -Force
    if ([string]$c.server -eq '102.222.21.220') { $c.server = '127.0.0.1' }
    $c | Add-Member -NotePropertyName encrypt -NotePropertyValue $false -Force
    $n++
  }
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [IO.File]::WriteAllText($sf, ($j | ConvertTo-Json -Depth 20), $utf8)
  Write-Host ("Settings password synced connections=" + $n)
} else {
  Write-Host 'WARN no rpma-settings.json'
}

$envLocal = Join-Path $App '.env.local'
if (Test-Path $envLocal) {
  Copy-Item $envLocal ($envLocal + '.bak') -Force
  $t = [IO.File]::ReadAllText($envLocal)
  if ($t -match '(?m)^RPM_ASSURE_SQL_PASSWORD=') {
    $t = [regex]::Replace($t, '(?m)^RPM_ASSURE_SQL_PASSWORD=.*$', ('RPM_ASSURE_SQL_PASSWORD=' + $pwd))
  } else {
    $t = $t.TrimEnd() + "`r`nRPM_ASSURE_SQL_PASSWORD=$pwd`r`n"
  }
  $t = $t -replace '102\.222\.21\.220', '127.0.0.1'
  if ($t -match '(?m)^RPM_ASSURE_SQL_ENCRYPT=') {
    $t = [regex]::Replace($t, '(?m)^RPM_ASSURE_SQL_ENCRYPT=.*$', 'RPM_ASSURE_SQL_ENCRYPT=false')
  }
  [IO.File]::WriteAllText($envLocal, $t)
  Write-Host '.env.local password synced'
}

# Service does not inherit new machine env until reboot — put it on NSSM extra.
if ($nssm) {
  $cur = (& $nssm get RPMAssure-App AppEnvironmentExtra 2>$null | Out-String) -replace "`0", ''
  $keep = @($cur -split "`r?`n" | Where-Object { $_ -and $_ -notmatch '^(RPM_ASSURE_SQL_PASSWORD|RPM_ASSURE_SQL_SERVER|RPM_ASSURE_SQL_ENCRYPT)=' })
  if (-not ($keep -match '^RPM_ASSURE_DATA_MODE=')) { $keep += 'RPM_ASSURE_DATA_MODE=auto' }
  $keep += 'RPM_ASSURE_SQL_PASSWORD=' + $pwd
  $keep += 'RPM_ASSURE_SQL_SERVER=127.0.0.1,14333'
  $keep += 'RPM_ASSURE_SQL_ENCRYPT=false'
  $joined = ($keep | Where-Object { $_ }) -join "`r`n"
  & $nssm set RPMAssure-App AppEnvironmentExtra $joined | Out-Null
  Write-Host 'NSSM AppEnvironmentExtra SQL password set'
} else {
  Write-Host 'WARN nssm not at C:\RPM-Assure\Tools\nssm.exe — service may keep stale env until reboot'
}

Restart-Service RPMAssure-App -Force
Start-Sleep -Seconds 4
Write-Host 'RPMAssure-App restarted. Hard-refresh the UI (Ctrl+F5).'
Write-Host 'Customer Tenant should load if probe was login-ok.'
