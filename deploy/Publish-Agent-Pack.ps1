# Run on the Assure app server only. Git stays here.
# Publishes the Edge agent zip for customer hosts (no Git / no GitHub).

param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Copy-TreeShare([string]$From, [string]$To) {
  New-Item -ItemType Directory -Force -Path $To | Out-Null
  Get-ChildItem -LiteralPath $From -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($From.Length).TrimStart('\')
    if ($rel -match '\\logs\\|Agent\.Secrets\.bin$|status\.json$|\.log$') { return }
    $dest = Join-Path $To $rel
    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
    $in = [IO.File]::Open($_.FullName, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    try {
      $out = [IO.File]::Create($dest)
      try { $in.CopyTo($out) } finally { $out.Dispose() }
    } finally { $in.Dispose() }
  }
}

function Write-ZipFromFolder([string]$Folder, [string]$ZipPath) {
  if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
  $zip = [IO.Compression.ZipFile]::Open($ZipPath, [IO.Compression.ZipArchiveMode]::Create)
  try {
    $root = (Resolve-Path $Folder).Path.TrimEnd('\')
    Get-ChildItem -LiteralPath $Folder -Recurse -File | ForEach-Object {
      $entry = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
      $e = $zip.CreateEntry($entry, [IO.Compression.CompressionLevel]::Optimal)
      $in = [IO.File]::Open($_.FullName, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
      try {
        $es = $e.Open()
        try { $in.CopyTo($es) } finally { $es.Dispose() }
      } finally { $in.Dispose() }
    }
  } finally { $zip.Dispose() }
}

$dlDirs = @(
  (Join-Path $Root 'downloads'),
  (Join-Path $Root 'App\public\downloads'),
  (Join-Path $Root 'deploy\ui-pack\public\downloads'),
  (Join-Path $Root 'deploy\ui-pack\App\public\downloads')
) | Select-Object -Unique
foreach ($d in $dlDirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
$dl = $dlDirs[0]

$ver = '2.8.0'
foreach ($vf in @(
    (Join-Path $Pack 'Sql\agent\VERSION'),
    (Join-Path $Pack 'sql\agent\VERSION')
  )) {
  if (Test-Path $vf) { $ver = (Get-Content $vf -Raw).Trim(); break }
}

$stage = Join-Path $env:TEMP ('rpma-agent-pack-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $stage | Out-Null
foreach ($rel in @('Sql\agent', 'sql\agent', 'Sql\base\syspro-direct', 'sql\base\syspro-direct', 'Sql\customers', 'sql\customers')) {
  $from = Join-Path $Pack $rel
  if (Test-Path $from) { Copy-TreeShare $from (Join-Path $stage $rel) }
}
Set-Content -LiteralPath (Join-Path $stage 'VERSION') -Value $ver -Encoding ASCII

$zip = Join-Path $dl 'rpm-assure-agent.zip'
Write-ZipFromFolder $stage $zip
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue

foreach ($d in $dlDirs) {
  Set-Content -LiteralPath (Join-Path $d 'VERSION') -Value $ver -Encoding ASCII
  if ($d -ne $dl) { Copy-Item -Force $zip (Join-Path $d 'rpm-assure-agent.zip') }
}

foreach ($name in @('Deploy-Assure-Agent.ps1', 'Onboard-IB-Syspro.ps1')) {
  $src = @(
    (Join-Path $Pack ('Sql\agent\' + $name)),
    (Join-Path $Pack ('sql\agent\' + $name)),
    (Join-Path $Pack ('Sql\customers\IB\' + $name)),
    (Join-Path $Pack ('sql\customers\IB\' + $name))
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($src) {
    foreach ($d in $dlDirs) { Copy-Item -Force $src (Join-Path $d $name) }
  }
}

$len = (Get-Item $zip).Length
if ($len -lt 50000) { Write-Host ('WARN zip is small (' + $len + ' bytes) - check pack folders exist under ' + $Pack) }
Write-Host ('PUBLISHED agent pack v' + $ver + ' ' + $len + ' bytes')
Write-Host ' https://assure.rpmresources.co.za/downloads/VERSION'
Write-Host ' https://assure.rpmresources.co.za/downloads/rpm-assure-agent.zip'
Write-Host ' https://assure.rpmresources.co.za/downloads/Deploy-Assure-Agent.ps1'
