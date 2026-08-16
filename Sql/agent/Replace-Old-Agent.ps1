# Remove the old Edge agent, pull the new wizard pack, open the short installer.
# Run as Administrator on the customer SQL host.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\Sql\agent\Replace-Old-Agent.ps1
$ErrorActionPreference = "Stop"
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw "Open a NEW Administrator PowerShell and run this again." }

function W([string]$m) { Write-Host $m }

$Root = "C:\RPM-Assure"
$Agent = Join-Path $Root "Agent"
$Pack = Join-Path $Root "deploy\ui-pack"
$Repo = "https://github.com/KirkSweet1980/rpm-assure-ui-pack.git"

W "========================================"
W " RPM Assure - replace old agent"
W "========================================"

# --- 1. Stop tray / leftover collect tasks ---
W "Stopping tray and old scheduled tasks..."
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -EA SilentlyContinue |
  Where-Object { $_.CommandLine -match 'Start-Agent-Tray|RpmAssure-Agent' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -EA SilentlyContinue }
foreach ($tn in @(
  "RPMAssure-Edge-Tray",
  "RPMAssure-App-OnStart"
)) {
  cmd.exe /c ('schtasks /Delete /TN "' + $tn + '" /F >nul 2>&1') | Out-Null
}
Get-ScheduledTask -EA SilentlyContinue |
  Where-Object { $_.TaskName -like "RPMAssure-*-SysproCollect" -or $_.TaskName -like "RPMAssure-Edge*" } |
  ForEach-Object {
    Unregister-ScheduledTask -TaskName $_.TaskName -Confirm:$false -EA SilentlyContinue
    W ("  removed task " + $_.TaskName)
  }

# --- 2. Remove Windows service ---
W "Removing service RPMAssure-Edge..."
$nssm = $null
foreach ($p in @(
  (Join-Path $Agent "tools\nssm.exe"),
  (Join-Path $Root "Tools\nssm.exe")
)) { if (Test-Path $p) { $nssm = $p; break } }
$oldE = $ErrorActionPreference
$ErrorActionPreference = "Continue"
if (Get-Service RPMAssure-Edge -EA SilentlyContinue) {
  if ($nssm) {
    & $nssm stop RPMAssure-Edge confirm 2>$null | Out-Null
    Start-Sleep 2
    & $nssm remove RPMAssure-Edge confirm 2>$null | Out-Null
  }
  Stop-Service RPMAssure-Edge -Force -EA SilentlyContinue
  sc.exe delete RPMAssure-Edge | Out-Null
  Start-Sleep 2
}
$ErrorActionPreference = $oldE
if (Get-Service RPMAssure-Edge -EA SilentlyContinue) {
  W "WARN: service still listed - reboot this SQL host if install then fails"
} else {
  W "Service removed"
}

# --- 3. Unlock and remove old Agent folder (keep a backup of config) ---
W "Clearing old Agent folder..."
$keep = Join-Path $env:TEMP ("rpma-old-agent-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Force -Path $keep | Out-Null
foreach ($f in @("Agent.Config.ps1", "Agent.Settings.json", "VERSION")) {
  $src = Join-Path $Agent $f
  if (Test-Path $src) { Copy-Item $src $keep -Force -EA SilentlyContinue }
}
if (Test-Path $Agent) {
  takeown /F $Agent /R /D Y | Out-Null
  icacls $Agent /grant Administrators:F /T /C /Q | Out-Null
  Get-ChildItem $Agent -Recurse -Force -EA SilentlyContinue | ForEach-Object {
    try { $_.Attributes = "Normal" } catch {}
  }
  Remove-Item $Agent -Recurse -Force -EA SilentlyContinue
}
if (Test-Path $Agent) { W "WARN: some agent files still locked (Defender). Installer will overwrite." }
else { W "Old agent files removed. Backup: $keep" }

# --- 4. Git + latest wizard pack ---
W "Updating pack from Git..."
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
$git = $null
if (Get-Command git -EA SilentlyContinue) { $git = (Get-Command git).Source }
if (-not $git -and (Test-Path "C:\Program Files\Git\cmd\git.exe")) { $git = "C:\Program Files\Git\cmd\git.exe" }
if (-not $git) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $tmp = Join-Path $env:TEMP "Git-64-bit.exe"
  Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe" -OutFile $tmp
  Start-Process -FilePath $tmp -ArgumentList "/VERYSILENT", "/NORESTART", "/NOCANCEL", "/SP-" -Wait
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
  $git = "C:\Program Files\Git\cmd\git.exe"
}
if (-not (Test-Path $git)) { throw "Git is not available. Install Git for Windows and re-run." }

