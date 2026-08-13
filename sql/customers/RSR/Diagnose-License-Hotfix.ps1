# Run ON RSR-PROD as Administrator / collect account
# Checks local license columns + SYSPRODeployment + central join keys
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Customer.Config.ps1')
$base = 'C:\RPM-Assure\Sql\base\syspro-direct'
if (-not (Test-Path (Join-Path $base 'Lib-Sqlcmd.ps1'))) {
  throw "Missing base Lib-Sqlcmd.ps1 - expand base pack first"
}
. (Join-Path $base 'Lib-Sqlcmd.ps1')
Initialize-RpmaCollect -LogDir $LogDir -Prefix 'rsr_lic_diag'

Write-RpmaLog "=== RSR license/version/hotfix diagnose ==="
Write-RpmaLog "Instance=$InstanceName Central=$CentralDataSource"

# Local AdmSystemLicense columns
$qCols = @"
SET NOCOUNT ON;
SELECT name FROM Sysprodb.sys.columns
WHERE object_id = OBJECT_ID(N'Sysprodb.dbo.AdmSystemLicense')
ORDER BY column_id;
"@
$r = Invoke-RpmaSql -Server '.' -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $qCols -Tsv
Write-RpmaLog ("AdmSystemLicense cols: " + ((Get-RpmaDataRows $r.Text) -join ','))

$qLic = @"
SET NOCOUNT ON;
SELECT TOP 1
  CONVERT(varchar(30), ImportDate, 126),
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(40), LicenseType))),''),
  ISNULL(CONVERT(varchar(20), TRY_CONVERT(bigint, Users)),''),
  LEFT(ISNULL(CONVERT(nvarchar(max), LicenseXml),''), 400)
FROM Sysprodb.dbo.AdmSystemLicense
ORDER BY ImportDate DESC;
"@
$r2 = Invoke-RpmaSql -Server '.' -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $qLic -Tsv
Write-RpmaLog ("license sample: " + ((Get-RpmaDataRows $r2.Text) -join ' | '))

$qDep = @"
SET NOCOUNT ON;
SELECT CASE WHEN DB_ID(N'SYSPRODeployment') IS NULL THEN 0 ELSE 1 END;
SELECT CASE WHEN OBJECT_ID(N'SYSPRODeployment.dbo.CustomerHotfixes',N'U') IS NULL THEN 0 ELSE 1 END;
IF OBJECT_ID(N'SYSPRODeployment.dbo.CustomerHotfixes',N'U') IS NOT NULL
  SELECT COUNT(*) FROM SYSPRODeployment.dbo.CustomerHotfixes WITH (NOLOCK);
"@
$r3 = Invoke-RpmaSql -Server '.' -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $qDep -Tsv
Write-RpmaLog ("deployment probe: " + ((Get-RpmaDataRows $r3.Text) -join ' | '))

# Central verify
$qc = @"
SET NOCOUNT ON;
SELECT CustomerCode, SqlInstanceName, Active FROM dbo.Dim_Customer WHERE CustomerCode=N'$CustomerCode';
SELECT TOP 1 ProductName, ProductVersion, Users, LicenseExpiry FROM dbo.Syspro_SystemLicense WHERE InstanceName=N'$InstanceName' ORDER BY SnapshotDate DESC, ImportedAt DESC;
SELECT TOP 1 ProductVersion, BuildNumber FROM dbo.Syspro_VersionInfo WHERE InstanceName=N'$InstanceName' ORDER BY SnapshotDate DESC, ImportedAt DESC;
SELECT SUM(CASE WHEN HotfixCode LIKE N'KB%' THEN 1 ELSE 0 END) AS Kb, COUNT(*) AS AllHf
FROM dbo.Syspro_Hotfix WHERE InstanceName=N'$InstanceName'
  AND SnapshotDate=(SELECT MAX(SnapshotDate) FROM dbo.Syspro_Hotfix WHERE InstanceName=N'$InstanceName');
"@
$rc = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText $qc -Tsv
Write-RpmaLog ("central: " + ((Get-RpmaDataRows $rc.Text) -join ' || '))
Write-RpmaLog "=== Done diagnose. Re-run Run-Collect-Direct.ps1 after app+base update. ==="
