# Fix Condition quoting (WIX0104 ALL token) + rebuild
$ErrorActionPreference = 'Stop'
Write-Host '=== Fix WIX0104 conditions + rebuild ===' -ForegroundColor Cyan
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

$Package_wxs = @'
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
Tuu++RSsH978D+2i3lsJHgAA
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Package.wxs'), (Expand-GzB64 $Package_wxs))
Write-Host 'WROTE Package.wxs'
$Service_wxs = @'
H4sIAAYue2oC/1WRX2+CMBTF3/0UzX3Hiv9dQKMobnEuhi3bw7YsDV6xGVDSFoFvv8oM6uO55/SXe0+dWZnE5IRScZG6YLc7QDAN
xZ6nkQu5PlhjmE1bzgcviUmmyoWj1tkDpQUvtRCxQt0WMqIqPGLCFD31aVEqmLYIcXzJogRTfRZGeiLJRGr0Woo8I097F15RnniI
jaOALLnEUAtZNa6ZwD/iFlK/95Ls55LaMvmLEsg658aw7W631+v3rcFgOLRGo/HYmkzmc2ux8LzlcrXy/Y7dQM9YiUyjL+I9SkJv
jAAjrrSs3lmcIwmE0C48bp63QDZ4XlEcdMEkfgW7LQlQiVyGqGo1VyqXCOSFJXh3C3mrMjMxVFMykJrswuc18V3Dd0wfXajQdNIs
5NDm/kup9L7Vund6Ld6h5uemrT+jNBYe5wEAAA==
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Service.wxs'), (Expand-GzB64 $Service_wxs))
Write-Host 'WROTE Service.wxs'
$Shortcuts_wxs = @'
H4sIAAYue2oC/5VUTVPbMBC98ys0utAebBMIAToxTMgHZQiQ2tAcCMOo9sbR1NZqJDmJ+fWVbQgxnaHFt12vnt6+p93u2TpLyRKU
5ih82nL3KAERYcxF4tPczJ1jena6053yNbGVQvt0YYz85nkrvjaIqQbjoko8HS0gY9pbtr3VWtPTHUK6I8WSDIQpAxv2MZMobHyh
MJfkMvZpuEBlotxsfmlKBlxBZFAVPu1JmfKIGcttojBRLNMjTGNQtIbcBq3w+pl8Cg1T5hpETslFzm2y1zs/7/cHA2c4HI2cvb1W
y9nfPzhw2u3Dw07n6Oj4+ORkA2ghX0ltMuW3zfapj2LOE9oouGEZ+DSYXJOe1rkCUhflqqLfrB2AjhSXptI8/DEmTMREcwMk2j5E
VvyZqbh59o6pBIxPH8JCG8g67VqRxykXMa70BFegwgWk6Wxp3ZzJMtZl7MIamlA9leSlP9rfdW7QKjznKRBnuAbbZKk5WvULcl5I
pjVxRuVf+nB5E971xuPR7XgwDB5rirNAZnXbTt32tEq7UrcocS6FNixNrbF/Hae7DUZTVL/ty9t6Ao1ySrxP+XQrQYRW1n849QVt
XaX/1w98KsGIzH9ZTWqv7oPx/1kTZfFH4lPPApaPlpSjpe1ssYqXq2SmQGOuItBuhO4z81JM+LvH9CnNAshwCTWvSqs6YQft3YCR
W9tyLnht3XuQhGujip8szYEEiLbn71f9e0quwF4f4tysmIJZKXHw2sDsTXD6YsHWpN4V0ia4MJCUl1fIdh1ViBNmFj4tQG+x6Hqb
wX/ZLl5zvVQLyHvbQF3PrrDTnT/Wdft18AQAAA==
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Shortcuts.wxs'), (Expand-GzB64 $Shortcuts_wxs))
Write-Host 'WROTE Shortcuts.wxs'
$Registry_wxs = @'
H4sIAAYue2oC/42STVPCMBCG7/yKzI4HPZSAIh9Og4OFqiMgUxw9qOPUspTMtE0nSaH998byIRxQj+/mzZPs7mtf53FEligVFwmD
erUGBJNAzHgSMsj03GrDdbdiv/CcGGeiGCy0Tq8oXfFcCxEp1FUhQ6qCBca+ossGXeUKuhVCbFf6YYyJ/hZGOiJORWL0rRRZSu5n
DDwMudKy2B0pIH0uMdBCFgzux9On3nDoPg77Aw/WmH1QyXDi9GPLAXKbcVPrdNrtVqvZtC4vGw3r4uL83KrXazXLdQeDft9xbm56
vR3PELf3H7AgnhCawd3DcATEaAZTMdcrX+KbNxkRD5XIZICqVD2lMol7pD3Wsx9lSMZ+jKaRRGk/ikxrQJ6K1FSMw4wYSOli8HrQ
6nv58sTXCwYFmpnQP194Xq/wCP7kdOnL6kSKWRbojfXsP1hHJHMe/vLvtcEV0Qzl+3+Ik+wz4mqBx4gHQz4A2nRvTbsw0F0aNjGj
hzkrk0h/omhTk+Vu5QtXONy8+QIAAA==
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Registry.wxs'), (Expand-GzB64 $Registry_wxs))
Write-Host 'WROTE Registry.wxs'
$Payload_wxs = @'
H4sIAAYue2oC/1WQUWvCMBzE3/0U4f/exmrd3GiU2lqRiZM5GIzBCDXTQNuEJNV2n35pdd36lNxd+HG5YF7lGTozpbkoCHjuEBAr
UnHgxZFAab6cKcxng+CNV8i+LDSBkzHyEeMLr4wQmWbGFeqIdXpiOdX47ONLpWE2QChIFD3mrDCNsDISuRSF1SslSonWBwI7WmeC
HrpEA4q5YqkRqiaw3u5fw80med7Eyxe4Uv5zWkSUy88b5p1LQKuSW3cYeotRNI4dfzlJnLv76YMTLqLYWSZDbzT2J43TEZuqPGMt
rrn0eHtRqpQRcN0PebV/T/e7ybc0t2nPemL1jpoTgZrZD+GuOO6a3xbB/Una0fDfagG2s88GP8ocaJekAQAA
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Payload.wxs'), (Expand-GzB64 $Payload_wxs))
Write-Host 'WROTE Payload.wxs'

# Show the fixed condition lines for proof
Write-Host '--- Package.wxs condition lines ---' -ForegroundColor Cyan
Select-String -Path (Join-Path $WixDir 'Package.wxs') -Pattern 'Condition=' | ForEach-Object { $_.Line.Trim() }

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
Write-Host "Building..." -ForegroundColor Cyan
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
