# Shared sqlcmd helpers for SYSPRO direct collect (ASCII)
function Get-RpmaSqlcmd {
  $c = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($p in @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\SQLCMD.EXE'
  )) { if (Test-Path $p) { return $p } }
  throw 'sqlcmd not found'
}

function Clear-RpmaOldLogs {
  param(
    [Parameter(Mandatory)][string]$LogDir,
    [int]$KeepDays = 14,
    [int]$MaxFiles = 200
  )
  if (-not (Test-Path -LiteralPath $LogDir)) { return }
  $cut = (Get-Date).AddDays(-[Math]::Abs($KeepDays))
  Get-ChildItem -LiteralPath $LogDir -File -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Extension -match '\.(log|txt|out)$' -or $_.Name -match '^(syspro_|sched_|collect_|out_|err_|dtr_)'
    } |
    Where-Object { $_.LastWriteTime -lt $cut } |
    ForEach-Object {
      Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
    }
  $logs = @(Get-ChildItem -LiteralPath $LogDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -eq '.log' } |
    Sort-Object LastWriteTime)
  if ($logs.Count -gt $MaxFiles) {
    $logs | Select-Object -First ($logs.Count - $MaxFiles) |
      ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue }
  }
  $tmp = Join-Path $LogDir 'tmp'
  if (Test-Path -LiteralPath $tmp) {
    Get-ChildItem -LiteralPath $tmp -File -ErrorAction SilentlyContinue |
      Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) } |
      ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue }
  }
}

function Ensure-RpmaSqlRuntime {
  # Safe if Initialize-RpmaCollect was not called (discover / ad-hoc scripts)
  if (-not $script:RpmaSqlcmd) {
    $script:RpmaSqlcmd = Get-RpmaSqlcmd
  }
  if (-not $script:RpmaWorkDir -or -not (Test-Path -LiteralPath $script:RpmaWorkDir)) {
    $base = if ($script:RpmaLogPath) {
      Split-Path -Parent $script:RpmaLogPath
    } else {
      $env:TEMP
    }
    if (-not $base) { $base = $env:TEMP }
    $script:RpmaWorkDir = Join-Path $base 'rpma_sql_tmp'
    New-Item -ItemType Directory -Force -Path $script:RpmaWorkDir | Out-Null
  }
  if (-not $script:RpmaLogPath) {
    $script:RpmaLogPath = Join-Path $script:RpmaWorkDir ('rpma_adhoc_{0:yyyyMMdd_HHmmss}.log' -f (Get-Date))
  }
}

function Initialize-RpmaCollect {
  param(
    [string]$LogDir,
    [string]$Prefix = 'syspro',
    [int]$LogKeepDays = 14
  )
  if (-not $LogDir) { $LogDir = Join-Path $env:TEMP 'rpma_logs' }
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  Clear-RpmaOldLogs -LogDir $LogDir -KeepDays $LogKeepDays
  $script:RpmaLogPath = Join-Path $LogDir (('{0}_{1:yyyyMMdd_HHmmss}.log' -f $Prefix, (Get-Date)))
  $script:RpmaSqlcmd = Get-RpmaSqlcmd
  $script:RpmaWorkDir = Join-Path $LogDir 'tmp'
  New-Item -ItemType Directory -Force -Path $script:RpmaWorkDir | Out-Null
  Write-RpmaLog ("sqlcmd=" + $script:RpmaSqlcmd)
  Write-RpmaLog ("logKeepDays=" + $LogKeepDays)
}

function Write-RpmaLog([string]$m) {
  Ensure-RpmaSqlRuntime
  $line = '{0:yyyy-MM-dd HH:mm:ss}Z {1}' -f (Get-Date).ToUniversalTime(), $m
  try { Add-Content -LiteralPath $script:RpmaLogPath -Value $line -ErrorAction SilentlyContinue } catch { }
  Write-Host $line
}

