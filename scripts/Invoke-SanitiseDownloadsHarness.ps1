# Temp-dir tests for deploy/Sanitise-Downloads-DeployScript.ps1. Never uses production secrets.
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

$san = Join-Path $RepoRoot 'deploy/Sanitise-Downloads-DeployScript.ps1'
$tok = $null; $errs = $null
[void][System.Management.Automation.Language.Parser]::ParseFile($san, [ref]$tok, [ref]$errs)
$nErr = @($errs).Count
Write-Host '=== AST SANITISER ==='
Write-Host ("AST_PARSE = " + $(if ($nErr -eq 0) { 'PASS' } else { 'FAIL' }))
Write-Host ("ERROR_COUNT = " + $nErr)
foreach ($e in @($errs)) { Write-Host ("ERROR_TEXT " + $e.ToString()) }
Ok ($nErr -eq 0) "sanitiser AST 0 errors"

$src = Get-Content $san -Raw
Ok ($src -notmatch 'schtasks') "L: no schtasks"
Ok ($src -notmatch 'Restart-Service') "L: no Restart-Service"
Ok ($src -notmatch 'sqlcmd') "L: no sqlcmd"
Ok ($src -notmatch 'Publish-Agent') "L: no Agent publication"
Ok ($src -notmatch 'WriteAllText\(\$verFile') "L: no VERSION write"

$fake = 'FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE'
if ($fake.Length -ne 32) { throw 'fixture fake must be 32 chars' }

function New-Fixture([string]$dir, [string]$secretDefault) {
  New-Item -ItemType Directory -Force -Path (Join-Path $dir 'downloads') | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $dir 'logs') | Out-Null
  Set-Content -LiteralPath (Join-Path $dir 'downloads/VERSION') -Value "2.9.11`n" -Encoding ascii
  Set-Content -LiteralPath (Join-Path $dir 'downloads/rpm-assure-agent.zip') -Value ('Z' * 1500) -Encoding ascii
  Set-Content -LiteralPath (Join-Path $dir 'downloads/rpm-assure-agent.msi') -Value ('M' * 800) -Encoding ascii
  $installer = @"
