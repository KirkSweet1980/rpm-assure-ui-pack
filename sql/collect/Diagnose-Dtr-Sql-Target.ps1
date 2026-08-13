# Diagnose why DTR collect cannot connect to SQL from THIS machine.
# powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\collect\Diagnose-Dtr-Sql-Target.ps1
# Optional: -CustomerCode UVSS -SqlServer "UVSS-SYSPRO"
param(
  [ValidateSet('AHIC', 'UVSS', 'RSR', 'RSS', '')]
  [string]$CustomerCode = '',
  [string]$SqlServer = '',
  [string]$SqlUser = 'Rpm_collect',
  [string]$SqlPassword = ''
)

$ErrorActionPreference = 'Continue'
Write-Host "=== DTR SQL target diagnose ==="
Write-Host "Machine : $env:COMPUTERNAME"
Write-Host "User    : $env:USERDOMAIN\$env:USERNAME"
Write-Host "Time    : $(Get-Date -Format o)"

$defaults = @{
  AHIC = 'AHIC-SSQL-SRV'
  UVSS = 'UVSS-SYSPRO'
  RSR  = 'RSR-SQLSRV-DB'
  RSS  = 'RSS-PROD'
}

Write-Host ""
Write-Host "--- SQL-related services on THIS box ---"
Get-Service -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match 'SQL|MSSQL' } |
  Format-Table Name, Status, DisplayName -AutoSize | Out-String | Write-Host

Write-Host "--- Listening ports 1433 / 14333 ---"
try {
  Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in 1433, 14333 } |
    Select-Object LocalAddress, LocalPort, OwningProcess |
    Format-Table -AutoSize | Out-String | Write-Host
} catch {
  Write-Host "(Get-NetTCPConnection failed) $($_.Exception.Message)"
  netstat -ano | findstr ":1433"
}

function Test-SqlTarget([string]$Server, [string]$Mode) {
  $sqlcmd = (Get-Command sqlcmd.exe -ErrorAction SilentlyContinue).Source
  if (-not $sqlcmd) {
    Write-Host "sqlcmd.exe not in PATH"
    return
  }
  $q = "SET NOCOUNT ON; SELECT @@SERVERNAME AS Srv, SUSER_SNAME() AS Login;"
  Write-Host ""
  Write-Host "TRY $Mode -> -S `"$Server`""
  $args = @('-S', $Server, '-C', '-l', '5', '-b', '-Q', $q, '-W', '-h', '-1')
  if ($Mode -eq 'SQLAUTH' -and $SqlPassword) {
    $args = @('-S', $Server, '-U', $SqlUser, '-P', $SqlPassword, '-C', '-l', '5', '-b', '-Q', $q, '-W', '-h', '-1')
  } elseif ($Mode -eq 'SQLAUTH') {
    Write-Host "  skip SQLAUTH (no password)"
    return
  }
  $out = & $sqlcmd @args 2>&1 | Out-String
  Write-Host "  exit=$LASTEXITCODE"
  Write-Host ($out.Trim() | ForEach-Object { "  $_" })
}

$candidates = New-Object System.Collections.Generic.List[string]
foreach ($s in @(
    '.',
    '(local)',
    'localhost',
    '127.0.0.1',
    'tcp:127.0.0.1,1433',
    'localhost\SQLEXPRESS',
    '.\SQLEXPRESS',
    'rpmwinrm\RPMREPORTS',
    'tcp:102.222.21.220,14333'
  )) { [void]$candidates.Add($s) }

if ($SqlServer) { [void]$candidates.Insert(0, $SqlServer) }
if ($CustomerCode -and $defaults.ContainsKey($CustomerCode)) {
  $d = $defaults[$CustomerCode]
  [void]$candidates.Add($d)
  [void]$candidates.Add("tcp:$d,1433")
}

$seen = @{}
foreach ($s in $candidates) {
  if ($seen.ContainsKey($s)) { continue }
  $seen[$s] = $true
  Test-SqlTarget $s 'WINAUTH'
}

if ($SqlPassword) {
  $target = if ($SqlServer) { $SqlServer } elseif ($CustomerCode) { $defaults[$CustomerCode] } else { '.' }
  Test-SqlTarget $target 'SQLAUTH'
}

Write-Host ""
Write-Host "=== How to read this ==="
Write-Host @"
Named Pipes error [2] / 'Server not found' on '.' means:
  THIS machine does not have a default SQL instance (or SQL is stopped).

DTR L1-3 collect (217c) must run where company DBs + Dtr*Balances live:
  - AHIC host (often AHIC-SSQL-SRV)
  - UVSS host (often UVSS-SYSPRO)
  - RSR host (often RSR-SQLSRV-DB)
  - RSS host (often RSS-PROD)

Central app SQL (rpmwinrm\RPMREPORTS / 102.222.21.220,14333) only stores
the landing tables. It does NOT host source Dtr*Balances.

Next steps:
1) RDP to the customer SYSPRO SQL host for that customer.
2) Confirm services + sqlcmd -S . -E -Q "SELECT @@SERVERNAME"
3) Then run:
   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\collect\Run-Dtr-AllLevels.ps1 ``
     -CustomerCode <CODE> -SqlServer '.' -WindowsAuth

OR use the existing direct collector on that host (recommended):
   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\base\syspro-direct\Run-Syspro-Collect-Direct.ps1 ``
     -ConfigPath C:\RPM-Assure\Sql\customers\<CODE>\Customer.Config.ps1
   (or base\syspro-direct\Customer.Config.ps1 if that is what Install-OnThisHost used)

If you only have access to central right now, you can only PROOF counts:
   sqlcmd -S "102.222.21.220,14333" -d RPMAssure_App -E -C -Q "SELECT CustomerCode, InformationLevel, COUNT(*) Cnt FROM dbo.vw_FinSight_ControlBalances_All WITH (NOLOCK) GROUP BY CustomerCode, InformationLevel ORDER BY 1,2"
"@
