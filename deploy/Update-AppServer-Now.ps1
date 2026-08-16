# RPM Assure - App server one-shot (Git only).
# Run in Administrator PowerShell:
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Update-AppServer-Now.ps1
$ErrorActionPreference = "Stop"
$Root = "C:\RPM-Assure"
$Pack = "C:\RPM-Assure\deploy\ui-pack"
$App = "C:\RPM-Assure\App"
$Repo = "https://github.com/KirkSweet1980/rpm-assure-ui-pack.git"
$Svc = "RPMAssure-App"

function W([string]$m) { Write-Host $m }
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "Open a NEW Administrator PowerShell and run again." }

$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
$git = $null
if (Get-Command git -EA SilentlyContinue) { $git = (Get-Command git).Source }
if (-not $git -and (Test-Path "C:\Program Files\Git\cmd\git.exe")) { $git = "C:\Program Files\Git\cmd\git.exe" }
if (-not $git) { throw "Install Git for Windows first." }

W "========================================"
W " RPM Assure - App server update"
W "========================================"
W ("git = " + $git)

New-Item -ItemType Directory -Force -Path (Join-Path $Root "deploy") | Out-Null
if (Test-Path "$Pack\.git\index.lock") { Remove-Item "$Pack\.git\index.lock" -Force -EA SilentlyContinue }

$got = $false
if (Test-Path "$Pack\.git") {
  W "git fetch + reset..."
  & $git -C $Pack -c core.longpaths=true fetch --all --prune
  & $git -C $Pack -c core.longpaths=true reset --hard origin/main
  if ($LASTEXITCODE -eq 0 -and (Test-Path "$Pack\App\src\routes\index.tsx")) { $got = $true }
}
if (-not $got) {
  W "git clone (fresh)..."
  if (Test-Path $Pack) {
    cmd /c ("rmdir /s /q `"" + $Pack + "`"") | Out-Null
  }
  New-Item -ItemType Directory -Force -Path (Join-Path $Root "deploy") | Out-Null
  & $git -c core.longpaths=true clone --depth 1 --branch main $Repo $Pack
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path "$Pack\App\src\routes\index.tsx")) {
    throw "git clone failed. Close Explorer on C:\RPM-Assure\deploy and retry."
  }
}

$head = (& $git -C $Pack log -1 --oneline)
W ("HEAD " + $head)

if (Get-Service $Svc -EA SilentlyContinue) {
  W ("Stop " + $Svc)
  Stop-Service $Svc -Force -EA SilentlyContinue
  Start-Sleep 2
}

if (-not (Test-Path $App)) { throw ("Missing " + $App) }
W "Copy App\src + public from git..."
New-Item -ItemType Directory -Force -Path (Join-Path $App "src"), (Join-Path $App "public") | Out-Null
robocopy (Join-Path $Pack "App\src") (Join-Path $App "src") /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw ("robocopy src failed " + $LASTEXITCODE) }
if (Test-Path (Join-Path $Pack "App\public")) {
  robocopy (Join-Path $Pack "App\public") (Join-Path $App "public") /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

foreach ($rel in @("Sql\agent", "Sql\central", "Sql\ops")) {
  $from = Join-Path $Pack $rel
  if (Test-Path $from) {
    $to = Join-Path $Root $rel
    New-Item -ItemType Directory -Force -Path $to | Out-Null
    W ("Copy " + $rel)
    robocopy $from $to /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  }
}

Copy-Item (Join-Path $Pack "deploy\Update-AppServer-Now.ps1") (Join-Path $Root "deploy\Update-AppServer-Now.ps1") -Force -EA SilentlyContinue
Copy-Item (Join-Path $Pack "deploy\Update-AppServer.ps1") (Join-Path $Root "deploy\Update-AppServer.ps1") -Force -EA SilentlyContinue

if (Get-Service $Svc -EA SilentlyContinue) {
  Start-Service $Svc
  Start-Sleep 4
  W ($Svc + " = " + (Get-Service $Svc).Status)
}

W "========================================"
W " UPDATED"
W (" HEAD : " + $head)
W " Hard-refresh the browser (Ctrl+F5)."
W " Expect: wider EcoSystem / RPM Services rail + static centered right-pane heading."
W "========================================"
