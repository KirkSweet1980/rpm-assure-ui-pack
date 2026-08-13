<#
.SYNOPSIS
  Export multitenant spine catalog from RPMAssure for review (schema metadata, no bulk data).

.EXAMPLE
  .\Export-SpineForReview.ps1

.EXAMPLE
  .\Export-SpineForReview.ps1 -ServerInstance 'RPMWINRM\RPMREPORTS' -Database 'RPMAssure'
#>

param(
    [string] $ServerInstance = 'RPMWINRM\RPMREPORTS',
    [string] $Database       = 'RPMAssure',
    [string] $OutputRoot     = "$env:USERPROFILE\Desktop\SpineExport_RPMAssure",
    [switch] $UseSqlAuth,
    [string] $SqlUser,
    [string] $SqlPassword
)

$ErrorActionPreference = 'Stop'

$stamp  = Get-Date -Format 'yyyyMMdd_HHmm'
$outDir = Join-Path $OutputRoot "$Database`_$stamp"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$catalogFile = Join-Path $outDir '01_spine_catalog.txt'
$queryFile   = Join-Path $outDir '_catalog_query.sql'

$query = @'
SET NOCOUNT ON;

PRINT '===== SERVER / DATABASE =====';
SELECT
    @@SERVERNAME AS ServerName,
    @@INSTANCENAME AS InstanceName,
    DB_NAME() AS DatabaseName,
    SYSUTCDATETIME() AS UtcNow;

PRINT '===== TABLES + ROW COUNTS =====';
SELECT
    SCHEMA_NAME(t.schema_id) AS SchemaName,
    t.name AS TableName,
    SUM(CASE WHEN p.index_id IN (0, 1) THEN p.rows ELSE 0 END) AS RowCnt
FROM sys.tables t
JOIN sys.partitions p ON p.object_id = t.object_id
WHERE t.is_ms_shipped = 0
GROUP BY t.schema_id, t.name
ORDER BY SchemaName, TableName;

PRINT '===== COLUMNS =====';
SELECT
    SCHEMA_NAME(t.schema_id) AS SchemaName,
    t.name AS TableName,
    c.column_id AS ColumnId,
    c.name AS ColumnName,
    ty.name AS DataType,
    c.max_length AS MaxLength,
    c.precision AS [Precision],
    c.scale AS Scale,
    c.is_nullable AS IsNullable,
    c.is_identity AS IsIdentity
FROM sys.tables t
JOIN sys.columns c ON c.object_id = t.object_id
JOIN sys.types ty ON ty.user_type_id = c.user_type_id
WHERE t.is_ms_shipped = 0
ORDER BY SchemaName, TableName, ColumnId;

PRINT '===== PRIMARY KEYS =====';
SELECT
    SCHEMA_NAME(t.schema_id) AS SchemaName,
    t.name AS TableName,
    i.name AS PkName,
    STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS PkColumns
FROM sys.tables t
JOIN sys.indexes i ON i.object_id = t.object_id AND i.is_primary_key = 1
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = t.object_id AND c.column_id = ic.column_id
WHERE t.is_ms_shipped = 0
GROUP BY t.schema_id, t.name, i.name
ORDER BY SchemaName, TableName;

PRINT '===== FOREIGN KEYS =====';
SELECT
    fk.name AS ForeignKeyName,
    SCHEMA_NAME(tp.schema_id) AS ParentSchema,
    tp.name AS ParentTable,
    SCHEMA_NAME(tr.schema_id) AS ReferencedSchema,
    tr.name AS ReferencedTable,
    STRING_AGG(cp.name, ', ') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS ParentColumns,
    STRING_AGG(cr.name, ', ') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS ReferencedColumns
FROM sys.foreign_keys fk
JOIN sys.tables tp ON tp.object_id = fk.parent_object_id
JOIN sys.tables tr ON tr.object_id = fk.referenced_object_id
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.columns cp ON cp.object_id = fkc.parent_object_id AND cp.column_id = fkc.parent_column_id
JOIN sys.columns cr ON cr.object_id = fkc.referenced_object_id AND cr.column_id = fkc.referenced_column_id
GROUP BY fk.name, tp.schema_id, tp.name, tr.schema_id, tr.name
ORDER BY ParentSchema, ParentTable, ForeignKeyName;

PRINT '===== INDEXES =====';
SELECT
    SCHEMA_NAME(t.schema_id) AS SchemaName,
    t.name AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.is_unique AS IsUnique,
    i.is_primary_key AS IsPrimaryKey,
    STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS KeyColumns
FROM sys.tables t
JOIN sys.indexes i ON i.object_id = t.object_id AND i.index_id > 0
JOIN sys.index_columns ic
    ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
