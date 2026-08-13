<#
.SYNOPSIS
  RPM Assure / review export — schema scripts + catalog (no bulk data).
.EXAMPLE
  .\Export-DbForReview.ps1 -ServerInstance 'RPMWINRIM\RPMReports' -Database 'RPMAssure'
#>

param(
    [Parameter(Mandatory = $true)]
    [string] $ServerInstance,

    [Parameter(Mandatory = $true)]
    [string] $Database,

    [string] $OutputRoot = "$env:USERPROFILE\Desktop\DbExport_RPMAssure",

    [switch] $UseSqlAuth,
    [string] $SqlUser,
    [securestring] $SqlPassword
)

$ErrorActionPreference = 'Stop'
$stamp = Get-Date -Format 'yyyyMMdd_HHmm'
$outDir = Join-Path $OutputRoot "$Database`_$stamp"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

function Get-PlainPassword {
    param([securestring]$Secure)
    if (-not $Secure) { return $null }
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

$smoOk = $false
try {
    Import-Module SqlServer -ErrorAction Stop
    $smoOk = $true
} catch {
    try {
        Add-Type -AssemblyName 'Microsoft.SqlServer.Smo' -ErrorAction Stop
        Add-Type -AssemblyName 'Microsoft.SqlServer.SmoExtended' -ErrorAction Stop
        $smoOk = $true
    } catch {
        Write-Warning 'SqlServer module / SMO not found. Will try sqlcmd for catalog only; schema CREATE scripts skipped.'
    }
}

$catalogSql = @'
SET NOCOUNT ON;

SELECT
    @@SERVERNAME AS ServerName,
    DB_NAME()    AS DatabaseName,
    SCHEMA_NAME(t.schema_id) AS SchemaName,
    t.name AS TableName,
    t.create_date AS CreateDate,
    SUM(CASE WHEN p.index_id IN (0,1) THEN p.rows ELSE 0 END) AS [RowCount]
FROM sys.tables t
JOIN sys.partitions p ON p.object_id = t.object_id
WHERE t.is_ms_shipped = 0
GROUP BY t.schema_id, t.name, t.create_date
ORDER BY SchemaName, TableName;

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
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE t.is_ms_shipped = 0
GROUP BY t.schema_id, t.name, i.name, i.type_desc, i.is_unique, i.is_primary_key
ORDER BY SchemaName, TableName, IndexName;

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

SELECT
    SCHEMA_NAME(o.schema_id) AS SchemaName,
    o.name AS ObjectName,
    o.type_desc AS ObjectType,
    o.create_date AS CreateDate,
    o.modify_date AS ModifyDate
FROM sys.objects o
WHERE o.is_ms_shipped = 0
  AND o.type IN ('P', 'V', 'FN', 'IF', 'TF', 'TR')
ORDER BY ObjectType, SchemaName, ObjectName;

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
'@

$catalogPath = Join-Path $outDir '00_catalog.sqlresult.txt'
$sqlFile = Join-Path $outDir '_catalog_query.sql'
$catalogSql | Set-Content -Path $sqlFile -Encoding UTF8

Write-Host "Running catalog queries against $ServerInstance / $Database ..." -ForegroundColor Cyan

$plain = Get-PlainPassword -Secure $SqlPassword
$catalogOk = $false

if (Get-Command Invoke-Sqlcmd -ErrorAction SilentlyContinue) {
    try {
        if ($UseSqlAuth) {
            $all = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $Database -Username $SqlUser -Password $plain -Query $catalogSql -MaxCharLength 1000000 -TrustServerCertificate
        } else {
            $all = Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $Database -Query $catalogSql -MaxCharLength 1000000 -TrustServerCertificate
        }
        # Invoke-Sqlcmd may return DataRow(s) or DataTable(s) depending on version
        $sb = New-Object System.Text.StringBuilder
        [void]$sb.AppendLine("ServerInstance=$ServerInstance Database=$Database")
        [void]$sb.AppendLine("Exported=$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
        [void]$sb.AppendLine('')

        if ($all -is [System.Data.DataTable]) {
            $sets = @($all)
        } elseif ($all -is [System.Data.DataSet]) {
            $sets = @($all.Tables)
        } else {
            # Often an array of DataRows for first set only on older modules — still write something useful
            $sets = @($all)
        }

        $i = 0
        foreach ($item in $sets) {
            $i++
            if ($item -is [System.Data.DataTable]) {
                $dt = $item
                [void]$sb.AppendLine("===== RESULT SET $i  rows=$($dt.Rows.Count) =====")
                $cols = ($dt.Columns | ForEach-Object { $_.ColumnName }) -join "`t"
                [void]$sb.AppendLine($cols)
                foreach ($row in $dt.Rows) {
                    $line = ($dt.Columns | ForEach-Object {
                        $v = $row[$_.ColumnName]
                        if ($null -eq $v -or $v -is [DBNull]) { '' } else { [string]$v }
                    }) -join "`t"
                    [void]$sb.AppendLine($line)
                }
            } else {
                [void]$sb.AppendLine("===== RESULT SET $i (rows) =====")
                $item | Format-Table -AutoSize | Out-String | ForEach-Object { [void]$sb.AppendLine($_) }
            }
            [void]$sb.AppendLine()
        }
        $sb.ToString() | Set-Content -Path $catalogPath -Encoding UTF8
        $catalogOk = $true
    } catch {
        Write-Warning "Invoke-Sqlcmd failed: $($_.Exception.Message). Trying sqlcmd.exe..."
    }
}

if (-not $catalogOk) {
    if (-not (Get-Command sqlcmd -ErrorAction SilentlyContinue)) {
        throw 'Neither Invoke-Sqlcmd nor sqlcmd.exe is available. Install SSMS or: Install-Module SqlServer -Scope CurrentUser'
    }
    if ($UseSqlAuth) {
        & sqlcmd -S $ServerInstance -d $Database -U $SqlUser -P $plain -C -i $sqlFile -o $catalogPath -W -s "`t"
    } else {
        & sqlcmd -S $ServerInstance -d $Database -E -C -i $sqlFile -o $catalogPath -W -s "`t"
    }
    if ($LASTEXITCODE -ne 0) {
        throw "sqlcmd failed with exit code $LASTEXITCODE"
    }
    $catalogOk = $true
}

Write-Host "Catalog: $catalogPath" -ForegroundColor Green

# SMO schema (no data)
if ($smoOk) {
    Write-Host 'Scripting schema with SMO (no data)...' -ForegroundColor Cyan
    try {
        $server = New-Object Microsoft.SqlServer.Management.Smo.Server($ServerInstance)
        if ($UseSqlAuth) {
            $server.ConnectionContext.LoginSecure = $false
            $server.ConnectionContext.Login = $SqlUser
            $server.ConnectionContext.Password = $plain
        } else {
            $server.ConnectionContext.LoginSecure = $true
        }

        $db = $server.Databases[$Database]
        if (-not $db) { throw "Database '$Database' not found on $ServerInstance" }

        $scripter = New-Object Microsoft.SqlServer.Management.Smo.Scripter($server)
        $opt = $scripter.Options
        $opt.ScriptData            = $false
        $opt.ScriptSchema          = $true
        $opt.ScriptDrops           = $false
        $opt.WithDependencies      = $true
        $opt.Indexes               = $true
        $opt.DriAll                = $true
        $opt.Triggers              = $true
        $opt.SchemaQualify         = $true
        $opt.Permissions           = $false
        $opt.ScriptBatchTerminator = $true
        $opt.FileName              = (Join-Path $outDir '01_schema.sql')
        $opt.ToFileOnly            = $true
        $opt.AppendToFile          = $false
        $opt.Encoding              = [System.Text.Encoding]::UTF8

        $urns = New-Object Microsoft.SqlServer.Management.Smo.UrnCollection
        foreach ($t in $db.Tables)  { if (-not $t.IsSystemObject) { [void]$urns.Add($t.Urn) } }
        foreach ($v in $db.Views)   { if (-not $v.IsSystemObject) { [void]$urns.Add($v.Urn) } }
        foreach ($p in $db.StoredProcedures) { if (-not $p.IsSystemObject) { [void]$urns.Add($p.Urn) } }
        foreach ($f in $db.UserDefinedFunctions) { if (-not $f.IsSystemObject) { [void]$urns.Add($f.Urn) } }

        if ($urns.Count -eq 0) {
            '/* Database has no user tables/views/procs yet */' | Set-Content -Path $opt.FileName -Encoding UTF8
            Write-Host 'Database appears empty (no user objects).' -ForegroundColor Yellow
        } else {
            $scripter.Script($urns)
            Write-Host "Schema: $($opt.FileName)" -ForegroundColor Green
        }
    } catch {
        Write-Warning "SMO schema script failed: $($_.Exception.Message)"
    }
}

@"
RPM Assure DB export
Server:   $ServerInstance
Database: $Database
When:     $(Get-Date -Format 'yyyy-MM-dd HH:mm')
Contents:
  00_catalog.sqlresult.txt
  01_schema.sql (if SMO available)
"@ | Set-Content (Join-Path $outDir 'README.txt') -Encoding UTF8

$zipPath = "$outDir.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $outDir -DestinationPath $zipPath -Force

Write-Host ''
Write-Host 'Done.' -ForegroundColor Green
Write-Host "Folder: $outDir"
Write-Host "Zip:    $zipPath"
