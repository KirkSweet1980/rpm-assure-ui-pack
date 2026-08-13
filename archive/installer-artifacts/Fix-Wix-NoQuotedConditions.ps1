# UNIQUE: Fix-Wix-NoQuotedConditions.ps1
# Do not use Fix-Wix0104-And-Build.ps1
$ErrorActionPreference = 'Stop'
Write-Host '=== Fix Wix - no quoted conditions ===' -ForegroundColor Cyan
$Root = 'C:\RPM-Assure\installer'
$App = 'C:\RPM-Assure\App'
$WixDir = Join-Path $Root 'wix'
if (-not (Test-Path $WixDir)) { throw "Missing $WixDir" }

function Expand-GzB64([string]$b64) {
  $gz = [Convert]::FromBase64String(($b64 -replace '\s',''))
  $msIn = New-Object IO.MemoryStream(,$gz)
  $gzs = New-Object IO.Compression.GZipStream($msIn, [IO.Compression.CompressionMode]::Decompress)
  $msOut = New-Object IO.MemoryStream
  $gzs.CopyTo($msOut); $gzs.Close()
  return $msOut.ToArray()
}

$B64_Package_wxs = @'
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
2e+07ppPweb+zV98PJx6kB0AAA==
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Package.wxs'), (Expand-GzB64 $B64_Package_wxs))
Write-Host 'WROTE Package.wxs'
$B64_Service_wxs = @'
H4sIADgve2oC/1WRX2+CMBTF3/0UzX3Hiv9dQKMobnEuhi3bw7YsDV6xGVDSFoFvv8oM6uO55/SXe0+dWZnE5IRScZ
G6YLc7QDANxZ6nkQu5PlhjmE1bzgcviUmmyoWj1tkDpQUvtRCxQt0WMqIqPGLCFD31aVEqmLYIcXzJogRTfRZGeiLJ
RGr0Woo8I097F15RnniIjaOALLnEUAtZNa6ZwD/iFlK/95Ls55LaMvmLEsg658aw7W631+v3rcFgOLRGo/HYmkzmc2
ux8LzlcrXy/Y7dQM9YiUyjL+I9SkJvjAAjrrSs3lmcIwmE0C48bp63QDZ4XlEcdMEkfgW7LQlQiVyGqGo1VyqXCOSF
JXh3C3mrMjMxVFMykJrswuc18V3Dd0wfXajQdNIs5NDm/kup9L7Vund6Ld6h5uemrT+jNBYe5wEAAA==
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Service.wxs'), (Expand-GzB64 $B64_Service_wxs))
Write-Host 'WROTE Service.wxs'
$B64_Shortcuts_wxs = @'
H4sIADgve2oC/5VUTVPbMBC98ys0utAebBMIAToxTMgHZQiQ2tAcCMOo9sbR1NZqJDmJ+fWVbQgxnaHFt12vnt6+p9
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
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Shortcuts.wxs'), (Expand-GzB64 $B64_Shortcuts_wxs))
Write-Host 'WROTE Shortcuts.wxs'
$B64_Registry_wxs = @'
H4sIADgve2oC/42STVPCMBCG7/yKzI4HPZSAIh9Og4OFqiMgUxw9qOPUspTMtE0nSaH998byIRxQj+/mzZPs7mtf53
FEligVFwmDerUGBJNAzHgSMsj03GrDdbdiv/CcGGeiGCy0Tq8oXfFcCxEp1FUhQ6qCBca+ossGXeUKuhVCbFf6YYyJ
/hZGOiJORWL0rRRZSu5nDDwMudKy2B0pIH0uMdBCFgzux9On3nDoPg77Aw/WmH1QyXDi9GPLAXKbcVPrdNrtVqvZtC
4vGw3r4uL83KrXazXLdQeDft9xbm56vR3PELf3H7AgnhCawd3DcATEaAZTMdcrX+KbNxkRD5XIZICqVD2lMol7pD3W
sx9lSMZ+jKaRRGk/ikxrQJ6K1FSMw4wYSOli8HrQ6nv58sTXCwYFmpnQP194Xq/wCP7kdOnL6kSKWRbojfXsP1hHJH
Me/vLvtcEV0Qzl+3+Ik+wz4mqBx4gHQz4A2nRvTbsw0F0aNjGjhzkrk0h/omhTk+Vu5QtXONy8+QIAAA==
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Registry.wxs'), (Expand-GzB64 $B64_Registry_wxs))
Write-Host 'WROTE Registry.wxs'
$B64_Payload_wxs = @'
H4sIADgve2oC/1WQUWvCMBzE3/0U4f/exmrd3GiU2lqRiZM5GIzBCDXTQNuEJNV2n35pdd36lNxd+HG5YF7lGTozpb
koCHjuEBArUnHgxZFAab6cKcxng+CNV8i+LDSBkzHyEeMLr4wQmWbGFeqIdXpiOdX47ONLpWE2QChIFD3mrDCNsDIS
uRSF1SslSonWBwI7WmeCHrpEA4q5YqkRqiaw3u5fw80med7Eyxe4Uv5zWkSUy88b5p1LQKuSW3cYeotRNI4dfzlJnL
v76YMTLqLYWSZDbzT2J43TEZuqPGMtrrn0eHtRqpQRcN0PebV/T/e7ybc0t2nPemL1jpoTgZrZD+GuOO6a3xbB/Una
0fDfagG2s88GP8ocaJekAQAA
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Payload.wxs'), (Expand-GzB64 $B64_Payload_wxs))
Write-Host 'WROTE Payload.wxs'

