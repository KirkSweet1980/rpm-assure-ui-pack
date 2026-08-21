# Temp-dir behavioral tests for deploy decoupling. Never uses C:\RPM-Assure production.
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$PwshExe = '/tmp/pwsh/pwsh'
)

$ErrorActionPreference = 'Stop'
$failed = 0
function Ok([bool]$cond, [string]$msg) {
  if ($cond) { Write-Host ("OK  " + $msg) }
  else { $script:failed++; Write-Host ("FAIL " + $msg) }
}

function Parse-Ast([string]$path) {
  $errs = $null; $tok = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$tok, [ref]$errs)
  return @{ File = $path; Errors = @($errs) }
}

$files = @(
  'deploy/Apply-UiPack.ps1',
  'deploy/Sync-UiPack-From-Git.ps1',
  'deploy/Stage-AgentPilot.ps1',
  'deploy/Publish-AgentRelease.ps1',
  'deploy/Install-Publish-Agent-Pack-Task.ps1',
  'deploy/Publish-Agent-Pack-IfStale.ps1',
  'deploy/Publish-Agent-Pack.ps1',
  'deploy/Update-AppServer.ps1'
)
Write-Host '=== AST PARSE ==='
$astFail = 0
foreach ($rel in $files) {
  $p = Join-Path $RepoRoot $rel
  $r = Parse-Ast $p
  $n = $r.Errors.Count
  $st = if ($n -eq 0) { 'PASS' } else { 'FAIL'; $astFail++ }
  Write-Host ("FILE " + $rel)
  Write-Host ("AST_PARSE = " + $st)
  Write-Host ("ERROR_COUNT = " + $n)
  foreach ($e in $r.Errors) { Write-Host ("ERROR_TEXT " + $e.ToString()) }
}
if ($astFail -gt 0) { throw 'AST parse failed' }

$tmp = Join-Path ([IO.Path]::GetTempPath()) ('rpma-decouple-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$mod = Join-Path $tmp 'StubWin.psm1'
@'
function Restart-Service { param([Parameter(ValueFromRemainingArguments)]$a) }
function Start-Service { param([Parameter(ValueFromRemainingArguments)]$a) }
function Stop-Service { param([Parameter(ValueFromRemainingArguments)]$a) }
Export-ModuleMember -Function Restart-Service,Start-Service,Stop-Service
'@ | Set-Content -LiteralPath $mod -Encoding ascii
$shim = Join-Path $tmp 'shim'
New-Item -ItemType Directory -Force -Path $shim | Out-Null

@'
#!/bin/bash
src="$1"; dst="$2"
mkdir -p "$dst"
if [ -d "$src" ]; then cp -a "$src"/. "$dst"/ 2>/dev/null || true; fi
exit 0
'@ | Set-Content -LiteralPath (Join-Path $shim 'robocopy') -Encoding ascii
@'
#!/bin/bash
exit 0
'@ | Set-Content -LiteralPath (Join-Path $shim 'sqlcmd') -Encoding ascii
(@'
#!/bin/bash
exec "__PWSH__" -NoProfile -File "__WRAP__" -- "$@"
'@).Replace('__PWSH__', $PwshExe).Replace('__WRAP__', (Join-Path $shim 'Invoke-WinPs.ps1')) | Set-Content -LiteralPath (Join-Path $shim 'powershell.exe') -Encoding ascii
@"
Import-Module '$mod' -Force
`$list = @(`$args)
`$i = 0
`$file = `$null
`$rest = @()
while (`$i -lt `$list.Count) {
  switch (`$list[`$i]) {
    '-NoProfile' { `$i++ }
    '--' { `$i++ }
    '-ExecutionPolicy' { `$i += 2 }
    '-File' { `$file = `$list[`$i+1]; `$i += 2 }
    default { `$rest += `$list[`$i]; `$i++ }
  }
}
if (-not `$file) { throw 'shim: no -File' }
& `$file @rest
exit `$LASTEXITCODE
"@ | Set-Content -LiteralPath (Join-Path $shim 'Invoke-WinPs.ps1') -Encoding ascii
@'
#!/bin/bash
echo "UNEXPECTED schtasks $*" >&2
exit 99
'@ | Set-Content -LiteralPath (Join-Path $shim 'schtasks') -Encoding ascii
Get-ChildItem $shim | ForEach-Object { & chmod +x $_.FullName }

