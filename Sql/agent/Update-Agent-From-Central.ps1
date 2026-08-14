# Pull latest agent files from GitHub and restart the service.
# Called by RpmAssure-Agent.ps1 when Assure queues an update.
param(
  [string]$AgentRoot = 'C:\RPM-Assure\Agent',
  [string]$Root = 'C:\RPM-Assure',
  [string]$RepoUrl = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git',
  [string]$ZipUrl = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack/archive/refs/heads/main.zip'
)

$ErrorActionPreference = 'Stop'
$Pack = Join-Path $Root 'deploy\ui-pack'
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy'), $AgentRoot, (Join-Path $AgentRoot 'logs') | Out-Null

function Find-Git {
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
  $g = Get-Command git -EA SilentlyContinue
  if ($g) { return $g.Source }
  foreach ($p in @('C:\Program Files\Git\cmd\git.exe','C:\Program Files (x86)\Git\cmd\git.exe')) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

$git = Find-Git
$ok = $false
if ($git) {
  try {
    if (Test-Path (Join-Path $Pack '.git')) {
      & $git -C $Pack fetch --all --prune
      & $git -C $Pack reset --hard origin/main
    } else {
      if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
      & $git clone --depth 1 --branch main $RepoUrl $Pack
    }
    $ok = $LASTEXITCODE -eq 0 -and (Test-Path (Join-Path $Pack 'Sql\agent\RpmAssure-Agent.ps1'))
  } catch { $ok = $false }
}

if (-not $ok) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $zip = Join-Path $env:TEMP 'rpm-assure-ui-pack.zip'
  Invoke-WebRequest -UseBasicParsing -Uri $ZipUrl -OutFile $zip
  $dest = Join-Path $env:TEMP 'rpm-assure-ui-pack-main'
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force
  $inner = Get-ChildItem $dest -Directory | Select-Object -First 1
  if (-not $inner) { throw 'zip extract failed' }
  if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
  New-Item -ItemType Directory -Force -Path (Split-Path $Pack) | Out-Null
  Move-Item $inner.FullName $Pack
}

$from = Join-Path $Pack 'Sql\agent'
if (-not (Test-Path (Join-Path $from 'RpmAssure-Agent.ps1'))) { throw "Pack missing Sql\agent under $Pack" }

robocopy $from $AgentRoot /E /XF Agent.Secrets.bin Agent.Config.ps1 status.json request-sync.flag /XD logs /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
$baseFrom = Join-Path $Pack 'Sql\base\syspro-direct'
$baseTo = Join-Path $Root 'Sql\base\syspro-direct'
if (Test-Path $baseFrom) {
  New-Item -ItemType Directory -Force -Path $baseTo | Out-Null
  robocopy $baseFrom $baseTo /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

$verFile = Join-Path $AgentRoot 'VERSION'
$ver = '2.2.0'
if (Test-Path $verFile) { $ver = (Get-Content $verFile -Raw).Trim() }

$nssm = Join-Path $AgentRoot 'tools\nssm.exe'
if (-not (Test-Path $nssm)) { $nssm = 'C:\RPM-Assure\Tools\nssm.exe' }
$restart = Join-Path $AgentRoot 'apply-restart.cmd'
@(
  '@echo off',
  'timeout /t 8 /nobreak >nul',
  ('"' + $nssm + '" restart RPMAssure-Edge')
) | Set-Content -LiteralPath $restart -Encoding ASCII
Start-Process -FilePath $restart -WindowStyle Hidden

Write-Output ("UPDATED " + $ver)
exit 0
