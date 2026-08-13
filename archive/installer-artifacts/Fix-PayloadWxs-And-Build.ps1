# Fix corrupted Payload.wxs (leading dash) and rebuild MSI
# payload.zip already present - do NOT re-run Prepare unless missing
$ErrorActionPreference = 'Stop'
Write-Host '=== Fix Payload.wxs + rebuild ===' -ForegroundColor Cyan
$Root = 'C:\RPM-Assure\installer'
$WixDir = Join-Path $Root 'wix'
$payloadZip = Join-Path $Root 'payload\payload.zip'
if (-not (Test-Path $payloadZip)) { throw "Missing $payloadZip - run Prepare-Payload first" }

function Expand-GzB64([string]$b64) {
  $gz = [Convert]::FromBase64String(($b64 -replace '\s',''))
  $msIn = New-Object IO.MemoryStream(,$gz)
  $gzs = New-Object IO.Compression.GZipStream($msIn, [IO.Compression.CompressionMode]::Decompress)
  $msOut = New-Object IO.MemoryStream
  $gzs.CopyTo($msOut); $gzs.Close()
  return $msOut.ToArray()
}

# Write clean Payload.wxs as BYTES (no BOM)
$payloadWxs = @'
<?xml version="1.0" encoding="utf-8"?>
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">
  <Fragment>
    <ComponentGroup Id="PayloadComponents" Directory="INSTALLFOLDER">
      <Component Id="Cmp_PayloadZip" Guid="0A1B2C3D-4E5F-6789-ABCD-EF0123456789">
        <File Id="File_PayloadZip" Source="payload/payload.zip" Name="payload.zip" KeyPath="yes" />
      </Component>
    </ComponentGroup>
  </Fragment>
</Wix>
'@
$utf8 = New-Object System.Text.UTF8Encoding $false
$payloadPath = Join-Path $WixDir 'Payload.wxs'
[IO.File]::WriteAllText($payloadPath, $payloadWxs.Trim() + "`n", $utf8)
$hb = [IO.File]::ReadAllBytes($payloadPath)[0]
if ($hb -ne 0x3C) { throw "Payload.wxs still bad first byte=$hb" }
Write-Host "Payload.wxs OK first-byte=0x3C (<)" -ForegroundColor Green
Get-Content $payloadPath | Select-Object -First 3 | ForEach-Object { Write-Host "  $_" }

# Also restore other wxs from embed (in case tree was refresh-clobbered)
$B_Package_wxs = @'
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
+RRs7t/8BePGMQtvHQAA
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Package.wxs'), (Expand-GzB64 $B_Package_wxs))
Write-Host 'WROTE Package.wxs'
$B_Service_wxs = @'
H4sIAGAye2oC/1WRX2+CMBTF3/0UzX3Hiv9dQKMobnEuhi3bw7YsDV6xGVDSFoFvv8oM6uO55/SXe0+dWZnE5IRScZ
G6YLc7QDANxZ6nkQu5PlhjmE1bzgcviUmmyoWj1tkDpQUvtRCxQt0WMqIqPGLCFD31aVEqmLYIcXzJogRTfRZGeiLJ
RGr0Woo8I097F15RnniIjaOALLnEUAtZNa6ZwD/iFlK/95Ls55LaMvmLEsg658aw7W631+v3rcFgOLRGo/HYmkzmc2
ux8LzlcrXy/Y7dQM9YiUyjL+I9SkJvjAAjrrSs3lmcIwmE0C48bp63QDZ4XlEcdMEkfgW7LQlQiVyGqGo1VyqXCOSF
JXh3C3mrMjMxVFMykJrswuc18V3Dd0wfXajQdNIs5NDm/kup9L7Vund6Ld6h5uemrT+jNBYe5wEAAA==
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Service.wxs'), (Expand-GzB64 $B_Service_wxs))
Write-Host 'WROTE Service.wxs'
$B_Shortcuts_wxs = @'
H4sIAGAye2oC/5VUTVPbMBC98ys0utAebBMIAToxTMgHZQiQ2tAcCMOo9sbR1NZqJDmJ+fWVbQgxnaHFt12vnt6+p9
3u2TpLyRKU5ih82nL3KAERYcxF4tPczJ1jena6053yNbGVQvt0YYz85nkrvjaIqQbjoko8HS0gY9pbtr3VWtPTHUK6
I8WSDIQpAxv2MZMobHyhMJfkMvZpuEBlotxsfmlKBlxBZFAVPu1JmfKIGcttojBRLNMjTGNQtIbcBq3w+pl8Cg1T5h
pETslFzm2y1zs/7/cHA2c4HI2cvb1Wy9nfPzhw2u3Dw07n6Oj4+ORkA2ghX0ltMuW3zfapj2LOE9oouGEZ+DSYXJOe
1rkCUhflqqLfrB2AjhSXptI8/DEmTMREcwMk2j5EVvyZqbh59o6pBIxPH8JCG8g67VqRxykXMa70BFegwgWk6Wxp3Z
zJMtZl7MIamlA9leSlP9rfdW7QKjznKRBnuAbbZKk5WvULcl5IpjVxRuVf+nB5E971xuPR7XgwDB5rirNAZnXbTt32
tEq7UrcocS6FNixNrbF/Hae7DUZTVL/ty9t6Ao1ySrxP+XQrQYRW1n849QVtXaX/1w98KsGIzH9ZTWqv7oPx/1kTZf
FH4lPPApaPlpSjpe1ssYqXq2SmQGOuItBuhO4z81JM+LvH9CnNAshwCTWvSqs6YQft3YCRW9tyLnht3XuQhGujip8s
zYEEiLbn71f9e0quwF4f4tysmIJZKXHw2sDsTXD6YsHWpN4V0ia4MJCUl1fIdh1ViBNmFj4tQG+x6HqbwX/ZLl5zvV
QLyHvbQF3PrrDTnT/Wdft18AQAAA==
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Shortcuts.wxs'), (Expand-GzB64 $B_Shortcuts_wxs))
Write-Host 'WROTE Shortcuts.wxs'
$B_Registry_wxs = @'
H4sIAGAye2oC/42STVPCMBCG7/yKzI4HPZSAIh9Og4OFqiMgUxw9qOPUspTMtE0nSaH998byIRxQj+/mzZPs7mtf53
FEligVFwmDerUGBJNAzHgSMsj03GrDdbdiv/CcGGeiGCy0Tq8oXfFcCxEp1FUhQ6qCBca+ossGXeUKuhVCbFf6YYyJ
/hZGOiJORWL0rRRZSu5nDDwMudKy2B0pIH0uMdBCFgzux9On3nDoPg77Aw/WmH1QyXDi9GPLAXKbcVPrdNrtVqvZtC
4vGw3r4uL83KrXazXLdQeDft9xbm56vR3PELf3H7AgnhCawd3DcATEaAZTMdcrX+KbNxkRD5XIZICqVD2lMol7pD3W
sx9lSMZ+jKaRRGk/ikxrQJ6K1FSMw4wYSOli8HrQ6nv58sTXCwYFmpnQP194Xq/wCP7kdOnL6kSKWRbojfXsP1hHJH
Me/vLvtcEV0Qzl+3+Ik+wz4mqBx4gHQz4A2nRvTbsw0F0aNjGjhzkrk0h/omhTk+Vu5QtXONy8+QIAAA==
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Registry.wxs'), (Expand-GzB64 $B_Registry_wxs))
Write-Host 'WROTE Registry.wxs'

