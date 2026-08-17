# Install-Freshdesk-Collect.ps1 - run as Administrator on RPMWINRM
$ErrorActionPreference = 'Stop'
$Pack = $PSScriptRoot
$Root = 'C:\RPM-Assure'
$Dest = Join-Path $Root 'Sql\freshdesk'
$Src  = Join-Path $Pack 'Sql\freshdesk'
if (-not (Test-Path (Join-Path $Src 'Collect-Freshdesk-To-RPMAssure.ps1'))) {
  if (Test-Path (Join-Path $Pack 'Collect-Freshdesk-To-RPMAssure.ps1')) { $Src = $Pack }
  else { throw ('Missing Sql\freshdesk under ' + $Pack) }
}

New-Item -ItemType Directory -Force -Path $Dest | Out-Null
Copy-Item -Force (Join-Path $Src 'Collect-Freshdesk-To-RPMAssure.ps1') $Dest
Copy-Item -Force (Join-Path $Src '510_Ensure_Freshdesk_Tickets.sql') $Dest
Copy-Item -Force (Join-Path $Src 'Freshdesk.Config.example.ps1') $Dest
Write-Host ('Copied scripts to ' + $Dest)

$liveCfg = Join-Path $Dest 'Freshdesk.Config.ps1'
if (-not (Test-Path $liveCfg)) {
  Copy-Item (Join-Path $Dest 'Freshdesk.Config.example.ps1') $liveCfg
  Write-Host ('Created ' + $liveCfg + ' - set FreshdeskApiKey before collect')
} else {
  Write-Host ('Keeping existing config ' + $liveCfg)
}

$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
if (-not (Test-Path $sqlcmd)) { $sqlcmd = 'sqlcmd' }
& $sqlcmd -S '.\RPMREPORTS' -d RPMAssure_App -E -C -b -i (Join-Path $Dest '510_Ensure_Freshdesk_Tickets.sql')
if ($LASTEXITCODE -ne 0) { throw ('Schema failed ' + $LASTEXITCODE) }
Write-Host 'Schema OK: Freshdesk_Tickets + Dim_Freshdesk_CompanyMap'

Write-Host ''
Write-Host '=== NEXT ==='
Write-Host ('1. Edit API key:  notepad ' + $liveCfg)
$collect = Join-Path $Dest 'Collect-Freshdesk-To-RPMAssure.ps1'
Write-Host '2. Collect once:'
Write-Host ('   powershell -NoProfile -ExecutionPolicy Bypass -File "' + $collect + '"')
Write-Host '3. Map companies after first collect, then re-run collect.'
