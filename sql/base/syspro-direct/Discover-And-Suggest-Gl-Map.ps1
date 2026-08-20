# Discover GL control candidates; optional -ApplyCentral writes Dim_FinSight_GlControlMap
param(
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [switch]$ApplyCentral
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Missing $ConfigPath" }
. $ConfigPath
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'Lib-Sqlcmd.ps1')
if (-not $LogDir) { $LogDir = Join-Path (Split-Path -Parent $ConfigPath) 'logs' }
Initialize-RpmaCollect -LogDir $LogDir -Prefix ("gl_suggest_{0}" -f $CustomerCode)
Write-Host "=== GL suggest customer=$CustomerCode instance=$InstanceName ApplyCentral=$ApplyCentral ===" -ForegroundColor Cyan
$LocalS = '.'
$r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText 'SET NOCOUNT ON; SELECT SUSER_SNAME(), @@SERVERNAME;' -Tsv
if ($r.ExitCode -ne 0) { throw "Local SQL failed: $($r.Text)" }
Write-Host $r.Text

$pref = @()
if ($CompanyDatabases) { $pref = Get-RpmaStringArray (Flatten-RpmaStrings $CompanyDatabases) }
$all = Get-RpmaStringArray (Get-RpmaOnlineDbs -LocalServer $LocalS -LocalUser $LocalSqlUser -LocalPass $LocalSqlPassword)
Write-Host ("Online DBs (" + $all.Count + "): " + ($all -join ', '))
$dbs = Get-RpmaStringArray (Find-RpmaCompanyDbs -LocalServer $LocalS -LocalUser $LocalSqlUser -LocalPass $LocalSqlPassword -PreferredNames $pref)
Write-Host ("Company DBs: " + ($dbs -join ', '))
if ($dbs.Count -eq 0) { throw 'No company DBs. Set $CompanyDatabases in config.' }

$allInserts = New-Object System.Collections.Generic.List[string]
$seedRows = New-Object System.Collections.Generic.List[object]

foreach ($db in $dbs) {
  Write-Host ""
  Write-Host "=== $db ===" -ForegroundColor Yellow
  $dbQ = '[' + $db.Replace(']', ']]') + ']'
  $safe = $db.Replace("'", "''")

  $probe = "SET NOCOUNT ON; IF OBJECT_ID(N'$safe.dbo.GenMaster',N'U') IS NULL SELECT N'NOGEN'; ELSE SELECT N'HASGEN';"
  $pr = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $probe -Tsv
  $pv = [string]((Get-RpmaStringArray (Get-RpmaDataRows $pr.Text) | Select-Object -First 1))
  Write-Host "GenMaster=$pv"
  if ($pv -ne 'HASGEN') { continue }

  $q = @"
SET NOCOUNT ON;
SELECT TOP 60
  LTRIM(RTRIM(CONVERT(nvarchar(50),GlCode))) + N'|' +
  LEFT(LTRIM(RTRIM(CONVERT(nvarchar(200),Description))),80) + N'|' +
  CONVERT(varchar(40),ISNULL(TRY_CONVERT(decimal(18,2),CurrentBalance),0)) + N'|' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(5),ControlAccFlag))),N'') + N'|' +
  CASE
    WHEN Description LIKE N'%Inventor%' OR Description LIKE N'%STOCK%' OR Description LIKE N'%Stock%' OR Description LIKE N'%GIT%' OR Description LIKE N'%WAREHOUSE%' OR Description LIKE N'%Warehouse%' OR Description LIKE N'%Finished%' THEN N'INV'
    WHEN Description LIKE N'%Creditor%' OR Description LIKE N'%CREDITOR%' OR Description LIKE N'%Payable%' OR Description LIKE N'%GRN%' OR Description LIKE N'%Supplier%' OR Description LIKE N'%TRADE CREDITOR%' THEN N'AP'
    WHEN Description LIKE N'%Debtor%' OR Description LIKE N'%DEBTOR%' OR Description LIKE N'%Receiv%' OR Description LIKE N'%TRADE DEBTOR%' OR Description LIKE N'%Customer control%' THEN N'AR'
    WHEN Description LIKE N'%WIP%' OR Description LIKE N'%Work in%' OR Description LIKE N'%Work-in%' OR Description LIKE N'%WIP CONTROL%' THEN N'WIP'
    WHEN ControlAccFlag IN (N'Y',N'y',N'1') THEN N'CTL'
    ELSE N''
  END
