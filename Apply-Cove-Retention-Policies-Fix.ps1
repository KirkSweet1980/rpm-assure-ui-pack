# Apply-Cove-Retention-Policies-Fix.ps1
# ASCII-only (Windows PowerShell 5.1 safe)
$ErrorActionPreference = 'Stop'
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppRoot = 'C:\RPM-Assure\App'
$SqlRoot = 'C:\RPM-Assure\Sql\cove'
$Server = '102.222.21.220,14333'
$Db = 'RPMAssure_App'

if (-not (Test-Path $SqlRoot)) {
  New-Item -ItemType Directory -Path $SqlRoot -Force | Out-Null
}

Copy-Item (Join-Path $Here 'Sql\cove\438_Ensure_Cove_Retention.sql') (Join-Path $SqlRoot '438_Ensure_Cove_Retention.sql') -Force
Copy-Item (Join-Path $Here 'Sql\cove\Collect-Cove-To-RPMAssure.ps1') (Join-Path $SqlRoot 'Collect-Cove-To-RPMAssure.ps1') -Force
Write-Host 'OK SQL + collect'

$pairs = @(
  'src\lib\data\types.ts',
  'src\lib\data\live-portfolio.ts',
  'src\components\customer\customer-sections.tsx',
  'src\components\nav\customer-workspace-nav.tsx',
  'src\lib\nav\site-tree.ts',
  'src\routes\customers.$code.tsx',
  'src\routes\customers.$code.cove.retention.tsx',
  'src\routeTree.gen.ts'
)
foreach ($rel in $pairs) {
  $s = Join-Path $Here ('App\' + $rel)
  $d = Join-Path $AppRoot $rel
  if (-not (Test-Path -LiteralPath $s)) {
    Write-Host ("SKIP " + $s)
    continue
  }
  $dir = Split-Path -Parent $d
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  Copy-Item -LiteralPath $s -Destination $d -Force
  Write-Host ("OK " + $d)
}

Write-Host '=== 438 retention columns ==='
$sqlFile = Join-Path $SqlRoot '438_Ensure_Cove_Retention.sql'
& sqlcmd -S $Server -d $Db -E -C -b -i $sqlFile 2>&1 | ForEach-Object { Write-Host $_ }

Write-Host '=== Re-run Cove collect (PN/OP/FR retention) ==='
$collect = Join-Path $SqlRoot 'Collect-Cove-To-RPMAssure.ps1'
powershell -NoProfile -ExecutionPolicy Bypass -File $collect
Write-Host ("collect exit=" + $LASTEXITCODE)
Write-Host 'Look for Retention sample PN= in log.'

Write-Host 'Restart app...'
try {
  schtasks /End /TN RPMAssure-App-OnStart 2>$null | Out-Null
  Start-Sleep 2
  Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
  }
  schtasks /Run /TN RPMAssure-App-OnStart | Out-Null
  Start-Sleep 6
} catch {
  Write-Host $_
}

Write-Host 'Hard-refresh RPM Cloud Backup > Retention policies'
Write-Host '=== Done ==='