function Invoke-RpmaSql {
  param(
    [Parameter(Mandatory)][string]$Server,
    [string]$User,
    [string]$Pass,
    [string]$Database,
    [Parameter(Mandatory)][string]$SqlText,
    [switch]$Tsv
  )
  Ensure-RpmaSqlRuntime
  if (-not $script:RpmaWorkDir) { throw 'RpmaWorkDir not set - call Initialize-RpmaCollect or Ensure-RpmaSqlRuntime' }

  $id = [guid]::NewGuid().ToString('N')
  $tmpSql = Join-Path $script:RpmaWorkDir ("q_{0}.sql" -f $id)
  $tmpOut = Join-Path $script:RpmaWorkDir ("q_{0}.out" -f $id)
  [IO.File]::WriteAllText($tmpSql, $SqlText, [Text.UTF8Encoding]::new($false))

  $a = New-Object System.Collections.Generic.List[string]
  [void]$a.Add('-S'); [void]$a.Add($Server)
  if ($Database) { [void]$a.Add('-d'); [void]$a.Add($Database) }
  $useWin = [string]::IsNullOrWhiteSpace($Pass)
  if ($useWin) {
    [void]$a.Add('-E')
  } else {
    [void]$a.Add('-U'); [void]$a.Add($(if ($User) { $User } else { 'sa' }))
  }
  [void]$a.Add('-N'); [void]$a.Add('-C'); [void]$a.Add('-b'); [void]$a.Add('-x'); [void]$a.Add('-I')
  [void]$a.Add('-i'); [void]$a.Add($tmpSql)
  [void]$a.Add('-o'); [void]$a.Add($tmpOut)
  if ($Tsv) {
    [void]$a.Add('-h'); [void]$a.Add('-1')
    [void]$a.Add('-W')
    [void]$a.Add('-s'); [void]$a.Add('|')
  }

  $old = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $prevPwd = $env:SQLCMDPASSWORD
  if (-not $useWin) { $env:SQLCMDPASSWORD = $Pass }
  try {
    & $script:RpmaSqlcmd @($a.ToArray()) 2>&1 | Out-Null
    $ec = $LASTEXITCODE
  } finally {
    if ($null -eq $prevPwd) { Remove-Item Env:SQLCMDPASSWORD -EA SilentlyContinue }
    else { $env:SQLCMDPASSWORD = $prevPwd }
  }
  $ErrorActionPreference = $old

  $text = ''
  if (Test-Path -LiteralPath $tmpOut) { $text = [IO.File]::ReadAllText($tmpOut) }
  Remove-Item -LiteralPath $tmpSql, $tmpOut -Force -ErrorAction SilentlyContinue

  $needAdo = ($ec -ne 0) -or ($text -match 'Data source name not found|ODBC Driver')
  if ($needAdo) {
    try {
      $csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
      $csb['Data Source'] = $Server
      if ($Database) { $csb['Initial Catalog'] = $Database }
      $csb['User ID'] = $User
      $csb['Password'] = $Pass
      $csb['Encrypt'] = $true
      $csb['TrustServerCertificate'] = $true
      $csb['Connect Timeout'] = 45
      $conn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
      $conn.Open()
      $parts = [regex]::Split($SqlText, '(?im)^\s*GO\s*$')
      $adoText = ''
      $adoEc = 0
      foreach ($part in $parts) {
        $batch = $part.Trim()
        if (-not $batch) { continue }
        $cmd = $conn.CreateCommand()
        $cmd.CommandTimeout = 180
        $cmd.CommandText = $batch
        if ($Tsv) {
          $reader = $cmd.ExecuteReader()
          $lines = New-Object System.Collections.Generic.List[string]
          while ($reader.Read()) {
            $cols = New-Object System.Collections.Generic.List[string]
            for ($i = 0; $i -lt $reader.FieldCount; $i++) {
              if ($reader.IsDBNull($i)) { [void]$cols.Add('') }
              else { [void]$cols.Add([string]$reader.GetValue($i)) }
            }
            [void]$lines.Add(($cols.ToArray() -join '|'))
          }
          $reader.Close()
          $adoText = ($lines.ToArray() -join "`n")
        } else {
          [void]$cmd.ExecuteNonQuery()
        }
      }
      $conn.Close()
      return [pscustomobject]@{ ExitCode = $adoEc; Text = $adoText }
    } catch {
      return [pscustomobject]@{ ExitCode = 1; Text = ($text + ' | ADO: ' + $_.Exception.Message) }
    }
  }
  return [pscustomobject]@{ ExitCode = $ec; Text = $text }
}

function Flatten-RpmaStrings {
  # Always returns [string[]] (never a bare string). Safe to assign with @().
  param($InputObject)
  $list = New-Object System.Collections.Generic.List[string]
  function Walk($o) {
    if ($null -eq $o) { return }
    if ($o -is [string]) {
      $s = $o.Trim()
      if ($s) { [void]$list.Add($s) }
      return
    }
    # char[] from string already handled; skip char enumeration of strings
    if ($o -is [System.Collections.IEnumerable] -and -not ($o -is [string])) {
      foreach ($i in $o) { Walk $i }
      return
    }
    $s2 = ("$o").Trim()
    if ($s2) { [void]$list.Add($s2) }
  }
  Walk $InputObject
  # Unary comma: return one object that is string[] (prevents PS unrolling 1-item to string)
  return ,[string[]]@($list.ToArray())
}

