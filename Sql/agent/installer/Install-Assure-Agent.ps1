# RPM Assure Edge Agent - unattended install engine (called by the wizard).
# ASCII only. Run as Administrator on the customer SYSPRO SQL host.
param(
  [string]$ConfigFile = "",
  [string]$CustomerCode = "",
  [string]$DisplayName = "",
  [string]$SqlHost = "",
  [string]$InstanceName = "",
  [ValidateSet("Windows", "Sql")][string]$LocalAuth = "Windows",
  [string]$LocalSqlUser = "",
  [string]$LocalSqlPassword = "",
  [string]$CentralDataSource = "102.222.21.220,14333",
  [string]$CentralDatabase = "RPMAssure_App",
  [string]$CentralSqlUser = "rpmassure",
  [string]$CentralSqlPassword = "",
  [string]$AdminPassword = "",
  [int]$CollectIntervalMin = 30,
  [int]$JobsIntervalMin = 1440,
  [switch]$InstallTray,
  [switch]$StartService,
  [switch]$RunOnce,
  [switch]$LockFiles,
  [switch]$SkipGit,
  [string]$RepoUrl = "https://github.com/KirkSweet1980/rpm-assure-ui-pack.git",
  [string]$Root = "C:\RPM-Assure"
)

$ErrorActionPreference = "Stop"

if ($ConfigFile -and (Test-Path -LiteralPath $ConfigFile)) {
  $j = Get-Content -LiteralPath $ConfigFile -Raw | ConvertFrom-Json
  if ($j.CustomerCode) { $CustomerCode = [string]$j.CustomerCode }
  if ($j.DisplayName) { $DisplayName = [string]$j.DisplayName }
  if ($j.SqlHost) { $SqlHost = [string]$j.SqlHost }
  if ($j.InstanceName) { $InstanceName = [string]$j.InstanceName }
  if ($j.LocalAuth) { $LocalAuth = [string]$j.LocalAuth }
  if ($j.LocalSqlUser) { $LocalSqlUser = [string]$j.LocalSqlUser }
  if ($j.LocalSqlPassword) { $LocalSqlPassword = [string]$j.LocalSqlPassword }
  if ($j.CentralDataSource) { $CentralDataSource = [string]$j.CentralDataSource }
  if ($j.CentralDatabase) { $CentralDatabase = [string]$j.CentralDatabase }
  if ($j.CentralSqlUser) { $CentralSqlUser = [string]$j.CentralSqlUser }
  if ($j.CentralSqlPassword) { $CentralSqlPassword = [string]$j.CentralSqlPassword }
  if ($j.AdminPassword) { $AdminPassword = [string]$j.AdminPassword }
  if ($j.CollectIntervalMin) { $CollectIntervalMin = [int]$j.CollectIntervalMin }
  if ($j.JobsIntervalMin) { $JobsIntervalMin = [int]$j.JobsIntervalMin }
  if ($j.PSObject.Properties.Name -contains "InstallTray") { $InstallTray = [bool]$j.InstallTray }
  if ($j.PSObject.Properties.Name -contains "StartService") { $StartService = [bool]$j.StartService }
  if ($j.PSObject.Properties.Name -contains "RunOnce") { $RunOnce = [bool]$j.RunOnce }
  if ($j.PSObject.Properties.Name -contains "LockFiles") { $LockFiles = [bool]$j.LockFiles }
  if ($j.PSObject.Properties.Name -contains "SkipGit") { $SkipGit = [bool]$j.SkipGit }
}

$ErrorActionPreference = "Stop"
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw "Run as Administrator on the customer SYSPRO SQL server." }

$CustomerCode = $CustomerCode.Trim().ToUpperInvariant()
if ($CustomerCode -notmatch '^[A-Z0-9]{2,20}$') { throw "Customer code must be 2-20 A-Z / 0-9." }
if ([string]::IsNullOrWhiteSpace($DisplayName)) { $DisplayName = $CustomerCode }
if ([string]::IsNullOrWhiteSpace($SqlHost)) { $SqlHost = $env:COMPUTERNAME }
if ([string]::IsNullOrWhiteSpace($InstanceName)) { $InstanceName = $SqlHost }
if ([string]::IsNullOrWhiteSpace($AdminPassword) -or $AdminPassword.Length -lt 8) {
  throw "Agent admin password must be at least 8 characters."
}
if ([string]::IsNullOrWhiteSpace($CentralSqlPassword)) { throw "Central SQL password is required." }
if (-not $ConfigFile) {
  if (-not $PSBoundParameters.ContainsKey("InstallTray")) { $InstallTray = $true }
  if (-not $PSBoundParameters.ContainsKey("StartService")) { $StartService = $true }
}

