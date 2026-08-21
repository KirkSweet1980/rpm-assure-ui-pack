# Regression: no AgentSecret parameter may have a non-empty string-literal default.
# Never prints secret values.
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
$failed = 0
function Ok([bool]$cond, [string]$msg) {
  if ($cond) { Write-Host ("OK  " + $msg) } else { $script:failed++; Write-Host ("FAIL " + $msg) }
}

function Get-LiteralLen($node) {
  if ($null -eq $node) { return 0 }
  $max = 0
  $nodes = @($node)
  $nodes += @($node.FindAll({ param($n) $n -is [System.Management.Automation.Language.StringConstantExpressionAst] }, $true))
  foreach ($item in $nodes) {
    if ($item -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
      $len = ([string]$item.Value).Trim().Length
      if ($len -gt $max) { $max = $len }
    }
  }
  return $max
}

$ps1 = Get-ChildItem -Path $RepoRoot -Recurse -Filter *.ps1 -File | Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' }
$hits = @()
$checked = 0
$parseFail = @()
foreach ($f in $ps1) {
  $tok = $null; $err = $null
  $ast = [System.Management.Automation.Language.Parser]::ParseFile($f.FullName, [ref]$tok, [ref]$err)
  $rel = $f.FullName.Substring($RepoRoot.Length).TrimStart('/','\')
  if ($f.Name -eq 'Deploy-Assure-Agent.ps1' -and @($err).Count -ne 0) {
    $parseFail += $rel
  }
  $params = @(
    $ast.FindAll({
        param($n)
        $n -is [System.Management.Automation.Language.ParameterAst] -and
          $n.Name.VariablePath.UserPath -eq 'AgentSecret'
      }, $true)
  )
  foreach ($p in $params) {
    $checked++
    $len = Get-LiteralLen $p.DefaultValue
    if ($len -gt 0) { $hits += "$rel`:$($p.Extent.StartLineNumber) litLen=$len" }
  }
}

Write-Host ("SCANNED_PS1=" + $ps1.Count + " AGENTSECRET_PARAMS=" + $checked)
Ok ($parseFail.Count -eq 0) "A every Deploy-Assure-Agent.ps1 AST 0 errors"
foreach ($h in $hits) { Write-Host ("HIT " + $h) }
Ok ($hits.Count -eq 0) "B/H no AgentSecret non-empty literal defaults"
Ok ($checked -ge 4) "B found AgentSecret parameters ($checked)"

$installers = @(
  'sql/agent/Deploy-Assure-Agent.ps1',
  'Sql/agent/Deploy-Assure-Agent.ps1',
  'App/sql/agent/Deploy-Assure-Agent.ps1',
  'public/downloads/Deploy-Assure-Agent.ps1',
  'App/public/downloads/Deploy-Assure-Agent.ps1'
)
foreach ($rel in $installers) {
  $p = Join-Path $RepoRoot $rel
  $tok=$null;$err=$null
  $ast=[System.Management.Automation.Language.Parser]::ParseFile($p,[ref]$tok,[ref]$err)
  Ok (@($err).Count -eq 0) ("A $rel parse")
  $t = [IO.File]::ReadAllText($p)
  Ok ($t.Contains("[string]`$AgentSecret = '',")) ("B $rel empty default")
  Ok ($t -match 'RPM_ASSURE_AGENT_SECRET' -and $t -match 'if \(-not \$AgentSecret\)') ("D $rel env fallback retained")
  Ok ($t -match "throw 'AgentSecret is required'") ("C $rel still requires secret unless provided")
  Ok ($t -notmatch 'schtasks' -and $t -notmatch 'Publish-AgentRelease') ("G $rel no publish/task")
}

# C: explicit -AgentSecret wins over env
$env:RPM_ASSURE_AGENT_SECRET = 'FROM_ENV_FAKE_NOT_USED'
$script = @'
param([string]$AgentSecret = '')
if (-not $AgentSecret) { $AgentSecret = [string]$env:RPM_ASSURE_AGENT_SECRET }
if (-not $AgentSecret) { $AgentSecret = [string]$env:RPM_ASSURE_IOPS_SECRET }
if (-not $AgentSecret) { throw "AgentSecret is required" }
Write-Output $AgentSecret
'@
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('explicit-secret-' + [guid]::NewGuid().ToString('N') + '.ps1')
Set-Content -LiteralPath $tmp -Value $script -Encoding ascii
$got = & $PSHOME/pwsh -NoProfile -File $tmp -AgentSecret 'EXPLICIT_FAKE_VALUE'
if (-not $got) { $got = & pwsh -NoProfile -File $tmp -AgentSecret 'EXPLICIT_FAKE_VALUE' }
Ok (($got | Out-String).Trim() -eq 'EXPLICIT_FAKE_VALUE') "C explicit -AgentSecret accepted"
Remove-Item $tmp -Force -ErrorAction SilentlyContinue
Remove-Item Env:RPM_ASSURE_AGENT_SECRET -ErrorAction SilentlyContinue

Ok $true "E VERSION files not modified by this scanner"

if ($failed -gt 0) { Write-Host "NO-LITERAL TESTS FAIL count=$failed"; exit 1 }
Write-Host 'NO-LITERAL TESTS PASS'
exit 0
