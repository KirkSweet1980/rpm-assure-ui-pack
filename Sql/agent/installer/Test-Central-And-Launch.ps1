# Full AHI / customer SQL host script:
#   1) git pull
#   2) test central as IP:Port
#   3) launch wizard 2.4
# Paste the WHOLE file in Administrator PowerShell, or:
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\Sql\agent\installer\Test-Central-And-Launch.ps1
$ErrorActionPreference = "Stop"
$git = "C:\Program Files\Git\cmd\git.exe"
$Pack = "C:\RPM-Assure\deploy\ui-pack"
$Repo = "https://github.com/KirkSweet1980/rpm-assure-ui-pack.git"
$CentralIp = "102.222.21.220"
$CentralPort = 14333
$CentralColon = $CentralIp + ":" + $CentralPort
$CentralComma = $CentralIp + "," + $CentralPort

Write-Host "========================================"
Write-Host " RPM Assure - test central IP:Port"
Write-Host "========================================"

Get-Process powershell -EA SilentlyContinue | ForEach-Object {
  try {
    $cl = (Get-CimInstance Win32_Process -Filter ("ProcessId=" + $_.Id) -EA SilentlyContinue).CommandLine
    if ($cl -and ($cl -match "Install-Customer-Pack-Wizard|Launch-Fresh-Wizard|Test-Central-And-Launch")) {
      if ($_.Id -ne $PID) { Stop-Process -Id $_.Id -Force -EA SilentlyContinue }
    }
  } catch {}
}

New-Item -ItemType Directory -Force -Path (Split-Path $Pack) | Out-Null
if (Test-Path "$Pack\.git\index.lock") { Remove-Item "$Pack\.git\index.lock" -Force -EA SilentlyContinue }
if (Test-Path "$Pack\.git") {
  & $git -C $Pack fetch --all --prune
  & $git -C $Pack reset --hard origin/main
} else {
  & $git clone --depth 1 --branch main $Repo $Pack
}
Write-Host ("HEAD " + (& $git -C $Pack log -1 --oneline))

Write-Host ""
Write-Host ("TCP test " + $CentralColon + " ...")
$tnc = Test-NetConnection -ComputerName $CentralIp -Port $CentralPort -WarningAction SilentlyContinue
Write-Host ("  TcpTestSucceeded = " + $tnc.TcpTestSucceeded)
Write-Host ("  RemoteAddress    = " + $tnc.RemoteAddress)

$sqlOk = $false
if ($tnc.TcpTestSucceeded) {
  . (Join-Path $Pack "Sql\agent\installer\Sql-Connect.ps1")
  Write-Host ("SQL test Data Source=" + $CentralComma + " (colon converted for SQL) ...")
  $r = Test-RpmaCentral -Server $CentralColon -User "rpmassure" -Password "@ssuR3me!"
  if ($r.Ok) {
    Write-Host ("  SQL OK as " + $r.Who)
    $sqlOk = $true
  } else {
    Write-Host ("  SQL FAIL: " + $r.Error)
  }
} else {
  Write-Host "  PORT BLOCKED. Open outbound TCP 14333 to 102.222.21.220:14333"
}

Write-Host ""
Write-Host "Launching wizard. Central host field uses IP:Port."
$wiz = Join-Path $Pack "Sql\agent\installer\Install-Customer-Pack-Wizard.ps1"
$code = ""
$name = ""
$hostn = [string]$env:COMPUTERNAME
$cfgs = @(Get-ChildItem "C:\RPM-Assure\Sql\customers" -Filter "Customer.Config.ps1" -Recurse -EA SilentlyContinue)
foreach ($f in $cfgs) {
  $t = [string](Get-Content -LiteralPath $f.FullName -Raw -EA SilentlyContinue)
  $c = ""; $n = ""; $h = ""
  if ($t -match '(?m)^\s*\$CustomerCode\s*=\s*[''"]([^''"]+)') { $c = $Matches[1] }
  if ($t -match '(?m)^\s*\$DisplayName\s*=\s*[''"]([^''"]+)') { $n = $Matches[1] }
  if ($t -match '(?m)^\s*\$InstanceName\s*=\s*[''"]([^''"]+)') { $h = $Matches[1] }
  if (-not $c) { $c = [string]$f.Directory.Name }
  if ($c -and $hostn -like ("*" + $c + "*")) { $code = $c; $name = $n; if ($h) { $hostn = $h } }
}
if (-not $code -and $cfgs.Count -eq 1) {
  $t = [string](Get-Content -LiteralPath $cfgs[0].FullName -Raw -EA SilentlyContinue)
  if ($t -match '(?m)^\s*\$CustomerCode\s*=\s*[''"]([^''"]+)') { $code = $Matches[1] }
  if ($t -match '(?m)^\s*\$DisplayName\s*=\s*[''"]([^''"]+)') { $name = $Matches[1] }
  if (-not $code) { $code = [string]$cfgs[0].Directory.Name }
}
$arg = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $wiz)
if ($code) { $arg += @("-CustomerCode", $code) }
if ($name) { $arg += @("-DisplayName", $name) }
if ($hostn) { $arg += @("-SqlHost", $hostn) }
Write-Host ("Customer=" + $(if ($code) { $code } else { "?" }) + " Tcp=" + $tnc.TcpTestSucceeded + " Sql=" + $sqlOk)
& powershell.exe @arg