# Patch Package.wxs sources to use forward slashes without ..
$pkg = Join-Path $WixDir 'Package.wxs'
$txt = [IO.File]::ReadAllText($pkg)
$txt = $txt.Replace('Source="..\', 'Source="').Replace('Source="..\\', 'Source="')
$txt = $txt.Replace('Source="payload\', 'Source="payload/').Replace('Source="wizard\', 'Source="wizard/')
$txt = $txt.Replace('Source="winsw\', 'Source="winsw/').Replace('Source="service\', 'Source="service/')
$txt = $txt.Replace('Source="resources\', 'Source="resources/')
$utf8 = New-Object System.Text.UTF8Encoding $false
[IO.File]::WriteAllText($pkg, $txt, $utf8)

# Ensure required non-zip sources exist
$need = @(
  'payload\README.txt',
  'wizard\RpmAssure-ConfigWizard.ps1',
  'service\Start-Service.ps1',
  'resources\app.env.example',
  'winsw\RPMAssure-App.xml'
)
foreach ($n in $need) {
  if (-not (Test-Path (Join-Path $Root $n))) {
    Write-Host "WARNING missing $n" -ForegroundColor Yellow
  }
}
if (-not (Test-Path (Join-Path $Root 'payload\README.txt'))) {
  New-Item -ItemType Directory -Force -Path (Join-Path $Root 'payload') | Out-Null
  Set-Content (Join-Path $Root 'payload\README.txt') 'RPM Assure payload' -Encoding ASCII
}

$env:PATH = "$(Join-Path $env:USERPROFILE '.dotnet\tools');$env:PATH"
$wixPath = (Get-Command wix -EA SilentlyContinue).Source
if (-not $wixPath) { $wixPath = Join-Path $env:USERPROFILE '.dotnet\tools\wix.exe' }
$Version = '1.0.0'
if (Test-Path (Join-Path $Root 'VERSION.txt')) { $Version = (Get-Content (Join-Path $Root 'VERSION.txt') -Raw).Trim() }
$outDir = Join-Path $Root 'dist'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$msi = Join-Path $outDir "RPMAssure-$Version.msi"
$log = Join-Path $outDir "wix-build-$Version.log"
if (Test-Path $msi) { Remove-Item $msi -Force }

$sources = @(
  (Join-Path $WixDir 'Package.wxs'),
  (Join-Path $WixDir 'Service.wxs'),
  (Join-Path $WixDir 'Shortcuts.wxs'),
  (Join-Path $WixDir 'Registry.wxs'),
  (Join-Path $WixDir 'Payload.wxs')
)
$argList = @('build') + $sources + @('-d',"ProductVersion=$Version",'-b',$Root,'-o',$msi,'-arch','x64','-culture','en-US','-nologo','-v')
Write-Host "Building with -b $Root ..." -ForegroundColor Cyan
Push-Location $Root
try {
  $ErrorActionPreference = 'Continue'
  $output = & $wixPath @argList 2>&1 | ForEach-Object { "$_" }
  $code = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
} finally { Pop-Location }
$output | Set-Content $log -Encoding UTF8
$output | ForEach-Object { Write-Host $_ }
if ($code -ne 0 -or -not (Test-Path $msi)) {
  $output | Where-Object { $_ -match 'error' } | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
  throw "wix build failed exit $code log=$log"
}
Write-Host "MSI READY: $msi" -ForegroundColor Green
Write-Host ("Size: {0:N1} MB" -f ((Get-Item $msi).Length / 1MB))
Write-Host "Install: msiexec /i `"$msi`""
