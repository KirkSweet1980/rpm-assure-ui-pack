# Local Windows Defender exclusion for C:\RPM-Assure. Bitdefender is GravityZone policy only —
# do not call product.console.exe (it hangs the agent loop waiting on stdin).
# ASCII only.
param([string]$Root = 'C:\RPM-Assure')

$ErrorActionPreference = 'Continue'
$logDir = Join-Path $Root 'Agent\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'exclusion.log'
function W([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content $log $line
  Write-Host $line
}

$stamp = Join-Path $logDir 'exclusion.ok'
if (Test-Path $stamp) {
  try {
    $t = [datetime]::Parse((Get-Content $stamp -Raw).Trim(), [Globalization.CultureInfo]::InvariantCulture)
    if (((Get-Date).ToUniversalTime() - $t.ToUniversalTime()).TotalHours -lt 12) { return }
  } catch {}
}

try {
  if (Get-Command Add-MpPreference -EA SilentlyContinue) {
    Add-MpPreference -ExclusionPath $Root -ErrorAction Stop
    W ('Defender ExclusionPath=' + $Root)
  } else {
    W 'Defender Add-MpPreference not present'
  }
} catch {
  W ('Defender warn ' + $_.Exception.Message)
}

W 'Bitdefender exclusions come from GravityZone policy (no local product.console).'
[IO.File]::WriteAllText($stamp, [datetime]::UtcNow.ToString('o'))
