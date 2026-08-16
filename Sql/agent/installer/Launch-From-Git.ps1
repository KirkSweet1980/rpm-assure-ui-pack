# Pull latest pack and open the Edge Agent setup wizard.
# Run as Administrator on the customer SQL host.
param(
  [string]$RepoUrl = "https://github.com/KirkSweet1980/rpm-assure-ui-pack.git",
  [string]$Root = "C:\RPM-Assure"
)
$ErrorActionPreference = "Stop"
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $MyInvocation.MyCommand.Path)
  exit
}
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
$git = $null
if (Get-Command git -EA SilentlyContinue) { $git = (Get-Command git).Source }
if (-not $git -and (Test-Path "C:\Program Files\Git\cmd\git.exe")) { $git = "C:\Program Files\Git\cmd\git.exe" }
if (-not $git) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $tmp = Join-Path $env:TEMP "Git-64-bit.exe"
  Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe" -OutFile $tmp
  Start-Process -FilePath $tmp -ArgumentList "/VERYSILENT", "/NORESTART", "/NOCANCEL", "/SP-" -Wait
  $git = "C:\Program Files\Git\cmd\git.exe"
}
$pack = Join-Path $Root "deploy\ui-pack"
New-Item -ItemType Directory -Force -Path (Join-Path $Root "deploy") | Out-Null
if (Test-Path (Join-Path $pack ".git")) {
  & $git -C $pack fetch --all --prune
  & $git -C $pack reset --hard origin/main
} else {
  if (Test-Path $pack) { Remove-Item $pack -Recurse -Force }
  & $git clone --depth 1 --branch main $RepoUrl $pack
}
$wiz = Join-Path $pack "Sql\agent\installer\Install-Assure-Agent-Wizard.ps1"
if (-not (Test-Path $wiz)) { throw "Wizard missing after git pull: $wiz" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $wiz
