# Finish RSS on RSS-PROD - bootstrap SYSPROAdmin, collect rpmassure
param(
  [string]$SaUser = 'SYSPROAdmin',
  [string]$SaPassword = '',
  [switch]$SkipLoginCreate,
  [switch]$SkipLinkedServer,
  [switch]$SkipCollect,
  [switch]$InstallSchedule
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Customer.Config.ps1')
if (-not $SaPassword) {
  if ($BootstrapSqlPassword) { $SaPassword = $BootstrapSqlPassword }
}
function Find-Sqlcmd {
  $cmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  throw 'sqlcmd not found'
}
$sqlcmd = Find-Sqlcmd
function Run-SqlFile([string]$file, [string]$user, [string]$pass) {
  Write-Host ("RUN " + $file + " as " + $user) -ForegroundColor Cyan
  $out = & $sqlcmd -S '.' -U $user -P $pass -C -b -i $file 2>&1
  $out | ForEach-Object { Write-Host $_ }
  if ($LASTEXITCODE -ne 0) {
    throw ("sqlcmd failed " + $LASTEXITCODE + " " + $file)
  }
}

# Optional TCP check
$tcpTest = Join-Path $PSScriptRoot '303b_Test_Central_Tcp.ps1'
if (Test-Path $tcpTest) {
  Write-Host 'Checking path to central SQL...' -ForegroundColor Cyan
  & powershell -NoProfile -ExecutionPolicy Bypass -File $tcpTest
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'WARNING: TCP 14333 may be blocked. Linked server will fail until fixed.' -ForegroundColor Yellow
  }
}

if (-not $SkipLoginCreate) {
  if (-not $SaPassword) { throw 'Provide -SaPassword for SYSPROAdmin' }
  Run-SqlFile (Join-Path $PSScriptRoot '302_RSS_Create_Collect_Login.sql') $SaUser $SaPassword
}
if (-not $SkipLinkedServer) {
  if (-not $SaPassword) { throw 'Provide -SaPassword' }
  try {
    Run-SqlFile (Join-Path $PSScriptRoot '303_RSS_LinkedServer_Central.sql') $SaUser $SaPassword
  } catch {
    Write-Host $_ -ForegroundColor Red
    Write-Host ''
    Write-Host 'Linked server failed. Login rpmassure may already be created.' -ForegroundColor Yellow
    Write-Host 'Fix network/provider then re-run ONLY:' -ForegroundColor Yellow
    Write-Host '  sqlcmd -S "." -U SYSPROAdmin -P ''$y$pr0'' -C -b -i C:\RPM-Assure\Sql\customers\RSS\303_RSS_LinkedServer_Central.sql'
    Write-Host 'Or: Finish-RSS-OnCustomer.ps1 -SkipLoginCreate -SkipLinkedServer  (after 303 works)'
    throw
  }
}
if (-not $SkipCollect) {
  Write-Host 'Collect as rpmassure...' -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot 'Run-RSS-Collect-Scheduled.ps1')
}
if ($InstallSchedule) {
  & (Join-Path $PSScriptRoot 'Install-RSS-Schedule.ps1')
}
Write-Host 'Finish complete for RSS-PROD.' -ForegroundColor Green
