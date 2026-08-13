# Run RPM Assure Portfolio against live RPMAssure_App (Windows)
# Requires: Node 22+, network to 102.222.21.220,14333
$ErrorActionPreference = 'Stop'
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -ErrorAction SilentlyContinue
if (-not $Root) { $Root = (Get-Location).Path }
# Prefer repo root = parent of scripts
$Root = Resolve-Path (Join-Path $PSScriptRoot '..')

Set-Location $Root

$env:RPM_ASSURE_DATA_MODE = 'auto'
$env:RPM_ASSURE_SQL_SERVER = '102.222.21.220,14333'
$env:RPM_ASSURE_SQL_DATABASE = 'RPMAssure_App'
$env:RPM_ASSURE_SQL_USER = 'Rpm_collect'
$env:RPM_ASSURE_SQL_PASSWORD = 'RpmCollect#AHIC2026'
$env:RPM_ASSURE_SQL_TRUST_CERT = 'true'

Write-Host "Root: $Root" -ForegroundColor Cyan
Write-Host "SQL:  $env:RPM_ASSURE_SQL_SERVER / $env:RPM_ASSURE_SQL_DATABASE as $env:RPM_ASSURE_SQL_USER" -ForegroundColor Yellow

# Connectivity smoke (sqlcmd if present)
if (Get-Command sqlcmd -ErrorAction SilentlyContinue) {
  Write-Host "Testing SQL login..." -ForegroundColor Cyan
  sqlcmd -S $env:RPM_ASSURE_SQL_SERVER -d $env:RPM_ASSURE_SQL_DATABASE -U $env:RPM_ASSURE_SQL_USER -P $env:RPM_ASSURE_SQL_PASSWORD -C -Q "SELECT DB_NAME() AS Db, COUNT(*) AS Customers FROM dbo.Dim_Customer; SELECT COUNT(*) AS Ops FROM dbo.Syspro_Operators WHERE InstanceName=N'AHIC-SSQL-SRV';" -W
  if ($LASTEXITCODE -ne 0) { throw "SQL test failed — fix network/login before starting app" }
} else {
  Write-Host "sqlcmd not found — skipping pre-check" -ForegroundColor DarkYellow
}

if (-not (Test-Path (Join-Path $Root 'node_modules'))) {
  Write-Host "npm install..." -ForegroundColor Cyan
  npm install
}

Write-Host "Starting dev server on http://0.0.0.0:8080 ..." -ForegroundColor Green
npm run dev
