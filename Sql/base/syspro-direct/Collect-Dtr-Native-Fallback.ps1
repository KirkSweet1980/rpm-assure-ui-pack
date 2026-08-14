# Native FinSight L1/L2/L3 when Datarapt missing: INV AP AR WIP + GL control map
# Optional in Customer.Config.ps1:
#   $GlControlMap = @{ INV = '1200'; AP = '2000'; AR = '1100'; WIP = '1300' }
#   $GlControlMapByDb = @{ 'SysproCompanyU' = @{ INV = '1200' } }
# Central: Dim_FinSight_GlControlMap (463_Ensure_FinSight_GlControlMap.sql)
#
# powershell -NoProfile -ExecutionPolicy Bypass -File .\Collect-Dtr-Native-Fallback.ps1 -ConfigPath C:\RPM-Assure\Sql\customers\UVSS\Customer.Config.ps1
param(
  [Parameter(Mandatory = $true)][string]$ConfigPath,
  [switch]$SkipWip,
  [switch]$SkipGl
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Missing config: $ConfigPath" }
. $ConfigPath
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'Lib-Sqlcmd.ps1')
if (-not $LogDir) { $LogDir = Join-Path (Split-Path -Parent $ConfigPath) 'logs' }
Initialize-RpmaCollect -LogDir $LogDir -Prefix ("dtr_native_{0}" -f $CustomerCode)
Write-RpmaLog "START native+GL+WIP customer=$CustomerCode instance=$InstanceName SkipWip=$SkipWip SkipGl=$SkipGl"
Write-RpmaLog "MARKER-GL-V11-20260812"

$LocalS = '.'
$r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText 'SET NOCOUNT ON; SELECT SUSER_SNAME(), @@SERVERNAME;' -Tsv
if ($r.ExitCode -ne 0) { throw "Local SQL failed: $($r.Text)" }
$r = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText 'SET NOCOUNT ON; SELECT DB_NAME(), SUSER_SNAME();' -Tsv
if ($r.ExitCode -ne 0) { throw "Central SQL failed: $($r.Text)" }

$snap = Get-RpmaSnapshotDateSast
$instLit = ConvertTo-RpmaSqlLit $InstanceName
$custLit = ConvertTo-RpmaSqlLit $CustomerCode
Write-RpmaLog "SnapshotDate=$snap"

function Clear-CentralDay([string]$table) {
  $sql = "SET NOCOUNT ON; DELETE FROM dbo.$table WHERE SnapshotDate='$snap' AND InstanceName=$instLit;"
  $rr = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText $sql
  if ($rr.ExitCode -ne 0) { throw "Delete $table failed: $($rr.Text)" }
}
function Send-Batches([string[]]$Statements, [int]$BatchSize = 40) {
  return Invoke-RpmaCentralBatches -CentralServer $CentralDataSource -CentralUser $CentralSqlUser -CentralPass $CentralSqlPassword -CentralDb $CentralDatabase -Statements $Statements -BatchSize $BatchSize
}

# GL map: db -> module -> list of gl codes
$script:GlMap = @{}
function Add-GlMap {
  param([string]$DbKey, [string]$Module, $GlCode)
  $mod = $Module.ToUpperInvariant()
  $dbk = if ($DbKey) { $DbKey } else { '*' }
  if (-not $script:GlMap.ContainsKey($dbk)) { $script:GlMap[$dbk] = @{} }
  if (-not $script:GlMap[$dbk].ContainsKey($mod)) { $script:GlMap[$dbk][$mod] = New-Object 'System.Collections.Generic.List[string]' }
  foreach ($g in @($GlCode)) {
    if ($null -eq $g) { continue }
    if ($g -is [System.Collections.IEnumerable] -and -not ($g -is [string])) {
      foreach ($gg in @($g)) { Add-GlMap -DbKey $dbk -Module $mod -GlCode $gg }
      continue
    }
    $s = [string]$g
    if ([string]::IsNullOrWhiteSpace($s) -or $s -eq 'System.Object[]') { continue }
    $s = $s.Trim()
    if (-not $script:GlMap[$dbk][$mod].Contains($s)) { [void]$script:GlMap[$dbk][$mod].Add($s) }
  }
}

if (Get-Variable -Name GlControlMap -Scope Global -ErrorAction SilentlyContinue) { } # may be script scope from dot-source
if ($null -ne (Get-Variable -Name GlControlMap -ErrorAction SilentlyContinue)) {
  if ($GlControlMap -is [hashtable]) {
    foreach ($k in $GlControlMap.Keys) { Add-GlMap -DbKey '*' -Module ([string]$k) -GlCode $GlControlMap[$k] }
  }
}
if ($null -ne (Get-Variable -Name GlControlMapByDb -ErrorAction SilentlyContinue)) {
  if ($GlControlMapByDb -is [hashtable]) {
    foreach ($dbk in $GlControlMapByDb.Keys) {
      $inner = $GlControlMapByDb[$dbk]
      if ($inner -is [hashtable]) {
        foreach ($k in $inner.Keys) { Add-GlMap -DbKey ([string]$dbk) -Module ([string]$k) -GlCode $inner[$k] }
      }
    }
  }
}

if (-not $SkipGl) {
  $mapSql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Dim_FinSight_GlControlMap',N'U') IS NULL BEGIN SELECT N'NOMAP'; RETURN; END
SELECT LTRIM(RTRIM(CompanyDb)) + N'|' + LTRIM(RTRIM(ModuleCode)) + N'|' + LTRIM(RTRIM(GlCode))
FROM dbo.Dim_FinSight_GlControlMap WITH (NOLOCK)
WHERE Active=1 AND CustomerCode=$custLit AND NULLIF(LTRIM(RTRIM(GlCode)),N'') IS NOT NULL;
"@
  $mr = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText $mapSql -Tsv
  if ($mr.ExitCode -eq 0) {
    foreach ($line in (Get-RpmaDataRows $mr.Text)) {
      if ($line -eq 'NOMAP' -or $line -notmatch '\|') { continue }
      $p = $line -split '\|', 3
      if ($p.Count -ge 3) { Add-GlMap -DbKey $p[0] -Module $p[1] -GlCode $p[2] }
    }
  } else { Write-RpmaLog "GL map soft-fail $($mr.Text)" }
}
# summary map keys
$mapN = 0
foreach ($dk in @($script:GlMap.Keys)) {
  foreach ($mk in @($script:GlMap[$dk].Keys)) {
    $mapN += @($script:GlMap[$dk][$mk]).Count
  }
}
Write-RpmaLog ("GL map entries loaded=$mapN dbs=" + (($script:GlMap.Keys | Sort-Object) -join ','))


