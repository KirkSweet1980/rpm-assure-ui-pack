# Strip UTF-8 BOM from package.json (breaks Vite / JSON.parse)
$ErrorActionPreference = 'Stop'
$pkg = 'C:\RPM-Assure\App\package.json'
if (-not (Test-Path $pkg)) { throw "Missing $pkg" }

$bytes = [IO.File]::ReadAllBytes($pkg)
# EF BB BF = UTF-8 BOM
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
  $bytes = $bytes[3..($bytes.Length - 1)]
  [IO.File]::WriteAllBytes($pkg, $bytes)
  Write-Host 'Stripped UTF-8 BOM from package.json' -ForegroundColor Green
} else {
  # also strip char BOM if present as text
  $raw = [IO.File]::ReadAllText($pkg)
  if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 0xFEFF) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [IO.File]::WriteAllText($pkg, $raw.Substring(1), $utf8NoBom)
    Write-Host 'Stripped text BOM from package.json' -ForegroundColor Green
  } else {
    Write-Host 'No BOM detected' -ForegroundColor Cyan
  }
}

# Validate JSON
try {
  $null = Get-Content -LiteralPath $pkg -Raw | ConvertFrom-Json
  Write-Host 'package.json is valid JSON' -ForegroundColor Green
} catch {
  throw ("package.json still invalid: " + $_.Exception.Message)
}

# Ensure build scripts exist
$raw = [IO.File]::ReadAllText($pkg)
if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 0xFEFF) { $raw = $raw.Substring(1) }
$j = $raw | ConvertFrom-Json
$j.scripts | Add-Member -NotePropertyName postbuild -NotePropertyValue 'node scripts/copy-pglite-assets.mjs' -Force
$j.scripts | Add-Member -NotePropertyName 'build:node' -NotePropertyValue 'node scripts/build-node.mjs' -Force
$j.scripts | Add-Member -NotePropertyName 'start:prod' -NotePropertyValue 'node .output/server/index.mjs' -Force
$json = $j | ConvertTo-Json -Depth 30
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[IO.File]::WriteAllText($pkg, $json, $utf8NoBom)
Write-Host 'Scripts ensured (UTF-8 no BOM)' -ForegroundColor Green

# Ensure build-node.mjs exists
$bn = 'C:\RPM-Assure\App\scripts\build-node.mjs'
if (-not (Test-Path $bn)) {
  Write-Host 'WARNING: scripts\build-node.mjs missing - re-run Apply-Production-Ready.ps1' -ForegroundColor Yellow
} else {
  Write-Host "OK $bn" -ForegroundColor Green
}

Write-Host 'Next: Go-Production.ps1' -ForegroundColor Cyan
