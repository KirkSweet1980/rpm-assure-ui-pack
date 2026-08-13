param(
  [string]$ProductName = 'RPM Assure',
  [switch]$KeepConfig
)
$ErrorActionPreference = 'Continue'
Write-Host "Uninstalling $ProductName ..." -ForegroundColor Cyan
# Prefer msiexec by UpgradeCode product discovery
$apps = Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -EA SilentlyContinue
$apps += Get-ItemProperty 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*' -EA SilentlyContinue
$hit = $apps | Where-Object { $_.DisplayName -like '*RPM Assure*' } | Select-Object -First 1
if ($hit -and $hit.PSChildName) {
  $guid = $hit.PSChildName
  Write-Host "ProductCode $guid"
  Start-Process msiexec.exe -ArgumentList @('/x', $guid, '/qb') -Wait
} else {
  Write-Host 'Product not found in registry - trying service cleanup only' -ForegroundColor Yellow
}
# Service cleanup
$svc = 'C:\Program Files\RPM Resources\RPM Assure\service\Uninstall-Service.ps1'
if (Test-Path $svc) { & $svc }
if (-not $KeepConfig) {
  $cfg = Join-Path $env:ProgramData 'RPM Resources\RPM Assure'
  if (Test-Path $cfg) {
    Write-Host "Removing config $cfg" -ForegroundColor Yellow
    Remove-Item $cfg -Recurse -Force -EA SilentlyContinue
  }
}
Write-Host 'Done'