$env:PATH = $shim + ':' + $env:PATH

function New-AgentPack([string]$Pack, [string]$ver) {
  $agent = Join-Path $Pack 'sql/agent'
  New-Item -ItemType Directory -Force -Path $agent | Out-Null
  foreach ($n in @('RpmAssure-Agent.ps1','Deploy-Assure-Agent.ps1','Update-From-Https.ps1','Start-Agent-Tray.ps1','Collect-Host-Patches.ps1','Lib-RpmaHttps.ps1','Apply-Staged-Pack.ps1','Uninstall-Assure-Agent.ps1','Install-Agent-Tray.ps1','Install-Agent-Service.ps1')) {
    Set-Content -LiteralPath (Join-Path $agent $n) -Value ("# dummy $n`n" + ('x' * 200)) -Encoding ascii
  }
  Set-Content -LiteralPath (Join-Path $agent 'VERSION') -Value $ver -Encoding ascii
  $src = Join-Path $Pack 'src'
  New-Item -ItemType Directory -Force -Path $src | Out-Null
  Set-Content -LiteralPath (Join-Path $src 'app.txt') -Value 'app' -Encoding ascii
  $dep = Join-Path $Pack 'deploy'
  New-Item -ItemType Directory -Force -Path $dep | Out-Null
  foreach ($leaf in @('Apply-UiPack.ps1','Sync-UiPack-From-Git.ps1','Publish-AgentRelease.ps1','Stage-AgentPilot.ps1','Publish-Agent-Pack.ps1','Publish-Agent-Pack-IfStale.ps1','Install-Publish-Agent-Pack-Task.ps1','Sanitise-Downloads-DeployScript.ps1')) {
    Copy-Item -Force (Join-Path $RepoRoot ('deploy/' + $leaf)) (Join-Path $dep $leaf)
  }
}

function Init-GitPack([string]$Pack) {
  Push-Location $Pack
  try {
    & git init -b main | Out-Null
    & git config user.email 't@t'
    & git config user.name 't'
    & git add -A
    & git commit -m seed --quiet
  } finally { Pop-Location }
}

function Install-TrustedControllers([string]$destRoot) {
  $dep = Join-Path $destRoot 'deploy'
  New-Item -ItemType Directory -Force -Path $dep | Out-Null
  foreach ($leaf in @('Apply-UiPack.ps1','Sync-UiPack-From-Git.ps1','Publish-AgentRelease.ps1','Stage-AgentPilot.ps1','Publish-Agent-Pack.ps1','Publish-Agent-Pack-IfStale.ps1','Install-Publish-Agent-Pack-Task.ps1')) {
    Copy-Item -Force (Join-Path $RepoRoot ('deploy/' + $leaf)) (Join-Path $dep $leaf)
  }
}

function File-Hash([string]$p) {
  if (-not (Test-Path $p)) { return 'MISSING' }
  return (Get-FileHash -Algorithm SHA256 $p).Hash
}

function New-Root([string]$dir) {
  New-Item -ItemType Directory -Force -Path (Join-Path $dir 'downloads') | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $dir 'App/src') | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $dir 'deploy') | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $dir 'logs') | Out-Null
  Set-Content -LiteralPath (Join-Path $dir 'downloads/VERSION') -Value "2.9.11`n" -Encoding ascii
  Set-Content -LiteralPath (Join-Path $dir 'downloads/rpm-assure-agent.zip') -Value ('z' * 1500) -Encoding ascii
}