FROM $dbQ.dbo.GenMaster
WHERE ControlAccFlag IN (N'Y',N'y',N'1')
   OR Description LIKE N'%Control%'
   OR Description LIKE N'%Inventor%'
   OR Description LIKE N'%Creditor%'
   OR Description LIKE N'%Debtor%'
   OR Description LIKE N'%WIP%'
   OR Description LIKE N'%Stock%'
   OR ABS(ISNULL(TRY_CONVERT(decimal(18,2),CurrentBalance),0)) > 500
ORDER BY CASE WHEN ControlAccFlag IN (N'Y',N'y',N'1') THEN 0 ELSE 1 END,
         ABS(ISNULL(TRY_CONVERT(decimal(18,2),CurrentBalance),0)) DESC;
"@
  $rr = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $q -Tsv
  $rows = Get-RpmaStringArray (Get-RpmaDataRows $rr.Text)
  Write-Host ("raw lines: " + $rows.Count)
  foreach ($line in $rows) {
    if ($line -notmatch '\|') { continue }
    Write-Host $line
    $p = $line -split '\|', 5
    if ($p.Count -lt 5) { continue }
    $gl = $p[0].Trim(); $ds = $p[1].Trim(); $mod = $p[4].Trim()
    if ($mod -eq 'CTL') {
      $u = $ds.ToUpperInvariant()
      if ($u -match 'STOCK|INVENTOR|WAREHOUSE|GIT') { $mod = 'INV' }
      elseif ($u -match 'CREDITOR|PAYABLE|GRN|SUPPLIER') { $mod = 'AP' }
      elseif ($u -match 'DEBTOR|RECEIV') { $mod = 'AR' }
      elseif ($u -match 'WIP|WORK IN') { $mod = 'WIP' }
      else { continue }
    }
    if ($mod -notin @('INV','AP','AR','WIP')) { continue }
    if (-not $gl) { continue }
    $notes = ($ds -replace "'","''")
    if ($notes.Length -gt 80) { $notes = $notes.Substring(0,80) }
    $ins = "INSERT dbo.Dim_FinSight_GlControlMap (CustomerCode,CompanyDb,ModuleCode,GlCode,Notes) VALUES (N'$CustomerCode',N'$db',N'$mod',N'$gl',N'$notes');"
    if (-not $allInserts.Contains($ins)) { [void]$allInserts.Add($ins) }
    $seedRows.Add([pscustomobject]@{ Db=$db; Mod=$mod; Gl=$gl; Notes=$notes }) | Out-Null
  }
}

Write-Host ""
Write-Host "=== Suggested INSERTs ($($allInserts.Count)) ===" -ForegroundColor Green
foreach ($i in $allInserts) { Write-Host $i }

if ($ApplyCentral -and $seedRows.Count -gt 0) {
  Write-Host "=== ApplyCentral: writing map to $CentralDataSource ===" -ForegroundColor Cyan
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("SET NOCOUNT ON;")
  [void]$sb.AppendLine("IF OBJECT_ID(N'dbo.Dim_FinSight_GlControlMap',N'U') IS NULL BEGIN RAISERROR(N'Run 463 first',16,1); RETURN; END")
  [void]$sb.AppendLine("DELETE dbo.Dim_FinSight_GlControlMap WHERE CustomerCode=N'$CustomerCode';")
  $seen = @{}
  foreach ($row in $seedRows) {
    $k = "$($row.Db)|$($row.Mod)|$($row.Gl)"
    if ($seen.ContainsKey($k)) { continue }
    $seen[$k] = $true
    $n = $row.Notes -replace "'","''"
    [void]$sb.AppendLine("INSERT dbo.Dim_FinSight_GlControlMap (CustomerCode,CompanyDb,ModuleCode,GlCode,Notes,Active) VALUES (N'$CustomerCode',N'$($row.Db)',N'$($row.Mod)',N'$($row.Gl)',N'$n',1);")
  }
  [void]$sb.AppendLine("SELECT CustomerCode,CompanyDb,ModuleCode,GlCode FROM dbo.Dim_FinSight_GlControlMap WITH (NOLOCK) WHERE CustomerCode=N'$CustomerCode' ORDER BY 2,3,4;")
  $sql = $sb.ToString()
  $cr = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText $sql -Tsv
  if ($cr.ExitCode -ne 0) { throw "ApplyCentral failed: $($cr.Text)" }
  Write-Host $cr.Text
  Write-Host "ApplyCentral OK rows=$($seen.Count)" -ForegroundColor Green
} elseif ($ApplyCentral) {
  Write-Host 'ApplyCentral: no INV/AP/AR/WIP candidates found - map left unchanged' -ForegroundColor Yellow
}

Write-Host "Native: Collect-Dtr-Native-Fallback.ps1 -ConfigPath $ConfigPath"
Write-Host "=== Done ==="
