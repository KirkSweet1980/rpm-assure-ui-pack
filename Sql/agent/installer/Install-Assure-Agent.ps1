# RPM Assure Edge Agent - unattended install engine (called by the wizard).
# ASCII only. Run as Administrator.
#
# Policy (2026-08):
# - Online / heartbeat NEVER depends on cover.
# - All collect scripts always deployed.
# - Detect SYSPRO / Pulseway / Bitdefender / Cove; enable cover (never clear).
# - No local SQL => no SYSPRO; local SQL config is optional (install must not fail).
param(
  [string]$ConfigFile = "",
  [string]$CustomerCode = "",
  [string]$DisplayName = "",
  [string]$SqlHost = "",
  [string]$InstanceName = "",
  [ValidateSet("Windows", "Sql", "")][string]$LocalAuth = "Windows",
  [string]$LocalSqlUser = "",
  [string]$LocalSqlPassword = "",
  [string]$CentralDataSource = "102.222.21.220,14333",
  [string]$CentralDatabase = "RPMAssure_App",
  [string]$CentralSqlUser = "rpmassure",
  [string]$CentralSqlPassword = "",
  [string]$AdminPassword = "",
  [int]$CollectIntervalMin = 2,
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

try {
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

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) { throw "Run as Administrator on the customer host." }

$CustomerCode = $CustomerCode.Trim().ToUpperInvariant()
if ($CustomerCode -notmatch '^[A-Z0-9]{2,20}$') { throw "Customer code must be 2-20 A-Z / 0-9." }
if ([string]::IsNullOrWhiteSpace($DisplayName)) { $DisplayName = $CustomerCode }
if ([string]::IsNullOrWhiteSpace($SqlHost)) { $SqlHost = $env:COMPUTERNAME }
if ([string]::IsNullOrWhiteSpace($InstanceName)) { $InstanceName = $SqlHost }
if ([string]::IsNullOrWhiteSpace($AdminPassword) -or $AdminPassword.Length -lt 8) {
  throw "Agent admin password must be at least 8 characters."
}
if ([string]::IsNullOrWhiteSpace($CentralSqlPassword)) { throw "Central SQL password is required (for heartbeat to Assure)." }
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
  $out = @{ syspro = $false; rmm = $false; cove = $false; epp = $false; csp = $false }
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
  ISNULL(CAST(a.PillarCsp AS int), -1) AS M
FROM dbo.Dim_Customer c WITH (NOLOCK)
LEFT JOIN dbo.Dim_Customer_AmsConfig a WITH (NOLOCK) ON a.CustomerCode = c.CustomerCode
WHERE c.CustomerCode = N'$safe'
"@
    $rd = $cmd.ExecuteReader()
    if ($rd.Read()) {
      $out.syspro = ([int]$rd.GetValue(0) -eq 1)
      $out.rmm = ([int]$rd.GetValue(1) -eq 1)
      $out.cove = ([int]$rd.GetValue(2) -eq 1)
      $out.epp = ([int]$rd.GetValue(3) -eq 1)
      $out.csp = ([int]$rd.GetValue(4) -eq 1)
    }
    $rd.Close(); $cn.Close(); $cn.Dispose()
  } catch {
    W ("Cover lookup failed (continuing): " + $_.Exception.Message)
  }
  return $out
}

$cover = Get-InstallCover $CustomerCode
W ("Central cover: syspro=$($cover.syspro) rmm=$($cover.rmm) cove=$($cover.cove) epp=$($cover.epp) csp=$($cover.csp)")

# ---- Local product detection ----
$local = @{ SqlPresent = $false; Syspro = $false; Pulseway = $false; Bitdefender = $false; Cove = $false; Details = @() }
try {
  $detectPs1 = Join-Path $pack 'Sql\agent\Detect-Local-Services.ps1'
  if (-not (Test-Path $detectPs1)) { $detectPs1 = 'C:\RPM-Assure\Sql\agent\Detect-Local-Services.ps1' }
  if (-not (Test-Path $detectPs1)) { $detectPs1 = 'C:\RPM-Assure\Agent\Detect-Local-Services.ps1' }
  if (Test-Path $detectPs1) {
    . $detectPs1
    $local = Get-RpmaLocalServices
    W "Local product scan:"
    W ("  SQL present  : " + $local.SqlPresent)
    W ("  SYSPRO       : " + $local.Syspro)
    W ("  Pulseway     : " + $local.Pulseway)
    W ("  Bitdefender  : " + $local.Bitdefender)
    W ("  Cove         : " + $local.Cove)
    foreach ($d in $local.Details) { W ("    - " + $d) }
    if (-not $local.Details.Count) { W '    (none detected on this host)' }
  } else {
    W 'WARN Detect-Local-Services.ps1 missing - skipping product scan'
  }
} catch {
  W ("WARN local product scan failed (continuing): " + $_.Exception.Message)
}

