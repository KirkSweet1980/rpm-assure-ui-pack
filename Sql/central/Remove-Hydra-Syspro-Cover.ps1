# Remove Hydrasales (HYDRA) SYSPRO cover. RMM / Cove / EPP unchanged.
# APP / central SQL. Administrator PowerShell.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:
#   C:\RPM-Assure\Sql\central\Remove-Hydra-Syspro-Cover.ps1

$ErrorActionPreference = 'Stop'

$sqlcmd = $null
foreach ($c in @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE'
  )) {
  if (Test-Path $c) { $sqlcmd = $c; break }
}
if (-not $sqlcmd) {
  $g = Get-Command sqlcmd.exe -ErrorAction SilentlyContinue
  if ($g) { $sqlcmd = $g.Source }
}
if (-not $sqlcmd) { throw 'sqlcmd.exe not found' }

$sql = @'
SET NOCOUNT ON;
IF DB_ID(N'RPMAssure_App') IS NOT NULL USE RPMAssure_App;

IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer WHERE CustomerCode = N'HYDRA')
BEGIN
  PRINT N'HYDRA not in Dim_Customer';
END
ELSE
BEGIN
  UPDATE dbo.Dim_Customer
  SET SqlInstanceName = NULL, UpdatedAt = SYSUTCDATETIME()
  WHERE CustomerCode = N'HYDRA';

  IF EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = N'HYDRA')
    UPDATE dbo.Dim_Customer_AmsConfig
    SET PillarSyspro = 0, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'hydra_syspro_off'
    WHERE CustomerCode = N'HYDRA';
  ELSE
    INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, AmsEnabled, PillarSyspro, UpdatedAt, UpdatedBy)
    VALUES (N'HYDRA', 1, 0, SYSUTCDATETIME(), N'hydra_syspro_off');

  PRINT N'HYDRA SYSPRO cover off';
END

SELECT c.CustomerCode, c.DisplayName, c.SqlInstanceName, a.PillarSyspro
FROM dbo.Dim_Customer c
LEFT JOIN dbo.Dim_Customer_AmsConfig a ON a.CustomerCode = c.CustomerCode
WHERE c.CustomerCode = N'HYDRA';
'@

$tmp = Join-Path $env:TEMP 'rpm-hydra-syspro-off.sql'
Set-Content -LiteralPath $tmp -Value $sql -Encoding UTF8

$ok = $false
Write-Host 'Removing Hydrasales SYSPRO cover...'
& $sqlcmd -S '.\RPMREPORTS' -d RPMAssure_App -E -C -b -i $tmp
if ($LASTEXITCODE -eq 0) { $ok = $true }
if (-not $ok) {
  & $sqlcmd -S '(local)\RPMREPORTS' -d RPMAssure_App -E -C -b -i $tmp
  if ($LASTEXITCODE -eq 0) { $ok = $true }
}
if (-not $ok) { throw 'SQL failed. Run on the APP SQL box as a Windows sysadmin.' }

Write-Host 'HYDRA SYSPRO = No Cover. Hard-refresh Assure.'
