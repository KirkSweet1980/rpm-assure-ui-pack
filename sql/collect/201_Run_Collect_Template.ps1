# AHIC default: local sa, remote Rpm_collect via RPM_CENTRAL
param(
    [ValidateSet('AHIC','GENERIC')]
    [string] $Mode = 'AHIC',
    [string] $CustomerCode,
    [string] $InstanceName,
    [string] $CompanyDb,
    [string] $ScriptDir = $PSScriptRoot
)
$ErrorActionPreference = 'Stop'
. (Join-Path $ScriptDir 'AHI_Local_Config.ps1')

function Invoke-LocalSqlFile([string]$Path) {
    if (-not (Test-Path $Path)) { throw "Missing $Path" }
    Write-Host "LOCAL auth: $AhiSqlUser @ $AhiSqlServer" -ForegroundColor Cyan
    Write-Host "File: $Path" -ForegroundColor Cyan
    & sqlcmd -S $AhiSqlServer -U $AhiSqlUser -P $AhiSqlPassword -C -b -i $Path
    if ($LASTEXITCODE -ne 0) { throw "sqlcmd exit $LASTEXITCODE" }
}

if ($Mode -eq 'AHIC') {
    Invoke-LocalSqlFile (Join-Path $ScriptDir '210_Collect_AHIC_To_RPMAssure_App.sql')
} else {
    if (-not $CustomerCode -or -not $InstanceName -or -not $CompanyDb) {
        throw 'GENERIC needs -CustomerCode -InstanceName -CompanyDb'
    }
    $base = Join-Path $ScriptDir '200_Collect_Syspro_To_RPMAssure_App.sql'
    $sql = Get-Content $base -Raw
    $sql = $sql -replace "DECLARE @CustomerCode\s+nvarchar\(50\)\s+=\s+N'[^']*'", "DECLARE @CustomerCode nvarchar(50)=N'$CustomerCode'"
    $sql = $sql -replace "DECLARE @InstanceName\s+nvarchar\(100\)\s+=\s+N'[^']*'", "DECLARE @InstanceName nvarchar(100)=N'$InstanceName'"
    $sql = $sql -replace "DECLARE @CompanyDb\s+sysname\s+=\s+N'[^']*'", "DECLARE @CompanyDb sysname=N'$CompanyDb'"
    $tmp = Join-Path $env:TEMP "collect_$CustomerCode.sql"
    Set-Content $tmp $sql -Encoding UTF8
    try { Invoke-LocalSqlFile $tmp } finally { Remove-Item $tmp -Force -EA SilentlyContinue }
}
Write-Host 'Done.' -ForegroundColor Green
