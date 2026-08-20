# Discover likely GL control accounts + Gen/Wip tables on customer host.
# powershell -NoProfile -ExecutionPolicy Bypass -File .\Discover-Gl-Control-Accounts.ps1 -ConfigPath ...\Customer.Config.ps1
param([Parameter(Mandatory = $true)][string]$ConfigPath)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Missing config: $ConfigPath" }
. $ConfigPath
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'Lib-Sqlcmd.ps1')

if (-not $LogDir) { $LogDir = Join-Path (Split-Path -Parent $ConfigPath) 'logs' }
Initialize-RpmaCollect -LogDir $LogDir -Prefix ("discover_gl_{0}" -f $CustomerCode)

$LocalS = '.'
$r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText 'SET NOCOUNT ON; SELECT SUSER_SNAME(), @@SERVERNAME;' -Tsv
if ($r.ExitCode -ne 0) { throw "Local SQL failed: $($r.Text)" }
Write-RpmaLog ("local OK " + ((Get-RpmaDataRows $r.Text) -join ' | '))

$dbs = Get-RpmaOnlineDbs -LocalServer $LocalS -LocalUser $LocalSqlUser -LocalPass $LocalSqlPassword |
  Where-Object { $_ -match '^SysproCompany' -and $_ -notmatch '_SRS$' }

Write-Host "=== GL control discovery customer=$CustomerCode ==="
foreach ($db in $dbs) {
  Write-Host ""
  Write-Host "--- $db ---"
  $dbQ = '[' + $db.Replace(']', ']]') + ']'
  $sql = @"
SET NOCOUNT ON;
PRINT N'Tables Gen*/Gtr*/Ctl*/Wip*:';
SELECT t.name AS TableName
FROM $dbQ.sys.tables t
WHERE t.name LIKE N'Gen%' OR t.name LIKE N'Gtr%' OR t.name LIKE N'Ctl%'
   OR t.name LIKE N'Wip%' OR t.name LIKE N'%Control%'
ORDER BY 1;

DECLARE @gm sysname = (
  SELECT TOP 1 t.name FROM $dbQ.sys.tables t
  WHERE t.name IN (N'GenMaster',N'GenAccount',N'GtrMaster',N'GenChart')
  ORDER BY CASE t.name WHEN N'GenMaster' THEN 0 ELSE 1 END
);
IF @gm IS NOT NULL
BEGIN
  PRINT N'GL master table: ' + @gm;
  SELECT c.name AS ColName FROM $dbQ.sys.columns c
  JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=@gm
  ORDER BY c.column_id;

  DECLARE @code sysname=NULL,@desc sysname=NULL;
  SELECT TOP 1 @code=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=@gm
   WHERE c.name IN (N'GlCode',N'Account',N'LedgerCode',N'AccountCode') ORDER BY CASE c.name WHEN N'GlCode' THEN 0 ELSE 1 END;
  SELECT TOP 1 @desc=c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.tables t ON t.object_id=c.object_id AND t.name=@gm
   WHERE c.name IN (N'Description',N'AccountDesc',N'Name',N'GlDescription');
  IF @code IS NOT NULL AND @desc IS NOT NULL
  BEGIN
    DECLARE @q nvarchar(max)=N'
    SELECT TOP 40 LTRIM(RTRIM(CONVERT(nvarchar(50), '+QUOTENAME(@code)+N'))) AS GlCode,
      LTRIM(RTRIM(CONVERT(nvarchar(120), '+QUOTENAME(@desc)+N'))) AS Descr
    FROM $dbQ.dbo.'+QUOTENAME(@gm)+N'
    WHERE '+QUOTENAME(@desc)+N' LIKE N''%invent%''
       OR '+QUOTENAME(@desc)+N' LIKE N''%stock%''
       OR '+QUOTENAME(@desc)+N' LIKE N''%creditor%''
       OR '+QUOTENAME(@desc)+N' LIKE N''%payable%''
       OR '+QUOTENAME(@desc)+N' LIKE N''%debtor%''
       OR '+QUOTENAME(@desc)+N' LIKE N''%receiv%''
       OR '+QUOTENAME(@desc)+N' LIKE N''%wip%''
       OR '+QUOTENAME(@desc)+N' LIKE N''%work in%''
       OR '+QUOTENAME(@desc)+N' LIKE N''%control%''
    ORDER BY 1;';
    PRINT N'Likely control accounts by description:';
    EXEC sp_executesql @q;
  END
END
ELSE PRINT N'No GenMaster/GtrMaster found';

PRINT N'Wip tables:';
SELECT t.name FROM $dbQ.sys.tables t WHERE t.name LIKE N'Wip%' ORDER BY 1;
"@
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $sql
  Write-Host $r.Text
}

Write-Host ''
Write-Host 'Next: insert map rows on central (app server):'
Write-Host ("  sqlcmd -S `".\RPMREPORTS`" -d RPMAssure_App -E -C -Q `"INSERT dbo.Dim_FinSight_GlControlMap (CustomerCode,CompanyDb,ModuleCode,GlCode,Notes) VALUES ('$CustomerCode','SysproCompanyU','INV','YOUR_GL','Inventory control');`"")
Write-Host 'Then re-run Collect-Dtr-Native-Fallback.ps1'
