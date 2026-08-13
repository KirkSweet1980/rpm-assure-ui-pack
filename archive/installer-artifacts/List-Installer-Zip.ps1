# Manual extract proof - run if Build fails
$ErrorActionPreference = 'Stop'
$zip = Get-ChildItem "$env:USERPROFILE\Downloads\RPMAssure-Windows-Installer*.zip" |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $zip) { throw 'zip missing in Downloads' }
Write-Host "Using $($zip.FullName) size=$($zip.Length) time=$($zip.LastWriteTime)"
$tmp = Join-Path $env:TEMP 'rpma_zip_list'
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($zip.FullName, $tmp)
Write-Host '--- all .csproj ---'
Get-ChildItem $tmp -Recurse -Filter *.csproj | ForEach-Object { $_.FullName }
Write-Host '--- setup-wizard files ---'
Get-ChildItem $tmp -Recurse -Directory -Filter setup-wizard | ForEach-Object {
  Write-Host $_.FullName
  Get-ChildItem $_.FullName | ForEach-Object { Write-Host "  $($_.Name)" }
}
Write-Host '--- top of extract ---'
Get-ChildItem $tmp | ForEach-Object { Write-Host $_.FullName }
