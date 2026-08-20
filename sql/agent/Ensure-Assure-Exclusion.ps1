# Local exclusions for C:\RPM-Assure. Defender sticks. Bitdefender follows GravityZone policy
# (local add is overwritten unless the policy allows it). Safe to run every agent cycle.
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

$bd = @(
  "${env:ProgramFiles}\Bitdefender\Endpoint Security\product.console.exe",
  "${env:ProgramFiles(x86)}\Bitdefender\Endpoint Security\product.console.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($bd) {
  try {
    $out = & $bd /exclusions add folder $Root 2>&1 | Out-String
    W ('Bitdefender CLI ' + $out.Trim())
    W 'If policy-locked, GravityZone must exclude C:\RPM-Assure (On-Access + ATC).'
  } catch {
    W ('Bitdefender CLI warn ' + $_.Exception.Message)
  }
} else {
  W 'Bitdefender product.console.exe not on this host'
}

[IO.File]::WriteAllText($stamp, [datetime]::UtcNow.ToString('o'))
