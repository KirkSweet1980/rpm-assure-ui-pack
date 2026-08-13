param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string]$ServerInstance = '102.222.21.220,14333',
  [string]$Database = 'RPMAssure_App',
  [string]$User = 'Rpm_collect',
  [string]$Password = 'RpmCollect#AHIC2026',
  [string]$ReleaseLabel = '2025',
  [string]$ProductFamily = 'SYSPRO8',
  [string]$DefaultSeverity = 'Optional'
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Path)) { throw "File not found: $Path" }

# Ensure tables first
$ensure = 'C:\RPM-Assure\Sql\central\320b_Ensure_ImportLog_Only.sql'
if (Test-Path -LiteralPath $ensure) {
  Write-Host 'Ensuring hotfix tables...' -ForegroundColor Cyan
  & sqlcmd -S $ServerInstance -d $Database -U $User -P $Password -C -b -i $ensure
  if ($LASTEXITCODE -ne 0) {
    & sqlcmd -S $ServerInstance -d $Database -E -C -b -i $ensure
  }
}

$lines = Get-Content -LiteralPath $Path -Encoding UTF8
$rows = New-Object System.Collections.Generic.List[object]
foreach ($line in $lines) {
  $t = $line.Trim()
  if ($t.Length -lt 3) { continue }
  if ($t.StartsWith('#') -or $t.StartsWith(';')) { continue }
  $code = $null; $title = $null; $sev = $DefaultSeverity
  if ($t.Contains([char]9) -or ($t.Contains(',') -and $t -match 'KB')) {
    if ($t.Contains([char]9)) { $parts = $t.Split([char]9) } else { $parts = $t.Split(',') }
    if ($parts.Count -ge 1) { $code = $parts[0].Trim().Trim('"') }
    if ($parts.Count -ge 2) { $title = $parts[1].Trim().Trim('"') }
    if ($parts.Count -ge 3 -and $parts[2].Trim().Length -gt 0) { $sev = $parts[2].Trim().Trim('"') }
  }
  if (-not $code -and $t -match '(KB\d{6,})') {
    $code = $Matches[1]
    $title = ($t.Replace($code, '')).Trim(' ', '-', ':', [char]9)
  }
  if (-not $code -and $t -match '^(\d{5,})\s*[-:]\s*(.+)$') {
    $code = $Matches[1]; $title = $Matches[2].Trim()
  }
  if (-not $code) { continue }
  $rows.Add([pscustomobject]@{ Code = $code; Title = $title; Severity = $sev })
}
Write-Host ('Parsed rows: ' + $rows.Count) -ForegroundColor Cyan
if ($rows.Count -eq 0) { throw 'No hotfix rows parsed' }

$srcName = [IO.Path]::GetFileName($Path)
$tmpSql = Join-Path $env:TEMP ('hf_base_' + [guid]::NewGuid().ToString('N') + '.sql')
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('SET NOCOUNT ON; USE [' + $Database + '];')
foreach ($r in $rows) {
  $c = $r.Code.Replace("'", "''")
  $ti = if ($r.Title) { $r.Title.Replace("'", "''") } else { '' }
  $s = $r.Severity.Replace("'", "''")
  $fn = $srcName.Replace("'", "''")
  $rl = $ReleaseLabel.Replace("'", "''")
  $pf = $ProductFamily.Replace("'", "''")
  [void]$sb.AppendLine("IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Syspro_HotfixBaseline WHERE ProductFamily=N'$pf' AND HotfixCode=N'$c' AND ISNULL(ReleaseLabel,N'')=N'$rl')")
  [void]$sb.AppendLine("INSERT INTO dbo.Dim_Syspro_HotfixBaseline (ProductFamily,ReleaseLabel,HotfixCode,Title,Severity,SourceFile,Synopsis) VALUES (N'$pf',N'$rl',N'$c',NULLIF(N'$ti',N''),N'$s',N'$fn',NULLIF(N'$ti',N''));")
  [void]$sb.AppendLine("ELSE UPDATE dbo.Dim_Syspro_HotfixBaseline SET Title=COALESCE(NULLIF(N'$ti',N''),Title),Severity=N'$s',SourceFile=N'$fn',ImportedAtUtc=SYSUTCDATETIME(),Active=1 WHERE ProductFamily=N'$pf' AND HotfixCode=N'$c' AND ISNULL(ReleaseLabel,N'')=N'$rl';")
}
$fn2 = $srcName.Replace("'", "''")
$cnt = $rows.Count
[void]$sb.AppendLine("IF OBJECT_ID(N'dbo.Syspro_HotfixImportLog',N'U') IS NOT NULL INSERT INTO dbo.Syspro_HotfixImportLog (ImportKind,SourceFile,RowsImported,Notes) VALUES (N'Baseline',N'$fn2',$cnt,N'Release $ReleaseLabel');")
[void]$sb.AppendLine('SELECT COUNT(*) AS BaselineActive FROM dbo.Dim_Syspro_HotfixBaseline WHERE Active=1;')
[IO.File]::WriteAllText($tmpSql, $sb.ToString())
Write-Host 'Running sqlcmd...' -ForegroundColor Cyan
& sqlcmd -S $ServerInstance -d $Database -U $User -P $Password -C -b -i $tmpSql
if ($LASTEXITCODE -ne 0) { throw "sqlcmd failed $LASTEXITCODE" }
Write-Host 'Baseline import done.' -ForegroundColor Green
Remove-Item $tmpSql -Force -ErrorAction SilentlyContinue