function W([string]$m) {
  Write-Host $m
  try { [Console]::Out.Flush() } catch {}
  try {
    $pf = "C:\RPM-Assure\Agent\logs\wizard-install.log"
    $dir = Split-Path $pf
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    Add-Content -LiteralPath $pf -Value $m -Encoding ASCII
  } catch {}
}

function Find-Git {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
  $g = Get-Command git -EA SilentlyContinue
  if ($g) { return $g.Source }
  foreach ($p in @("C:\Program Files\Git\cmd\git.exe", "C:\Program Files (x86)\Git\cmd\git.exe")) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

function Ensure-Git {
  $git = Find-Git
  if ($git) { return $git }
  W "Installing Git for Windows..."
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $tmp = Join-Path $env:TEMP "Git-64-bit.exe"
  Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe" -OutFile $tmp
  Start-Process -FilePath $tmp -ArgumentList "/VERYSILENT", "/NORESTART", "/NOCANCEL", "/SP-" -Wait
  $git = Find-Git
  if (-not $git) { throw "Git installed. Open a NEW Administrator window and run the wizard again." }
  return $git
}

function Invoke-GitQuiet {
  param([Parameter(Mandatory)][string]$GitExe, [Parameter(Mandatory)][string[]]$GitArgs)
  $env:GIT_TERMINAL_PROMPT = "0"
  $env:GCM_INTERACTIVE = "Never"
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $out = & $GitExe @GitArgs 2>&1
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  foreach ($line in @($out)) {
    $s = [string]$line
    if ($s.Trim()) { Write-Host $s }
  }
  return $code
}

function Ensure-Pack([string]$git) {
  $pack = "C:\RPM-Assure\deploy\ui-pack"
  New-Item -ItemType Directory -Force -Path "C:\RPM-Assure\deploy" | Out-Null
  $agentPs1 = Join-Path $pack "Sql\agent\RpmAssure-Agent.ps1"
  if (Test-Path -LiteralPath $agentPs1) {
    Write-Host "Pack already present - skip git (avoids hang)."
    return [string]$pack
  }
  $lock = Join-Path $pack ".git\index.lock"
  if (Test-Path -LiteralPath $lock) { Remove-Item -LiteralPath $lock -Force -EA SilentlyContinue }
  $ok = $false
  if (Test-Path -LiteralPath (Join-Path $pack ".git")) {
    [void](Invoke-GitQuiet -GitExe $git -GitArgs @("-C", $pack, "fetch", "--all", "--prune"))
    $rc = Invoke-GitQuiet -GitExe $git -GitArgs @("-C", $pack, "reset", "--hard", "origin/main")
    if ($rc -eq 0 -and (Test-Path -LiteralPath $agentPs1)) { $ok = $true }
  }
  if (-not $ok) {
    throw "ui-pack missing Sql\agent. Run git reset on the app/SQL host first, then Finish again. Do not wait on this window."
  }
  return [string]$pack
}

try {
  $pf0 = "C:\RPM-Assure\Agent\logs\wizard-install.log"
  New-Item -ItemType Directory -Force -Path (Split-Path $pf0) | Out-Null
  Set-Content -LiteralPath $pf0 -Value "" -Encoding ASCII
} catch {}

W "========================================"
W " RPM Assure Edge Agent  |  $CustomerCode"
W "========================================"

$pack = "C:\RPM-Assure\deploy\ui-pack"
if (-not (Test-Path -LiteralPath (Join-Path $pack "Sql\agent\RpmAssure-Agent.ps1"))) {
  throw "Pack missing $pack\Sql\agent. Update the pack on this host first."
}
W "Using local pack (no git during install)."

function Get-InstallCover([string]$Code) {
  $out = @{ syspro = $true; rmm = $false; cove = $false; epp = $false; csp = $false }
  try {
    $n = $CentralDataSource
    if ($n -match ':(\d+)$' -and $n -notmatch '\\') { $n = $n -replace ':(\d+)$', ',$1' }
    $cs = "Data Source=$n;Initial Catalog=$CentralDatabase;User ID=$CentralSqlUser;Password=$CentralSqlPassword;Connect Timeout=8;Encrypt=True;TrustServerCertificate=True;"
    $cn = New-Object System.Data.SqlClient.SqlConnection $cs
    $cn.Open()
    $cmd = $cn.CreateCommand()
    $cmd.CommandTimeout = 15
    $safe = $Code.Replace("'", "''")
    $cmd.CommandText = @"
SELECT
  ISNULL(CAST(a.PillarSyspro AS int), -1) AS S,
  ISNULL(CAST(a.PillarPulseway AS int), -1) AS R,
  ISNULL(CAST(a.PillarCove AS int), -1) AS C,
  ISNULL(CAST(a.PillarBitdefender AS int), -1) AS E,
  ISNULL(CAST(a.PillarCsp AS int), -1) AS M,
  ISNULL(c.SqlInstanceName, N'') AS Inst
FROM dbo.Dim_Customer c WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer_AmsConfig a WITH (NOLOCK) ON a.CustomerCode = c.CustomerCode
WHERE c.CustomerCode = N'$safe'
"@
    $rd = $cmd.ExecuteReader()
    if ($rd.Read()) {
      $s = [int]$rd.GetValue(0)
      $out.syspro = $(if ($s -eq 0) { $false } elseif ($s -eq 1) { $true } else { [bool]$InstanceName })
      $out.rmm = ([int]$rd.GetValue(1) -eq 1)
      $out.cove = ([int]$rd.GetValue(2) -eq 1)
      $out.epp = ([int]$rd.GetValue(3) -eq 1)
      $out.csp = ([int]$rd.GetValue(4) -eq 1)
    }
    $rd.Close(); $cn.Close(); $cn.Dispose()
  } catch {
    W ("Cover lookup failed (assume SYSPRO if instance set): " + $_.Exception.Message)
    $out.syspro = [bool]$InstanceName
  }
  return $out
}

$cover = Get-InstallCover $CustomerCode
$tags = @()
if ($cover.syspro) { $tags += "syspro" }
if ($cover.rmm) { $tags += "rmm" }
if ($cover.cove) { $tags += "cove" }
if ($cover.epp) { $tags += "epp" }
if ($cover.csp) { $tags += "csp" }
if (-not $tags.Count) { $tags = @("agent") }
$RoleTags = ($tags -join ",")
W ("Cover syspro=$($cover.syspro) rmm=$($cover.rmm) cove=$($cover.cove) epp=$($cover.epp) csp=$($cover.csp) roles=$RoleTags")

$from = Join-Path $pack "Sql\agent"
$agentRoot = Join-Path $Root "Agent"
$sqlRoot = Join-Path $Root "Sql"
$custDir = Join-Path $sqlRoot ("customers\" + $CustomerCode)
New-Item -ItemType Directory -Force -Path $agentRoot, (Join-Path $agentRoot "logs"), (Join-Path $agentRoot "tools"), (Join-Path $agentRoot "tray"), $custDir, (Join-Path $sqlRoot "base\syspro-direct") | Out-Null

W "Stopping old Edge service so files are not locked..."
$oldE = $ErrorActionPreference
$ErrorActionPreference = "Continue"
Stop-Service RPMAssure-Edge -Force -EA SilentlyContinue
Get-Process nssm -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue
Start-Sleep -Seconds 1
$ErrorActionPreference = $oldE

W "Copying agent files..."
robocopy $from $agentRoot /E /XO /R:1 /W:1 /XF Agent.Secrets.bin Agent.Config.ps1 status.json request-sync.flag Update-Agent-From-Central.ps1 /XD logs /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
W "Copying sql agent files..."
robocopy $from (Join-Path $sqlRoot "agent") /E /XO /R:1 /W:1 /XF Update-Agent-From-Central.ps1 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
$baseSrc = Join-Path $pack "Sql\base\syspro-direct"
if ($cover.syspro -and (Test-Path $baseSrc)) {
  W "SYSPRO on cover - copying collect scripts..."
  robocopy $baseSrc (Join-Path $sqlRoot "base\syspro-direct") /E /XO /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
} else {
  W "No SYSPRO cover - not deploying SYSPRO collect scripts."
  $skipDir = Join-Path $sqlRoot "base\syspro-direct"
  if (Test-Path $skipDir) {
    Get-ChildItem $skipDir -Filter "*.ps1" -EA SilentlyContinue | ForEach-Object {
      W ("Leaving existing " + $_.Name + " unused (no cover)")
    }
  }
}
W "Copies done."

$custCfg = Join-Path $custDir "Customer.Config.ps1"
$custBody = @"
# Generated by Assure Agent Wizard. Passwords are NOT stored here.
`$CustomerCode = '$CustomerCode'
`$DisplayName = '$($DisplayName.Replace("'", "''"))'
`$InstanceName = '$($InstanceName.Replace("'", "''"))'
`$SqlHost = '$($SqlHost.Replace("'", "''"))'
`$LocalAuth = '$LocalAuth'
`$LocalSqlUser = '$($LocalSqlUser.Replace("'", "''"))'
`$CentralDataSource = '$($CentralDataSource.Replace("'", "''"))'
`$CentralDatabase = '$($CentralDatabase.Replace("'", "''"))'
`$CentralSqlUser = '$($CentralSqlUser.Replace("'", "''"))'
`$SqlRoot = '$sqlRoot'
`$AgentRoot = '$agentRoot'
"@
[IO.File]::WriteAllText($custCfg, $custBody, [Text.UTF8Encoding]::new($false))
W "Wrote $custCfg"

$cfgPath = Join-Path $agentRoot "Agent.Config.ps1"
$cfgBody = @"
# Non-secret agent settings. Passwords live in Agent.Secrets.bin (DPAPI).
`$CustomerCode = '$CustomerCode'
`$DisplayName = '$($DisplayName.Replace("'", "''"))'
`$InstanceName = '$($InstanceName.Replace("'", "''"))'
`$RoleTags = '$RoleTags'
`$CentralDataSource = '$($CentralDataSource.Replace("'", "''"))'
`$CentralDatabase = '$($CentralDatabase.Replace("'", "''"))'
`$CentralSqlUser = '$($CentralSqlUser.Replace("'", "''"))'
`$SqlRoot = '$sqlRoot'
`$AgentRoot = '$agentRoot'
`$LogDir = '$agentRoot\logs'
"@
[IO.File]::WriteAllText($cfgPath, $cfgBody, [Text.UTF8Encoding]::new($false))
W "Wrote $cfgPath"

$lib = Join-Path $agentRoot "Lib-SecureConfig.ps1"
. $lib
$script:RpmaAgentRoot = $agentRoot
W "Saving encrypted settings..."
Initialize-RpmaSecureStore -AdminPassword $AdminPassword -CentralSqlPassword $CentralSqlPassword -LocalSqlPassword $LocalSqlPassword -CentralDataSource $CentralDataSource -CentralDatabase $CentralDatabase -CentralSqlUser $CentralSqlUser
W "Encrypted settings saved."
$set = Get-RpmaAgentSettings
$set.collectIntervalMin = [int]$CollectIntervalMin
$set.jobsIntervalMin = [int]$JobsIntervalMin
$set.centralDataSource = $CentralDataSource
$set.centralDatabase = $CentralDatabase
$set.centralSqlUser = $CentralSqlUser
Save-RpmaAgentSettings $set
W "Secrets saved (folder not locked during install)."

$install = Join-Path $agentRoot "Install-Agent-Service.ps1"
if (-not (Test-Path $install)) { throw "Missing $install" }
$svcArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $install, "-AgentRoot", $agentRoot, "-SqlRoot", $sqlRoot)
if ($RunOnce) { $svcArgs += "-RunOnce" }
W "Installing Windows service..."
& powershell.exe @svcArgs
W "Service installer returned."
if (-not $StartService) {
  Stop-Service RPMAssure-Edge -Force -EA SilentlyContinue
}

if ($InstallTray) {
  W "Installing tray icon..."
  $tray = Join-Path $agentRoot "Install-Agent-Tray.ps1"
  if (Test-Path $tray) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $tray -AgentRoot $agentRoot
  }
  W "Tray done."
}

$svc = Get-Service RPMAssure-Edge -EA SilentlyContinue
W "========================================"
W (" Customer : " + $DisplayName + " (" + $CustomerCode + ")")
W (" Host     : " + $env:COMPUTERNAME)
W (" Instance : " + $InstanceName)
W (" Service  : " + $(if ($svc) { $svc.Status } else { "not installed" }))
W (" Settings : password-protected (Set-AgentSettings.ps1)")
W (" Files    : SYSTEM + Administrators only")
W "========================================"
