# Manual / Pulseway: pull agent pack over HTTPS with BITS (not IWR-in-TEMP).
# Bitdefender ATC blocks hidden cmd + zip-in-%TEMP%. This stays under C:\RPM-Assure.
param(
  [string]$Base = "https://assure.rpmresources.co.za",
  [string]$Root = "C:\RPM-Assure"
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$dl = Join-Path $Root "downloads"
$pack = Join-Path $Root "deploy\ui-pack"
$agent = Join-Path $Root "Agent"
$next = Join-Path $agent "_next"
New-Item -ItemType Directory -Force -Path $dl, $pack, $agent, $next | Out-Null

$zip = Join-Path $dl "rpm-assure-agent.zip"
$uri = $Base.TrimEnd("/") + "/downloads/rpm-assure-agent.zip"
Write-Host ("GET " + $uri)
Import-Module BitsTransfer -ErrorAction SilentlyContinue
if (Get-Command Start-BitsTransfer -EA SilentlyContinue) {
  Start-BitsTransfer -Source $uri -Destination $zip -ErrorAction Stop
} else {
  $wc = New-Object Net.WebClient
  $wc.DownloadFile($uri, $zip)
}
if (-not (Test-Path $zip) -or (Get-Item $zip).Length -lt 1000) { throw "zip empty" }
Write-Host ("zip bytes=" + (Get-Item $zip).Length)

Get-ChildItem $pack -Force -EA SilentlyContinue | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force -EA SilentlyContinue
New-Item -ItemType Directory -Force -Path $pack | Out-Null
$tar = Join-Path $env:SystemRoot "System32\tar.exe"
if (Test-Path $tar) {
  & $tar -xf $zip -C $pack
} else {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory($zip, $pack)
}

$from = Join-Path $pack "Sql\agent"
if (-not (Test-Path (Join-Path $from "RpmAssure-Agent.ps1"))) { $from = Join-Path $pack "sql\agent" }
if (-not (Test-Path (Join-Path $from "RpmAssure-Agent.ps1"))) { throw "pack missing RpmAssure-Agent.ps1" }
robocopy $from $next /E /XF Agent.Secrets.bin Agent.Config.ps1 Agent.Settings.json /XD logs /NFL /NDL /NJH /NJS | Out-Null
robocopy $from $agent /E /XF Agent.Secrets.bin Agent.Config.ps1 Agent.Settings.json /XD logs _next /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null

$apply = Join-Path $agent "Apply-Staged-Pack.ps1"
if (Test-Path $apply) {
  schtasks /Create /TN "RPMAssure-ApplyPack" /SC MINUTE /MO 1 /RU SYSTEM /RL HIGHEST /F `
    /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$apply`"" | Out-Null
}

$svc = Get-Service RPMAssure-Edge -EA SilentlyContinue
if ($svc) { Restart-Service RPMAssure-Edge -Force -EA SilentlyContinue }
$ver = "unknown"
$vf = Join-Path $agent "VERSION"
if (Test-Path $vf) { $ver = (Get-Content $vf -Raw).Trim() }
Write-Host ("UPDATED local pack/agent VERSION=" + $ver)
Write-Host "If EPP still blocks: exclude C:\RPM-Assure (On-Access + ATC) then re-run."
