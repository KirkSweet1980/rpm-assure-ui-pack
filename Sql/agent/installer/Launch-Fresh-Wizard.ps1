# Pull pack with cmd (git stderr is not a PowerShell error), then launch wizard 2.7.
$ErrorActionPreference = "Continue"
$git = "C:\Program Files\Git\cmd\git.exe"
$Pack = "C:\RPM-Assure\deploy\ui-pack"
$Repo = "https://github.com/KirkSweet1980/rpm-assure-ui-pack.git"

Write-Host "Stopping hung wizard windows..."
Get-Process powershell, powershell_ise -EA SilentlyContinue | ForEach-Object {
  if ($_.Id -eq $PID) { return }
  try {
    $cl = (Get-CimInstance Win32_Process -Filter ("ProcessId=" + $_.Id) -EA SilentlyContinue).CommandLine
    if ($cl -and ($cl -match "Install-Customer-Pack-Wizard|Install-Assure-Agent-Wizard")) {
      Stop-Process -Id $_.Id -Force -EA SilentlyContinue
    }
  } catch {}
}

New-Item -ItemType Directory -Force -Path (Split-Path $Pack) | Out-Null
if (Test-Path "$Pack\.git\index.lock") { Remove-Item "$Pack\.git\index.lock" -Force -EA SilentlyContinue }
if (Test-Path "$Pack\.git") {
  cmd /c "`"$git`" -C `"$Pack`" fetch --all --prune"
  cmd /c "`"$git`" -C `"$Pack`" reset --hard origin/main"
} else {
  if (Test-Path $Pack) { cmd /c ("rmdir /s /q `"" + $Pack + "`"") | Out-Null }
  cmd /c "`"$git`" clone --depth 1 --branch main $Repo `"$Pack`""
}

$wiz = Join-Path $Pack "Sql\agent\installer\Install-Customer-Pack-Wizard.ps1"
if (-not (Test-Path $wiz)) { throw "Wizard missing after git pull: $wiz" }
$head = cmd /c "`"$git`" -C `"$Pack`" log -1 --oneline"
Write-Host ("HEAD " + $head)

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
  if ($h -and ($h -eq $hostn -or $hostn -like ("*" + $h + "*") -or $h -like ("*" + $hostn + "*"))) {
    $code = $c; $name = $n; if ($h) { $hostn = $h }; break
  }
  if ($c -and $hostn -like ("*" + $c + "*")) {
    $code = $c; $name = $n; if ($h) { $hostn = $h }
  }
}
if (-not $code -and $cfgs.Count -eq 1) {
  $t = [string](Get-Content -LiteralPath $cfgs[0].FullName -Raw -EA SilentlyContinue)
  if ($t -match '(?m)^\s*\$CustomerCode\s*=\s*[''"]([^''"]+)') { $code = $Matches[1] }
  if ($t -match '(?m)^\s*\$DisplayName\s*=\s*[''"]([^''"]+)') { $name = $Matches[1] }
  if ($t -match '(?m)^\s*\$InstanceName\s*=\s*[''"]([^''"]+)') { $hostn = $Matches[1] }
  if (-not $code) { $code = [string]$cfgs[0].Directory.Name }
}
Write-Host ("Customer " + $(if ($code) { $code } else { "(type in wizard)" }) + " host=" + $hostn)
Write-Host "Launching wizard 2.7..."
$arg = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $wiz)
if ($code) { $arg += @("-CustomerCode", $code) }
if ($name) { $arg += @("-DisplayName", $name) }
if ($hostn) { $arg += @("-SqlHost", $hostn) }
& powershell.exe @arg
