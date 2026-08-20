# Install + run true Deployment hotfix collect (UVSS)
# Pure ASCII. Place zip files under Downloads first if copying from pack.
$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure\Sql\customers\UVSS'
New-Item -ItemType Directory -Force -Path $Root | Out-Null

$User = 'Rpm_collect'
$Pass = ''
$AdminUser = 'SYSPROAdmin'
$AdminPass = '$y$pr0'

function Find-Sqlcmd {
  $c = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $p = 'D:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
  if (Test-Path $p) { return $p }
  throw 'sqlcmd not found'
}

$sqlcmd = Find-Sqlcmd
Write-Host "sqlcmd=$sqlcmd"

# Prefer files already in place; else copy from Downloads pack
$need = @(
  '302c_Grant_SYSPRODeployment_Rpm_collect.sql',
  '227_Collect_UVSS_DeploymentHotfixes.sql',
  '402_Probe_ReleaseHotfixes.sql'
)
foreach ($f in $need) {
  $dest = Join-Path $Root $f
  if (-not (Test-Path $dest)) {
    $src = Get-ChildItem -Path (Join-Path $env:USERPROFILE 'Downloads') -Recurse -Filter $f -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($null -eq $src) { Write-Host "MISSING $f - copy into $Root first" -ForegroundColor Yellow; continue }
    Copy-Item $src.FullName $dest -Force
  }
  Write-Host "OK $dest"
}

Write-Host '=== Grant SYSPRODeployment (admin) ===' -ForegroundColor Cyan
& $sqlcmd -S '.' -U $AdminUser -P $AdminPass -C -b -i (Join-Path $Root '302c_Grant_SYSPRODeployment_Rpm_collect.sql')
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Admin grant failed - try sa or run 302c manually' -ForegroundColor Yellow
}

Write-Host '=== Collect Deployment hotfixes ===' -ForegroundColor Cyan
& $sqlcmd -S '.' -U $User -P $Pass -C -b -i (Join-Path $Root '227_Collect_UVSS_DeploymentHotfixes.sql')
if ($LASTEXITCODE -ne 0) { throw "Collect failed exit=$LASTEXITCODE" }

Write-Host 'DONE. Verify on central:' -ForegroundColor Green
Write-Host '  SELECT COUNT(*) FROM Syspro_Hotfix WHERE InstanceName=''UVSS-SYSPRO'''
Write-Host '  SELECT TOP 5 * FROM Syspro_VersionInfo WHERE InstanceName=''UVSS-SYSPRO'' ORDER BY SnapshotDate DESC'