function Get-GlCodeList {
  param([string]$Db, [string]$Module)
  $mod = $Module.ToUpperInvariant()
  $flat = New-Object System.Collections.Generic.List[string]
  foreach ($key in @($Db, '*')) {
    if (-not $script:GlMap.ContainsKey($key)) { continue }
    if (-not $script:GlMap[$key].ContainsKey($mod)) { continue }
    $raw = $script:GlMap[$key][$mod]
    if ($null -eq $raw) { continue }
    # Always walk via List index to avoid PS unrolling surprises
    $tmp = New-Object System.Collections.Generic.List[object]
    if ($raw -is [string]) {
      [void]$tmp.Add($raw)
    } elseif ($raw -is [System.Collections.IList]) {
      for ($i = 0; $i -lt $raw.Count; $i++) { [void]$tmp.Add($raw[$i]) }
    } else {
      [void]$tmp.Add($raw)
    }
    for ($i = 0; $i -lt $tmp.Count; $i++) {
      $item = $tmp[$i]
      if ($null -eq $item) { continue }
      if (($item -is [System.Collections.IList]) -and -not ($item -is [string])) {
        for ($j = 0; $j -lt $item.Count; $j++) {
          $s = [string]$item[$j]
          if ([string]::IsNullOrWhiteSpace($s)) { continue }
          $s = $s.Trim()
          if ($s.StartsWith('System.')) { continue }
          if (-not $flat.Contains($s)) { [void]$flat.Add($s) }
        }
      } else {
        $s = [string]$item
        if ([string]::IsNullOrWhiteSpace($s)) { continue }
        $s = $s.Trim()
        if ($s.StartsWith('System.')) { continue }
        if (-not $flat.Contains($s)) { [void]$flat.Add($s) }
      }
    }
  }
  # NEVER return List directly (PS unrolls 1-item list to string)
  $script:LastGlCodeList = $flat
}

function Lookup-GlBalance {
  param([string]$Db, $CodeList)
  $script:LastGlCloseBalance = $null
  if ($SkipGl) { return }
  if ($null -eq $CodeList -or $CodeList.Count -lt 1) { return }

  $inParts = New-Object System.Collections.Generic.List[string]
  for ($i = 0; $i -lt $CodeList.Count; $i++) {
    $s = [string]$CodeList[$i]
    if ([string]::IsNullOrWhiteSpace($s)) { continue }
    $s = $s.Trim()
    if ($s.StartsWith('System.')) { continue }
    [void]$inParts.Add("N'" + ($s.Replace("'", "''")) + "'")
    $compact = $s.Replace('-','').Replace(' ','')
    if ($compact -ne $s -and $compact.Length -gt 0) {
      [void]$inParts.Add("N'" + ($compact.Replace("'", "''")) + "'")
    }
  }
  if ($inParts.Count -lt 1) { return }
  $inList = [string]::Join(',', $inParts.ToArray())
  $dbSafe = $Db.Replace(']', ']]')
  $dbLit = $Db.Replace("'", "''")

  $sqlCol = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'$dbLit.dbo.GenMaster',N'U') IS NULL BEGIN SELECT N'NOGEN'; RETURN; END
DECLARE @bal sysname=NULL;
SELECT TOP 1 @bal=c.name FROM [$dbSafe].sys.columns c
JOIN [$dbSafe].sys.tables t ON t.object_id=c.object_id AND t.name=N'GenMaster'
WHERE c.name IN (N'CurrentBalance',N'ClosingBalance',N'Balance',N'PeriodBalance',N'CloseBalance',N'YtdBalance',N'MtdBalance',N'ActualBalance',N'AccountBalance')
ORDER BY CASE c.name WHEN N'CurrentBalance' THEN 0 WHEN N'ClosingBalance' THEN 1 WHEN N'Balance' THEN 2 ELSE 9 END;
IF @bal IS NULL
  SELECT TOP 1 @bal=c.name FROM [$dbSafe].sys.columns c
  JOIN [$dbSafe].sys.tables t ON t.object_id=c.object_id AND t.name=N'GenMaster'
  JOIN [$dbSafe].sys.types ty ON ty.user_type_id=c.user_type_id
  WHERE ty.name IN (N'decimal',N'numeric',N'money',N'smallmoney') AND c.name LIKE N'%Bal%'
  ORDER BY c.column_id;
IF @bal IS NULL BEGIN SELECT N'NOBALCOL'; RETURN; END
SELECT CONVERT(nvarchar(128), @bal);
"@
  $rr = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $sqlCol -Tsv
  if ($rr.ExitCode -ne 0) {
    Write-RpmaLog ("Lookup-GlBalance col-fail " + $Db + " " + $rr.Text)
    return
  }
  $balCol = $null
  foreach ($line in (Get-RpmaStringArray (Get-RpmaDataRows $rr.Text))) {
    $s = [string]$line
    if ($null -eq $s) { continue }
    $s = $s.Trim()
    if ($s -eq 'NOGEN' -or $s -eq 'NOBALCOL') {
      Write-RpmaLog ("Lookup-GlBalance " + $Db + " " + $s)
      return
    }
    if ($s -match '^[A-Za-z_][A-Za-z0-9_]*$') { $balCol = $s; break }
  }
  if (-not $balCol) {
    Write-RpmaLog ("Lookup-GlBalance " + $Db + " no-bal-col")
    return
  }

  $bq = '[' + $balCol.Replace(']', ']]') + ']'
  $sqlSum = @"