# No local SQL => never treat as SYSPRO host; local SQL config is optional
$needsLocalSql = [bool]$local.SqlPresent -and [bool]$local.Syspro
if (-not $local.SqlPresent) {
  W 'No SQL Server on this host - SYSPRO cover/config not required.'
  $local.Syspro = $false
  # Soften empty local SQL settings so they never block install
  if ([string]::IsNullOrWhiteSpace($LocalAuth)) { $LocalAuth = 'Windows' }
}

# Enable cover on central (soft-fail)
try {
  if ($local.Syspro -or $local.Pulseway -or $local.Bitdefender -or $local.Cove) {
    $enablePs1 = Join-Path $pack 'Sql\agent\Enable-Cover-From-Local.ps1'
    if (-not (Test-Path $enablePs1)) { $enablePs1 = 'C:\RPM-Assure\Sql\agent\Enable-Cover-From-Local.ps1' }
    if (-not (Test-Path $enablePs1)) { $enablePs1 = 'C:\RPM-Assure\Agent\Enable-Cover-From-Local.ps1' }
    if (Test-Path $enablePs1) {
      W 'Enabling cover on central from local products...'
      $oldEap = $ErrorActionPreference
      $ErrorActionPreference = 'Continue'
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $enablePs1 `
        -CustomerCode $CustomerCode `
        -CentralDataSource $CentralDataSource `
        -CentralDatabase $CentralDatabase `
        -CentralSqlUser $CentralSqlUser `
        -CentralSqlPassword $CentralSqlPassword `
        -Syspro:([bool]$local.Syspro) `
        -Pulseway:([bool]$local.Pulseway) `
        -Bitdefender:([bool]$local.Bitdefender) `
        -Cove:([bool]$local.Cove) `
        -AgentRoot (Join-Path $Root 'Agent') 2>&1 | ForEach-Object { W ([string]$_) }
      $ErrorActionPreference = $oldEap
    } else {
      W 'WARN Enable-Cover-From-Local.ps1 missing'
    }
    if ($local.Syspro) { $cover.syspro = $true }
    if ($local.Pulseway) { $cover.rmm = $true }
    if ($local.Cove) { $cover.cove = $true }
    if ($local.Bitdefender) { $cover.epp = $true }
  }
} catch {
  W ("WARN cover enable failed (install continues): " + $_.Exception.Message)
}

$tags = @('agent')
if ($cover.syspro) { $tags += 'syspro' }
if ($cover.rmm) { $tags += 'rmm' }
if ($cover.cove) { $tags += 'cove' }
if ($cover.epp) { $tags += 'epp' }
if ($cover.csp) { $tags += 'csp' }
$RoleTags = ($tags -join ',')
W ("RoleTags: $RoleTags")

