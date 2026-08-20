# Pull the agent pack from Assure HTTPS. No Git. No GitHub.
param(
  [string]$AgentRoot = 'C:\RPM-Assure\Agent',
  [string]$AppHttpsUrl = 'https://assure.rpmresources.co.za'
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$zip = Join-Path $env:TEMP 'rpm-assure-agent.zip'
Invoke-WebRequest -UseBasicParsing -TimeoutSec 180 -Uri ($AppHttpsUrl.TrimEnd('/') + '/downloads/rpm-assure-agent.zip') -OutFile $zip
$pack = 'C:\RPM-Assure\deploy\ui-pack'
if (Test-Path $pack) { Remove-Item $pack -Recurse -Force }
New-Item -ItemType Directory -Force -Path $pack | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::ExtractToDirectory($zip, $pack)
$from = Join-Path $pack 'Sql\agent'
if (-not (Test-Path (Join-Path $from 'RpmAssure-Agent.ps1'))) { $from = Join-Path $pack 'sql\agent' }
if (-not (Test-Path (Join-Path $from 'RpmAssure-Agent.ps1'))) { throw 'Pack zip missing agent scripts' }
New-Item -ItemType Directory -Force -Path $AgentRoot | Out-Null
robocopy $from $AgentRoot /E /XF Agent.Secrets.bin Agent.Config.ps1 Agent.Settings.json status.json request-sync.flag /XD logs /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
Write-Host 'Updated from Assure HTTPS pack'