SET NOCOUNT ON;
SELECT CONVERT(varchar(40),ISNULL(SUM(TRY_CONVERT(decimal(18,2),$bq)),0))
FROM [$dbSafe].dbo.GenMaster
WHERE LTRIM(RTRIM(CONVERT(nvarchar(50),GlCode))) IN ($inList)
   OR REPLACE(REPLACE(LTRIM(RTRIM(CONVERT(nvarchar(50),GlCode))),N'-',N''),N' ',N'') IN ($inList);
"@
  $rr2 = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $sqlSum -Tsv
  if ($rr2.ExitCode -ne 0) {
    Write-RpmaLog ("Lookup-GlBalance sum-fail " + $Db + " col=" + $balCol + " " + $rr2.Text)
    return
  }
  $found = $null
  foreach ($line in (Get-RpmaStringArray (Get-RpmaDataRows $rr2.Text))) {
    $s = [string]$line
    if ($null -eq $s) { continue }
    $s = $s.Trim()
    if ($s -match '^-?\d+(\.\d+)?$') { $found = $s; break }
  }
  if ($null -eq $found) {
    Write-RpmaLog ("Lookup-GlBalance " + $Db + " no-number col=" + $balCol + " in=[" + $inList + "]")
    return
  }
  try {
    $script:LastGlCloseBalance = [System.Decimal]::Parse($found, [System.Globalization.CultureInfo]::InvariantCulture)
    Write-RpmaLog ("Lookup-GlBalance " + $Db + " col=" + $balCol + " ok=" + $found)
  } catch {
    Write-RpmaLog ("Lookup-GlBalance parse fail " + $found)
  }
}

function Get-PipeRows([string]$SqlText) {
  $rr = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $SqlText -Tsv
  $list = New-Object 'System.Collections.Generic.List[string]'
  if ($rr.ExitCode -ne 0) { Write-RpmaLog "query FAIL $($rr.Text)"; return @(,$list.ToArray()) }
  foreach ($line in (Get-RpmaDataRows $rr.Text)) {
    $s = [string]$line
    if (-not $s) { continue }
    # Keep level rows + WIP/discover markers (META| was previously dropped)
    if ($s -match '^[123]\|') { [void]$list.Add($s); continue }
    if ($s -match '^(META|NOWIP|NOWIPCOLS|NOAR|NOINV|NOAP|WIPMETA)\|') { [void]$list.Add($s); continue }
    if ($s -match '^NO') { Write-RpmaLog $s; continue }
  }
  return @(,$list.ToArray())
}