$from = Join-Path $pack "Sql\agent"
$agentRoot = Join-Path $Root "Agent"
$sqlRoot = Join-Path $Root "Sql"
$custDir = Join-Path $sqlRoot ("customers\" + $CustomerCode)
New-Item -ItemType Directory -Force -Path $agentRoot, (Join-Path $agentRoot "logs"), (Join-Path $agentRoot "tools"), (Join-Path $agentRoot "tray"), $custDir, (Join-Path $sqlRoot "base\syspro-direct") | Out-Null

W "Stopping old Edge service so files are not locked..."
try {
  $oldE = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  Stop-Service RPMAssure-Edge -Force -EA SilentlyContinue
  Get-Process nssm -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue
  Start-Sleep -Seconds 1
  $ErrorActionPreference = $oldE
} catch {}

W "Copying agent files..."
try {
  robocopy $from $agentRoot /E /XO /R:1 /W:1 /XF Agent.Secrets.bin Agent.Config.ps1 status.json request-sync.flag Update-Agent-From-Central.ps1 /XD logs /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  robocopy $from (Join-Path $sqlRoot "agent") /E /XO /R:1 /W:1 /XF Update-Agent-From-Central.ps1 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  $baseSrc = Join-Path $pack "Sql\base\syspro-direct"
  if (Test-Path $baseSrc) {
    W "Deploying collect scripts (syspro-direct)."
    robocopy $baseSrc (Join-Path $sqlRoot "base\syspro-direct") /E /XO /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  }
  W "Copies done."
} catch {
  W ("WARN copy issue: " + $_.Exception.Message)
}

# Customer.Config - always write minimal identity; local SQL fields only when useful
$custCfg = Join-Path $custDir "Customer.Config.ps1"
if ($needsLocalSql) {
  $custBody = @"
# Generated by Assure Agent Wizard. Passwords are NOT stored here.
# Local SQL present - SYSPRO collect may use these.
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
} else {
  $custBody = @"
# Generated by Assure Agent Wizard. Passwords are NOT stored here.
# No local SQL / no SYSPRO on this host - identity only (heartbeat + host jobs).
`$CustomerCode = '$CustomerCode'
`$DisplayName = '$($DisplayName.Replace("'", "''"))'
`$InstanceName = '$($env:COMPUTERNAME.Replace("'", "''"))'
`$SqlHost = '$($env:COMPUTERNAME.Replace("'", "''"))'
`$LocalAuth = 'Windows'
`$LocalSqlUser = ''
`$CentralDataSource = '$($CentralDataSource.Replace("'", "''"))'
`$CentralDatabase = '$($CentralDatabase.Replace("'", "''"))'
`$CentralSqlUser = '$($CentralSqlUser.Replace("'", "''"))'
`$SqlRoot = '$sqlRoot'
`$AgentRoot = '$agentRoot'
"@
}
try {
  [IO.File]::WriteAllText($custCfg, $custBody, [Text.UTF8Encoding]::new($false))
  W "Wrote $custCfg"
} catch {
  W ("WARN could not write Customer.Config: " + $_.Exception.Message)
}

$cfgPath = Join-Path $agentRoot "Agent.Config.ps1"
$cfgBody = @"
# Non-secret agent settings. Passwords live in Agent.Secrets.bin (DPAPI).
# RoleTags informational; online = heartbeat only.
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

# Secrets - LocalSqlPassword optional when no local SQL
try {
  $lib = Join-Path $agentRoot "Lib-SecureConfig.ps1"
  if (-not (Test-Path $lib)) { throw "Missing $lib" }
  . $lib
  $script:RpmaAgentRoot = $agentRoot
  W "Saving encrypted settings..."
  $localPass = if ($needsLocalSql) { $LocalSqlPassword } else { '' }
  Initialize-RpmaSecureStore -AdminPassword $AdminPassword -CentralSqlPassword $CentralSqlPassword -LocalSqlPassword $localPass -CentralDataSource $CentralDataSource -CentralDatabase $CentralDatabase -CentralSqlUser $CentralSqlUser
  $set = Get-RpmaAgentSettings
  $set.collectIntervalMin = [int]$CollectIntervalMin
  $set.jobsIntervalMin = [int]$JobsIntervalMin
  $set.centralDataSource = $CentralDataSource
  $set.centralDatabase = $CentralDatabase
  $set.centralSqlUser = $CentralSqlUser
  Save-RpmaAgentSettings $set
  W "Secrets saved."
} catch {
  W ("ERROR saving secrets: " + $_.Exception.Message)
  throw
}

# Service install - soft-fail tray, hard-fail only if service script missing
try {
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
} catch {
  W ("ERROR service install: " + $_.Exception.Message)
  throw
}

try {
  if ($InstallTray) {
    W "Installing tray icon..."
    $tray = Join-Path $agentRoot "Install-Agent-Tray.ps1"
    if (Test-Path $tray) {
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $tray -AgentRoot $agentRoot
    }
    W "Tray done."
  }
} catch {
  W ("WARN tray install failed (agent service still OK): " + $_.Exception.Message)
}

$svc = Get-Service RPMAssure-Edge -EA SilentlyContinue
W "========================================"
W (" Customer : " + $DisplayName + " (" + $CustomerCode + ")")
W (" Host     : " + $env:COMPUTERNAME)
W (" SQL host : " + $(if ($local.SqlPresent) { 'yes' } else { 'no - SYSPRO not required' }))
W (" Instance : " + $(if ($needsLocalSql) { $InstanceName } else { '(n/a)' }))
W (" Service  : " + $(if ($svc) { $svc.Status } else { "not installed" }))
W (" Roles    : " + $RoleTags)
W (" Local    : SQL=$($local.SqlPresent) SYSPRO=$($local.Syspro) Pulseway=$($local.Pulseway) Bitdefender=$($local.Bitdefender) Cove=$($local.Cove)")
W (" Online   : heartbeat only")
W "========================================"

} catch {
  Write-Host ("INSTALL FAILED: " + $_.Exception.Message) -ForegroundColor Red
  try {
    Add-Content -LiteralPath "C:\RPM-Assure\Agent\logs\wizard-install.log" -Value ("FAILED: " + $_.Exception.Message) -Encoding ASCII
  } catch {}
  exit 1
}
exit 0
