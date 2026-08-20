$ErrorActionPreference = 'Stop'
$Dir = 'C:\RPM-Assure\Sql\customers\AHIC'
$sql = Join-Path $Dir '241_Collect_AHIC_DeploymentCatalogue.sql'
$LogDir = Join-Path $Dir 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$log = Join-Path $LogDir ('catalogue_{0:yyyyMMdd_HHmmss}.log' -f (Get-Date))
if (-not (Test-Path -LiteralPath $sql)) { throw "Missing $sql" }
if (-not (Select-String -LiteralPath $sql -Pattern 'v241e' -SimpleMatch -Quiet)) {
  throw '241 SQL is not v241e - reinstall pack'
}
$user = if ($env:RPM_DEPLOY_SQL_USER) { $env:RPM_DEPLOY_SQL_USER } else { 'sa' }
$pass = if ($env:RPM_DEPLOY_SQL_PASSWORD) { $env:RPM_DEPLOY_SQL_PASSWORD } else { '$y$pr0123' }
$line = 'START catalogue as ' + $user
Add-Content -LiteralPath $log -Value $line
Write-Host $line -ForegroundColor Cyan
& sqlcmd -S '.' -U $user -P $pass -C -b -i $sql *>&1 | Tee-Object -FilePath $log -Append
if ($LASTEXITCODE -ne 0) { throw ("sqlcmd failed " + $LASTEXITCODE) }
Write-Host 'OK AHIC catalogue' -ForegroundColor Green
