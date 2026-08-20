# Sign rpm-assure-agent.msi with Authenticode.
# Needs a code-signing cert (PFX or LocalMachine\My thumbprint).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File Sign-Agent-Msi.ps1 -PfxPath C:\RPM-Assure\secrets\codesign.pfx
#   powershell -NoProfile -ExecutionPolicy Bypass -File Sign-Agent-Msi.ps1 -Thumbprint ABCDEF...
param(
  [string]$Msi = 'C:\RPM-Assure\downloads\rpm-assure-agent.msi',
  [string]$PfxPath = '',
  [string]$PfxPassword = '',
  [string]$Thumbprint = '',
  [string]$TimestampUrl = 'http://timestamp.digicert.com'
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $Msi)) { throw "Missing $Msi - run Build-Agent-Msi.ps1 first" }
if (-not $PfxPath) { $PfxPath = $env:RPM_ASSURE_CODE_SIGN_PFX }
if (-not $PfxPassword) { $PfxPassword = $env:RPM_ASSURE_CODE_SIGN_PASSWORD }
if (-not $Thumbprint) { $Thumbprint = $env:RPM_ASSURE_CODE_SIGN_THUMBPRINT }

$signtool = @(
  "${env:ProgramFiles(x86)}\Windows Kits\10\bin\x64\signtool.exe",
  "${env:ProgramFiles(x86)}\Windows Kits\10\App Certification Kit\signtool.exe",
  "${env:ProgramFiles}\Windows Kits\10\bin\x64\signtool.exe"
)
$kit = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Filter signtool.exe -Recurse -EA SilentlyContinue |
  Where-Object { $_.FullName -match '\\x64\\signtool.exe$' } |
  Select-Object -Last 1
if ($kit) { $signtool = @($kit.FullName) + $signtool }
$st = $signtool | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $st) { throw 'signtool.exe not found. Install Windows 10/11 SDK (Signing Tools).' }

$cmd = @('sign', '/fd', 'SHA256', '/td', 'SHA256', '/tr', $TimestampUrl, '/v', $Msi)
if ($PfxPath) {
  if (-not (Test-Path $PfxPath)) { throw "PFX not found: $PfxPath" }
  $cmd = @('sign', '/fd', 'SHA256', '/td', 'SHA256', '/tr', $TimestampUrl, '/f', $PfxPath)
  if ($PfxPassword) { $cmd += @('/p', $PfxPassword) }
  $cmd += @('/v', $Msi)
} elseif ($Thumbprint) {
  $cmd = @('sign', '/fd', 'SHA256', '/td', 'SHA256', '/tr', $TimestampUrl, '/sha1', $Thumbprint, '/sm', '/v', $Msi)
} else {
  $certs = @(Get-ChildItem Cert:\LocalMachine\My | Where-Object {
    $_.HasPrivateKey -and ($_.EnhancedKeyUsageList | Where-Object { $_.FriendlyName -match 'Code Signing' })
  })
  if ($certs.Count -eq 1) {
    $cmd = @('sign', '/fd', 'SHA256', '/td', 'SHA256', '/tr', $TimestampUrl, '/sha1', $certs[0].Thumbprint, '/sm', '/v', $Msi)
    Write-Host ('Using store cert ' + $certs[0].Subject)
  } elseif ($certs.Count -gt 1) {
    throw 'Multiple code-signing certs in LocalMachine\My. Pass -Thumbprint.'
  } else {
    throw 'No code-signing cert. Export a PFX to C:\RPM-Assure\secrets\codesign.pfx (not git) or install in LocalMachine\My.'
  }
}

Write-Host ('signtool ' + (($cmd | ForEach-Object { if ($_ -eq $PfxPassword) { '***' } else { $_ } }) -join ' '))
& $st @cmd
if ($LASTEXITCODE -ne 0) { throw "signtool exit=$LASTEXITCODE" }
Write-Host ('SIGNED ' + $Msi)
Get-AuthenticodeSignature $Msi | Format-List Status, SignerCertificate, TimeStamperCertificate