function Invoke-PwshFile([string]$file, [string[]]$argList, [hashtable]$envExtra) {
  $prev = @{}
  if ($envExtra) {
    foreach ($k in $envExtra.Keys) { $prev[$k] = [Environment]::GetEnvironmentVariable($k); [Environment]::SetEnvironmentVariable($k, $envExtra[$k]) }
  }
  try {
    $tmpWin = Join-Path $tmp 'win-temp'
    New-Item -ItemType Directory -Force -Path $tmpWin | Out-Null
    $prev['TEMP'] = [Environment]::GetEnvironmentVariable('TEMP')
    $prev['TMP'] = [Environment]::GetEnvironmentVariable('TMP')
    [Environment]::SetEnvironmentVariable('TEMP', $tmpWin)
    [Environment]::SetEnvironmentVariable('TMP', $tmpWin)
    if ($envExtra) {
      foreach ($k in $envExtra.Keys) { $prev[$k] = [Environment]::GetEnvironmentVariable($k); [Environment]::SetEnvironmentVariable($k, $envExtra[$k]) }
    }
    $argLit = ($argList | ForEach-Object { if ($_ -match '\s') { "'" + ($_ -replace "'","''") + "'" } else { $_ } }) -join ' '
    $cmd = "Import-Module '$mod' -Force; & '$file' $argLit; exit `$LASTEXITCODE"
    $out = & $PwshExe -NoProfile -Command $cmd 2>&1
    $code = $LASTEXITCODE
    foreach ($line in @($out)) { Write-Host $line }
    return [int]$code
  } finally {
    foreach ($k in $prev.Keys) { [Environment]::SetEnvironmentVariable($k, $prev[$k]) }
  }
}

function Read-Ver([string]$root) {
  $p = Join-Path $root 'downloads/VERSION'
  if (-not (Test-Path $p)) { return '?' }
  return ((Get-Content $p -Raw) -replace '\s','')
}

# ---- A ----
Write-Host '=== TEST A APPLY APP-ONLY ==='
$aRoot = Join-Path $tmp 'A-root'
$aPack = Join-Path $tmp 'A-pack'
New-Root $aRoot
Install-TrustedControllers $aRoot
$sentinelA = Join-Path $aRoot 'deploy/Apply-UiPack.ps1'
$sentHashA = File-Hash $sentinelA
$pubHashA = File-Hash (Join-Path $aRoot 'deploy/Publish-AgentRelease.ps1')
New-Item -ItemType Directory -Force -Path $aPack | Out-Null
New-AgentPack $aPack '2.10.1'
Init-GitPack $aPack
$beforeA = Read-Ver $aRoot
$codeA = Invoke-PwshFile (Join-Path $RepoRoot 'deploy/Apply-UiPack.ps1') @('-Root',$aRoot,'-Pack',$aPack,'-SkipGitReset')
$afterA = Read-Ver $aRoot
Ok ($codeA -eq 0) "A exit 0 ($codeA)"
Ok ($beforeA -eq '2.9.11') "A before=2.9.11"
Ok ($afterA -eq '2.9.11') "A after=2.9.11"
Ok (-not (Test-Path (Join-Path $aRoot 'downloads/pilot'))) "A no pilot dir"
Ok ((File-Hash $sentinelA) -eq $sentHashA) "A trusted Apply-UiPack not overwritten"
Ok ((File-Hash (Join-Path $aRoot 'deploy/Publish-AgentRelease.ps1')) -eq $pubHashA) "A trusted Publish-AgentRelease not overwritten"
Write-Host ("A VERSION before=$beforeA after=$afterA")

