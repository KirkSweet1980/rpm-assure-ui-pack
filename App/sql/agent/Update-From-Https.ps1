# Pull agent pack from Assure HTTPS only (never GitHub). BITS then WebClient, 3 tries.
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

function Get-RpmaUrl([string]$Url, [string]$Dest) {
  $ok = $false
  for ($i = 1; $i -le 3 -and -not $ok; $i++) {
    try {
      if (Get-Command Start-BitsTransfer -EA SilentlyContinue) {
        Start-BitsTransfer -Source $Url -Destination $Dest -ErrorAction Stop
        $ok = $true
        break
      }
    } catch { Write-Host ("BITS try$i " + $_.Exception.Message) }
    try {
      $wc = New-Object Net.WebClient
      $wc.Headers['Cache-Control'] = 'no-cache'
      $wc.DownloadFile($Url, $Dest)
      $ok = $true
    } catch {
      Write-Host ("WebClient try$i " + $_.Exception.Message)
      Start-Sleep -Seconds (2 * $i)
    }
  }
  if (-not $ok) { throw "download failed $Url" }
}

$base = $Base.TrimEnd("/")
$verUri = $base + "/downloads/VERSION"
$zipUri = $base + "/downloads/rpm-assure-agent.zip"
$verFile = Join-Path $dl "VERSION"
Write-Host ("GET " + $verUri)
try { Get-RpmaUrl $verUri $verFile } catch { Write-Host ("WARN VERSION " + $_.Exception.Message) }
$remoteVer = "unknown"
if (Test-Path $verFile) { $remoteVer = ((Get-Content $verFile -Raw) -replace '\s', '') }
Write-Host ("remote VERSION=" + $remoteVer)

$zip = Join-Path $dl "rpm-assure-agent.zip"
Write-Host ("GET " + $zipUri)
Get-RpmaUrl $zipUri $zip
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
$patchFrom = Join-Path $from "Collect-Host-Patches.ps1"
if (-not (Test-Path $patchFrom)) { throw "pack missing Collect-Host-Patches.ps1 - central must Publish-Agent-Pack" }

robocopy $from $next /E /XF Agent.Secrets.bin Agent.Config.ps1 Agent.Settings.json /XD logs /NFL /NDL /NJH /NJS | Out-Null
robocopy $from $agent /E /XF Agent.Secrets.bin Agent.Config.ps1 Agent.Settings.json RpmAssure-Agent.ps1 RpmAssure-Agent-Loop.ps1 /XD logs _next /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
Copy-Item -Force $patchFrom (Join-Path $agent "Collect-Host-Patches.ps1")
Copy-Item -Force (Join-Path $from "Update-From-Https.ps1") (Join-Path $agent "Update-From-Https.ps1") -EA SilentlyContinue

$apply = Join-Path $agent "Apply-Staged-Pack.ps1"
if (Test-Path $apply) {
  schtasks /Create /TN "RPMAssure-ApplyPack" /SC MINUTE /MO 1 /RU SYSTEM /RL HIGHEST /F `
    /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$apply`"" | Out-Null
}

$svc = Get-Service RPMAssure-Edge -EA SilentlyContinue
if ($svc) { Restart-Service RPMAssure-Edge -Force -EA SilentlyContinue }
$ver = $remoteVer
$vf = Join-Path $agent "VERSION"
if (Test-Path $vf) { $ver = (Get-Content $vf -Raw).Trim() }
Write-Host ("UPDATED local pack/agent VERSION=" + $ver)
Write-Host "If EPP still blocks: exclude C:\RPM-Assure (On-Access + ATC) then re-run."