function Write-ModuleRows {
  param([string]$TargetTable, [string]$Db, [string]$Module, $DetailLines)
  $lines = @()
  if ($null -ne $DetailLines) {
    if ($DetailLines -is [string]) {
      if ($DetailLines -match '^[123]\|') { $lines = @($DetailLines) }
    } elseif ($DetailLines -is [System.Collections.IList]) {
      for ($i = 0; $i -lt $DetailLines.Count; $i++) {
        $L = [string]$DetailLines[$i]
        if ($L -match '^[123]\|') { $lines += $L }
      }
    } else {
      foreach ($L0 in @($DetailLines)) {
        $L = [string]$L0
        if ($L -match '^[123]\|') { $lines += $L }
      }
    }
  }
  if ($lines.Count -eq 0) { return 0 }

  Write-RpmaLog ("Write-ModuleRows " + $Module + " " + $Db + " lines=" + $lines.Count)
  $script:LastGlCodeList = $null
  Get-GlCodeList -Db $Db -Module $Module
  $glList = $script:LastGlCodeList
  if ($null -eq $glList) { $glList = New-Object System.Collections.Generic.List[string] }
  Write-RpmaLog ("Write-ModuleRows map codes=" + $glList.Count)

  $script:LastGlCloseBalance = $null
  if ($glList.Count -gt 0) {
    Lookup-GlBalance -Db $Db -CodeList $glList
  }

  $hasGl = $false
  $gclNum = [System.Decimal]0
  if ($null -ne $script:LastGlCloseBalance) {
    $hasGl = $true
    $gclNum = [System.Decimal]$script:LastGlCloseBalance
  }
  $tag = '[Native]'
  if ($hasGl) { $tag = '[Native+GL]' }
  $glJoin = ''
  if ($glList.Count -gt 0) {
    $jb = New-Object System.Collections.Generic.List[string]
    for ($gi = 0; $gi -lt $glList.Count; $gi++) { [void]$jb.Add([string]$glList[$gi]) }
    $glJoin = [string]::Join(',', $jb.ToArray())
  }
  $gclShow = 'n/a'
  if ($hasGl) { $gclShow = $gclNum.ToString([System.Globalization.CultureInfo]::InvariantCulture) }
  Write-RpmaLog ($Module + ' ' + $Db + ' GL=[' + $glJoin + '] glClose=' + $gclShow + ' mapHit=' + $glList.Count)

  $stmts = New-Object 'System.Collections.Generic.List[string]'
  foreach ($line in $lines) {
    $p = $line -split '\|'
    if ($p.Count -lt 5) { continue }
    $il = $p[0]
    if ($il -notmatch '^[123]$') { continue }
    $k = $p[1]; $d1 = $p[2]; $ds = $p[3]; $subStr = $p[4]
    if ($subStr -notmatch '^-?\d+(\.\d+)?$') { $subStr = '0' }

    $ds2 = $tag + ' ' + $ds
    if (($il -eq '1') -and ($glJoin -ne '')) {
      $ds2 = $tag + ' ' + $Module + ' control GL=' + $glJoin + ' | ' + $ds
    }
    $glCodeOut = $k
    if (($il -eq '1') -and ($glList.Count -gt 0)) { $glCodeOut = [string]$glList[0] }

    $gcl = $subStr
    $vr = '0'
    if (($il -eq '1') -and $hasGl) {
      try {
        $subNum = [System.Decimal]::Parse($subStr, [System.Globalization.CultureInfo]::InvariantCulture)
        $useGl = $gclNum
        if (($Module -eq 'AP') -or ($Module -eq 'AR')) {
          $sd = [double]$subNum
          $gd = [double]$useGl
          if (([Math]::Abs($sd) -gt 0.005) -and ([Math]::Abs($gd) -gt 0.005)) {
            if ([Math]::Sign($sd) -ne [Math]::Sign($gd)) {
              $useGl = [System.Decimal]([Math]::Abs($gd) * [Math]::Sign($sd))
            }
          }
        }
        $gcl = $useGl.ToString('0.00', [System.Globalization.CultureInfo]::InvariantCulture)
        $diff = $subNum - $useGl
        $vr = $diff.ToString('0.00', [System.Globalization.CultureInfo]::InvariantCulture)
      } catch {
        Write-RpmaLog ('var soft-fail ' + $_.Exception.Message)
        $gcl = $subStr
        $vr = '0'
      }
    }

    $dbLit = ConvertTo-RpmaSqlLit $Db
    $kLit = ConvertTo-RpmaSqlLit $k
    $gLit = ConvertTo-RpmaSqlLit $glCodeOut
    $d1Lit = ConvertTo-RpmaSqlLit $d1
    $dsLit = ConvertTo-RpmaSqlLit $ds2

    switch ($TargetTable) {
      'Syspro_DtrInvBalances' {
        $ins = "INSERT INTO dbo.Syspro_DtrInvBalances (SnapshotDate,InstanceName,CompanyDb,CustomerCode,GlYear,GlPeriod,InformationLevel,LevelKey,GlCode,Dimension1,Warehouse,Description,InvOpenBalance,InvCloseBalance,GlOpenBalance,GlCloseBalance,Variance,RefreshDate,ImportedAt) VALUES ('$snap',$instLit,$dbLit,$custLit,NULL,NULL,$il,$kLit,$gLit,$d1Lit,$d1Lit,$dsLit,NULL,$subStr,NULL,$gcl,$vr,SYSUTCDATETIME(),SYSUTCDATETIME());"
      }
      'Syspro_DtrApBalances' {
        $ins = "INSERT INTO dbo.Syspro_DtrApBalances (SnapshotDate,InstanceName,CompanyDb,CustomerCode,GlYear,GlPeriod,InformationLevel,LevelKey,GlCode,Dimension1,Branch,Description,ApOpenBalance,ApCloseBalance,GlOpenBalance,GlCloseBalance,Variance,RefreshDate,ImportedAt) VALUES ('$snap',$instLit,$dbLit,$custLit,NULL,NULL,$il,$kLit,$gLit,$d1Lit,$d1Lit,$dsLit,NULL,$subStr,NULL,$gcl,$vr,SYSUTCDATETIME(),SYSUTCDATETIME());"
      }
      'Syspro_DtrArBalances' {
        $ins = "INSERT INTO dbo.Syspro_DtrArBalances (SnapshotDate,InstanceName,CompanyDb,CustomerCode,GlYear,GlPeriod,InformationLevel,LevelKey,GlCode,Dimension1,Branch,Description,ArOpenBalance,ArCloseBalance,GlOpenBalance,GlCloseBalance,Variance,RefreshDate,ImportedAt) VALUES ('$snap',$instLit,$dbLit,$custLit,NULL,NULL,$il,$kLit,$gLit,$d1Lit,$d1Lit,$dsLit,NULL,$subStr,NULL,$gcl,$vr,SYSUTCDATETIME(),SYSUTCDATETIME());"
      }
      'Syspro_DtrWipBalances' {
        $ins = "INSERT INTO dbo.Syspro_DtrWipBalances (SnapshotDate,InstanceName,CompanyDb,CustomerCode,GlYear,GlPeriod,InformationLevel,LevelKey,GlCode,Description,SubOpenBalance,SubCloseBalance,GlOpenBalance,GlCloseBalance,Variance,RefreshDate,ImportedAt) VALUES ('$snap',$instLit,$dbLit,$custLit,NULL,NULL,$il,$kLit,$gLit,$dsLit,NULL,$subStr,NULL,$gcl,$vr,SYSUTCDATETIME(),SYSUTCDATETIME());"
      }
      default { continue }
    }
    [void]$stmts.Add($ins)
  }
  if ($stmts.Count -eq 0) { return 0 }
  return (Send-Batches -Statements $stmts.ToArray() -BatchSize 40)
}

foreach ($t in @('Syspro_DtrInvBalances','Syspro_DtrApBalances','Syspro_DtrArBalances','Syspro_DtrWipBalances')) {
  try { Clear-CentralDay $t; Write-RpmaLog "cleared $t" } catch { Write-RpmaLog "clear $t skip" }
}

$allDbs = Get-RpmaStringArray (Get-RpmaOnlineDbs -LocalServer $LocalS -LocalUser $LocalSqlUser -LocalPass $LocalSqlPassword)
Write-RpmaLog ("online DBs (" + $allDbs.Count + "): " + ($allDbs -join ', '))
$pref = @()
if ($CompanyDatabases) { $pref = Get-RpmaStringArray (Flatten-RpmaStrings $CompanyDatabases) }
$companyDbs = Get-RpmaStringArray (Find-RpmaCompanyDbs -LocalServer $LocalS -LocalUser $LocalSqlUser -LocalPass $LocalSqlPassword -PreferredNames $pref)
# Drop junk / multi-name blobs (defense)
$companyDbs = @($companyDbs | Where-Object {
  $_ -and ($_ -notmatch '\s') -and ($_ -notmatch '(?i)^SYSPRODeployment$') -and ($_ -notmatch '(?i)^Sysprodb$') -and ($_ -notmatch '(?i)_SRS$')
})
Write-RpmaLog ("company DBs: " + ($companyDbs -join ', '))
if ($companyDbs.Count -eq 0) { Write-RpmaLog 'WARN no company DBs - set $CompanyDatabases in Customer.Config.ps1' }
$grand = 0

foreach ($db in $companyDbs) {
  if (-not $db -or $db -match '\s') { Write-RpmaLog "SKIP bad company name: $db"; continue }
  $dbQ = '[' + $db.Replace(']', ']]') + ']'
  Write-RpmaLog "=== $db ==="

  # INV
  $invSql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'$db.dbo.InvWarehouse',N'U') IS NULL BEGIN SELECT 'NOINV|0'; RETURN; END