# Deploy-Assure-Agent.ps1 fixture KEEP-UNRELATED
param(
  [string]`$CustomerCode = '',
  [string]`$AgentSecret = $secretDefault,
  [string]`$AppHttpsUrl = 'https://assure.rpmresources.co.za',
  [switch]`$Unattended
)
Write-Host 'KEEP-UNRELATED'
if (-not `$AgentSecret) { throw 'AgentSecret is required' }
"@
  Set-Content -LiteralPath (Join-Path $dir 'downloads/Deploy-Assure-Agent.ps1') -Value $installer -Encoding ascii
}

function Invoke-San([string]$root) {
  $out = & $PwshExe -NoProfile -File $san -Root $root 2>&1
  return @{ Code = [int]$LASTEXITCODE; Out = ($out | Out-String) }
}

function Read-Ver([string]$root) {
  return ((Get-Content (Join-Path $root 'downloads/VERSION') -Raw) -replace '\s', '')
}

function Agent-LiteralLen([string]$path) {
  $t = [IO.File]::ReadAllText($path)
  $tok=$null; $err=$null
  $ast = [System.Management.Automation.Language.Parser]::ParseInput($t, [ref]$tok, [ref]$err)
  $ps = @(
    $ast.FindAll({
        param($n)
        $n -is [System.Management.Automation.Language.ParameterAst] -and $n.Name.VariablePath.UserPath -eq 'AgentSecret'
      }, $true)
  )
  if ($ps.Count -ne 1) { return -1 }
  $max = 0
  $nodes = @($ps[0].DefaultValue)
  if ($null -ne $ps[0].DefaultValue) {
    $nodes += @($ps[0].DefaultValue.FindAll({ param($n) $n -is [System.Management.Automation.Language.StringConstantExpressionAst] }, $true))
  }
  foreach ($lit in $nodes) {
    if ($lit -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
      $len = ([string]$lit.Value).Trim().Length
      if ($len -gt $max) { $max = $len }
    }
  }
  return $max
}

$tmp = Join-Path ([IO.Path]::GetTempPath()) ('rpma-san-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

# A-H happy path
Write-Host '=== A-H SANITISE FAKE SECRET ==='
$a = Join-Path $tmp 'A'
New-Fixture $a ("'" + $fake + "'")
$zipH = (Get-FileHash (Join-Path $a 'downloads/rpm-assure-agent.zip')).Hash
$msiH = (Get-FileHash (Join-Path $a 'downloads/rpm-assure-agent.msi')).Hash
$beforeText = [IO.File]::ReadAllText((Join-Path $a 'downloads/Deploy-Assure-Agent.ps1'))
$r1 = Invoke-San $a
Ok ($r1.Code -eq 0) "A exit 0 ($($r1.Code))"
Ok ((Agent-LiteralLen (Join-Path $a 'downloads/Deploy-Assure-Agent.ps1')) -eq 0) "A/G AgentSecret default empty"
Ok ($r1.Out -notmatch [regex]::Escape($fake)) "B stdout/stderr has no fake secret"
Ok ((Read-Ver $a) -eq '2.9.11') "D VERSION 2.9.11"
$afterText = [IO.File]::ReadAllText((Join-Path $a 'downloads/Deploy-Assure-Agent.ps1'))
Ok ($afterText.Contains('KEEP-UNRELATED') -and $afterText.Contains("AppHttpsUrl = 'https://assure.rpmresources.co.za'")) "C unrelated content kept"
Ok (-not $afterText.Contains($fake)) "A fake literal removed from file"
$bak = Get-ChildItem -Recurse -File (Join-Path $a 'backups/downloads-sanitise') -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq 'Deploy-Assure-Agent.ps1' }
Ok ($null -ne $bak) "E rollback copy created"
$tok2=$null; $err2=$null
[void][System.Management.Automation.Language.Parser]::ParseInput($afterText, [ref]$tok2, [ref]$err2)
Ok (@($err2).Count -eq 0) "F resulting installer AST PASS"
Ok (((Get-FileHash (Join-Path $a 'downloads/rpm-assure-agent.zip')).Hash) -eq $zipH) "K zip unchanged"
Ok (((Get-FileHash (Join-Path $a 'downloads/rpm-assure-agent.msi')).Hash) -eq $msiH) "K msi unchanged"

$r2 = Invoke-San $a
Ok ($r2.Code -eq 0) "H second run exit 0"
Ok ($r2.Out -match 'ALREADY_SANITISED') "H idempotent already sanitised"
Ok ((Read-Ver $a) -eq '2.9.11') "H VERSION still 2.9.11"
Ok ($r2.Out -notmatch [regex]::Escape($fake)) "H no secret on second run"

# I missing target
Write-Host '=== I MISSING TARGET ==='
$i = Join-Path $tmp 'I'
New-Item -ItemType Directory -Force -Path (Join-Path $i 'downloads') | Out-Null
Set-Content (Join-Path $i 'downloads/VERSION') "2.9.11`n" -Encoding ascii
$ri = Invoke-San $i
Ok ($ri.Code -ne 0) "I missing target fails ($($ri.Code))"

# J multiple AgentSecret
Write-Host '=== J MULTIPLE AGENTSECRET ==='
$j = Join-Path $tmp 'J'
New-Fixture $j "''"
$bad = @"
param(
  [string]`$AgentSecret = '',
  [string]`$AgentSecret = ''
)
"@
Set-Content -LiteralPath (Join-Path $j 'downloads/Deploy-Assure-Agent.ps1') -Value $bad -Encoding ascii
$rj = Invoke-San $j
Ok ($rj.Code -ne 0) "J multiple AgentSecret fails ($($rj.Code))"
Ok ((Read-Ver $j) -eq '2.9.11') "J VERSION unchanged"

Write-Host ''
if ($failed -gt 0) {
  Write-Host ("HARNESS FAIL count=$failed")
  exit 1
}
Write-Host 'SANITISE HARNESS PASS'
exit 0
