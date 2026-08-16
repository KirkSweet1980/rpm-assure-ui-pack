# Kill hung wizard/install, stop service, copy without lock-wait, install service.
$ErrorActionPreference = "Continue"
Write-Host "Stopping hung installer / old agent..."
Get-Process powershell, powershell_ise -EA SilentlyContinue | ForEach-Object {
  if ($_.Id -eq $PID) { return }
  try {
    $cl = (Get-CimInstance Win32_Process -Filter ("ProcessId=" + $_.Id) -EA SilentlyContinue).CommandLine
    if ($cl -and ($cl -match "Install-Customer-Pack-Wizard|Install-Assure-Agent|Launch-Fresh|Test-Central|RpmAssure-Agent|Start-Agent-Tray")) {
      Stop-Process -Id $_.Id -Force -EA SilentlyContinue
    }
  } catch {}
}
Stop-Service RPMAssure-Edge -Force -EA SilentlyContinue
Get-Process nssm -EA SilentlyContinue | Stop-Process -Force -EA SilentlyContinue
Start-Sleep 1

$Pack = "C:\RPM-Assure\deploy\ui-pack"
$from = Join-Path $Pack "Sql\agent"
if (-not (Test-Path (Join-Path $from "RpmAssure-Agent.ps1"))) {
  throw "Missing $from\RpmAssure-Agent.ps1"
}

$agent = "C:\RPM-Assure\Agent"
$sql = "C:\RPM-Assure\Sql"
New-Item -ItemType Directory -Force -Path $agent, "$agent\logs", "$agent\tools", "$agent\tray", "$sql\base\syspro-direct" | Out-Null
Write-Host "Copying (1 retry, skip locked updater)..."
robocopy $from $agent /E /XO /R:1 /W:1 /XF Agent.Secrets.bin Agent.Config.ps1 status.json request-sync.flag Update-Agent-From-Central.ps1 /XD logs /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if (Test-Path "$Pack\Sql\base\syspro-direct") {
  robocopy "$Pack\Sql\base\syspro-direct" "$sql\base\syspro-direct" /E /XO /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

$install = Join-Path $agent "Install-Agent-Service.ps1"
Write-Host "Installing Windows service..."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $install -AgentRoot $agent -SqlRoot $sql
Get-Service RPMAssure-Edge -EA SilentlyContinue | Format-Table Name, Status, StartType -AutoSize
Write-Host "Done. Finish is not needed - service install ran here."
