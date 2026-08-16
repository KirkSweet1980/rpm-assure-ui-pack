# Kill hung wizard/install, install the Edge service WITHOUT git or first collect.
# Administrator PowerShell on the customer SQL host:
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\Sql\agent\installer\Finish-Agent-Now.ps1
$ErrorActionPreference = "Stop"
Write-Host "Stopping hung installer / wizard / old agent..."
Get-Process powershell, powershell_ise -EA SilentlyContinue | ForEach-Object {
  if ($_.Id -eq $PID) { return }
  try {
    $cl = (Get-CimInstance Win32_Process -Filter ("ProcessId=" + $_.Id) -EA SilentlyContinue).CommandLine
    if ($cl -and ($cl -match "Install-Customer-Pack-Wizard|Install-Assure-Agent|Launch-Fresh|Test-Central|RpmAssure-Agent|Start-Agent-Tray")) {
      Stop-Process -Id $_.Id -Force -EA SilentlyContinue
    }
  } catch {}
}
Get-Process nssm -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue

$Pack = "C:\RPM-Assure\deploy\ui-pack"
$from = Join-Path $Pack "Sql\agent"
if (-not (Test-Path (Join-Path $from "RpmAssure-Agent.ps1"))) {
  throw "Missing $from\RpmAssure-Agent.ps1 - git pull the pack first (do that in a NEW window, then re-run this)."
}

$agent = "C:\RPM-Assure\Agent"
$sql = "C:\RPM-Assure\Sql"
New-Item -ItemType Directory -Force -Path $agent, "$agent\logs", "$agent\tools", "$agent\tray", "$sql\base\syspro-direct" | Out-Null
robocopy $from $agent /E /XF Agent.Secrets.bin Agent.Config.ps1 status.json request-sync.flag /XD logs /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if (Test-Path "$Pack\Sql\base\syspro-direct") {
  robocopy "$Pack\Sql\base\syspro-direct" "$sql\base\syspro-direct" /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

$install = Join-Path $agent "Install-Agent-Service.ps1"
if (-not (Test-Path $install)) { throw "Missing $install" }
Write-Host "Installing Windows service (no first collect)..."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $install -AgentRoot $agent -SqlRoot $sql
$svc = Get-Service RPMAssure-Edge -EA SilentlyContinue
Write-Host ""
Write-Host "========================================"
Write-Host (" Service : " + $(if ($svc) { "$($svc.Status) $($svc.StartType)" } else { "MISSING" }))
Write-Host " Tray    : look next to the clock after logon"
Write-Host " Collect : runs on the service schedule (not now)"
Write-Host "========================================"
