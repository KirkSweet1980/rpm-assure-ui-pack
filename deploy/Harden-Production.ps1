# One-shot production hardening. Does not rotate SQL logins (do that later).
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Harden-Production.ps1
$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure'
$SecDir = Join-Path $Root 'secrets'
$SecFile = Join-Path $SecDir 'sql-collect.json'
$Report = Join-Path $SecDir 'hardening-status.txt'
$nssm = @(
  (Join-Path $Root 'Tools\nssm.exe'),
  'C:\Program Files\nssm\win64\nssm.exe',
  'C:\Program Files\nssm\nssm.exe',
  'C:\nssm\nssm.exe',
  (Get-Command nssm -EA SilentlyContinue | Select-Object -ExpandProperty Source)
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

function W([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Write-Host $line
  Add-Content -LiteralPath $Report -Value $line -EA SilentlyContinue
}

New-Item -ItemType Directory -Force -Path $SecDir | Out-Null
if (-not (Test-Path $Report)) { Set-Content -LiteralPath $Report -Value '' }

W '=== RPM Assure Harden-Production start ==='

# ACL: Administrators + SYSTEM only
try {
  $acl = Get-Acl $SecDir
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($id in @('BUILTIN\Administrators', 'NT AUTHORITY\SYSTEM')) {
    $r = New-Object System.Security.AccessControl.FileSystemAccessRule($id, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($r)
  }
  Set-Acl -Path $SecDir -AclObject $acl
  W 'secrets folder ACL = Administrators + SYSTEM'
} catch {
  W ('ACL warn ' + $_.Exception.Message)
}

function Find-ExistingSqlPassword {
  if (Test-Path $SecFile) {
    try {
      $p = [string]((Get-Content $SecFile -Raw | ConvertFrom-Json).password)
      if ($p) { return $p }
    } catch {}
  }
  if ($env:RPM_ASSURE_SQL_PASSWORD) { return [string]$env:RPM_ASSURE_SQL_PASSWORD }
  $mach = [Environment]::GetEnvironmentVariable('RPM_ASSURE_SQL_PASSWORD', 'Machine')
  if ($mach) { return [string]$mach }
  $roots = @(
    (Join-Path $Root 'Sql'),
    (Join-Path $Root 'config')
  )
  foreach ($r in $roots) {
    if (-not (Test-Path $r)) { continue }
    $files = Get-ChildItem -LiteralPath $r -Filter '*.ps1' -Recurse -EA SilentlyContinue |
      Where-Object { $_.Name -match 'Config|\.Config' }
    foreach ($f in $files) {
      $t = Get-Content -LiteralPath $f.FullName -Raw -EA SilentlyContinue
      if ($t -match '(?m)\$SqlPassword\s*=\s*''([^'']+)''' -or $t -match '(?m)\$FreshdeskSqlPassword\s*=\s*''([^'']+)''' -or $t -match '(?m)\$LocalSqlPassword\s*=\s*''([^'']+)''') {
        $cand = $Matches[1]
        if ($cand -and $cand -notmatch 'PASTE') { return $cand }
      }
    }
  }
  return $null
}

$pwd = $null
if (Test-Path $SecFile) {
  try { $pwd = [string]((Get-Content $SecFile -Raw | ConvertFrom-Json).password) } catch {}
  if ($pwd) { W 'secrets sql-collect.json kept (will not harvest Config.ps1)' }
}
if (-not $pwd) { $pwd = Find-ExistingSqlPassword }
if ($pwd) {
  if (-not (Test-Path $SecFile)) {
    $json = @{ password = $pwd; user = 'Rpm_collect'; seededUtc = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json
    [IO.File]::WriteAllText($SecFile, $json)
    W 'sql-collect.json seeded (file not in git)'
  }
  try {
    [Environment]::SetEnvironmentVariable('RPM_ASSURE_SQL_PASSWORD', $pwd, 'Machine')
    $env:RPM_ASSURE_SQL_PASSWORD = $pwd
    W 'RPM_ASSURE_SQL_PASSWORD set (machine). Password not printed.'
  } catch {
    W ('machine env warn ' + $_.Exception.Message)
  }
} else {
  W 'WARN no SQL password found in secrets / env / Config.ps1'
}

[Environment]::SetEnvironmentVariable('RPM_ASSURE_BOOTSTRAP_LOCK', '1', 'Machine')
$env:RPM_ASSURE_BOOTSTRAP_LOCK = '1'
W 'RPM_ASSURE_BOOTSTRAP_LOCK=1'

$boot = [Environment]::GetEnvironmentVariable('RPM_ASSURE_BOOTSTRAP_SECRET', 'Machine')
if ([string]::IsNullOrWhiteSpace($boot)) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $boot = [Convert]::ToBase64String($bytes)
  [Environment]::SetEnvironmentVariable('RPM_ASSURE_BOOTSTRAP_SECRET', $boot, 'Machine')
  W 'RPM_ASSURE_BOOTSTRAP_SECRET generated (machine). Stored in secrets\bootstrap-secret.txt'
  [IO.File]::WriteAllText((Join-Path $SecDir 'bootstrap-secret.txt'), $boot)
} else {
  W 'RPM_ASSURE_BOOTSTRAP_SECRET already set'
}

if ($nssm) {
  try {
    $cur = & $nssm get RPMAssure-App AppEnvironmentExtra 2>$null | Out-String
    $cur = ($cur -replace "`0", '').Trim()
    $pairs = @{
      RPM_ASSURE_BOOTSTRAP_LOCK   = '1'
      RPM_ASSURE_BOOTSTRAP_SECRET = [Environment]::GetEnvironmentVariable('RPM_ASSURE_BOOTSTRAP_SECRET', 'Machine')
    }
    if ($pwd) { $pairs['RPM_ASSURE_SQL_PASSWORD'] = $pwd }
    $lines = @()
    if ($cur) { $lines = @($cur -split "`r?`n" | Where-Object { $_ -and $_ -notmatch '^(RPM_ASSURE_BOOTSTRAP_LOCK|RPM_ASSURE_BOOTSTRAP_SECRET|RPM_ASSURE_SQL_PASSWORD)=' }) }
    foreach ($k in $pairs.Keys) {
      if ($pairs[$k]) { $lines += ($k + '=' + $pairs[$k]) }
    }
    $joined = ($lines -join "`r`n")
    $tmp = Join-Path $env:TEMP 'rpma-nssm-env.txt'
    [IO.File]::WriteAllText($tmp, $joined)
    & $nssm set RPMAssure-App AppEnvironmentExtra $joined | Out-Null
    W 'NSSM RPMAssure-App environment updated (bootstrap lock + secrets)'
  } catch {
    W ('NSSM env warn ' + $_.Exception.Message)
  }
} else {
  W 'NSSM not found - set service env by hand'
}

# SQL listen check (do not change firewall here - SYSPRO edge may still use 14333)
try {
  $tcp = Get-NetTCPConnection -LocalPort 14333 -State Listen -EA SilentlyContinue |
    Select-Object -ExpandProperty LocalAddress -Unique
  if ($tcp) { W ('SQL TCP 14333 listening on: ' + ($tcp -join ', ') + '  (restrict to known IPs when ready)') }
  else { W 'SQL TCP 14333 not listening (or no permission to query)' }
} catch {
  W 'SQL listen check skipped'
}

$leaked = @(
  'C:\RPM-Assure\Sql',
  'C:\RPM-Assure\App'
) | ForEach-Object {
  if (Test-Path $_) {
    Select-String -Path (Join-Path $_ '*') -Pattern 'RpmCollect#' -SimpleMatch -EA SilentlyContinue |
      Select-Object -First 5
  }
}
if ($leaked) { W ('WARN leftover password strings in tree (rotate SQL login after this seed). Count sample=' + @($leaked).Count) }
else { W 'No RpmCollect# strings found in live Sql/App (or search skipped)' }

# Prefer loopback + rotated password for app SQL (Settings + .env.local). Do not print password.
try {
  $sf = Join-Path $Root 'App\data\rpma-settings.json'
  if (Test-Path $sf) {
    $j = Get-Content $sf -Raw | ConvertFrom-Json
    $changed = $false
    $list = @($j.sqlConnections)
    for ($i = 0; $i -lt $list.Count; $i++) {
      if ([string]$list[$i].server -eq '102.222.21.220') {
        $list[$i].server = '127.0.0.1'
        $changed = $true
      }
      if ($pwd) {
        $list[$i].password = $pwd
        $changed = $true
      }
      if ($null -ne $list[$i].encrypt) { $list[$i].encrypt = $false; $changed = $true }
    }
    $j.sqlConnections = $list
    if ($changed) {
      $j | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $sf -Encoding UTF8
      W 'Settings SQL password synced from secrets; host loopback; encrypt=false'
    } else {
      W 'Settings SQL already local or missing connections'
    }
  } else {
    W 'Settings file not found (skip rewrite)'
  }
  $envLocal = Join-Path $Root 'App\.env.local'
  if ((Test-Path $envLocal) -and $pwd) {
    $t = Get-Content $envLocal -Raw
    if ($t -match '(?m)^RPM_ASSURE_SQL_PASSWORD=') {
      $t = [regex]::Replace($t, '(?m)^RPM_ASSURE_SQL_PASSWORD=.*$', ('RPM_ASSURE_SQL_PASSWORD=' + $pwd))
    } else {
      $t = $t.TrimEnd() + "`r`nRPM_ASSURE_SQL_PASSWORD=$pwd`r`n"
    }
    $t = $t -replace '102\.222\.21\.220', '127.0.0.1'
    $t = [regex]::Replace($t, '(?m)^RPM_ASSURE_SQL_ENCRYPT=.*$', 'RPM_ASSURE_SQL_ENCRYPT=false')
    [IO.File]::WriteAllText($envLocal, $t)
    W '.env.local SQL password synced from secrets'
  }
} catch {
  W ('Settings rewrite warn ' + $_.Exception.Message)
}

W '=== Harden-Production done ==='
W 'Next: Restart-Service RPMAssure-App'
W 'Remaining: firewall 14333 after SYSPRO HTTPS ingest; rpmassure login rotate - see docs/HARDENING.md'
Write-Host "report=$Report"
