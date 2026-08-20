param(
  [Parameter(Mandatory = $true)][string]$Path,
  [Parameter(Mandatory = $true)][string]$InstanceName,
  [string]$ServerInstance = '102.222.21.220,14333',
  [string]$Database = 'RPMAssure_App',
  [string]$User = 'Rpm_collect',
  [string]$Password = '',
  [string]$CustomerCode = ''
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Path)) { throw "File not found: $Path" }

$lines = Get-Content -LiteralPath $Path -Encoding UTF8
$codes = New-Object System.Collections.Generic.List[object]
foreach ($line in $lines) {
  $t = $line.Trim()
  if ($t.Length -lt 3) { continue }
  $code = $null
  $title = $null
  if ($t -match '(KB\d{6,})') {
    $code = $Matches[1]
    $title = ($t.Replace($code, '')).Trim(' ', '-', ':')
  } elseif ($t -match '^(\d{5,})\s*[-:]\s*(.+)$') {
    $code = $Matches[1]
    $title = $Matches[2]
  } elseif ($t -match '^(KB\d{6,}|\d{5,})\s*$') {
    $code = $Matches[1].Trim()
  }
  if ($code) { $codes.Add([pscustomobject]@{ Code = $code; Title = $title }) }
}
Write-Host ('Parsed installed: ' + $codes.Count)
if ($codes.Count -eq 0) { throw 'No codes parsed' }

$srcName = [IO.Path]::GetFileName($Path)
$tmpSql = Join-Path $env:TEMP ('hf_inst_' + [guid]::NewGuid().ToString('N') + '.sql')
$sb = New-Object System.Text.StringBuilder
$inst = $InstanceName.Replace("'", "''")
[void]$sb.AppendLine('SET NOCOUNT ON; USE [' + $Database + '];')
[void]$sb.AppendLine("DECLARE @Snap date = CAST(CAST(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'South Africa Standard Time' AS date) AS date);")
[void]$sb.AppendLine("DELETE FROM dbo.Syspro_HotfixInstalled WHERE SnapshotDate=@Snap AND InstanceName=N'$inst';")
foreach ($r in $codes) {
  $c = $r.Code.Replace("'", "''")
  $ti = if ($r.Title) { $r.Title.Replace("'", "''") } else { '' }
  [void]$sb.AppendLine("INSERT INTO dbo.Syspro_HotfixInstalled (SnapshotDate,InstanceName,HotfixCode,Title,Source,ImportedAt) VALUES (@Snap,N'$inst',N'$c',NULLIF(N'$ti',N''),N'InstallerTxt',SYSUTCDATETIME());")
}
$fn = $srcName.Replace("'", "''")
$cc = $CustomerCode.Replace("'", "''")
$cnt = $codes.Count
[void]$sb.AppendLine("INSERT INTO dbo.Syspro_HotfixImportLog (ImportKind,CustomerCode,InstanceName,SourceFile,RowsImported) VALUES (N'Installed',NULLIF(N'$cc',N''),N'$inst',N'$fn',$cnt);")
[void]$sb.AppendLine("SELECT COUNT(*) AS InstalledRows FROM dbo.Syspro_HotfixInstalled WHERE InstanceName=N'$inst' AND SnapshotDate=@Snap;")

[IO.File]::WriteAllText($tmpSql, $sb.ToString())
& sqlcmd -S $ServerInstance -d $Database -U $User -P $Password -C -b -i $tmpSql
if ($LASTEXITCODE -ne 0) { throw "sqlcmd failed $LASTEXITCODE" }
Write-Host 'Installed import done.' -ForegroundColor Green
Remove-Item $tmpSql -Force -ErrorAction SilentlyContinue
