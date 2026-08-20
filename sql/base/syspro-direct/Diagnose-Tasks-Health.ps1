param([Parameter(Mandatory=$true)][string]$ConfigPath)
$ErrorActionPreference = 'Stop'
. $ConfigPath
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'Lib-Sqlcmd.ps1')
Initialize-RpmaCollect -LogDir $LogDir -Prefix 'diag_tasks'
$LocalS = '.'
$sql = @'
SET NOCOUNT ON;
DECLARE @sys sysname =
  CASE WHEN OBJECT_ID(N'SysproDB.dbo.AdmOperator',N'U') IS NOT NULL THEN N'SysproDB'
       WHEN OBJECT_ID(N'Sysprodb.dbo.AdmOperator',N'U') IS NOT NULL THEN N'Sysprodb' ELSE N'' END;
PRINT @sys;
SELECT 'AdmTaskGroup' n, COUNT(*) c FROM SysproDB.dbo.AdmTaskGroup;
SELECT 'AdmTaskItem' n, COUNT(*) c FROM SysproDB.dbo.AdmTaskItem;
SELECT 'AdmSysHealthLog' n, COUNT(*) c FROM SysproDB.dbo.AdmSysHealthLog;
SELECT name FROM SysproDB.sys.columns WHERE object_id=OBJECT_ID(N'SysproDB.dbo.AdmTaskGroup') ORDER BY column_id;
SELECT name FROM SysproDB.sys.columns WHERE object_id=OBJECT_ID(N'SysproDB.dbo.AdmTaskItem') ORDER BY column_id;
SELECT name FROM SysproDB.sys.columns WHERE object_id=OBJECT_ID(N'SysproDB.dbo.AdmSysHealthLog') ORDER BY column_id;
SELECT TOP 3 * FROM SysproDB.dbo.AdmTaskGroup;
SELECT TOP 3 * FROM SysproDB.dbo.AdmSysHealthLog;
'@
$r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $sql
Write-Host $r.Text
Write-Host "exit=$($r.ExitCode)"