# ---- B ----
Write-Host '=== TEST B SYNC ==='
$bTmp = Join-Path $tmp 'B'
$origin = Join-Path $bTmp 'origin.git'
$bPack = Join-Path $bTmp 'pack'
$bRoot = Join-Path $bTmp 'root'
New-Item -ItemType Directory -Force -Path $bTmp | Out-Null
& git init --bare --initial-branch=main $origin | Out-Null
& git clone $origin $bPack 2>$null | Out-Null
New-AgentPack $bPack '2.10.1'
Push-Location $bPack
try {
  & git checkout -B main | Out-Null
  & git config user.email 't@t'; & git config user.name 't'
  & git add -A; & git commit -m c1 --quiet
  & git push -u origin main 2>$null | Out-Null
} finally { Pop-Location }
$other = Join-Path $bTmp 'other'
& git clone -b main $origin $other 2>&1 | Out-Host
Push-Location $other
try {
  & git config user.email 't@t'; & git config user.name 't'
  Set-Content extra.txt 'moved' -Encoding ascii
  & git add extra.txt; & git commit -m c2 --quiet
  & git push origin main 2>&1 | Out-Host
} finally { Pop-Location }
$localB = (& git -C $bPack rev-parse HEAD).Trim()
$remB = (& git -C $bPack ls-remote origin refs/heads/main).ToString().Split()[0]
if ($localB -eq $remB) { throw "B setup failed: pack already at origin/main $localB" }
New-Root $bRoot
Install-TrustedControllers $bRoot
Copy-Item -Force (Join-Path $RepoRoot 'deploy/Apply-UiPack.ps1') (Join-Path $bPack 'deploy/Apply-UiPack.ps1')
$beforeB = Read-Ver $bRoot
$codeB = Invoke-PwshFile (Join-Path $RepoRoot 'deploy/Sync-UiPack-From-Git.ps1') @('-Root',$bRoot,'-Pack',$bPack)
$afterB = Read-Ver $bRoot
Ok ($codeB -eq 0) "B exit 0 ($codeB)"
Ok ($beforeB -eq '2.9.11' -and $afterB -eq '2.9.11') "B VERSION unchanged"
Write-Host ("B VERSION before=$beforeB after=$afterB")

# ---- C ----
Write-Host '=== TEST C IFSTALE NO-OP ==='
$cRoot = Join-Path $tmp 'C-root'
New-Root $cRoot
$zipBefore = (Get-Item (Join-Path $cRoot 'downloads/rpm-assure-agent.zip')).Length
$codeC = Invoke-PwshFile (Join-Path $RepoRoot 'deploy/Publish-Agent-Pack-IfStale.ps1') @('-Root',$cRoot)
$afterC = Read-Ver $cRoot
$zipAfter = (Get-Item (Join-Path $cRoot 'downloads/rpm-assure-agent.zip')).Length
Ok ($codeC -eq 0) "C exit 0"
Ok ($afterC -eq '2.9.11') "C VERSION unchanged"
Ok ($zipBefore -eq $zipAfter) "C zip unchanged"

# ---- D ----
Write-Host '=== TEST D TASK INSTALLER REFUSE ==='
$dRoot = Join-Path $tmp 'D-root'
New-Root $dRoot
$codeD = Invoke-PwshFile (Join-Path $RepoRoot 'deploy/Install-Publish-Agent-Pack-Task.ps1') @('-Root',$dRoot)
Ok ($codeD -eq 0) "D refuse exit 0 (no schtasks)"
Ok ((Read-Ver $dRoot) -eq '2.9.11') "D VERSION unchanged"

# ---- E ----
Write-Host '=== TEST E PUBLISH FAIL CLOSED ==='
$eRoot = Join-Path $tmp 'E-root'
$ePack = Join-Path $tmp 'E-pack'
New-Root $eRoot
New-Item -ItemType Directory -Force -Path $ePack | Out-Null
New-AgentPack $ePack '2.10.1'
Remove-Item -Force (Join-Path $ePack 'sql/agent/RpmAssure-Agent.ps1')
$codeE = Invoke-PwshFile (Join-Path $RepoRoot 'deploy/Publish-AgentRelease.ps1') @('-Root',$eRoot,'-Pack',$ePack,'-CandidateVersion','2.10.1','-SkipPublicVerify') @{ RPM_ASSURE_RELEASE_MODE = 'TEST' }
Ok ($codeE -ne 0) "E missing agent fails ($codeE)"
Ok ((Read-Ver $eRoot) -eq '2.9.11') "E VERSION unchanged"

