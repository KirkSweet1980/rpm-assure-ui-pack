# Install UVSS Extra-A scripts from Downloads zip
$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure\Sql\customers\UVSS'
$Downloads = Join-Path $env:USERPROFILE 'Downloads'
$Zip = Join-Path $Downloads 'RPMAssure_UVSS_Extra_A.zip'
if (-not (Test-Path -LiteralPath $Zip)) {
  $c = Get-ChildItem -LiteralPath $Downloads -Filter 'RPMAssure_UVSS_Extra_A*.zip' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($null -eq $c) { throw 'Place RPMAssure_UVSS_Extra_A.zip in Downloads first' }
  $Zip = $c.FullName
}
New-Item -ItemType Directory -Force -Path $Root | Out-Null
$tmp = Join-Path $env:TEMP ('uvss_extra_a_' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
Expand-Archive -LiteralPath $Zip -DestinationPath $tmp -Force
$payload = $tmp
$kids = @(Get-ChildItem -LiteralPath $tmp -Directory -ErrorAction SilentlyContinue)
if (($kids.Count -eq 1) -and -not (Test-Path -LiteralPath (Join-Path $tmp '221_Collect_UVSS_SystemAuditLog.sql'))) {
  $payload = $kids[0].FullName
}
Get-ChildItem -LiteralPath $payload -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $Root -Recurse -Force
}
Write-Host ('Installed from: ' + $Zip) -ForegroundColor Cyan
Write-Host ('Into: ' + $Root)
$need = @(
  '221_Collect_UVSS_SystemAuditLog.sql',
  '222_Collect_UVSS_DiagSummary.sql',
  '223_Collect_UVSS_SqlHealthBal.sql',
  'Run-UVSS-Extra-A.ps1'
)
$ok = $true
foreach ($n in $need) {
  $p = Join-Path $Root $n
  if (Test-Path -LiteralPath $p) {
    Write-Host ('  OK  ' + $n)
  } else {
    Write-Host ('  MISS ' + $n) -ForegroundColor Red
    $ok = $false
  }
}
if (-not $ok) { throw 'Install incomplete - re-download zip' }
Write-Host ''
Write-Host 'Next: run Extra-A collect' -ForegroundColor Green
Write-Host ('  powershell -NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $Root 'Run-UVSS-Extra-A.ps1') + '"')
