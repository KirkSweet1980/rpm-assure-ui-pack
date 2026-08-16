# Enable-Cover-From-Local.ps1
# Push cover=1 to central for products found on this host. Only ENABLES. Never clears.
# Bools accepted as switch OR 0/1/true/false strings (safe for powershell -File).
param(
  [Parameter(Mandatory)][string]$CustomerCode,
  [Parameter(Mandatory)][string]$CentralDataSource,
  [Parameter(Mandatory)][string]$CentralDatabase,
  [Parameter(Mandatory)][string]$CentralSqlUser,
  [Parameter(Mandatory)][string]$CentralSqlPassword,
  [string]$Syspro = '0',
  [string]$Pulseway = '0',
  [string]$Bitdefender = '0',
  [string]$Cove = '0',
  [string]$AgentRoot = 'C:\RPM-Assure\Agent'
)

$ErrorActionPreference = 'Continue'

function Convert-RpmaFlag([string]$v) {
  if ([string]::IsNullOrWhiteSpace($v)) { return $false }
  $t = $v.Trim().ToLowerInvariant()
  return ($t -eq '1' -or $t -eq 'true' -or $t -eq '$true' -or $t -eq 'yes')
}

$doSyspro = Convert-RpmaFlag $Syspro
$doPulseway = Convert-RpmaFlag $Pulseway
$doBitdefender = Convert-RpmaFlag $Bitdefender
$doCove = Convert-RpmaFlag $Cove

$CustomerCode = $CustomerCode.Trim().ToUpperInvariant()
if (-not ($doSyspro -or $doPulseway -or $doBitdefender -or $doCove)) {
  Write-Host 'No local products to enable on cover.'
  return @{ Enabled = @(); SqlOk = $true }
}

function Sql-Lit([string]$s) {
  if ($null -eq $s) { return 'NULL' }
  return "N'" + ($s.Replace("'", "''")) + "'"
}

$sets = @()
if ($doSyspro) { $sets += 'PillarSyspro = 1' }
if ($doPulseway) { $sets += 'PillarPulseway = 1' }
if ($doCove) { $sets += 'PillarCove = 1' }
if ($doBitdefender) { $sets += 'PillarBitdefender = 1' }
$setClause = $sets -join ",`n  "

$sql = @"
SET NOCOUNT ON;
IF NOT EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = $(Sql-Lit $CustomerCode))
BEGIN
  INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode) VALUES ($(Sql-Lit $CustomerCode));
END

IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarBitdefender') IS NULL
BEGIN
  ALTER TABLE dbo.Dim_Customer_AmsConfig ADD PillarBitdefender bit NULL;
END

UPDATE dbo.Dim_Customer_AmsConfig
SET
  $setClause
WHERE CustomerCode = $(Sql-Lit $CustomerCode);

SELECT
  ISNULL(PillarSyspro, 0) AS Syspro,
  ISNULL(PillarPulseway, 0) AS Rmm,
  ISNULL(PillarCove, 0) AS Cove,
  ISNULL(PillarBitdefender, 0) AS Epp
FROM dbo.Dim_Customer_AmsConfig WITH (NOLOCK)
WHERE CustomerCode = $(Sql-Lit $CustomerCode);
"@

$csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$csb['Data Source'] = $CentralDataSource
$csb['Initial Catalog'] = $CentralDatabase
$csb['User ID'] = $CentralSqlUser
$csb['Password'] = $CentralSqlPassword
$csb['Encrypt'] = $true
$csb['TrustServerCertificate'] = $true
$csb['Connect Timeout'] = 20

$enabled = @()
if ($doSyspro) { $enabled += 'syspro' }
if ($doPulseway) { $enabled += 'rmm/Pulseway' }
if ($doCove) { $enabled += 'cove' }
if ($doBitdefender) { $enabled += 'epp/Bitdefender' }

try {
  $conn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
  $conn.Open()
  $cmd = $conn.CreateCommand()
  $cmd.CommandTimeout = 30
  $cmd.CommandText = $sql
  $reader = $cmd.ExecuteReader()
  $after = $null
  if ($reader.Read()) {
    $after = [ordered]@{
      Syspro = [int]$reader.GetValue(0)
      Rmm = [int]$reader.GetValue(1)
      Cove = [int]$reader.GetValue(2)
      Epp = [int]$reader.GetValue(3)
    }
  }
  $reader.Close()
  $conn.Close()
  $conn.Dispose()
  Write-Host ("Cover enabled on central for $CustomerCode : " + ($enabled -join ', '))
  if ($after) {
    Write-Host ("  AmsConfig now: Syspro=$($after.Syspro) Rmm=$($after.Rmm) Cove=$($after.Cove) Epp=$($after.Epp)")
  }
  return @{ Enabled = $enabled; SqlOk = $true; After = $after }
} catch {
  Write-Host ("WARN could not update cover on central: " + $_.Exception.Message) -ForegroundColor Yellow
  return @{ Enabled = $enabled; SqlOk = $false; Error = $_.Exception.Message }
}
