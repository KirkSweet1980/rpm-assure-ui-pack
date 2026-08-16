# Detect-Local-Services.ps1
# Local product discovery on the customer host.
# Policy: only ENABLE cover when found. Never clear cover from the agent.
#
# Returns hashtable:
#   SqlPresent  = $true|$false   (SQL Server engine on this machine)
#   Syspro      = $true|$false   (always false when SqlPresent is false)
#   Pulseway    = $true|$false
#   Bitdefender = $true|$false
#   Cove        = $true|$false
#   Details     = string[]

function Test-RpmaPath([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
  try { return (Test-Path -LiteralPath $Path -EA SilentlyContinue) } catch { return $false }
}

function Test-RpmaService([string[]]$Names) {
  try {
    foreach ($n in $Names) {
      if ($n -match '[\*\?]') {
        $hit = Get-Service -EA SilentlyContinue | Where-Object { $_.Name -like $n }
        if ($hit) { return $true }
      } else {
        $s = Get-Service -Name $n -EA SilentlyContinue
        if ($s) { return $true }
      }
    }
  } catch {}
  return $false
}

function Test-RpmaReg([string[]]$Paths) {
  foreach ($p in $Paths) {
    try { if (Test-Path -LiteralPath $p -EA SilentlyContinue) { return $true } } catch {}
  }
  return $false
}

function Test-RpmaSqlPresent {
  # SQL Server engine on this host (not just client tools)
  $details = New-Object System.Collections.Generic.List[string]
  $present = $false
  try {
    # Default instance + any MSSQL$ named instances
    $svc = Get-Service -EA SilentlyContinue | Where-Object {
      $_.Name -eq 'MSSQLSERVER' -or $_.Name -like 'MSSQL$*'
    }
    if ($svc) {
      $present = $true
      [void]$details.Add('SQL: service ' + (($svc | Select-Object -ExpandProperty Name) -join ','))
    }
  } catch {}
  if (-not $present) {
    foreach ($p in @(
      (Join-Path $env:ProgramFiles 'Microsoft SQL Server'),
      (Join-Path ${env:ProgramFiles(x86)} 'Microsoft SQL Server')
    )) {
      if (Test-RpmaPath $p) {
        # Prefer evidence of engine binaries, not only client tools
        $engine = Get-ChildItem -Path $p -Filter 'sqlservr.exe' -Recurse -EA SilentlyContinue | Select-Object -First 1
        if ($engine) {
          $present = $true
          [void]$details.Add('SQL: sqlservr.exe under ' + $p)
          break
        }
      }
    }
  }
  if (-not $present) {
    if (Test-RpmaReg @(
      'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL',
      'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Microsoft SQL Server\Instance Names\SQL'
    )) {
      $present = $true
      [void]$details.Add('SQL: instance registry present')
    }
  }
  return @{ Present = $present; Details = $details.ToArray() }
}

function Test-RpmaSysproDatabases {
  # Only called when SQL is present. Best-effort; never throws.
  $attempts = @('.', $env:COMPUTERNAME, '(local)', 'localhost')
  foreach ($ds in $attempts) {
    try {
      $cs = "Data Source=$ds;Initial Catalog=master;Integrated Security=True;Connect Timeout=3;Encrypt=False;TrustServerCertificate=True;"
      $cn = New-Object System.Data.SqlClient.SqlConnection $cs
      $cn.Open()
      $cmd = $cn.CreateCommand()
      $cmd.CommandTimeout = 6
      $cmd.CommandText = "SELECT TOP 1 name FROM sys.databases WITH (NOLOCK) WHERE name LIKE N'Syspro%' OR name LIKE N'SYSPRO%' ORDER BY name;"
      $name = [string]$cmd.ExecuteScalar()
      $cn.Close(); $cn.Dispose()
      if ($name) { return $name }
    } catch {
      # try next data source
    }
  }
  return $null
}

function Get-RpmaLocalServices {
  $details = New-Object System.Collections.Generic.List[string]
  $out = [ordered]@{
    SqlPresent   = $false
    Syspro       = $false
    Pulseway     = $false
    Bitdefender  = $false
    Cove         = $false
    Details      = @()
  }

  # ---- SQL Server presence (gates SYSPRO) ----
  $sqlInfo = Test-RpmaSqlPresent
  $out.SqlPresent = [bool]$sqlInfo.Present
  foreach ($d in $sqlInfo.Details) { [void]$details.Add($d) }
  if (-not $out.SqlPresent) {
    [void]$details.Add('SQL: not detected on this host - SYSPRO assumed absent')
  }

  # ---- SYSPRO ERP (requires SQL on this machine) ----
  if ($out.SqlPresent) {
    $sySvc = @('SYSPRO*', 'Syspro*', 'SYSPROServer', 'SYSPRO Service', 'SYSPRO WCF', 'SYSPRO Reporting')
    $syPaths = @(
      'C:\SYSPRO', 'C:\SYSPRO7', 'C:\SYSPRO8', 'C:\SYSPRO9', 'C:\Syspro',
      'D:\SYSPRO', 'D:\SYSPRO8', 'E:\SYSPRO',
      (Join-Path $env:ProgramFiles 'SYSPRO'),
      (Join-Path ${env:ProgramFiles(x86)} 'SYSPRO'),
      (Join-Path $env:ProgramFiles 'Syspro'),
      (Join-Path ${env:ProgramFiles(x86)} 'Syspro')
    )
    $syReg = @(
      'HKLM:\SOFTWARE\SYSPRO', 'HKLM:\SOFTWARE\WOW6432Node\SYSPRO',
      'HKLM:\SOFTWARE\Syspro', 'HKLM:\SOFTWARE\WOW6432Node\Syspro'
    )
    if (Test-RpmaService $sySvc) {
      $out.Syspro = $true
      [void]$details.Add('SYSPRO: service present')
    } elseif ($syPaths | Where-Object { Test-RpmaPath $_ }) {
      $out.Syspro = $true
      [void]$details.Add('SYSPRO: install folder present')
    } elseif (Test-RpmaReg $syReg) {
      $out.Syspro = $true
      [void]$details.Add('SYSPRO: registry present')
    } else {
      $db = Test-RpmaSysproDatabases
      if ($db) {
        $out.Syspro = $true
        [void]$details.Add("SYSPRO: database present ($db)")
      }
    }
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
  $bdReg = @('HKLM:\SOFTWARE\Bitdefender', 'HKLM:\SOFTWARE\WOW6432Node\Bitdefender')
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
  $coveSvc = @('Backup Service Controller', 'BackupFP', 'CoveDataProtection', 'Backup Manager', 'ProcessController')
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

if ($MyInvocation.InvocationName -ne '.') {
  $r = Get-RpmaLocalServices
  Write-Host ("SQL present  : " + $r.SqlPresent)
  Write-Host ("SYSPRO       : " + $r.Syspro)
  Write-Host ("Pulseway     : " + $r.Pulseway)
  Write-Host ("Bitdefender  : " + $r.Bitdefender)
  Write-Host ("Cove         : " + $r.Cove)
  foreach ($d in $r.Details) { Write-Host ("  - " + $d) }
  if (-not $r.Details.Count) { Write-Host '  (none detected)' }
}
