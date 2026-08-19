# Apply-Server-Firewall.ps1
# App server: pull ui-pack, copy firewall UI + API + schema, restart RPMAssure-App.
# Run in Administrator PowerShell on RPMWINRM.

$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure'
$Pack = Join-Path $Root 'deploy\ui-pack'
$App = Join-Path $Root 'App'
$Repo = 'https://github.com/KirkSweet1980/rpm-assure-ui-pack.git'
$Svc = 'RPMAssure-App'

function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run this in an Administrator PowerShell.' }

$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
  foreach ($p in @('C:\Program Files\Git\cmd\git.exe', 'C:\Program Files (x86)\Git\cmd\git.exe')) {
    if (Test-Path $p) { $git = @{ Source = $p }; break }
  }
}
if (-not $git) { throw 'Git is not installed.' }
$GitExe = [string]$git.Source

function Invoke-Git([string[]]$GitArgs) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $out = & $GitExe @GitArgs 2>&1
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  foreach ($line in @($out)) { if ("$line".Trim()) { Write-Host $line } }
  return $code
}

W Cyan '=== RPM Assure - Server firewall pane ==='
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null
if (Test-Path (Join-Path $Pack '.git')) {
  W Cyan "git fetch/reset $Pack"
  [void](Invoke-Git @('-C', $Pack, 'fetch', '--all', '--prune'))
  $rc = Invoke-Git @('-C', $Pack, 'reset', '--hard', 'origin/main')
  if ($rc -ne 0) { throw 'git reset failed' }
} else {
  W Cyan "git clone $Repo"
  if (Test-Path $Pack) { Remove-Item $Pack -Recurse -Force }
  $rc = Invoke-Git @('clone', '--depth', '1', '--branch', 'main', $Repo, $Pack)
  if ($rc -ne 0) { throw 'git clone failed' }
}

$srcRoot = $Pack
if (Test-Path (Join-Path $Pack 'App\src\routes\index.tsx')) { $srcRoot = Join-Path $Pack 'App' }

$pairs = @(
  @{ From = 'src\routes\api\firewall.ts'; To = 'src\routes\api\firewall.ts' },
  @{ From = 'src\routeTree.gen.ts'; To = 'src\routeTree.gen.ts' },
  @{ From = 'src\components\customer\customer-sections.tsx'; To = 'src\components\customer\customer-sections.tsx' },
  @{ From = 'src\lib\data\types.ts'; To = 'src\lib\data\types.ts' },
  @{ From = 'src\lib\data\live-portfolio.ts'; To = 'src\lib\data\live-portfolio.ts' },
  @{ From = 'src\lib\data\demo-portfolio.ts'; To = 'src\lib\data\demo-portfolio.ts' }
)
foreach ($p in $pairs) {
  $from = Join-Path $srcRoot $p.From
  if (-not (Test-Path $from)) { $from = Join-Path $Pack $p.From }
  if (-not (Test-Path $from)) { throw "Missing in pack: $($p.From)" }
  $to = Join-Path $App $p.To
  New-Item -ItemType Directory -Force -Path (Split-Path $to -Parent) | Out-Null
  Copy-Item -LiteralPath $from -Destination $to -Force
  W Green ("Copied " + $p.To)
}

$fwPs1 = Join-Path $Pack 'sql\rmm\pulseway\Pulseway-Collect-Firewall.ps1'
if (-not (Test-Path $fwPs1)) { $fwPs1 = Join-Path $Pack 'Sql\rmm\pulseway\Pulseway-Collect-Firewall.ps1' }
if (Test-Path $fwPs1) {
  $destFw = Join-Path $Root 'Sql\rmm\pulseway\Pulseway-Collect-Firewall.ps1'
  New-Item -ItemType Directory -Force -Path (Split-Path $destFw -Parent) | Out-Null
  Copy-Item -LiteralPath $fwPs1 -Destination $destFw -Force
  W Green 'Copied Pulseway-Collect-Firewall.ps1'
}

$agentFw = Join-Path $Pack 'sql\agent\Collect-Host-Firewall.ps1'
if (-not (Test-Path $agentFw)) { $agentFw = Join-Path $Pack 'Sql\agent\Collect-Host-Firewall.ps1' }
if (Test-Path $agentFw) {
  $destAg = Join-Path $Root 'Sql\agent\Collect-Host-Firewall.ps1'
  New-Item -ItemType Directory -Force -Path (Split-Path $destAg -Parent) | Out-Null
  Copy-Item -LiteralPath $agentFw -Destination $destAg -Force
  W Green 'Copied Collect-Host-Firewall.ps1'
}

$agentMain = Join-Path $Pack 'sql\agent\RpmAssure-Agent.ps1'
if (-not (Test-Path $agentMain)) { $agentMain = Join-Path $Pack 'Sql\agent\RpmAssure-Agent.ps1' }
if (Test-Path $agentMain) {
  Copy-Item -LiteralPath $agentMain -Destination (Join-Path $Root 'Sql\agent\RpmAssure-Agent.ps1') -Force
  W Green 'Copied RpmAssure-Agent.ps1'
}

$sql = Join-Path $Pack 'sql\central\521_Agent_HostFirewall.sql'
if (-not (Test-Path $sql)) { $sql = Join-Path $Pack 'Sql\central\521_Agent_HostFirewall.sql' }
if (Test-Path $sql) {
  $sqlDest = Join-Path $Root 'Sql\central\521_Agent_HostFirewall.sql'
  New-Item -ItemType Directory -Force -Path (Split-Path $sqlDest -Parent) | Out-Null
  Copy-Item -LiteralPath $sql -Destination $sqlDest -Force
  $sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
  if (-not (Test-Path $sqlcmd)) { $sqlcmd = 'sqlcmd' }
  W Cyan '--- sqlcmd 521_Agent_HostFirewall ---'
  & $sqlcmd -S '.\RPMREPORTS' -d RPMAssure_App -E -C -b -i $sqlDest
  if ($LASTEXITCODE -eq 0) { W Green 'Agent_HostFirewall OK' } else { W Yellow 'sqlcmd warned - check output' }
} else {
  W Yellow '521_Agent_HostFirewall.sql not in pack'
}

Restart-Service -Name $Svc -Force
Start-Sleep -Seconds 4
W Green ($Svc + ' = ' + (Get-Service -Name $Svc).Status)
W Cyan 'UI is up. Ports appear after the first Pulseway / agent POST to /api/firewall.'
W Cyan 'Pulseway script: C:\RPM-Assure\Sql\rmm\pulseway\Pulseway-Collect-Firewall.ps1'
W Cyan 'Schedule hourly. Same secret as Disk IOPS (X-Assure-Secret).'
