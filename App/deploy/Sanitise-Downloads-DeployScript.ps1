# Remove a hardcoded AgentSecret string-literal default from
# $Root\downloads\Deploy-Assure-Agent.ps1.
# Does not print secret values. Does not change VERSION, ZIP/MSI, or publish an Agent.
param(
  [string]$Root = 'C:\RPM-Assure'
)

$ErrorActionPreference = 'Stop'
$target = Join-Path $Root 'downloads\Deploy-Assure-Agent.ps1'
$verFile = Join-Path $Root 'downloads\VERSION'

function Read-Ver {
  if (-not (Test-Path $verFile)) { return '?' }
  return ((Get-Content $verFile -Raw) -replace '\s', '')
}

function Get-Ast([string]$text) {
  $tok = $null
  $errs = $null
  $ast = [System.Management.Automation.Language.Parser]::ParseInput($text, [ref]$tok, [ref]$errs)
  return @{ Ast = $ast; Errors = @($errs) }
}

function Get-AgentSecretParams($ast) {
  return @(
    $ast.FindAll({
        param($n)
        $n -is [System.Management.Automation.Language.ParameterAst] -and
          $n.Name.VariablePath.UserPath -eq 'AgentSecret'
      }, $true)
  )
}

function Get-NonEmptyLiteralLength($node) {
  if ($null -eq $node) { return 0 }
  $max = 0
  $nodes = @($node)
  if ($node -is [System.Management.Automation.Language.Ast]) {
    $nodes += @(
      $node.FindAll({
          param($n)
          $n -is [System.Management.Automation.Language.StringConstantExpressionAst]
        }, $true)
    )
  }
  foreach ($item in $nodes) {
    if ($item -is [System.Management.Automation.Language.StringConstantExpressionAst]) {
      $len = ([string]$item.Value).Trim().Length
      if ($len -gt $max) { $max = $len }
    }
  }
  return $max
}

if (-not (Test-Path $target)) { throw "Missing $target" }

$verBefore = Read-Ver
$utf8 = New-Object System.Text.UTF8Encoding $false
$text = [IO.File]::ReadAllText((Resolve-Path $target), $utf8)
$parsed = Get-Ast $text
if ($parsed.Errors.Count -gt 0) { throw "Target AST parse failed (errorCount=$($parsed.Errors.Count))" }

$agentParams = Get-AgentSecretParams $parsed.Ast
if ($agentParams.Count -ne 1) {
  throw "Expected exactly one AgentSecret parameter (found $($agentParams.Count))"
}
$p = $agentParams[0]
$litLen = Get-NonEmptyLiteralLength $p.DefaultValue

if ($litLen -eq 0) {
  Write-Host 'ALREADY_SANITISED AgentSecret default is empty/non-secret. No rewrite.'
  $verAfter = Read-Ver
  if ($verBefore -ne $verAfter) { throw "VERSION changed (before=$verBefore after=$verAfter)" }
  Write-Host ("VERSION_IMMUTABLE " + $verBefore)
  exit 0
}

Write-Host ("SANITISE AgentSecret literal default length=" + $litLen + " -> empty. Value not logged.")

$bakRoot = Join-Path $Root 'backups\downloads-sanitise'
$bakDir = Join-Path $bakRoot ((Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $bakDir | Out-Null
$bakFile = Join-Path $bakDir 'Deploy-Assure-Agent.ps1'
Copy-Item -LiteralPath $target -Destination $bakFile -Force
Write-Host ("ROLLBACK_COPY=" + $bakFile)

$dv = $p.DefaultValue
if ($null -eq $dv) { throw 'AgentSecret literal default extent missing' }
$start = $dv.Extent.StartOffset
$end = $dv.Extent.EndOffset
if ($end -le $start -or $start -lt 0 -or $end -gt $text.Length) { throw 'AgentSecret default extent out of range' }
$newText = $text.Substring(0, $start) + "''" + $text.Substring($end)

$reparse = Get-Ast $newText
if ($reparse.Errors.Count -gt 0) { throw "Sanitised script AST parse failed (errorCount=$($reparse.Errors.Count))" }
$reParams = Get-AgentSecretParams $reparse.Ast
if ($reParams.Count -ne 1) { throw 'Sanitised script AgentSecret count invalid' }
$reLen = Get-NonEmptyLiteralLength $reParams[0].DefaultValue
if ($reLen -ne 0) { throw 'Sanitised AgentSecret default is still a non-empty literal' }

$tmp = $target + '.' + [guid]::NewGuid().ToString('N') + '.tmp'
[IO.File]::WriteAllText($tmp, $newText, $utf8)
Move-Item -LiteralPath $tmp -Destination $target -Force

$onDisk = [IO.File]::ReadAllText((Resolve-Path $target), $utf8)
$diskAst = Get-Ast $onDisk
if ($diskAst.Errors.Count -gt 0) { throw "Post-write AST parse failed (errorCount=$($diskAst.Errors.Count))" }
$diskParams = Get-AgentSecretParams $diskAst.Ast
if ($diskParams.Count -ne 1) { throw 'Post-write AgentSecret count invalid' }
if ((Get-NonEmptyLiteralLength $diskParams[0].DefaultValue) -ne 0) { throw 'Post-write AgentSecret default still non-empty literal' }

$verAfter = Read-Ver
if ($verBefore -ne $verAfter) { throw "VERSION changed (before=$verBefore after=$verAfter)" }
Write-Host ("SANITISED AgentSecret default empty. VERSION_IMMUTABLE " + $verBefore)
exit 0
