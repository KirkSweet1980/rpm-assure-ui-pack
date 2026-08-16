# Able Tracers (ABLE) - launch Edge Agent wizard.
# Run as Administrator on the Able Tracers host (e.g. AT-SERVER).
# No SYSPRO cover: tick "No local SQL" if this box has no SQL, then Test central only.
$ErrorActionPreference = "Continue"
$git = "C:\Program Files\Git\cmd\git.exe"
$Pack = "C:\RPM-Assure\deploy\ui-pack"
$Repo = "https://github.com/KirkSweet1980/rpm-assure-ui-pack.git"
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
if (-not (Test-Path $wiz)) { throw "Wizard missing: $wiz" }
Write-Host "Launching Able Tracers (ABLE) wizard..."
$arg = @(
  "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $wiz,
  "-CustomerCode", "ABLE",
  "-DisplayName", "Able Tracers",
  "-SqlHost", $env:COMPUTERNAME
)
Start-Process powershell.exe -Verb RunAs -ArgumentList $arg
