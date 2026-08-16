# Detect-Local-Services.ps1
# Local product discovery on the customer host.
# Used at agent install (and optionally each cycle) to enable cover when products are present.
# Policy: only ENABLE cover when found. Never clear cover from the agent (central evidence owns off).
#
# Returns hashtable:
#   Pulseway   = $true|$false
#   Bitdefender = $true|$false
#   Cove       = $true|$false
#   Details    = string[] of what matched

function Test-RpmaPath([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
  return (Test-Path -LiteralPath $Path -EA SilentlyContinue)
}

function Test-RpmaService([string[]]$Names) {
  foreach ($n in $Names) {
    $s = Get-Service -Name $n -EA SilentlyContinue
    if ($s) { return $true }
  }
  # wildcard-safe scan of a few known prefixes
  $all = Get-Service -EA SilentlyContinue
  foreach ($n in $Names) {
    if ($n -match '[\*\?]') {
      $hit = $all | Where-Object { $_.Name -like $n }
      if ($hit) { return $true }
    }
  }
  return $false
}

function Test-RpmaReg([string[]]$Paths) {
  foreach ($p in $Paths) {
    if (Test-Path -LiteralPath $p -EA SilentlyContinue) { return $true }
  }
  return $false
}

function Get-RpmaLocalServices {
  $details = New-Object System.Collections.Generic.List[string]
  $out = [ordered]@{
    Pulseway     = $false
    Bitdefender  = $false
    Cove         = $false
    Details      = @()
  }

  # ---- Pulseway / PC Monitor (RMM) ----
  $pwSvc = @('PCMonitorSvc', 'PulsewayService', 'Pulseway')
  $pwPaths = @(
    (Join-Path $env:ProgramFiles 'Pulseway'),
    (Join-Path ${env:ProgramFiles(x86)} 'Pulseway'),
    (Join-Path $env:ProgramFiles 'MMSOFT Design\PC Monitor'),
    (Join-Path ${env:ProgramFiles(x86)} 'MMSOFT Design\PC Monitor')
  )
  $pwReg = @(
    'HKLM:\SOFTWARE\MMSOFT Design\PC Monitor',
    'HKLM:\SOFTWARE\WOW6432Node\MMSOFT Design\PC Monitor',
    'HKLM:\SOFTWARE\Pulseway',
    'HKLM:\SOFTWARE\WOW6432Node\Pulseway'
  )
  if (Test-RpmaService $pwSvc) {
    $out.Pulseway = $true
    [void]$details.Add('Pulseway: service present')
  } elseif ($pwPaths | Where-Object { Test-RpmaPath $_ }) {
    $out.Pulseway = $true
    [void]$details.Add('Pulseway: install folder present')
  } elseif (Test-RpmaReg $pwReg) {
    $out.Pulseway = $true
    [void]$details.Add('Pulseway: registry present')
  }

  # ---- Bitdefender / GravityZone / Endpoint Security (EPP) ----
  $bdSvc = @(
    'bdredline', 'EPProtectedService', 'BDAgent', 'VSSERV', 'UpdateService',
    'BDAuxService', 'Bitdefender Endpoint Security Service', 'EpicAgent',
    'BDProtectedService', 'bdagent'
  )
  $bdPaths = @(
    (Join-Path $env:ProgramFiles 'Bitdefender'),
    (Join-Path ${env:ProgramFiles(x86)} 'Bitdefender'),
    (Join-Path $env:ProgramFiles 'Endpoint Security'),
    (Join-Path $env:ProgramFiles 'Bitdefender Agent'),
    (Join-Path ${env:ProgramFiles(x86)} 'Bitdefender Agent'),
    (Join-Path $env:ProgramFiles 'Bitdefender\Endpoint Security')
  )
  $bdReg = @(
    'HKLM:\SOFTWARE\Bitdefender',
    'HKLM:\SOFTWARE\WOW6432Node\Bitdefender'
  )
  if (Test-RpmaService $bdSvc) {
    $out.Bitdefender = $true
    [void]$details.Add('Bitdefender: service present')
  } elseif ($bdPaths | Where-Object { Test-RpmaPath $_ }) {
    $out.Bitdefender = $true
    [void]$details.Add('Bitdefender: install folder present')
  } elseif (Test-RpmaReg $bdReg) {
    $out.Bitdefender = $true
    [void]$details.Add('Bitdefender: registry present')
  }

  # ---- Cove Data Protection / N-able Backup Manager ----
  $coveSvc = @(
    'Backup Service Controller', 'BackupFP', 'CoveDataProtection',
    'Backup Manager', 'ProcessController'
  )
  $covePaths = @(
    (Join-Path $env:ProgramFiles 'Backup Manager'),
    (Join-Path ${env:ProgramFiles(x86)} 'Backup Manager'),
    (Join-Path $env:ProgramFiles 'Cove Data Protection'),
    (Join-Path ${env:ProgramFiles(x86)} 'Cove Data Protection'),
    (Join-Path $env:ProgramData 'MXB'),
    (Join-Path $env:ProgramData 'Cove Data Protection')
  )
  $coveReg = @(
    'HKLM:\SOFTWARE\Backup Manager',
    'HKLM:\SOFTWARE\WOW6432Node\Backup Manager',
    'HKLM:\SOFTWARE\N-able\Backup Manager',
    'HKLM:\SOFTWARE\WOW6432Node\N-able\Backup Manager'
  )
  if (Test-RpmaService $coveSvc) {
    $out.Cove = $true
    [void]$details.Add('Cove: service present')
  } elseif ($covePaths | Where-Object { Test-RpmaPath $_ }) {
    $out.Cove = $true
    [void]$details.Add('Cove: install folder present')
  } elseif (Test-RpmaReg $coveReg) {
    $out.Cove = $true
    [void]$details.Add('Cove: registry present')
  }

  $out.Details = $details.ToArray()
  return $out
}

# When dot-sourced, functions are available.
# When run directly, print a quick report.
if ($MyInvocation.InvocationName -ne '.') {
  $r = Get-RpmaLocalServices
  Write-Host ("Pulseway     : " + $r.Pulseway)
  Write-Host ("Bitdefender  : " + $r.Bitdefender)
  Write-Host ("Cove         : " + $r.Cove)
  foreach ($d in $r.Details) { Write-Host ("  - " + $d) }
  if (-not $r.Details.Count) { Write-Host '  (none detected)' }
}
