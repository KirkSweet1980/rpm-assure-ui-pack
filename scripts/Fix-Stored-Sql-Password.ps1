# Fix stored SQL password in data/rpma-settings.json
$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$path = Join-Path $App 'data\rpma-settings.json'
if (-not (Test-Path -LiteralPath $path)) {
  throw ('Missing ' + $path + ' - Save SQL settings once first')
}

$raw = Get-Content -LiteralPath $path -Raw -Encoding UTF8
$j = $raw | ConvertFrom-Json
$pwd = 'RpmCollect#AHIC2026'
$fixed = 0

if ($null -eq $j.sqlConnections -or $j.sqlConnections.Count -eq 0) {
  throw 'No sqlConnections in settings file'
}

foreach ($c in $j.sqlConnections) {
  $isPrimary = $false
  if ($c.PSObject.Properties.Name -contains 'isPrimary') {
    $isPrimary = [bool]$c.isPrimary
  }
  if ($isPrimary -or $j.sqlConnections.Count -eq 1) {
    $old = [string]$c.password
    $c.password = $pwd
    $fixed++
    Write-Host ('Primary password set. Was length=' + $old.Length + ', now length=' + $pwd.Length)
  }
}

# If nothing marked primary, fix first connection
if ($fixed -eq 0) {
  $c = $j.sqlConnections[0]
  $old = [string]$c.password
  $c.password = $pwd
  $c.isPrimary = $true
  $fixed++
  Write-Host ('First connection password set. Was length=' + $old.Length + ', now length=' + $pwd.Length)
}

$j.updatedAt = (Get-Date).ToUniversalTime().ToString('o')
$json = $j | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($path, $json, [System.Text.UTF8Encoding]::new($false))
Write-Host ('Wrote ' + $path + ' (fixed=' + $fixed + ')')
Write-Host 'Restart vite, then Test connection (leave password blank).'
