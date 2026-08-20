# Backup RPMAssure_App + secrets folder. Local disk only (not git).
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\deploy\ui-pack\deploy\Backup-Assure-Box.ps1
$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure'
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$dest = Join-Path $Root ("backups\" + $stamp)
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$sqlcmd = @(
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
  'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\SQLCMD.EXE'
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $sqlcmd) { $sqlcmd = 'sqlcmd' }

$bak = Join-Path $dest 'RPMAssure_App.bak'
Write-Host "BACKUP DATABASE -> $bak"
$sql = @"
BACKUP DATABASE [RPMAssure_App]
TO DISK = N'$($bak.Replace("'", "''"))'
WITH COPY_ONLY, COMPRESSION, INIT, STATS = 10;
"@
$f = Join-Path $dest 'backup.sql'
[IO.File]::WriteAllText($f, $sql)
& $sqlcmd -S '.\RPMREPORTS' -E -C -b -i $f
if ($LASTEXITCODE -ne 0) { throw "BACKUP failed exit=$LASTEXITCODE" }

$sec = Join-Path $Root 'secrets'
if (Test-Path $sec) {
  $zip = Join-Path $dest 'secrets.zip'
  Compress-Archive -Path $sec -DestinationPath $zip -Force
  Write-Host "secrets -> $zip"
}

# ACL backups to Administrators
try {
  $acl = Get-Acl $dest
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($id in @('BUILTIN\Administrators', 'NT AUTHORITY\SYSTEM')) {
    $r = New-Object System.Security.AccessControl.FileSystemAccessRule($id, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($r)
  }
  Set-Acl -Path $dest -AclObject $acl
} catch {}

Get-ChildItem $dest | Format-Table Name, Length
Write-Host "OK backup=$dest"
Write-Host 'Keep this off the git pack. Copy off-box when you can.'
