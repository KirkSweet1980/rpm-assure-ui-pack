# Copy UVSS pack from Downloads to C:\RPM-Assure\Sql\customers\UVSS
$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure\Sql\customers\UVSS'
$Downloads = Join-Path $env:USERPROFILE 'Downloads'
$Zip = Join-Path $Downloads 'RPMAssure_UVSS_Finish.zip'
if (-not (Test-Path -LiteralPath $Zip)) {
  $c = Get-ChildItem -LiteralPath $Downloads -Filter 'RPMAssure_UVSS_Finish*.zip' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($null -eq $c) { throw 'Place RPMAssure_UVSS_Finish.zip in Downloads' }
  $Zip = $c.FullName
}
New-Item -ItemType Directory -Force -Path $Root | Out-Null
$tmp = Join-Path $env:TEMP ('uvss_' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
Expand-Archive -LiteralPath $Zip -DestinationPath $tmp -Force
$payload = $tmp
$kids = @(Get-ChildItem -LiteralPath $tmp -Directory -ErrorAction SilentlyContinue)
if (($kids.Count -eq 1) -and -not (Test-Path -LiteralPath (Join-Path $tmp 'Finish-UVSS-OnCustomer.ps1'))) {
  $payload = $kids[0].FullName
}
$nested = Join-Path $payload 'sql\customers\UVSS'
if (Test-Path -LiteralPath $nested) { $payload = $nested }
Get-ChildItem -LiteralPath $payload -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $Root -Recurse -Force
}
Write-Host ('Installed to ' + $Root) -ForegroundColor Green
Get-ChildItem -LiteralPath $Root -Filter '*.ps1' | Select-Object Name | Format-Table -AutoSize
Write-Host 'Next:'
Write-Host ('  powershell -NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $Root 'Finish-UVSS-OnCustomer.ps1') + '"')
