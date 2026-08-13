# RSR: register + linked server as rpmassure + collect
$ErrorActionPreference = 'Continue'
$dir = 'C:\RPM-Assure\Sql\customers\RSR'
Set-Location $dir
. .\Customer.Config.ps1

function Run-Sql([string]$Server, [string]$User, [string]$Pass, [string]$File, [string]$Database = $null) {
  Write-Host ("--- sqlcmd -S {0} -U {1} -i {2} ---" -f $Server, $User, $File) -ForegroundColor Cyan
  if ($Database) {
    & sqlcmd -S $Server -d $Database -U $User -P $Pass -C -b -i $File
  } else {
    & sqlcmd -S $Server -U $User -P $Pass -C -b -i $File
  }
  Write-Host ("--- exitcode=$LASTEXITCODE ---") -ForegroundColor Yellow
  return $LASTEXITCODE
}

Write-Host '=== 1) Register RSR on central ===' -ForegroundColor Cyan
$ec = Run-Sql '102.222.21.220,14333' 'rpmassure' '@ssuR3me!' (Join-Path $dir '301_Central_Register_RSR.sql') 'RPMAssure_App'
if ($ec -ne 0) { throw '301 register failed' }

Write-Host '=== 2a) Linked server create + map ===' -ForegroundColor Cyan
$ec = Run-Sql '.' 'SYSPROAdmin' 'Syspr0SA' (Join-Path $dir '303_RSR_LinkedServer_Central.sql')
if ($ec -ne 0) {
  Write-Host 'Full 303 failed - trying map-only 303b...' -ForegroundColor Yellow
  $ec2 = Run-Sql '.' 'SYSPROAdmin' 'Syspr0SA' (Join-Path $dir '303b_Map_Only_rpmassure.sql')
  if ($ec2 -ne 0) {
    Write-Host 'Also try map as rpmassure local if login exists:' -ForegroundColor Yellow
    Run-Sql '.' 'rpmassure' '@ssuR3me!' (Join-Path $dir '303b_Map_Only_rpmassure.sql') | Out-Null
    throw '303/303b failed - paste everything above this line'
  }
}

Write-Host '=== 2b) Prove linked server as rpmassure local user ===' -ForegroundColor Cyan
& sqlcmd -S '.' -U 'rpmassure' -P '@ssuR3me!' -C -b -Q "SELECT TOP 3 CustomerCode, DisplayName FROM [RPM_CENTRAL].[RPMAssure_App].dbo.Dim_Customer"
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Linked query as rpmassure failed - map may be wrong' -ForegroundColor Red
}

Write-Host '=== 3) Collect as rpmassure ===' -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dir 'Run-RSR-Collect-Scheduled.ps1') -IncludeJobs

Write-Host '=== 4) Verify on central ===' -ForegroundColor Cyan
sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -U "rpmassure" -P "@ssuR3me!" -C -Q "SELECT CustomerCode, DisplayName, Active, SqlInstanceName FROM Dim_Customer WHERE CustomerCode='RSR'; SELECT 'Operators' Src, COUNT(*) Cnt, MAX(ImportedAt) LastAt FROM Syspro_Operators WHERE InstanceName='RSR-SQLSRV-DB' UNION ALL SELECT 'Jobs', COUNT(*), MAX(ImportedAt) FROM Syspro_JobLogging WHERE InstanceName='RSR-SQLSRV-DB' UNION ALL SELECT 'License', COUNT(*), MAX(ImportedAt) FROM Syspro_SystemLicense WHERE InstanceName='RSR-SQLSRV-DB';"

Write-Host '=== 5) Schedule (Administrator) ===' -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dir 'Install-RSR-Schedule.ps1')
Write-Host 'DONE' -ForegroundColor Green
