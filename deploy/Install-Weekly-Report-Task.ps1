# Schedule weekly report email (Monday 07:00 SAST local time)
# Run as Administrator
$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) {
  $cand = @(
    'C:\Program Files\nodejs\node.exe',
    'C:\Nodejs\node.exe'
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $cand) { throw 'node.exe not found' }
  $Node = $cand
}
$script = Join-Path $App 'scripts\send-weekly-report.mjs'
if (-not (Test-Path -LiteralPath $script)) {
  throw ('Missing ' + $script + ' - copy scripts from pack first')
}
$taskName = 'RPMAssure-WeeklyReport'
$tr = '"' + $Node + '" "' + $script + '"'
# Monday 07:00
schtasks /Create /F /TN $taskName /TR $tr /SC WEEKLY /D MON /ST 07:00 /RU SYSTEM /RL HIGHEST
Write-Host ('Task ' + $taskName + ' created (MON 07:00).') -ForegroundColor Green
Write-Host 'Test now:'
Write-Host ('  cd ' + $App)
Write-Host ('  $env:RPM_ASSURE_APP="' + $App + '"')
Write-Host ('  node .\scripts\send-weekly-report.mjs')
