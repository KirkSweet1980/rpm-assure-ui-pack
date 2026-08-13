# Schedule monthly estate board pack email (1st of month 07:15 local)
# Run as Administrator on the app host
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
$script = Join-Path $App 'scripts\send-monthly-report.mjs'
if (-not (Test-Path -LiteralPath $script)) {
  throw ('Missing ' + $script + ' - copy scripts from pack first')
}
$taskName = 'RPMAssure-MonthlyReport'
$tr = '"' + $Node + '" "' + $script + '"'
# Monthly on day 1 at 07:15
schtasks /Create /F /TN $taskName /TR $tr /SC MONTHLY /D 1 /ST 07:15 /RU SYSTEM /RL HIGHEST
Write-Host ('Task ' + $taskName + ' created (day 1, 07:15).') -ForegroundColor Green
Write-Host 'Test now:'
Write-Host ('  cd ' + $App)
Write-Host ('  $env:RPM_ASSURE_APP="' + $App + '"')
Write-Host ('  node .\scripts\send-monthly-report.mjs')