function Get-RpmaStringArray {
  # Coerce any Flatten/List/string/array result to [string[]] without .ToArray() on string
  param($InputObject)
  if ($null -eq $InputObject) { return ,[string[]]@() }
  if ($InputObject -is [string]) { return ,[string[]]@($InputObject) }
  if ($InputObject -is [string[]]) { return ,$InputObject }
  $list = New-Object System.Collections.Generic.List[string]
  if ($InputObject -is [System.Collections.IEnumerable]) {
    foreach ($i in $InputObject) {
      if ($null -eq $i) { continue }
      if ($i -is [string]) {
        $s = $i.Trim(); if ($s) { [void]$list.Add($s) }
      } else {
        foreach ($j in (Get-RpmaStringArray $i)) { if ($j) { [void]$list.Add([string]$j) } }
      }
    }
    return ,[string[]]@($list.ToArray())
  }
  $s3 = ("$InputObject").Trim()
  if ($s3) { return ,[string[]]@($s3) }
  return ,[string[]]@()
}

function Get-RpmaDataRows([string]$text) {
  $rows = New-Object System.Collections.Generic.List[string]
  foreach ($line in ($text -split "`r?`n")) {
    $t = $line.Trim()
    if (-not $t) { continue }
    if ($t -match 'rows affected') { continue }
    if ($t -match '^Msg \d+') { continue }
    if ($t -match '^Sqlcmd:') { continue }
    if ($t -match '^\[Microsoft\]') { continue }
    if ($t -match '^Changed database') { continue }
    if ($t -match '^---') { continue }
    [void]$rows.Add($t)
  }
  return ,[string[]]@($rows.ToArray())
}

function ConvertTo-RpmaSqlLit([string]$s) {
  if ($null -eq $s -or $s -eq '') { return 'NULL' }
  return "N'" + ($s.Replace("'", "''")) + "'"
}

function Get-RpmaSnapshotDateSast {
  return (Get-Date).ToUniversalTime().AddHours(2).ToString('yyyy-MM-dd')
}

function Find-RpmaSysproSystemDb {
  param($LocalServer, $LocalUser, $LocalPass)
  $sql = @'
SET NOCOUNT ON;
IF DB_ID(N'SysproDB') IS NOT NULL AND OBJECT_ID(N'SysproDB.dbo.AdmOperator',N'U') IS NOT NULL SELECT N'SysproDB';
ELSE IF DB_ID(N'Sysprodb') IS NOT NULL AND OBJECT_ID(N'Sysprodb.dbo.AdmOperator',N'U') IS NOT NULL SELECT N'Sysprodb';
ELSE IF OBJECT_ID(N'SysproDB.dbo.AdmOperator',N'U') IS NOT NULL SELECT N'SysproDB';
ELSE IF OBJECT_ID(N'Sysprodb.dbo.AdmOperator',N'U') IS NOT NULL SELECT N'Sysprodb';
ELSE SELECT N'';
'@
  $r = Invoke-RpmaSql -Server $LocalServer -User $LocalUser -Pass $LocalPass -SqlText $sql -Tsv
  $row = (Get-RpmaDataRows $r.Text | Select-Object -First 1)
  if ($row) { return $row }

  # Sites like Sir Fruit: system catalog is SIR__SYS (no Sysprodb)
  $dbs = Get-RpmaOnlineDbs -LocalServer $LocalServer -LocalUser $LocalUser -LocalPass $LocalPass
  $prefer = @()
  $rest = @()
  foreach ($db in $dbs) {
    if ($db -match '(?i)^(master|model|msdb|tempdb|SYSPRODeployment|SysproReportingService)$') { continue }
    if ($db -match '(?i)_SRS$') { continue }
    if ($db -match '(?i)SYS$' -or $db -match '(?i)^Sysprodb$') { $prefer += $db } else { $rest += $db }
  }
  foreach ($db in ($prefer + $rest)) {
    $safe = $db.Replace("'", "''")
    $probe = "SET NOCOUNT ON; SELECT CASE WHEN OBJECT_ID(N'" + $safe + ".dbo.AdmOperator',N'U') IS NOT NULL THEN 1 ELSE 0 END;"
    $rr = Invoke-RpmaSql -Server $LocalServer -User $LocalUser -Pass $LocalPass -SqlText $probe -Tsv
    $vRows = Get-RpmaStringArray (Flatten-RpmaStrings (Get-RpmaDataRows $rr.Text))
    $v = if ($vRows.Count -gt 0) { [string]$vRows[0] } else { '' }
    if ($v -eq '1') { return $db }
  }
  throw "Cannot find Syspro system DB (no dbo.AdmOperator). $($r.Text)"
}