Write-Host '--- conditions ---' -ForegroundColor Cyan
Select-String -Path (Join-Path $WixDir 'Package.wxs') -Pattern 'Condition=' | ForEach-Object { $_.Line.Trim() }
$raw = [IO.File]::ReadAllText((Join-Path $WixDir 'Package.wxs'))
if ($raw.Contains('REMOVE="ALL"') -or $raw.Contains("REMOVE='ALL'")) { throw 'still has REMOVE=ALL' }
Write-Host 'OK: no REMOVE=ALL' -ForegroundColor Green

$payloadZip = Join-Path $Root 'payload\payload.zip'
if (-not (Test-Path $payloadZip)) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'scripts\Prepare-Payload.ps1') -AppSource $App
}
if (-not (Test-Path $payloadZip)) { throw "Missing $payloadZip" }

$env:PATH = "$(Join-Path $env:USERPROFILE '.dotnet\tools');$env:PATH"
$wixPath = (Get-Command wix -EA SilentlyContinue).Source
if (-not $wixPath) { $wixPath = Join-Path $env:USERPROFILE '.dotnet\tools\wix.exe' }
if (-not (Test-Path $wixPath)) { throw 'wix not found' }

$Version = (Get-Content (Join-Path $Root 'VERSION.txt') -Raw).Trim()
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
$argList = @('build') + $sources + @('-d',"ProductVersion=$Version",'-o',$msi,'-arch','x64','-culture','en-US','-nologo','-v')
Write-Host 'Building...' -ForegroundColor Cyan
$ErrorActionPreference = 'Continue'
$output = & $wixPath @argList 2>&1 | ForEach-Object { "$_" }
$code = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
$output | Set-Content $log -Encoding UTF8
$output | ForEach-Object { Write-Host $_ }

if ($code -ne 0 -or -not (Test-Path $msi)) {
  $output | Where-Object { $_ -match 'error' } | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
  throw "wix build failed exit $code log=$log"
}
Write-Host "MSI READY: $msi" -ForegroundColor Green
Write-Host ("Size: {0:N1} MB" -f ((Get-Item $msi).Length / 1MB))
Write-Host "Install: msiexec /i `"$msi`""
