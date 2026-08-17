# Run on the Assure app server only. Git stays here.
# Publishes the Edge agent zip for customer hosts (no Git / no GitHub).
#   https://assure.rpmresources.co.za/downloads/rpm-assure-agent.zip
#   https://assure.rpmresources.co.za/downloads/VERSION
#   https://assure.rpmresources.co.za/downloads/Deploy-Assure-Agent.ps1

param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack'
)

$ErrorActionPreference = 'Stop'
$dl = Join-Path $Root 'App\public\downloads'
$dl2 = Join-Path $Pack 'public\downloads'
New-Item -ItemType Directory -Force -Path $dl | Out-Null
if (Test-Path (Join-Path $Pack 'public')) {
  New-Item -ItemType Directory -Force -Path $dl2 | Out-Null
}

$ver = '2.8.0'
$verFile = Join-Path $Pack 'Sql\agent\VERSION'
if (Test-Path $verFile) { $ver = (Get-Content $verFile -Raw).Trim() }
elseif (Test-Path (Join-Path $Pack 'sql\agent\VERSION')) {
  $ver = (Get-Content (Join-Path $Pack 'sql\agent\VERSION') -Raw).Trim()
}

$stage = Join-Path $env:TEMP ('rpma-agent-pack-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $stage | Out-Null
foreach ($rel in @('Sql\agent', 'sql\agent', 'Sql\base\syspro-direct', 'sql\base\syspro-direct', 'Sql\customers', 'sql\customers')) {
  $from = Join-Path $Pack $rel
  if (Test-Path $from) {
    $to = Join-Path $stage $rel
    New-Item -ItemType Directory -Force -Path $to | Out-Null
    robocopy $from $to /E /NFL /NDL /NJH /NJS /nc /ns /np /XF *.log Agent.Secrets.bin Agent.Config.ps1 status.json | Out-Null
  }
}
Set-Content -LiteralPath (Join-Path $stage 'VERSION') -Value $ver -Encoding ASCII

$zip = Join-Path $dl 'rpm-assure-agent.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip)
Remove-Item $stage -Recurse -Force

Set-Content -LiteralPath (Join-Path $dl 'VERSION') -Value $ver -Encoding ASCII
foreach ($name in @('Deploy-Assure-Agent.ps1', 'Onboard-IB-Syspro.ps1')) {
  $src = @(
    (Join-Path $Pack ('Sql\agent\' + $name)),
    (Join-Path $Pack ('sql\agent\' + $name)),
    (Join-Path $Pack ('Sql\customers\IB\' + $name)),
    (Join-Path $Pack ('sql\customers\IB\' + $name))
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($src) { Copy-Item -Force $src (Join-Path $dl $name) }
}

if (Test-Path $dl2) {
  Copy-Item -Force (Join-Path $dl 'rpm-assure-agent.zip') (Join-Path $dl2 'rpm-assure-agent.zip') -ErrorAction SilentlyContinue
  Copy-Item -Force (Join-Path $dl 'VERSION') (Join-Path $dl2 'VERSION') -ErrorAction SilentlyContinue
}

$len = (Get-Item $zip).Length
Write-Host ('PUBLISHED agent pack v' + $ver + ' ' + $len + ' bytes')
Write-Host ' https://assure.rpmresources.co.za/downloads/rpm-assure-agent.zip'
Write-Host ' https://assure.rpmresources.co.za/downloads/Deploy-Assure-Agent.ps1'
