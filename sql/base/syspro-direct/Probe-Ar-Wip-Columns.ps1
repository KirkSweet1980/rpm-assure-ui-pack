# Probe AR/WIP columns on company DBs
param([Parameter(Mandatory=$true)][string]$ConfigPath)
$ErrorActionPreference = 'Stop'
. $ConfigPath
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'Lib-Sqlcmd.ps1')
if (-not $LogDir) { $LogDir = Join-Path (Split-Path -Parent $ConfigPath) 'logs' }
Initialize-RpmaCollect -LogDir $LogDir -Prefix ("probe_arwip_{0}" -f $CustomerCode)
$LocalS = '.'
$pref = @()
if ($CompanyDatabases) { $pref = Get-RpmaStringArray (Flatten-RpmaStrings $CompanyDatabases) }
$dbs = Get-RpmaStringArray (Find-RpmaCompanyDbs -LocalServer $LocalS -LocalUser $LocalSqlUser -LocalPass $LocalSqlPassword -PreferredNames $pref)
Write-Host ("Company DBs: " + ($dbs -join ', '))
foreach ($db in $dbs) {
  Write-Host ""
  Write-Host "=== $db ===" -ForegroundColor Cyan
  $dbQ = '[' + $db.Replace(']', ']]') + ']'
  $sql = @"
SET NOCOUNT ON;
SELECT 'T|' + t.name FROM $dbQ.sys.tables t WHERE t.name LIKE 'Ar%' OR t.name LIKE 'Wip%' ORDER BY 1;
SELECT 'C|' + t.name + '|' + c.name + '|' + ty.name
FROM $dbQ.sys.columns c
JOIN $dbQ.sys.tables t ON t.object_id=c.object_id
JOIN $dbQ.sys.types ty ON ty.user_type_id=c.user_type_id
WHERE t.name IN (N'ArCustomer',N'ArInvoice',N'ArCustomerBal',N'ArCustomerBalance',N'WipJob',N'WipMaster',N'WipJobAll',N'GenMaster')
ORDER BY t.name, c.column_id;
"@
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $sql -Tsv
  foreach ($line in (Get-RpmaStringArray (Flatten-RpmaStrings (Get-RpmaDataRows $r.Text)))) { Write-Host $line }
}
Write-Host 'Done.'
