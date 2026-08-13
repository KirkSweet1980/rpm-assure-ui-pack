# FinSight DTR L1+L2+L3 collect
#
# Source Dtr*Balances live on CUSTOMER SYSPRO SQL hosts.
# App server has named instance .\RPMREPORTS (central landing only).
#
# On customer SQL host:
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\collect\Run-Dtr-AllLevels.ps1 -CustomerCode UVSS -SqlServer '.' -WindowsAuth
#
# On app server (proof / wrong place for collect):
#   sqlcmd -S ".\RPMREPORTS" -E -C -Q "SELECT @@SERVERNAME"
#
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('AHIC', 'UVSS', 'RSR', 'RSS')]
  [string]$CustomerCode,
  [string]$SqlServer = '',
  [string]$SqlUser = 'Rpm_collect',
  [string]$SqlPassword = '',
  [switch]$WindowsAuth,
  [string]$Root = 'C:\RPM-Assure\Sql',
  [string]$ConfigPath = '',
  [switch]$SkipPreflight
)

$ErrorActionPreference = 'Continue'

$defaultServers = @{
  AHIC = 'AHIC-SSQL-SRV'
  UVSS = 'UVSS-SYSPRO'
  RSR  = 'RSR-SQLSRV-DB'
  RSS  = 'RSS-PROD'
}

if ($ConfigPath -and (Test-Path -LiteralPath $ConfigPath)) {
  Write-Host "Loading config $ConfigPath"
  . $ConfigPath
  if (-not $SqlServer -and $LocalSqlServer) { $SqlServer = $LocalSqlServer }
  if (-not $SqlServer -and $InstanceName) { $SqlServer = $InstanceName }
  if ($LocalSqlUser) { $SqlUser = $LocalSqlUser }
  if ($LocalSqlPassword -and -not $SqlPassword) { $SqlPassword = $LocalSqlPassword }
}

if (-not $SqlServer) {
  # Detect named instance on this box (app server = RPMREPORTS)
  $running = @(Get-Service -ErrorAction SilentlyContinue |
    Where-Object { $_.Status -eq 'Running' -and $_.Name -match '^MSSQL\$(.+)$' })
  if ($running.Count -eq 1 -and $running[0].Name -match '^MSSQL\$(.+)$') {
    $inst = $Matches[1]
    $SqlServer = ".\$inst"
    Write-Host "Auto-detected local named instance: $SqlServer"
  } elseif (Get-Service -Name 'MSSQLSERVER' -ErrorAction SilentlyContinue | Where-Object Status -eq Running) {
    $SqlServer = '.'
    Write-Host "Auto-detected default instance: ."
  } else {
    $SqlServer = '.'
    Write-Host "SqlServer not set - trying '.' (override with -SqlServer)"
  }
}

$file = Join-Path $Root ("customers\{0}\217c_Collect_{0}_DtrAllLevels.sql" -f $CustomerCode)
if (-not (Test-Path -LiteralPath $file)) {
  $alt = Join-Path $Root ("collect\217c_Collect_{0}_DtrAllLevels.sql" -f $CustomerCode)
  if (Test-Path -LiteralPath $alt) { $file = $alt }
  else { throw "Missing SQL: $file" }
}

function Find-Sqlcmd {
  $c = Get-Command sqlcmd.exe -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($p in @(
      "${env:ProgramFiles}\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE",
      "${env:ProgramFiles(x86)}\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE"
    )) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  throw 'sqlcmd.exe not found'
}

function Invoke-SqlcmdSafe {
  param([string[]]$ArgList)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $out = & $script:sqlcmd @ArgList 2>&1 | ForEach-Object { "$_" } | Out-String
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  return @{ ExitCode = $code; Text = $out }
}

$sqlcmd = Find-Sqlcmd
$useSqlAuth = ($SqlPassword -and -not $WindowsAuth)

Write-Host "=== DTR L1-3 $CustomerCode ==="
Write-Host "Host     : $env:COMPUTERNAME"
Write-Host "SqlServer: $SqlServer"
Write-Host "Auth     : $(if ($useSqlAuth) { "SQL $SqlUser" } else { 'Windows (-E)' })"
Write-Host "File     : $file"