# ---- F ----
Write-Host '=== TEST F EXPLICIT RELEASE TEST MODE ==='
$fRoot = Join-Path $tmp 'F-root'
$fPack = Join-Path $tmp 'F-pack'
New-Root $fRoot
New-Item -ItemType Directory -Force -Path $fPack | Out-Null
New-AgentPack $fPack '2.10.1'
$beforeF = Read-Ver $fRoot
$codeF = Invoke-PwshFile (Join-Path $RepoRoot 'deploy/Publish-AgentRelease.ps1') @('-Root',$fRoot,'-Pack',$fPack,'-CandidateVersion','2.10.1','-SkipPublicVerify') @{ RPM_ASSURE_RELEASE_MODE = 'TEST' }
$afterF = Read-Ver $fRoot
Ok ($codeF -eq 0) "F exit 0 ($codeF)"
Ok ($beforeF -eq '2.9.11') "F before=2.9.11"
Ok ($afterF -eq '2.10.1') "F after=2.10.1"
$bak = Get-ChildItem -Directory (Join-Path $fRoot 'backups/agent-release') -ErrorAction SilentlyContinue
Ok ($null -ne $bak -and $bak.Count -ge 1) "F rollback artifacts"
Write-Host ("F VERSION before=$beforeF candidate=2.10.1 after=$afterF")

# prove app-only still cannot change after F pattern on a fresh root
$f2 = Join-Path $tmp 'F2-root'
$f2p = Join-Path $tmp 'F2-pack'
New-Root $f2
New-Item -ItemType Directory -Force -Path $f2p | Out-Null
New-AgentPack $f2p '2.10.1'
Init-GitPack $f2p
[void](Invoke-PwshFile (Join-Path $RepoRoot 'deploy/Apply-UiPack.ps1') @('-Root',$f2,'-Pack',$f2p,'-SkipGitReset'))
Ok ((Read-Ver $f2) -eq '2.9.11') "F proof: app-only still 2.9.11"

# ---- G ----
Write-Host '=== TEST G PILOT STAGING ==='
$gRoot = Join-Path $tmp 'G-root'
$gPack = Join-Path $tmp 'G-pack'
New-Root $gRoot
New-Item -ItemType Directory -Force -Path $gPack | Out-Null
New-AgentPack $gPack '2.10.1'
$zipG = Get-FileHash (Join-Path $gRoot 'downloads/rpm-assure-agent.zip')
$beforeG = Read-Ver $gRoot
$codeG = Invoke-PwshFile (Join-Path $RepoRoot 'deploy/Stage-AgentPilot.ps1') @('-Root',$gRoot,'-Pack',$gPack,'-PilotHost','RPMINT-TEST01','-CandidateVersion','2.10.1')
$afterG = Read-Ver $gRoot
$pilot = Join-Path $gRoot 'downloads/pilot/2.10.1/RPMINT-TEST01/RpmAssure-Agent.ps1'
Ok ($codeG -eq 0) "G exit 0 ($codeG)"
Ok ($beforeG -eq '2.9.11' -and $afterG -eq '2.9.11') "G VERSION unchanged"
Ok (Test-Path $pilot) "G staged under pilot/2.10.1/host"
Ok ((Get-FileHash (Join-Path $gRoot 'downloads/rpm-assure-agent.zip')).Hash -eq $zipG.Hash) "G global zip unchanged"
Write-Host ("G VERSION before=$beforeG after=$afterG")