DECLARE @stock sysname=NULL,@wh sysname=NULL,@qty sysname=NULL,@cost sysname=NULL,@val sysname=NULL;
SELECT TOP 1 @stock=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'InvWarehouse' WHERE c.name IN (N'StockCode',N'Stock') ORDER BY CASE c.name WHEN N'StockCode' THEN 0 ELSE 1 END;
SELECT TOP 1 @wh=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'InvWarehouse' WHERE c.name IN (N'Warehouse',N'WarehouseCode',N'Whouse');
SELECT TOP 1 @qty=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'InvWarehouse' WHERE c.name IN (N'QtyOnHand',N'QtyOnHandUm',N'OnHand') ORDER BY CASE c.name WHEN N'QtyOnHand' THEN 0 ELSE 1 END;
SELECT TOP 1 @cost=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'InvWarehouse' WHERE c.name IN (N'UnitCost',N'AverageCost',N'StdCost',N'Cost',N'WarehouseCost');
SELECT TOP 1 @val=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'InvWarehouse' WHERE c.name IN (N'TotalCost',N'StockValue',N'InventoryValue',N'Value');
IF @stock IS NULL BEGIN SELECT 'NOCOLS|0'; RETURN; END
DECLARE @valExpr nvarchar(400);
IF @val IS NOT NULL SET @valExpr = N'TRY_CONVERT(decimal(18,2), '+QUOTENAME(@val)+N')';
ELSE IF @qty IS NOT NULL AND @cost IS NOT NULL SET @valExpr = N'TRY_CONVERT(decimal(18,2), '+QUOTENAME(@qty)+N')*TRY_CONVERT(decimal(18,6), '+QUOTENAME(@cost)+N')';
ELSE IF @qty IS NOT NULL SET @valExpr = N'TRY_CONVERT(decimal(18,2), '+QUOTENAME(@qty)+N')';
ELSE SET @valExpr = N'CONVERT(decimal(18,2),0)';
DECLARE @whExpr nvarchar(300)=CASE WHEN @wh IS NOT NULL THEN N'LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@wh)+N')))' ELSE N'N''''' END;
DECLARE @stExpr nvarchar(300)=N'LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@stock)+N')))';
DECLARE @sql nvarchar(max)=N';WITH base AS (SELECT '+@stExpr+N' AS StockCode,'+@whExpr+N' AS Warehouse,'+@valExpr+N' AS Val FROM $dbQ.dbo.InvWarehouse),
l3 AS (SELECT TOP 400 StockCode,Warehouse,SUM(ISNULL(Val,0)) AS Val FROM base GROUP BY StockCode,Warehouse HAVING ABS(SUM(ISNULL(Val,0)))>0.0001 ORDER BY ABS(SUM(ISNULL(Val,0))) DESC),
l2 AS (SELECT Warehouse,SUM(Val) AS Val FROM l3 GROUP BY Warehouse),
l1 AS (SELECT SUM(Val) AS Val FROM l2)
SELECT N''3|''+LEFT(StockCode,50)+N''|''+LEFT(ISNULL(Warehouse,N''''),50)+N''|''+LEFT(N''INV ''+StockCode+CASE WHEN Warehouse<>N'''' THEN N'' @ ''+Warehouse ELSE N'''' END,180)+N''|''+CONVERT(varchar(40),Val) FROM l3
UNION ALL SELECT N''2|''+LEFT(ISNULL(Warehouse,N''(default)''),50)+N''|''+LEFT(ISNULL(Warehouse,N''''),50)+N''|''+LEFT(N''INV warehouse ''+ISNULL(Warehouse,N''(default)''),180)+N''|''+CONVERT(varchar(40),Val) FROM l2
UNION ALL SELECT N''1|INV||INV company total|''+CONVERT(varchar(40),Val) FROM l1;';
EXEC sp_executesql @sql;
"@
  $n = Write-ModuleRows -TargetTable 'Syspro_DtrInvBalances' -Db $db -Module 'INV' -DetailLines (Get-PipeRows $invSql)
  $grand += $n; Write-RpmaLog "INV $db wrote=$n"

  # AP
  $apSql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'$db.dbo.ApSupplier',N'U') IS NOT NULL
BEGIN
  DECLARE @sup sysname=NULL,@bal sysname=NULL,@br sysname=NULL;
  SELECT TOP 1 @sup=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'ApSupplier' WHERE c.name IN (N'Supplier',N'SupplierCode',N'Vendor') ORDER BY CASE c.name WHEN N'Supplier' THEN 0 ELSE 1 END;
  SELECT TOP 1 @bal=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'ApSupplier' WHERE c.name IN (N'Balance',N'CurrentBalance',N'SupplierBalance',N'OutstandingBalance',N'TotalBalance');
  SELECT TOP 1 @br=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'ApSupplier' WHERE c.name IN (N'Branch',N'BranchCode',N'Area');
  IF @sup IS NOT NULL AND @bal IS NOT NULL
  BEGIN
    DECLARE @sqlA nvarchar(max)=N';WITH l3 AS (SELECT TOP 400 LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@sup)+N'))) AS K,'+CASE WHEN @br IS NOT NULL THEN N'LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@br)+N')))' ELSE N'N''''' END+N' AS Br,SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@bal)+N')) AS Val FROM $dbQ.dbo.ApSupplier GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@sup)+N')))'+CASE WHEN @br IS NOT NULL THEN N', LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@br)+N')))' ELSE N'' END+N' HAVING ABS(SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@bal)+N')))>0.0001 ORDER BY ABS(SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@bal)+N'))) DESC),
    l2 AS (SELECT Br,SUM(Val) AS Val FROM l3 GROUP BY Br),
    l1 AS (SELECT SUM(Val) AS Val FROM l2)
    SELECT N''3|''+K+N''|''+Br+N''|''+LEFT(N''AP ''+K,180)+N''|''+CONVERT(varchar(40),Val) FROM l3
    UNION ALL SELECT N''2|''+LEFT(ISNULL(Br,N''(default)''),50)+N''|''+Br+N''|''+LEFT(N''AP branch ''+ISNULL(Br,N''(default)''),180)+N''|''+CONVERT(varchar(40),Val) FROM l2
    UNION ALL SELECT N''1|AP||AP company total|''+CONVERT(varchar(40),Val) FROM l1;';
    EXEC sp_executesql @sqlA; RETURN;
  END
