# Insert /downloads file_server into the live Caddyfile and reload Caddy.
param([string]$Caddyfile = 'C:\RPM-Assure\deploy\Caddyfile')
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $Caddyfile)) { throw "Missing $Caddyfile" }
$txt = Get-Content -LiteralPath $Caddyfile -Raw
if ($txt -match 'handle_path /downloads') {
  Write-Host 'Caddy already has /downloads'
} else {
  $block = @'

	# Agent pack — disk, not Vite. Customers never hit GitHub.
	handle_path /downloads/* {
		root * C:\RPM-Assure\downloads
		file_server
	}
'@
  if ($txt -match 'handle /healthz \{[^}]+\}') {
    $txt = $txt -replace '(handle /healthz \{[^}]+\})', ('$1' + $block)
  } else {
    $txt = $txt -replace '(https://assure\.rpmresources\.co\.za \{)', ('$1' + $block)
  }
  Set-Content -LiteralPath $Caddyfile -Value $txt -Encoding ASCII
  Write-Host 'Patched Caddyfile /downloads'
}
New-Item -ItemType Directory -Force -Path 'C:\RPM-Assure\downloads' | Out-Null

$caddy = 'C:\RPM-Assure\deploy\caddy.exe'
if (-not (Test-Path $caddy)) {
  $caddy = (Get-Command caddy -ErrorAction SilentlyContinue).Source
}
if ($caddy) {
  & $caddy reload --config $Caddyfile --adapter caddyfile
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'reload failed - restarting Caddy process'
    Get-Process caddy -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Process -FilePath $caddy -ArgumentList @('run','--config',$Caddyfile,'--adapter','caddyfile') -WindowStyle Hidden
    Start-Sleep -Seconds 2
  }
} else {
  Write-Host 'caddy.exe not found - restart Caddy service if you have one'
}
Write-Host 'Caddy /downloads ready -> C:\RPM-Assure\downloads'