function Write-MaliciousApply([string]$path) {
  @"
param([string]`$Root='C:\RPM-Assure',[string]`$Pack='',[switch]`$SkipGitReset,[switch]`$PublishAgent,[string]`$CandidateVersion='')
`$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Force -Path (Join-Path `$Root 'downloads') | Out-Null
Set-Content -LiteralPath (Join-Path `$Root 'downloads/VERSION') -Value '9.9.9' -Encoding ascii
Set-Content -LiteralPath (Join-Path `$Root 'deploy/Apply-UiPack.ps1') -Value 'MALICIOUS-PACK-APPLY' -Encoding ascii
Write-Host 'MALICIOUS PACK APPLY RAN'
exit 0
"@ | Set-Content -LiteralPath $path -Encoding ascii
}

# ---- H Apply cannot overwrite protected controllers ----
Write-Host '=== TEST H CONTROLLER IMMUTABILITY ==='
$hRoot = Join-Path $tmp 'H-root'
$hPack = Join-Path $tmp 'H-pack'
New-Root $hRoot
Install-TrustedControllers $hRoot
New-Item -ItemType Directory -Force -Path $hPack | Out-Null
New-AgentPack $hPack '2.10.1'
Init-GitPack $hPack
Write-MaliciousApply (Join-Path $hPack 'deploy/Apply-UiPack.ps1')
Write-MaliciousApply (Join-Path $hPack 'deploy/Publish-AgentRelease.ps1')
$hBefore = @{
  Apply = File-Hash (Join-Path $hRoot 'deploy/Apply-UiPack.ps1')
  Pub = File-Hash (Join-Path $hRoot 'deploy/Publish-AgentRelease.ps1')
  Sync = File-Hash (Join-Path $hRoot 'deploy/Sync-UiPack-From-Git.ps1')
  Stage = File-Hash (Join-Path $hRoot 'deploy/Stage-AgentPilot.ps1')
}
$codeH = Invoke-PwshFile (Join-Path $RepoRoot 'deploy/Apply-UiPack.ps1') @('-Root',$hRoot,'-Pack',$hPack,'-SkipGitReset')
Ok ($codeH -eq 0) "H apply exit 0 ($codeH)"
Ok ((Read-Ver $hRoot) -eq '2.9.11') "H VERSION 2.9.11"
Ok ((File-Hash (Join-Path $hRoot 'deploy/Apply-UiPack.ps1')) -eq $hBefore.Apply) "H Root Apply not overwritten"
Ok ((File-Hash (Join-Path $hRoot 'deploy/Publish-AgentRelease.ps1')) -eq $hBefore.Pub) "H Root Publish-AgentRelease not overwritten"
Ok ((File-Hash (Join-Path $hRoot 'deploy/Sync-UiPack-From-Git.ps1')) -eq $hBefore.Sync) "H Root Sync not overwritten"
Ok ((File-Hash (Join-Path $hRoot 'deploy/Stage-AgentPilot.ps1')) -eq $hBefore.Stage) "H Root Stage not overwritten"
Ok ((Get-Content (Join-Path $hRoot 'deploy/Apply-UiPack.ps1') -Raw) -notmatch 'MALICIOUS-PACK-APPLY') "H Root Apply not pack-malicious"

# ---- I Sync ignores pack Apply ----
Write-Host '=== TEST I SYNC IGNORES PACK APPLY ==='
$iTmp = Join-Path $tmp 'I'
$iOrigin = Join-Path $iTmp 'origin.git'
$iPack = Join-Path $iTmp 'pack'
$iRoot = Join-Path $iTmp 'root'
New-Item -ItemType Directory -Force -Path $iTmp | Out-Null
& git init --bare --initial-branch=main $iOrigin | Out-Null
& git clone $iOrigin $iPack 2>&1 | Out-Null
New-AgentPack $iPack '2.10.1'
Push-Location $iPack
try {
  & git checkout -B main | Out-Null
  & git config user.email 't@t'; & git config user.name 't'
  & git add -A; & git commit -m c1 --quiet
  & git push -u origin main 2>&1 | Out-Null
} finally { Pop-Location }
$iOther = Join-Path $iTmp 'other'
& git clone -b main $iOrigin $iOther 2>&1 | Out-Null
Push-Location $iOther
try {
  & git config user.email 't@t'; & git config user.name 't'
  Set-Content extra.txt 'moved' -Encoding ascii
  & git add extra.txt; & git commit -m c2 --quiet
  & git push origin main 2>&1 | Out-Null
} finally { Pop-Location }
New-Root $iRoot
Install-TrustedControllers $iRoot
Write-MaliciousApply (Join-Path $iPack 'deploy/Apply-UiPack.ps1')
$codeI = Invoke-PwshFile (Join-Path $RepoRoot 'deploy/Sync-UiPack-From-Git.ps1') @('-Root',$iRoot,'-Pack',$iPack)
Ok ($codeI -eq 0) "I sync exit 0 ($codeI)"
Ok ((Read-Ver $iRoot) -eq '2.9.11') "I VERSION 2.9.11 (pack Apply ignored)"
Ok ((Get-Content (Join-Path $iRoot 'deploy/Apply-UiPack.ps1') -Raw) -notmatch 'MALICIOUS-PACK-APPLY') "I Root Apply still trusted"

# ---- J Sync fail-closed if Root Apply missing ----
Write-Host '=== TEST J SYNC FAIL-CLOSED MISSING ROOT APPLY ==='
$jTmp = Join-Path $tmp 'J'
$jOrigin = Join-Path $jTmp 'origin.git'
$jPack = Join-Path $jTmp 'pack'
$jRoot = Join-Path $jTmp 'root'
New-Item -ItemType Directory -Force -Path $jTmp | Out-Null
& git init --bare --initial-branch=main $jOrigin | Out-Null
& git clone $jOrigin $jPack 2>&1 | Out-Null
New-AgentPack $jPack '2.10.1'
Push-Location $jPack
try {
  & git checkout -B main | Out-Null
  & git config user.email 't@t'; & git config user.name 't'
  & git add -A; & git commit -m c1 --quiet
  & git push -u origin main 2>&1 | Out-Null
} finally { Pop-Location }
$jOther = Join-Path $jTmp 'other'
& git clone -b main $jOrigin $jOther 2>&1 | Out-Null
Push-Location $jOther
try {
  & git config user.email 't@t'; & git config user.name 't'
  Set-Content extra.txt 'moved' -Encoding ascii
  & git add extra.txt; & git commit -m c2 --quiet
  & git push origin main 2>&1 | Out-Null
} finally { Pop-Location }
New-Root $jRoot
Write-MaliciousApply (Join-Path $jPack 'deploy/Apply-UiPack.ps1')
Remove-Item -Force (Join-Path $jRoot 'deploy/Apply-UiPack.ps1') -ErrorAction SilentlyContinue
$codeJ = Invoke-PwshFile (Join-Path $RepoRoot 'deploy/Sync-UiPack-From-Git.ps1') @('-Root',$jRoot,'-Pack',$jPack)
Ok ($codeJ -ne 0) "J missing Root Apply fails ($codeJ)"
Ok ((Read-Ver $jRoot) -eq '2.9.11') "J VERSION unchanged"
Ok (-not (Test-Path (Join-Path $jRoot 'deploy/Apply-UiPack.ps1')) -or ((Get-Content (Join-Path $jRoot 'deploy/Apply-UiPack.ps1') -Raw) -notmatch 'MALICIOUS')) "J pack Apply not installed"

Write-Host ''

Write-Host ''
if ($failed -gt 0) {
  Write-Host ("HARNESS FAIL count=$failed tmp=$tmp")
  exit 1
}
Write-Host 'HARNESS PASS'
Write-Host ("TMP=" + $tmp)
exit 0
