<#
  Apply KPI views + Fact add-on + Datarapt DTR to RPMAssure
  Default: 102.222.21.220,14333 / RPMAssure (or on-box .\RPMREPORTS)
#>
param(
    [string] $ServerInstance = '102.222.21.220,14333',
    [string] $Database       = 'RPMAssure',
    [string] $ScriptDir      = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'

function Invoke-SqlFile {
    param([string] $FileName)
    $path = Join-Path $ScriptDir $FileName
    if (-not (Test-Path $path)) { throw "Missing file: $path" }
    Write-Host "Running $FileName ..." -ForegroundColor Cyan
    & sqlcmd -S $ServerInstance -d $Database -E -C -b -i $path
    if ($LASTEXITCODE -ne 0) { throw "Failed: $FileName (exit $LASTEXITCODE)" }
    Write-Host "OK: $FileName" -ForegroundColor Green
}

Write-Host "Server: $ServerInstance  DB: $Database" -ForegroundColor Yellow
Write-Host "ScriptDir: $ScriptDir"

# Connectivity
& sqlcmd -S $ServerInstance -d $Database -E -C -Q "SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DbName, COUNT(*) AS UserTables FROM sys.tables WHERE is_ms_shipped=0;"
if ($LASTEXITCODE -ne 0) { throw 'Cannot connect. Try -ServerInstance ''.\RPMREPORTS'' if on the SQL box.' }

# Pre-check Dim_Customer.CustomerCode uniqueness helper message
& sqlcmd -S $ServerInstance -d $Database -E -C -Q @"
SET NOCOUNT ON;
IF OBJECT_ID('dbo.Dim_Customer') IS NULL
    THROW 50001, 'Dim_Customer not found — wrong database?', 1;
SELECT 'Dim_Customer rows' AS Info, COUNT(*) AS Cnt FROM dbo.Dim_Customer;
"@

Invoke-SqlFile '003_RPMAssure_KpiViews.sql'
Invoke-SqlFile '004_RPMAssure_FactAddon_ExecPack.sql'
Invoke-SqlFile '005_RPMAssure_Datarapt_DtrBalances.sql'

Write-Host ''
Write-Host 'Smoke tests...' -ForegroundColor Cyan
& sqlcmd -S $ServerInstance -d $Database -E -C -W -Q @"
SET NOCOUNT ON;
SELECT 'Views' AS Kind, COUNT(*) AS Cnt FROM sys.views WHERE name LIKE 'vw_Kpi%' OR name = 'vw_Dim_Customer_Active';
SELECT 'Fact tables' AS Kind, COUNT(*) AS Cnt FROM sys.tables WHERE name LIKE 'Fact_%' OR name LIKE 'App_%' OR name = 'Dim_SlaPolicy';
SELECT TOP 10 CustomerCode, DisplayName, HealthRagProposed FROM dbo.vw_Kpi_HealthRag_Proposed ORDER BY HealthRagProposed, CustomerCode;
"@

Write-Host ''
Write-Host 'DONE. Review smoke output above.' -ForegroundColor Green
