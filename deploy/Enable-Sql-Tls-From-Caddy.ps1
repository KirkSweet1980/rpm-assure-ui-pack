# Bind the Let's Encrypt cert Caddy already has for assure.rpmresources.co.za
# onto SQL Server, then ForceEncryption. Clients must connect as:
#   assure.rpmresources.co.za,14333
# with Encrypt=True and TrustServerCertificate=False.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\Enable-Sql-Tls-From-Caddy.ps1

$ErrorActionPreference = 'Stop'
$HostName = 'assure.rpmresources.co.za'
$SqlInstance = 'RPMREPORTS'

function W([string]$c, [string]$m) { Write-Host $m -ForegroundColor $c }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run as Administrator on the SQL / website host.' }

$search = @(
  'C:\RPM-Assure\deploy\caddy-data',
  'C:\RPM-Assure\deploy\bin',
  (Join-Path $env:LOCALAPPDATA 'caddy'),
  (Join-Path $env:ProgramData 'caddy'),
  'C:\Windows\System32\config\systemprofile\AppData\Roaming\caddy',
  'C:\Windows\System32\config\systemprofile\AppData\Local\caddy'
)
$crt = $null
$key = $null
foreach ($root in $search) {
  if (-not (Test-Path $root)) { continue }
  $hit = Get-ChildItem $root -Recurse -Filter ($HostName + '.crt') -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($hit) {
    $crt = $hit.FullName
    $tryKey = [IO.Path]::ChangeExtension($crt, '.key')
    if (Test-Path $tryKey) { $key = $tryKey; break }
  }
}
if (-not $crt -or -not $key) {
  throw 'Caddy LE cert not found for ' + $HostName + '. Confirm Caddy HTTPS is up, then retry.'
}
W Cyan ('Cert ' + $crt)

$openssl = 'C:\Program Files\Git\usr\bin\openssl.exe'
if (-not (Test-Path $openssl)) { throw 'Need Git OpenSSL to build a PFX from the Caddy PEM.' }

$pfx = Join-Path $env:TEMP ('assure-sql-' + [guid]::NewGuid().ToString('N').Substring(0, 8) + '.pfx')
$pw = [Convert]::ToBase64String((New-Object byte[] 18))
$env:RPMA_PFX_PW = $pw
& $openssl pkcs12 -export -inkey $key -in $crt -out $pfx -passout env:RPMA_PFX_PW
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $pfx)) { throw 'openssl pkcs12 failed' }

$sec = ConvertTo-SecureString $pw -AsPlainText -Force
$imported = Import-PfxCertificate -FilePath $pfx -CertStoreLocation Cert:\LocalMachine\My -Password $sec
Remove-Item $pfx -Force -ErrorAction SilentlyContinue
Remove-Item Env:RPMA_PFX_PW -ErrorAction SilentlyContinue
$thumb = $imported.Thumbprint
W Green ('Imported thumbprint ' + $thumb)

# Private-key ACL on Cert: is not supported on all hosts - do not stop here.

$net = Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server' -ErrorAction SilentlyContinue |
  Where-Object { $_.PSChildName -match 'MSSQL\d+\.' + [regex]::Escape($SqlInstance) } |
  Select-Object -First 1
if (-not $net) {
  $net = Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server' -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.PSChildName -eq 'SuperSocketNetLib' } |
    Select-Object -First 1
}
if (-not $net) { throw 'SQL SuperSocketNetLib registry not found for ' + $SqlInstance }

$keyPath = $net.PSPath
if ($net.PSChildName -ne 'SuperSocketNetLib') {
  $keyPath = Join-Path $net.PSPath 'MSSQLServer\SuperSocketNetLib'
}
if (-not (Test-Path $keyPath)) { throw 'Missing ' + $keyPath }

Set-ItemProperty -Path $keyPath -Name Certificate -Value ($thumb -replace ' ','')
Set-ItemProperty -Path $keyPath -Name ForceEncryption -Value 1
W Green ('ForceEncryption=1 Certificate=' + $thumb)

$svc = Get-Service | Where-Object { $_.Name -eq ('MSSQL$' + $SqlInstance) -or $_.DisplayName -match $SqlInstance } | Select-Object -First 1
if ($svc) {
  W Cyan ('Restart ' + $svc.Name)
  Restart-Service -Name $svc.Name -Force
  Start-Sleep -Seconds 5
  W Green ($svc.Name + ' = ' + (Get-Service $svc.Name).Status)
}

Write-Host ''
Write-Host 'SQL now requires TLS with the Let''s Encrypt cert for ' + $HostName
Write-Host 'Point agents at:  ' + $HostName + ',14333'
Write-Host 'Encrypt=True  TrustServerCertificate=False'
Write-Host 'Keep HTTPS agent heartbeat on https://' + $HostName
