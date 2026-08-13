# Set BETTER_AUTH_URL and VITE_APP_URL for HTTPS hostname
$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$envFile = Join-Path $App '.env.local'
if (-not (Test-Path -LiteralPath $envFile)) {
  throw ('Missing ' + $envFile)
}
$hostUrl = 'https://assure.rpmresources.co.za'
$lines = Get-Content -LiteralPath $envFile
$keys = @('BETTER_AUTH_URL', 'VITE_APP_URL', 'BETTER_AUTH_TRUSTED_ORIGINS')
$kept = foreach ($line in $lines) {
  $t = $line.Trim()
  if (-not $t -or $t.StartsWith('#')) { $line; continue }
  $k = $t.Split('=')[0].Trim()
  if ($keys -contains $k) { continue }
  $line
}
$add = @(
  ('BETTER_AUTH_URL=' + $hostUrl),
  ('VITE_APP_URL=' + $hostUrl),
  ('BETTER_AUTH_TRUSTED_ORIGINS=' + $hostUrl)
)
$body = ($kept + '' + $add + '') -join "`n"
[System.IO.File]::WriteAllText($envFile, $body, [System.Text.UTF8Encoding]::new($false))
Write-Host ('Updated ' + $envFile) -ForegroundColor Green
Write-Host 'Restart the app process so auth picks up the new URL.'
