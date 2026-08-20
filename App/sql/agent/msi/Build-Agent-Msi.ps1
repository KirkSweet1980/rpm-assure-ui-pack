# Build rpm-assure-agent.msi on the Assure Windows box (needs .NET csc + WiX).
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\sql\agent\msi\Build-Agent-Msi.ps1
# Then Sign-Agent-Msi.ps1 if you have a code-signing cert.
param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack',
  [string]$OutDir = 'C:\RPM-Assure\downloads'
)

$ErrorActionPreference = 'Stop'
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$work = Join-Path $env:TEMP 'rpma-msi-build'
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
New-Item -ItemType Directory -Force -Path $work, $OutDir | Out-Null
Copy-Item (Join-Path $Here 'RpmAssure-Bootstrap.cs') (Join-Path $work 'RpmAssure-Bootstrap.cs')
Copy-Item (Join-Path $Here 'RpmAssureAgent.wxs') (Join-Path $work 'RpmAssureAgent.wxs')

$csc = @(
  "${env:WINDIR}\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
  "${env:WINDIR}\Microsoft.NET\Framework\v4.0.30319\csc.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $csc) { throw 'csc.exe not found (.NET Framework 4.x)' }

$fw = Split-Path $csc
& $csc /nologo /target:winexe /platform:x64 /optimize+ `
  /r:"$fw\System.Windows.Forms.dll" `
  /r:"$fw\System.Drawing.dll" `
  /r:"$fw\System.IO.Compression.dll" `
  /r:"$fw\System.IO.Compression.FileSystem.dll" `
  /out:"$work\RpmAssure-Bootstrap.exe" `
  "$work\RpmAssure-Bootstrap.cs"
if ($LASTEXITCODE -ne 0) { throw 'csc failed' }
Write-Host 'Bootstrap.exe compiled'

$wixBin = @(
  'C:\Program Files (x86)\WiX Toolset v3.14\bin',
  'C:\Program Files (x86)\WiX Toolset v3.11\bin',
  'C:\Program Files\WiX Toolset v4\bin',
  "${env:ProgramFiles}\WiX Toolset v5\bin"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

$wixExe = Get-Command wix -EA SilentlyContinue | Select-Object -ExpandProperty Source
if ($wixExe) {
  Push-Location $work
  & $wixExe build RpmAssureAgent.wxs -arch x64 -o (Join-Path $OutDir 'rpm-assure-agent.msi')
  Pop-Location
} elseif ($wixBin -and (Test-Path (Join-Path $wixBin 'candle.exe'))) {
  Push-Location $work
  & (Join-Path $wixBin 'candle.exe') -nologo -arch x64 RpmAssureAgent.wxs -out RpmAssureAgent.wixobj
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'candle failed' }
  & (Join-Path $wixBin 'light.exe') -nologo RpmAssureAgent.wixobj -out (Join-Path $OutDir 'rpm-assure-agent.msi')
  Pop-Location
} else {
  throw 'WiX not installed. On this box: winget install --id WiXToolset.WiX -e   OR  dotnet tool install --global wix'
}
if ($LASTEXITCODE -ne 0) { throw 'WiX build failed' }
$msi = Join-Path $OutDir 'rpm-assure-agent.msi'
if (-not (Test-Path $msi)) { throw 'MSI not produced' }
Write-Host ('MSI ' + $msi + ' bytes=' + (Get-Item $msi).Length)
Write-Host 'Next: Sign-Agent-Msi.ps1  then  msiexec /i ... CUSTOMERCODE=AHIC'
Write-Host 'Bitdefender GravityZone: exclude C:\RPM-Assure (On-Access + ATC).'