JOIN sys.columns c ON c.object_id = t.object_id AND c.column_id = ic.column_id
WHERE t.is_ms_shipped = 0
GROUP BY t.schema_id, t.name, i.name, i.type_desc, i.is_unique, i.is_primary_key
ORDER BY SchemaName, TableName, IndexName;

PRINT '===== TENANT / CUSTOMER COLUMNS =====';
SELECT
    SCHEMA_NAME(t.schema_id) AS SchemaName,
    t.name AS TableName,
    c.name AS ColumnName,
    ty.name AS DataType
FROM sys.tables t
JOIN sys.columns c ON c.object_id = t.object_id
JOIN sys.types ty ON ty.user_type_id = c.user_type_id
WHERE t.is_ms_shipped = 0
  AND (
        c.name LIKE '%Customer%Id%'
     OR c.name LIKE '%Tenant%Id%'
     OR c.name LIKE '%Client%Id%'
     OR c.name LIKE '%Org%Id%'
     OR c.name IN (
            'CustomerId', 'TenantId', 'ClientId', 'CompanyId',
            'OrganisationId', 'OrganizationId',
            'CustomerCode', 'TenantCode', 'ClientCode'
        )
  )
ORDER BY SchemaName, TableName, ColumnName;

PRINT '===== SENSITIVE COLUMN NAMES (names only) =====';
SELECT
    SCHEMA_NAME(t.schema_id) AS SchemaName,
    t.name AS TableName,
    c.name AS ColumnName,
    ty.name AS DataType
FROM sys.tables t
JOIN sys.columns c ON c.object_id = t.object_id
JOIN sys.types ty ON ty.user_type_id = c.user_type_id
WHERE t.is_ms_shipped = 0
  AND (
        c.name LIKE '%password%'
     OR c.name LIKE '%secret%'
     OR c.name LIKE '%token%'
     OR c.name LIKE '%apikey%'
     OR c.name LIKE '%api_key%'
     OR c.name LIKE '%connectionstring%'
  )
ORDER BY SchemaName, TableName, ColumnName;

PRINT '===== VIEWS / PROCS / FUNCTIONS =====';
SELECT
    SCHEMA_NAME(o.schema_id) AS SchemaName,
    o.name AS ObjectName,
    o.type_desc AS ObjectType
FROM sys.objects o
WHERE o.is_ms_shipped = 0
  AND o.type IN ('P', 'V', 'FN', 'IF', 'TF', 'TR')
ORDER BY ObjectType, SchemaName, ObjectName;
'@

$query | Set-Content -Path $queryFile -Encoding UTF8

Write-Host "Connecting to $ServerInstance / $Database ..." -ForegroundColor Cyan

if (-not (Get-Command sqlcmd -ErrorAction SilentlyContinue)) {
    throw 'sqlcmd.exe not found. Install SSMS or Command Line Utilities, then open a new PowerShell window.'
}

$sqlcmdArgs = @(
    '-S', $ServerInstance,
    '-d', $Database,
    '-C',
    '-W',
    '-s', '|',
    '-i', $queryFile,
    '-o', $catalogFile
)

if ($UseSqlAuth) {
    if (-not $SqlUser) { throw 'SQL auth requires -SqlUser' }
    if (-not $SqlPassword) { $SqlPassword = Read-Host 'SQL password' }
    $sqlcmdArgs += @('-U', $SqlUser, '-P', $SqlPassword)
} else {
    $sqlcmdArgs += '-E'
}

& sqlcmd @sqlcmdArgs
if ($LASTEXITCODE -ne 0) {
    throw @"
sqlcmd failed (exit $LASTEXITCODE).

Tried: $ServerInstance / $Database

On the SQL server box try:
  .\Export-SpineForReview.ps1 -ServerInstance '.\RPMREPORTS' -Database 'RPMAssure'

Or:
  .\Export-SpineForReview.ps1 -ServerInstance 'localhost\RPMREPORTS' -Database 'RPMAssure'
"@
}

# Quick connectivity proof line at top of readme
$readme = @"
RPM Assure spine export
ServerInstance : $ServerInstance
Database       : $Database
Exported       : $(Get-Date -Format 'dd-MM-yyyy HH:mm')
Files          :
  01_spine_catalog.txt  <- send this
  _catalog_query.sql
"@
$readme | Set-Content -Path (Join-Path $outDir 'README.txt') -Encoding UTF8

$zipPath = "$outDir.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $outDir -DestinationPath $zipPath -Force

Write-Host ''
Write-Host 'SUCCESS' -ForegroundColor Green
Write-Host "Folder: $outDir"
Write-Host "Zip:    $zipPath"
Write-Host "Catalog: $catalogFile"
Write-Host ''
Write-Host 'Send the zip (or 01_spine_catalog.txt) for review.' -ForegroundColor Yellow

try { notepad $catalogFile } catch { }
