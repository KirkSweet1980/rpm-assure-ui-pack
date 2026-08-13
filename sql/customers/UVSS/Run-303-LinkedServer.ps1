$ErrorActionPreference = 'Stop'
$sql = 'C:\RPM-Assure\Sql\customers\UVSS\303_UVSS_LinkedServer_Central.sql'
if (-not (Test-Path $sql)) { throw "Missing $sql - expand UVSS pack first" }
& sqlcmd -S '.' -U 'SYSPROAdmin' -P '$y$pr0' -C -b -i $sql
if ($LASTEXITCODE -ne 0) { throw "sqlcmd exit $LASTEXITCODE" }