# Warn if this looks like central reporting only
if ($SqlServer -match 'RPMREPORTS' -or $env:COMPUTERNAME -match 'rpmwinrm|RPMWINRM') {
  Write-Host ""
  Write-Host "NOTE: You appear to be on the CENTRAL reporting instance ($SqlServer)." -ForegroundColor Yellow
  Write-Host "217c reads Dtr*Balances FROM the server you connect to, then writes via linked server RPM_CENTRAL." -ForegroundColor Yellow
  Write-Host "Central usually has NO source Dtr tables - only landing Syspro_Dtr*." -ForegroundColor Yellow
  Write-Host "For real L2/L3 collect, RDP to $($defaultServers[$CustomerCode]) and run there." -ForegroundColor Yellow
  Write-Host ""
}

if (-not $SkipPreflight) {
  $probe = "SET NOCOUNT ON; SELECT @@SERVERNAME AS Srv, SUSER_SNAME() AS Login;"
  $tryList = New-Object System.Collections.Generic.List[string]
  [void]$tryList.Add($SqlServer)
  if ($SqlServer -eq '.') {
    [void]$tryList.Add('.\RPMREPORTS')
    [void]$tryList.Add('localhost\RPMREPORTS')
    [void]$tryList.Add('tcp:127.0.0.1,14333')
    [void]$tryList.Add('localhost')
    [void]$tryList.Add('127.0.0.1')
  } elseif ($SqlServer -match 'RPMREPORTS' -and $SqlServer -notmatch '^tcp:') {
    [void]$tryList.Add('.\RPMREPORTS')
    [void]$tryList.Add('localhost\RPMREPORTS')
    [void]$tryList.Add('tcp:127.0.0.1,14333')
    [void]$tryList.Add('tcp:102.222.21.220,14333')
  } elseif ($SqlServer -notmatch '^tcp:') {
    [void]$tryList.Add("tcp:$SqlServer,1433")
  }

  $okServer = $null
  foreach ($s in $tryList) {
    Write-Host "Preflight try -S `"$s`" ..."
    if ($useSqlAuth) {
      $r = Invoke-SqlcmdSafe -ArgList @('-S', $s, '-U', $SqlUser, '-P', $SqlPassword, '-C', '-l', '8', '-b', '-Q', $probe, '-W', '-h', '-1')
    } else {
      $r = Invoke-SqlcmdSafe -ArgList @('-S', $s, '-E', '-C', '-l', '8', '-b', '-Q', $probe, '-W', '-h', '-1')
    }
    if ($r.ExitCode -eq 0 -and $r.Text -notmatch 'Sqlcmd: Error') {
      Write-Host "Preflight OK: $($r.Text.Trim())" -ForegroundColor Green
      $okServer = $s
      break
    }
    $first = ($r.Text.Trim() -split "`n")[0]
    Write-Host "  fail exit=$($r.ExitCode) $first"
  }

  if (-not $okServer) {
    Write-Host ""
    Write-Host "CONNECTION FAILED from $env:COMPUTERNAME" -ForegroundColor Red
    Write-Host @"

Your app server has a NAMED instance (MSSQL`$RPMREPORTS), not a default instance.
So this fails:
  sqlcmd -S "." ...
Use:
  sqlcmd -S ".\RPMREPORTS" -E -C -Q "SELECT @@SERVERNAME"
  sqlcmd -S "localhost\RPMREPORTS" -E -C -Q "SELECT @@SERVERNAME"
  sqlcmd -S "tcp:102.222.21.220,14333" -E -C -Q "SELECT @@SERVERNAME"

BUT: connecting to central does NOT collect L2/L3 from SYSPRO.
RDP to customer host $($defaultServers[$CustomerCode]) and run:

  powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\base\syspro-direct\Run-Syspro-Collect-Direct.ps1 ``
    -ConfigPath C:\RPM-Assure\Sql\base\syspro-direct\Customer.Config.ps1

Or 217c on that host:
  powershell ... Run-Dtr-AllLevels.ps1 -CustomerCode $CustomerCode -SqlServer '.' -WindowsAuth

Proof on central only:
  sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -Q "SELECT CustomerCode, InformationLevel, COUNT(*) Cnt FROM dbo.vw_FinSight_ControlBalances_All WITH (NOLOCK) GROUP BY CustomerCode, InformationLevel ORDER BY 1,2"
"@
    throw "sqlcmd preflight failed"
  }
  $SqlServer = $okServer
}

# If we landed on central, refuse collect with clear message (unless -SkipPreflight and user forces)
$isCentral = ($SqlServer -match 'RPMREPORTS|102\.222\.21\.220')
if ($isCentral) {
  Write-Host ""
  Write-Host "Connected to CENTRAL ($SqlServer). Checking for source Dtr tables..." -ForegroundColor Yellow
  $srcQ = @"
SET NOCOUNT ON;
DECLARE @n int = 0;
SELECT @n = COUNT(*) FROM sys.databases d
WHERE d.state_desc = N'ONLINE' AND d.database_id > 4
  AND EXISTS (
    SELECT 1 FROM sys.databases x WHERE x.database_id = d.database_id
  );
-- rough: any user DB with DtrInvBalances
DECLARE @found int = 0, @db sysname, @sql nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT name FROM sys.databases WHERE state_desc=N'ONLINE' AND database_id>4;
OPEN c; FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS=0
BEGIN
  SET @sql = N'IF OBJECT_ID(N''' + REPLACE(@db,'''','''''') + N'.dbo.DtrInvBalances'',N''U'') IS NOT NULL SELECT 1';
  BEGIN TRY
    DECLARE @t table(i int);
    INSERT @t EXEC sp_executesql @sql;
    IF EXISTS (SELECT 1 FROM @t) SET @found = 1;
  END TRY BEGIN CATCH END CATCH
  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;
SELECT CASE WHEN @found=1 THEN N'HAS_SOURCE_DTR' ELSE N'NO_SOURCE_DTR_ON_CENTRAL' END AS Result;
"@
  if ($useSqlAuth) {
    $chk = Invoke-SqlcmdSafe -ArgList @('-S', $SqlServer, '-U', $SqlUser, '-P', $SqlPassword, '-C', '-b', '-Q', $srcQ, '-W', '-h', '-1')
  } else {
    $chk = Invoke-SqlcmdSafe -ArgList @('-S', $SqlServer, '-E', '-C', '-b', '-Q', $srcQ, '-W', '-h', '-1')
  }
  Write-Host $chk.Text.Trim()
  if ($chk.Text -match 'NO_SOURCE_DTR') {
    Write-Host @"

STOP: Central has no Datarapt source tables. 217c would insert 0 L2/L3 rows.

Proof counts (what FinSight already sees):
  sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -Q "SELECT CustomerCode, InformationLevel, COUNT(*) Cnt FROM dbo.vw_FinSight_ControlBalances_All WITH (NOLOCK) GROUP BY CustomerCode, InformationLevel ORDER BY 1,2"

Collect L2/L3: RDP to $($defaultServers[$CustomerCode]) and run Run-Syspro-Collect-Direct.ps1 (or 217c there).
"@ -ForegroundColor Red
    throw "Wrong server for DTR collect (central has no source Dtr*Balances)"
  }
}

$lsQ = "SET NOCOUNT ON; IF EXISTS (SELECT 1 FROM sys.servers WHERE name=N'RPM_CENTRAL' AND is_linked=1) SELECT 'RPM_CENTRAL OK' ELSE SELECT 'MISSING RPM_CENTRAL';"
if ($useSqlAuth) {
  $ls = Invoke-SqlcmdSafe -ArgList @('-S', $SqlServer, '-U', $SqlUser, '-P', $SqlPassword, '-C', '-b', '-Q', $lsQ, '-W', '-h', '-1')
} else {
  $ls = Invoke-SqlcmdSafe -ArgList @('-S', $SqlServer, '-E', '-C', '-b', '-Q', $lsQ, '-W', '-h', '-1')
}
Write-Host "Linked server: $($ls.Text.Trim())"
if ($ls.Text -match 'MISSING') {
  Write-Host "Prefer Run-Syspro-Collect-Direct.ps1 on the customer host (no linked server)." -ForegroundColor Yellow
}

Write-Host "Running 217c against $SqlServer ..."
if ($useSqlAuth) {
  $r = Invoke-SqlcmdSafe -ArgList @('-S', $SqlServer, '-U', $SqlUser, '-P', $SqlPassword, '-C', '-b', '-i', $file)
} else {
  $r = Invoke-SqlcmdSafe -ArgList @('-S', $SqlServer, '-E', '-C', '-b', '-i', $file)
}
Write-Host $r.Text
if ($r.ExitCode -ne 0) { throw "sqlcmd collect exit $($r.ExitCode)" }
Write-Host "OK. Hard-refresh FinSight for $CustomerCode." -ForegroundColor Green
