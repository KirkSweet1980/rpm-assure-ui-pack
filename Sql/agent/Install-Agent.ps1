# Install RPM Assure Edge Agent on THIS server.
# Run as Administrator on customer SYSPRO host (or any host that should push jobs).
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Agent.ps1
param(
  [string]$AgentRoot = "C:\RPM-Assure\Agent",
  [string]$SourceDir = "",
  [int]$CycleMinutes = 5,
  [switch]$RunNow
)

$ErrorActionPreference = "Stop"
if (-not $SourceDir) {
  $SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}

Write-Host "=== Install RPM Assure Edge Agent ===" -ForegroundColor Cyan
Write-Host "Source: $SourceDir"
Write-Host "Target: $AgentRoot"

New-Item -ItemType Directory -Force -Path $AgentRoot, (Join-Path $AgentRoot "logs"), (Join-Path $AgentRoot "jobs") | Out-Null

Copy-Item (Join-Path $SourceDir "RpmAssure-Agent.ps1") (Join-Path $AgentRoot "RpmAssure-Agent.ps1") -Force
if (Test-Path (Join-Path $SourceDir "Agent.Config.example.ps1")) {
  Copy-Item (Join-Path $SourceDir "Agent.Config.example.ps1") (Join-Path $AgentRoot "Agent.Config.example.ps1") -Force
}
if (Test-Path (Join-Path $SourceDir "README.md")) {
  Copy-Item (Join-Path $SourceDir "README.md") (Join-Path $AgentRoot "README.md") -Force
}

$cfg = Join-Path $AgentRoot "Agent.Config.ps1"
if (-not (Test-Path $cfg)) {
  $ex = Join-Path $AgentRoot "Agent.Config.example.ps1"
  if (Test-Path $ex) {
    Copy-Item $ex $cfg -Force
    Write-Host "Created $cfg from example - EDIT passwords and CustomerCode before first run" -ForegroundColor Yellow
  } else {
    throw "Missing Agent.Config.ps1 and no example"
  }
} else {
  Write-Host "Keeping existing $cfg" -ForegroundColor Green
}

# Prefer customer collect config if present
$guess = @(
  "C:\RPM-Assure\Sql\customers\*\Customer.Config.ps1"
) | ForEach-Object { Get-Item $_ -EA SilentlyContinue } | Select-Object -First 1
if ($guess) {
  Write-Host "Found collect config: $($guess.FullName)" -ForegroundColor Cyan
  Write-Host "Ensure Agent.Config.ps1 CustomerCode matches and SqlRoot points at C:\RPM-Assure\Sql"
}

$runner = Join-Path $AgentRoot "RpmAssure-Agent.ps1"
$taskName = "RPMAssure-Edge-Agent"
$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $runner + '" -AgentRoot "' + $AgentRoot + '"'

if ($CycleMinutes -lt 5) { $CycleMinutes = 5 }

cmd.exe /c ("schtasks /Delete /TN `"" + $taskName + "`" /F >nul 2>&1") | Out-Null
$create = 'schtasks /Create /F /TN "' + $taskName + '" /TR "' + $tr + '" /SC MINUTE /MO ' + $CycleMinutes + ' /RU SYSTEM /RL HIGHEST'
cmd.exe /c $create
if ($LASTEXITCODE -ne 0) {
  throw "schtasks create failed - run as Administrator. exit=$LASTEXITCODE"
}

try {
  icacls $AgentRoot /grant "SYSTEM:(OI)(CI)(F)" "Administrators:(OI)(CI)(F)" 2>$null | Out-Null
} catch {}

Write-Host ""
Write-Host "=== INSTALLED ===" -ForegroundColor Green
Write-Host "  Task:   $taskName every $CycleMinutes min"
Write-Host "  Agent:  $runner"
Write-Host "  Config: $cfg"
Write-Host "  Logs:   $AgentRoot\logs"
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "  1) Edit Agent.Config.ps1 (CustomerCode, central SQL password)"
Write-Host "  2) Apply central schema once: Sql\agent\470_Ensure_Agent_Tables.sql"
Write-Host "  3) Start-ScheduledTask -TaskName '$taskName'"
Write-Host "  4) Proof: SELECT * FROM dbo.vw_Agent_Status_Latest"

if ($RunNow) {
  Write-Host "Running once now..." -ForegroundColor Cyan
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runner -AgentRoot $AgentRoot
}

Get-ScheduledTask -TaskName $taskName -EA SilentlyContinue | Format-Table TaskName, State -AutoSize
Write-Host "=== Done ===" -ForegroundColor Green
