# Disable leftover central login [rpmassure]. Customer boxes are not touched.
# App and collectors use Rpm_collect. Dry-run unless -Apply.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Disable-Central-Rpmassure.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Disable-Central-Rpmassure.ps1 -Apply
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$sqlcmd = @(
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\SQLCMD.EXE'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $sqlcmd) { $sqlcmd = 'sqlcmd' }

function Invoke-Sql([string]$sql) {
  $f = Join-Path $env:TEMP ('rpma_da_' + [guid]::NewGuid().ToString('N') + '.sql')
  [IO.File]::WriteAllText($f, $sql)
  $saved = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $out = & $sqlcmd -S '.\RPMREPORTS' -d master -E -C -W -h -1 -i $f 2>&1 | Out-String
  $code = $LASTEXITCODE
  $ErrorActionPreference = $saved
  Remove-Item $f -Force -EA SilentlyContinue
  return @{ Exit = $code; Out = $out }
}

Write-Host '=== Disable central rpmassure (dry-run unless -Apply) ==='

$info = Invoke-Sql @"
SET NOCOUNT ON;
SELECT
  CASE WHEN p.is_disabled = 1 THEN 'disabled' ELSE 'enabled' END AS LoginState,
  CONVERT(varchar(30), l.createdate, 126) AS CreatedUtc
FROM sys.server_principals p
JOIN sys.syslogins l ON l.name = p.name
WHERE p.name = N'rpmassure';
SELECT 'LiveSessions=' + CONVERT(varchar(10), COUNT(*))
FROM sys.dm_exec_sessions
WHERE login_name = N'rpmassure' AND is_user_process = 1;
"@
Write-Host $info.Out.Trim()
if ($info.Out -notmatch 'enabled|disabled') {
  Write-Host 'Login rpmassure not found on central - nothing to do.'
  return
}

if (-not $Apply) {
  Write-Host 'Would ALTER LOGIN [rpmassure] DISABLE on .\RPMREPORTS (central only).'
  Write-Host 'Undo: ALTER LOGIN [rpmassure] ENABLE'
  Write-Host '=== dry-run done ==='
  return
}

if ($info.Out -match 'LiveSessions=([1-9][0-9]*)') {
  throw 'rpmassure has live sessions - not disabling. Re-run when idle.'
}

$r = Invoke-Sql @"
SET NOCOUNT ON;
IF EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'rpmassure')
BEGIN
  ALTER LOGIN [rpmassure] DISABLE;
  PRINT 'rpmassure DISABLED on central';
END
ELSE
  PRINT 'rpmassure not present';
"@
if ($r.Exit -ne 0) { throw $r.Out }
Write-Host $r.Out.Trim()
Write-Host '=== done ==='
Write-Host 'Customer SQL logins named rpmassure are unchanged.'
