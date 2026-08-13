$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\AHI_Local_Config.ps1"
# Linked server create usually needs sa
sqlcmd -S $AhiSqlServer -U sa -P '$y$pr0123' -C -b -i (Join-Path $PSScriptRoot '209_AHIC_LinkedServer_Central.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