END
IF OBJECT_ID(N'$db.dbo.ApInvoice',N'U') IS NOT NULL
BEGIN
  DECLARE @isup sysname=NULL,@iamt sysname=NULL;
  SELECT TOP 1 @isup=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'ApInvoice' WHERE c.name IN (N'Supplier',N'SupplierCode');
  SELECT TOP 1 @iamt=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'ApInvoice' WHERE c.name IN (N'InvoiceBalance',N'Balance',N'OutstandingValue',N'DocBalance',N'NetValue',N'OrigDocValue');
  IF @isup IS NOT NULL AND @iamt IS NOT NULL
  BEGIN
    DECLARE @sqlI nvarchar(max)=N';WITH l3 AS (SELECT TOP 400 LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@isup)+N'))) AS K,SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@iamt)+N')) AS Val FROM $dbQ.dbo.ApInvoice GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@isup)+N'))) HAVING ABS(SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@iamt)+N')))>0.0001 ORDER BY ABS(SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@iamt)+N'))) DESC),
    l1 AS (SELECT SUM(Val) AS Val FROM l3)
    SELECT N''3|''+K+N''||''+LEFT(N''AP supplier ''+K,180)+N''|''+CONVERT(varchar(40),Val) FROM l3
    UNION ALL SELECT N''2|AP-OPEN||AP open invoices mid|''+CONVERT(varchar(40),SUM(Val)) FROM l3
    UNION ALL SELECT N''1|AP||AP company total|''+CONVERT(varchar(40),Val) FROM l1;';
    EXEC sp_executesql @sqlI; RETURN;
  END
END
SELECT 'NOAP|0';
"@
  # fix accidental PowerShell injection in apSql - rewrite without $(if
  $n = Write-ModuleRows -TargetTable 'Syspro_DtrApBalances' -Db $db -Module 'AP' -DetailLines (Get-PipeRows $apSql)
  $grand += $n; Write-RpmaLog "AP $db wrote=$n"

  # AR
  $arSql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'$db.dbo.ArCustomer',N'U') IS NULL BEGIN SELECT 'NOAR|0'; RETURN; END
DECLARE @cus sysname=NULL,@bal sysname=NULL,@br sysname=NULL;
SELECT TOP 1 @cus=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'ArCustomer' WHERE c.name IN (N'Customer',N'CustomerCode',N'Debtor') ORDER BY CASE c.name WHEN N'Customer' THEN 0 ELSE 1 END;
SELECT TOP 1 @bal=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'ArCustomer' WHERE c.name IN (N'Balance',N'CurrentBalance',N'CustomerBalance',N'OutstandingBalance',N'TotalBalance',N'CreditBalance',N'SalesBalance',N'AgeingBalance',N'OutstBalance',N'ValueBalance',N'Bal',N'NetBalance',N'AccountBalance',N'ArBalance',N'DebtorBalance',N'OpenBalance',N'ClosingBalance');
SELECT TOP 1 @br=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'ArCustomer' WHERE c.name IN (N'Branch',N'BranchCode',N'Area',N'Salesperson');
IF @cus IS NULL OR @bal IS NULL
BEGIN
  IF OBJECT_ID(N'$db.dbo.ArInvoice',N'U') IS NOT NULL
  BEGIN
    DECLARE @icus sysname=NULL,@iamt2 sysname=NULL;
    SELECT TOP 1 @icus=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'ArInvoice' WHERE c.name IN (N'Customer',N'CustomerCode',N'Debtor');
    SELECT TOP 1 @iamt2=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'ArInvoice' WHERE c.name IN (N'InvoiceBalance',N'InvoiceBal',N'Balance',N'OutstandingValue',N'DocBalance',N'NetValue',N'OrigDocValue',N'DocumentValue',N'ForeignValue',N'ConvValue');
    IF @icus IS NOT NULL AND @iamt2 IS NOT NULL
    BEGIN
      DECLARE @sqlInv nvarchar(max)=N';WITH l3 AS (SELECT TOP 400 LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@icus)+N'))) AS K,SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@iamt2)+N')) AS Val FROM $dbQ.dbo.ArInvoice GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@icus)+N'))) HAVING ABS(SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@iamt2)+N')))>0.0001 ORDER BY ABS(SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@iamt2)+N'))) DESC),
      l1 AS (SELECT SUM(Val) AS Val FROM l3)
      SELECT N''3|''+K+N''||''+LEFT(N''AR customer ''+K,180)+N''|''+CONVERT(varchar(40),Val) FROM l3
      UNION ALL SELECT N''2|AR-OPEN||AR open invoices mid|''+CONVERT(varchar(40),SUM(Val)) FROM l3
      UNION ALL SELECT N''1|AR||AR company total|''+CONVERT(varchar(40),Val) FROM l1;';
      EXEC sp_executesql @sqlInv; RETURN;
    END
  END
  IF OBJECT_ID(N'$db.dbo.ArCustomerBal',N'U') IS NOT NULL OR OBJECT_ID(N'$db.dbo.ArCustomerBalance',N'U') IS NOT NULL
  BEGIN
    DECLARE @bt sysname = CASE WHEN OBJECT_ID(N'$db.dbo.ArCustomerBal',N'U') IS NOT NULL THEN N'ArCustomerBal' ELSE N'ArCustomerBalance' END;
    DECLARE @bcus sysname=NULL,@bbal sysname=NULL;
    SELECT TOP 1 @bcus=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=@bt WHERE c.name IN (N'Customer',N'CustomerCode',N'Debtor');
    SELECT TOP 1 @bbal=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=@bt JOIN $dbQ.sys.types ty ON ty.user_type_id=c.user_type_id WHERE ty.name IN (N'decimal',N'numeric',N'money') AND c.name LIKE N'%Bal%' ORDER BY c.column_id;
    IF @bcus IS NOT NULL AND @bbal IS NOT NULL
    BEGIN
      DECLARE @sqlB nvarchar(max)=N';WITH l3 AS (SELECT TOP 400 LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@bcus)+N'))) AS K,SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@bbal)+N')) AS Val FROM $dbQ.dbo.'+QUOTENAME(@bt)+N' GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@bcus)+N'))) HAVING ABS(SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@bbal)+N')))>0.0001 ORDER BY ABS(SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@bbal)+N'))) DESC),
      l1 AS (SELECT SUM(Val) AS Val FROM l3)
      SELECT N''3|''+K+N''||''+LEFT(N''AR bal ''+K,180)+N''|''+CONVERT(varchar(40),Val) FROM l3
      UNION ALL SELECT N''2|AR-BAL||AR balance mid|''+CONVERT(varchar(40),SUM(Val)) FROM l3
      UNION ALL SELECT N''1|AR||AR company total|''+CONVERT(varchar(40),Val) FROM l1;';
      EXEC sp_executesql @sqlB; RETURN;
    END
  END
  IF OBJECT_ID(N'$db.dbo.ArCustomer',N'U') IS NOT NULL
  BEGIN
    DECLARE @dcus sysname=NULL,@dbal sysname=NULL;
    SELECT TOP 1 @dcus=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'ArCustomer' WHERE c.name IN (N'Customer',N'CustomerCode',N'Debtor');
    SELECT TOP 1 @dbal=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=N'ArCustomer' JOIN $dbQ.sys.types ty ON ty.user_type_id=c.user_type_id WHERE ty.name IN (N'decimal',N'numeric',N'money',N'smallmoney') AND (c.name LIKE N'%Bal%' OR c.name LIKE N'%Outst%') ORDER BY c.column_id;
    IF @dcus IS NOT NULL AND @dbal IS NOT NULL
    BEGIN
      DECLARE @sqlD nvarchar(max)=N';WITH l3 AS (SELECT TOP 400 LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@dcus)+N'))) AS K,SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@dbal)+N')) AS Val FROM $dbQ.dbo.ArCustomer GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@dcus)+N'))) HAVING ABS(SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@dbal)+N')))>0.0001 ORDER BY ABS(SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@dbal)+N'))) DESC),
      l1 AS (SELECT SUM(Val) AS Val FROM l3)
      SELECT N''3|''+K+N''||''+LEFT(N''AR ''+K,180)+N''|''+CONVERT(varchar(40),Val) FROM l3
      UNION ALL SELECT N''2|AR-DYN||AR dynamic mid|''+CONVERT(varchar(40),SUM(Val)) FROM l3
      UNION ALL SELECT N''1|AR||AR company total|''+CONVERT(varchar(40),Val) FROM l1;';
      EXEC sp_executesql @sqlD; RETURN;
    END
  END
  SELECT 'NOARCOLS|0'; RETURN;