New-Item -ItemType Directory -Force -Path (Join-Path $Root "deploy") | Out-Null
if (Test-Path (Join-Path $Pack ".git")) {
  if (Test-Path (Join-Path $Pack ".git\index.lock")) { Remove-Item (Join-Path $Pack ".git\index.lock") -Force }
  & $git -C $Pack fetch --all --prune
  & $git -C $Pack reset --hard origin/main
} else {
  if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
  & $git clone --depth 1 --branch main $Repo $Pack
}

$wiz = Join-Path $Pack "Sql\agent\installer\Install-Customer-Pack-Wizard.ps1"
$cmd = Join-Path $Pack "Sql\agent\installer\Start-Customer-Pack.cmd"
if (-not (Test-Path $wiz)) { throw "New wizard missing after git: $wiz" }

# --- 5. Pre-fill Customer.Package.json from existing onboard config ---
$stage = Join-Path $Root "deploy\customer-agent-pack"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null
Copy-Item $wiz (Join-Path $stage "Install-Customer-Pack-Wizard.ps1") -Force
Copy-Item $cmd (Join-Path $stage "Start-Agent.cmd") -Force
$ens = Join-Path $Pack "Sql\agent\installer\Ensure-Collect-And-Central.ps1"
if (Test-Path $ens) { Copy-Item $ens (Join-Path $stage "Ensure-Collect-And-Central.ps1") -Force }

$code = ""
$name = ""
$hostName = $env:COMPUTERNAME
$centralHost = "102.222.21.220,14333"
$centralDb = "RPMAssure_App"
$centralUser = "rpmassure"
$centralPass = "@ssuR3me!"
$cfg = Get-ChildItem (Join-Path $Root "Sql\customers") -Filter "Customer.Config.ps1" -Recurse -EA SilentlyContinue | Select-Object -First 1
if ($cfg) {
  . $cfg.FullName
  if ($CustomerCode) { $code = [string]$CustomerCode }
  if ($DisplayName) { $name = [string]$DisplayName }
  if ($InstanceName) { $hostName = [string]$InstanceName }
  if ($SqlHost) { $hostName = [string]$SqlHost }
  if ($CentralDataSource) { $centralHost = [string]$CentralDataSource }
  if ($CentralDatabase) { $centralDb = [string]$CentralDatabase }
  if ($CentralSqlUser) { $centralUser = [string]$CentralSqlUser }
  if ($CentralSqlPassword) { $centralPass = [string]$CentralSqlPassword }
}
if (-not $code) { $code = Read-Host "Customer code (e.g. SIRF)" }
$code = $code.Trim().ToUpperInvariant()
if (-not $name) { $name = $code }

$pkg = [ordered]@{
  customerCode       = $code
  displayName        = $name
  sqlHost            = $hostName
  instanceName       = $hostName
  localAuth          = "Windows"
  centralDataSource  = $centralHost
  centralDatabase    = $centralDb
  centralSqlUser     = $centralUser
  centralSqlPassword = $centralPass
}
($pkg | ConvertTo-Json) | Set-Content -LiteralPath (Join-Path $stage "Customer.Package.json") -Encoding UTF8
W ("Pack staged for " + $name + " (" + $code + ") -> " + $stage)

# --- 6. Open new wizard ---
W "Opening new wizard (Next, Test connection, password, Finish)..."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $stage "Install-Customer-Pack-Wizard.ps1")
W "=== Done ==="
