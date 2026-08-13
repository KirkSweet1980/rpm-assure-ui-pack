# Backup app settings + env (no secrets printed)
$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$BackupRoot = 'C:\RPM-Assure\backups'
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$dest = Join-Path $BackupRoot ('settings_' + $stamp)
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$files = @(
  (Join-Path $App 'data\rpma-settings.json'),
  (Join-Path $App '.env.local'),
  (Join-Path $App 'env.local.example')
)
foreach ($f in $files) {
  if (Test-Path -LiteralPath $f) {
    Copy-Item -LiteralPath $f -Destination $dest -Force
    Write-Host ('Backed up ' + [IO.Path]::GetFileName($f))
  }
}
# keep last 30
Get-ChildItem $BackupRoot -Directory -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 30 |
  ForEach-Object { Remove-Item $_.FullName -Recurse -Force }
Write-Host ('Backup folder: ' + $dest) -ForegroundColor Green