function Get-RpmaOnlineDbs {
  param($LocalServer, $LocalUser, $LocalPass)
  Ensure-RpmaSqlRuntime
  $sql = @'
SET NOCOUNT ON;
SELECT name FROM sys.databases
WHERE state_desc = N'ONLINE'
  AND name NOT IN (N'master',N'model',N'msdb',N'tempdb')
ORDER BY name;
'@
  $r = Invoke-RpmaSql -Server $LocalServer -User $LocalUser -Pass $LocalPass -SqlText $sql -Tsv
  return ,(Get-RpmaStringArray (Flatten-RpmaStrings (Get-RpmaDataRows $r.Text)))
}


function Find-RpmaCompanyDbs {
  param($LocalServer, $LocalUser, $LocalPass, [string[]]$PreferredNames = @())
  Ensure-RpmaSqlRuntime
  $prefList = Get-RpmaStringArray (Flatten-RpmaStrings $PreferredNames)
  if ($prefList.Count -gt 0) {
    return ,$prefList
  }
  $all = Get-RpmaStringArray (Get-RpmaOnlineDbs -LocalServer $LocalServer -LocalUser $LocalUser -LocalPass $LocalPass)
  $classic = @($all | Where-Object { (($_ -match '(?i)^SysproCompany') -or ($_ -match '(?i)^AHICAR_')) -and $_ -notmatch '(?i)_SRS$' })
  if ($classic.Count -gt 0) { return ,[string[]]@($classic) }
  $found = New-Object System.Collections.Generic.List[string]
  foreach ($db in $all) {
    if ($db -match '(?i)^(master|model|msdb|tempdb|Sysprodb|SysproDB|SYSPRODeployment|FileManagement|SysproReportingService)$') { continue }
    if ($db -match '(?i)_SRS$' -or $db -match '(?i)^ReportServer') { continue }
    if ($db -match '(?i)SYS$' -and $db -notmatch '(?i)SysCompany') { continue }
    $safe = $db.Replace("'", "''")
    $probe = "SET NOCOUNT ON; SELECT CASE WHEN "
    $probe += "OBJECT_ID(N'" + $safe + ".dbo.InvWarehouse',N'U') IS NOT NULL "
    $probe += "OR OBJECT_ID(N'" + $safe + ".dbo.ApSupplier',N'U') IS NOT NULL "
    $probe += "OR OBJECT_ID(N'" + $safe + ".dbo.ArCustomer',N'U') IS NOT NULL "
    $probe += "OR OBJECT_ID(N'" + $safe + ".dbo.GenMaster',N'U') IS NOT NULL "
    $probe += "OR OBJECT_ID(N'" + $safe + ".dbo.WipJob',N'U') IS NOT NULL THEN 1 ELSE 0 END;"
    $rr = Invoke-RpmaSql -Server $LocalServer -User $LocalUser -Pass $LocalPass -SqlText $probe -Tsv
    $vRows = Get-RpmaStringArray (Flatten-RpmaStrings (Get-RpmaDataRows $rr.Text))
    $v = if ($vRows.Count -gt 0) { [string]$vRows[0] } else { '' }
    if ($v -eq '1') { [void]$found.Add($db) }
  }
  return ,[string[]]@($found.ToArray())
}

function Invoke-RpmaCentralBatches {
  param($CentralServer, $CentralUser, $CentralPass, $CentralDb, [string[]]$Statements, [int]$BatchSize = 25)
  Ensure-RpmaSqlRuntime
  $buf = New-Object System.Text.StringBuilder
  [void]$buf.AppendLine('SET NOCOUNT ON;')
  $n = 0; $total = 0
  foreach ($s in $Statements) {
    if (-not $s) { continue }
    [void]$buf.AppendLine($s)
    $n++
    if ($n -ge $BatchSize) {
      $r = Invoke-RpmaSql -Server $CentralServer -User $CentralUser -Pass $CentralPass -Database $CentralDb -SqlText $buf.ToString()
      if ($r.ExitCode -ne 0) { throw "Central batch failed: $($r.Text)" }
      $total += $n
      $n = 0
      $buf = New-Object System.Text.StringBuilder
      [void]$buf.AppendLine('SET NOCOUNT ON;')
    }
  }
  if ($n -gt 0) {
    $r = Invoke-RpmaSql -Server $CentralServer -User $CentralUser -Pass $CentralPass -Database $CentralDb -SqlText $buf.ToString()
    if ($r.ExitCode -ne 0) { throw "Central final batch failed: $($r.Text)" }
    $total += $n
  }
  return $total
}