END
DECLARE @sqlR nvarchar(max)=N';WITH l3 AS (SELECT TOP 400 LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@cus)+N'))) AS K,'+CASE WHEN @br IS NOT NULL THEN N'LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@br)+N')))' ELSE N'N''''' END+N' AS Br,SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@bal)+N')) AS Val FROM $dbQ.dbo.ArCustomer GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@cus)+N')))'+CASE WHEN @br IS NOT NULL THEN N', LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@br)+N')))' ELSE N'' END+N' HAVING ABS(SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@bal)+N')))>0.0001 ORDER BY ABS(SUM(TRY_CONVERT(decimal(18,2), '+QUOTENAME(@bal)+N'))) DESC),
l2 AS (SELECT Br,SUM(Val) AS Val FROM l3 GROUP BY Br),
l1 AS (SELECT SUM(Val) AS Val FROM l2)
SELECT N''3|''+K+N''|''+Br+N''|''+LEFT(N''AR ''+K,180)+N''|''+CONVERT(varchar(40),Val) FROM l3
UNION ALL SELECT N''2|''+LEFT(ISNULL(Br,N''(default)''),50)+N''|''+Br+N''|''+LEFT(N''AR branch ''+ISNULL(Br,N''(default)''),180)+N''|''+CONVERT(varchar(40),Val) FROM l2
UNION ALL SELECT N''1|AR||AR company total|''+CONVERT(varchar(40),Val) FROM l1;';
EXEC sp_executesql @sqlR;
"@
  $n = Write-ModuleRows -TargetTable 'Syspro_DtrArBalances' -Db $db -Module 'AR' -DetailLines (Get-PipeRows $arSql)
  $grand += $n; Write-RpmaLog "AR $db wrote=$n"

  if (-not $SkipWip) {
    $wipDisc = @"
SET NOCOUNT ON;
DECLARE @wt sysname=(SELECT TOP 1 t.name FROM $dbQ.sys.tables t WHERE t.name IN (
  N'WipMaster',N'WipJob',N'WipJobAll',N'BomWipMaster',N'WipJobMaster'
) ORDER BY CASE t.name WHEN N'WipMaster' THEN 0 WHEN N'WipJob' THEN 1 ELSE 2 END);
IF @wt IS NULL BEGIN SELECT N'NOWIP|none'; RETURN; END
DECLARE @job sysname=NULL,@mat sysname=NULL,@lab sysname=NULL,@foh sysname=NULL,@voh sysname=NULL,@sub sysname=NULL,@val sysname=NULL,@comp sysname=NULL;
SELECT TOP 1 @job=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=@wt
  WHERE c.name IN (N'Job',N'JobNumber',N'WipJob',N'JobCode') ORDER BY CASE c.name WHEN N'Job' THEN 0 ELSE 1 END;
SELECT TOP 1 @mat=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=@wt
  WHERE c.name IN (N'MatCostToDate1',N'MaterialValue',N'MatCost',N'MatValue',N'MaterialCost',N'MatValueIssues1')
  ORDER BY CASE c.name WHEN N'MatCostToDate1' THEN 0 WHEN N'MaterialValue' THEN 1 ELSE 9 END;
SELECT TOP 1 @lab=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=@wt
  WHERE c.name IN (N'LabCostToDate1',N'LabourValue',N'LabCost',N'LabValue',N'LaborCost',N'LabValueIssues1')
  ORDER BY CASE c.name WHEN N'LabCostToDate1' THEN 0 WHEN N'LabourValue' THEN 1 ELSE 9 END;
SELECT TOP 1 @foh=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=@wt
  WHERE c.name IN (N'FixedOhValue',N'FixedOverhead',N'FixedOhCost',N'FohValue');
SELECT TOP 1 @voh=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=@wt
  WHERE c.name IN (N'VariableOhValue',N'VariableOverhead',N'VariableOhCost',N'VohValue');
SELECT TOP 1 @sub=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=@wt
  WHERE c.name IN (N'SubContractValue',N'SubcontractValue',N'SubConValue',N'SubContractCost');
SELECT TOP 1 @val=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=@wt
  WHERE c.name IN (N'WipValue',N'TotalCost',N'ValueToDate',N'CostToDate',N'TotalValue',N'JobValue',N'CurrentValue');
SELECT TOP 1 @comp=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=@wt
  WHERE c.name IN (N'Complete',N'Completed',N'JobComplete',N'CompleteFlag');
SELECT N'META|' + ISNULL(@wt,N'') + N'|' + ISNULL(@job,N'') + N'|' + ISNULL(@mat,N'') + N'|' + ISNULL(@lab,N'') + N'|' + ISNULL(@foh,N'') + N'|' + ISNULL(@voh,N'') + N'|' + ISNULL(@sub,N'') + N'|' + ISNULL(@val,N'') + N'|' + ISNULL(@comp,N'');
"@
    $discRr = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $wipDisc -Tsv
    if ($discRr.ExitCode -ne 0) {
      Write-RpmaLog ("WIP $db discover FAIL " + $discRr.Text)
      $meta = ''
    } else {
      $meta = ''
      foreach ($line in (Get-RpmaDataRows $discRr.Text)) {
        $s = [string]$line
        if ($s -like 'META|*' -or $s -like 'NOWIP*') { $meta = $s; break }
      }
    }
    Write-RpmaLog ("WIP $db discover " + $meta)
    if (-not $meta -or $meta -like 'NOWIP*') { Write-RpmaLog "WIP $db wrote=0 (no table)" }
    else {
      $mp = $meta.Split('|')
      $wtName = if ($mp.Length -gt 1) { $mp[1] } else { '' }
      $jobCol = if ($mp.Length -gt 2) { $mp[2] } else { '' }
      $matCol = if ($mp.Length -gt 3) { $mp[3] } else { '' }
      $labCol = if ($mp.Length -gt 4) { $mp[4] } else { '' }
      $fohCol = if ($mp.Length -gt 5) { $mp[5] } else { '' }
      $vohCol = if ($mp.Length -gt 6) { $mp[6] } else { '' }
      $subCol = if ($mp.Length -gt 7) { $mp[7] } else { '' }
      $valCol = if ($mp.Length -gt 8) { $mp[8] } else { '' }
      $compCol = if ($mp.Length -gt 9) { $mp[9] } else { '' }
      if (-not $wtName -or -not $jobCol) { Write-RpmaLog "WIP $db wrote=0 (missing job)" }
      else {
        $parts = New-Object System.Collections.Generic.List[string]
        foreach ($c in @($matCol,$labCol,$fohCol,$vohCol,$subCol)) {
          if ($c) { [void]$parts.Add(('ISNULL(TRY_CONVERT(decimal(18,2),{0}),0)' -f ('[' + $c.Replace(']', ']]') + ']'))) }
        }
        if ($parts.Count -eq 0 -and $valCol) {
          [void]$parts.Add(('ISNULL(TRY_CONVERT(decimal(18,2),{0}),0)' -f ('[' + $valCol.Replace(']', ']]') + ']')))
        }
        if ($parts.Count -eq 0) { Write-RpmaLog "WIP $db wrote=0 (no value cols)" }
        else {
          $valExpr = [string]::Join('+', $parts)
          $jobQ = '[' + $jobCol.Replace(']', ']]') + ']'
          $wtQ = '[' + $wtName.Replace(']', ']]') + ']'
          $whereSql = ''
          if ($compCol) {
            $cq = '[' + $compCol.Replace(']', ']]') + ']'
            $whereSql = " WHERE ($cq IN (N'N',N'n',N'0',N'O',N'Open',N'I') OR $cq IS NULL OR LTRIM(RTRIM(CONVERT(nvarchar(20),$cq))) = N'')"
          }
          $wipSql = "SET NOCOUNT ON;`nWITH base AS (`n  SELECT LTRIM(RTRIM(CONVERT(nvarchar(50), $jobQ))) AS JobCode, ($valExpr) AS Val`n  FROM $dbQ.dbo.$wtQ$whereSql`n),`nl3 AS (`n  SELECT TOP 400 JobCode, SUM(ISNULL(Val,0)) AS Val FROM base`n  GROUP BY JobCode HAVING ABS(SUM(ISNULL(Val,0))) > 0.0001`n  ORDER BY ABS(SUM(ISNULL(Val,0))) DESC`n),`nl1 AS (SELECT SUM(Val) AS Val FROM l3)`nSELECT N'3|' + JobCode + N'||' + LEFT(N'WIP job ' + JobCode,180) + N'|' + CONVERT(varchar(40),Val) FROM l3`nUNION ALL SELECT N'2|WIP-OPEN||WIP open jobs mid|' + CONVERT(varchar(40),SUM(Val)) FROM l3`nUNION ALL SELECT N'1|WIP||WIP company total|' + CONVERT(varchar(40),Val) FROM l1;"
          $wipLines = @(Get-PipeRows $wipSql)
          $detail = @($wipLines | Where-Object { $_ -match '^[123]\|' })
          $n = Write-ModuleRows -TargetTable 'Syspro_DtrWipBalances' -Db $db -Module 'WIP' -DetailLines $detail
          $grand += $n; Write-RpmaLog "WIP $db wrote=$n"
        }
      }
    }
  }
}

Write-RpmaLog "DONE native+GL+WIP total=$grand"
Write-Host "Native FinSight fallback complete. Rows: $grand" -ForegroundColor Green
Write-Host "Map GL: run 463 on central, INSERT Dim_FinSight_GlControlMap, or set `$GlControlMap in config, re-run."
Write-Host "Discover: Discover-Gl-Control-Accounts.ps1 -ConfigPath $ConfigPath"
