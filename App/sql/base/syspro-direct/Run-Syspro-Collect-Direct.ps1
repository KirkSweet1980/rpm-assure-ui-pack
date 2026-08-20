# SYSPRO base direct collect - all customers
# Local SYSPRO read + central write. No linked server.
#
# powershell -NoProfile -ExecutionPolicy Bypass -File .\Run-Syspro-Collect-Direct.ps1 -ConfigPath .\Customer.Config.ps1
#   -IncludeJobs / -JobsErrorsOnly / -JobsOnly / -SkipDtr / -SkipSecurity
param(
  [Parameter(Mandatory = $true)][string]$ConfigPath,
  [switch]$IncludeJobs,
  [switch]$JobsOnly,
  [switch]$JobsErrorsOnly,
  [switch]$SkipDtr,
  [switch]$SkipSecurity
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Missing config: $ConfigPath" }
. $ConfigPath
$cfgLocalUser = $LocalSqlUser
$cfgLocalPass = $LocalSqlPassword
$agentLib = 'C:\RPM-Assure\Agent\Lib-SecureConfig.ps1'
if (Test-Path $agentLib) {
  . $agentLib
  Import-RpmaAgentSecrets
}
if ($cfgLocalPass) { $LocalSqlPassword = $cfgLocalPass }
if ($cfgLocalUser) { $LocalSqlUser = $cfgLocalUser }

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here 'Lib-Sqlcmd.ps1')

if (-not $LogDir) { $LogDir = Join-Path (Split-Path -Parent $ConfigPath) 'logs' }
if (-not $CollectDir) { $CollectDir = Split-Path -Parent $ConfigPath }

Initialize-RpmaCollect -LogDir $LogDir -Prefix ("syspro_{0}" -f $CustomerCode)
Write-RpmaLog "START customer=$CustomerCode instance=$InstanceName host=$env:COMPUTERNAME"
Write-RpmaLog "flags IncludeJobs=$IncludeJobs JobsOnly=$JobsOnly JobsErrorsOnly=$JobsErrorsOnly SkipDtr=$SkipDtr SkipSecurity=$SkipSecurity"

$tryServers = @('.', $env:COMPUTERNAME)
if ($InstanceName) { $tryServers += @($InstanceName, ".\$InstanceName") }
$tryServers = $tryServers | Select-Object -Unique
$r = $null
$LocalS = '.'
foreach ($s in $tryServers) {
  Write-RpmaLog "try local $s"
  $r = Invoke-RpmaSql -Server $s -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText "SET NOCOUNT ON; SELECT SUSER_SNAME(), @@SERVERNAME;" -Tsv
  if ($r.ExitCode -eq 0) { $LocalS = $s; break }
}
if (-not $r -or $r.ExitCode -ne 0) { throw "Local SQL failed: $($r.Text)" }
Write-RpmaLog ("local OK " + $LocalS + " " + ((Get-RpmaDataRows $r.Text) -join ' | '))

$r = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText "SET NOCOUNT ON; SELECT DB_NAME(), SUSER_SNAME();" -Tsv
if ($r.ExitCode -ne 0) { throw "Central SQL failed: $($r.Text)" }
Write-RpmaLog ("central OK " + ((Get-RpmaDataRows $r.Text) -join ' | '))

$chk = 'SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.Dim_Customer WHERE CustomerCode=' + (ConvertTo-RpmaSqlLit $CustomerCode) + ' AND Active=1;'
$r = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText $chk -Tsv
$active = 0
foreach ($x in (Get-RpmaDataRows $r.Text)) { if ($x -match '^\d+$') { $active = [int]$x; break } }
if ($active -lt 1) { throw "Customer $CustomerCode not active on central Dim_Customer" }
Write-RpmaLog 'Dim_Customer active'

$snap = Get-RpmaSnapshotDateSast
$sysDb = Find-RpmaSysproSystemDb -LocalServer $LocalS -LocalUser $LocalSqlUser -LocalPass $LocalSqlPassword
Write-RpmaLog "SnapshotDate=$snap SysDb=$sysDb Instance=$InstanceName"
$instLit = ConvertTo-RpmaSqlLit $InstanceName
$custLit = ConvertTo-RpmaSqlLit $CustomerCode
$sysQ = '[' + $sysDb.Replace(']', ']]') + ']'

function Clear-CentralDay([string]$table) {
  $sql = "SET NOCOUNT ON; DELETE FROM dbo.$table WHERE SnapshotDate='$snap' AND InstanceName=$instLit;"
  $rr = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText $sql
  if ($rr.ExitCode -ne 0) { throw "Delete $table failed: $($rr.Text)" }
}

function Send-Batches([string[]]$Statements, [int]$BatchSize = 25) {
  return Invoke-RpmaCentralBatches -CentralServer $CentralDataSource -CentralUser $CentralSqlUser -CentralPass $CentralSqlPassword -CentralDb $CentralDatabase -Statements $Statements -BatchSize $BatchSize
}

function Collect-Operators {
  Write-RpmaLog 'MODULE operators'
  $disc = @"
SET NOCOUNT ON;
DECLARE @loginObj int = OBJECT_ID(N'${sysDb}.dbo.AdmOperatorLogin');
DECLARE @op sysname=NULL, @dt sysname=NULL;
IF @loginObj IS NOT NULL
BEGIN
  SELECT TOP 1 @op = c.name FROM ${sysQ}.sys.columns c
  WHERE c.object_id=@loginObj AND c.name IN (N'Operator',N'OperatorCode',N'Oper',N'UserName')
  ORDER BY CASE c.name WHEN N'Operator' THEN 1 WHEN N'OperatorCode' THEN 2 ELSE 9 END;
  SELECT TOP 1 @dt = c.name FROM ${sysQ}.sys.columns c
  JOIN ${sysQ}.sys.types t ON t.user_type_id=c.user_type_id
  WHERE c.object_id=@loginObj AND t.name IN (N'datetime',N'datetime2',N'smalldatetime',N'date')
  ORDER BY CASE c.name
    WHEN N'LoginDateTime' THEN 0 WHEN N'LoginDate' THEN 1 WHEN N'LastLogin' THEN 2
    WHEN N'SystemDate' THEN 3 WHEN N'LogDate' THEN 4 ELSE 9 END;
END
SELECT ISNULL(@op,N''), ISNULL(@dt,N'');
"@
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $disc -Tsv
  $pair = (Get-RpmaDataRows $r.Text | Select-Object -First 1)
  $opCol = ''; $dtCol = ''
  if ($pair) {
    $pp = $pair -split '\|', 2
    $opCol = $pp[0].Trim()
    if ($pp.Count -gt 1) { $dtCol = $pp[1].Trim() }
  }
  Write-RpmaLog "login cols op=$opCol dt=$dtCol"

  if ($opCol -and $dtCol) {
    $q = @"
SET NOCOUNT ON;
SELECT
  o.OperatorCode + N'|' +
  ISNULL(o.OperatorName,N'') + N'|' +
  ISNULL(CONVERT(varchar(30), lg.LastLogin, 126), N'')
FROM (
  SELECT LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))) AS OperatorCode,
         MAX(LTRIM(RTRIM(CONVERT(nvarchar(200), Name)))) AS OperatorName
  FROM ${sysQ}.dbo.AdmOperator
  WHERE Operator IS NOT NULL AND LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))) <> N''
  GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), Operator)))
) o
OUTER APPLY (
  SELECT MAX(l.[$dtCol]) AS LastLogin
  FROM ${sysQ}.dbo.AdmOperatorLogin l
  WHERE LTRIM(RTRIM(CONVERT(nvarchar(50), l.[$opCol]))) = o.OperatorCode
) lg;
"@
  } else {
    $q = @"
SET NOCOUNT ON;
SELECT
  LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))) + N'|' +
  ISNULL(MAX(LTRIM(RTRIM(CONVERT(nvarchar(200), Name)))),N'') + N'|'
FROM ${sysQ}.dbo.AdmOperator
WHERE Operator IS NOT NULL AND LTRIM(RTRIM(CONVERT(nvarchar(50), Operator))) <> N''
GROUP BY LTRIM(RTRIM(CONVERT(nvarchar(50), Operator)));
"@
  }
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $q -Tsv
  if ($r.ExitCode -ne 0) { throw "Operators query failed: $($r.Text)" }
  $stmts = New-Object System.Collections.Generic.List[string]
  $cnt = 0; $loginCnt = 0
  foreach ($line in (Get-RpmaDataRows $r.Text)) {
    $p = $line -split '\|', 3
    if ($p.Count -lt 1 -or -not $p[0]) { continue }
    $code = $p[0].Trim(); if (-not $code -or $code -eq 'NULL') { continue }
    $name = if ($p.Count -gt 1) { $p[1].Trim() } else { '' }
    if ($name -eq 'NULL') { $name = '' }
    $ll = 'NULL'
    if ($p.Count -gt 2 -and $p[2] -and $p[2] -ne 'NULL') {
      $ll = "'" + ($p[2].Trim() -replace 'T',' ') + "'"
      $loginCnt++
    }
    $ins = "INSERT INTO dbo.Syspro_Operators (SnapshotDate,InstanceName,OperatorCode,OperatorName,GroupCode,Email,LastLoginDate,OperatorStatus,ImportedAt) VALUES ('$snap',$instLit," + (ConvertTo-RpmaSqlLit $code) + ',' + (ConvertTo-RpmaSqlLit $name) + ",NULL,NULL,$ll,N'Active',SYSUTCDATETIME());"
    $stmts.Add($ins) | Out-Null
    $cnt++
  }
  Clear-CentralDay 'Syspro_Operators'
  if ($cnt -eq 0) { throw 'No operators found locally' }
  [void](Send-Batches -Statements $stmts.ToArray() -BatchSize 20)
  Write-RpmaLog "operators written=$cnt withLastLogin=$loginCnt"
}

function Find-RpmaCol {
  param([string[]]$Cols, [string[]]$Candidates)
  foreach ($cand in $Candidates) {
    foreach ($c in $Cols) {
      if (-not $c) { continue }
      if ($c.Equals($cand, [StringComparison]::OrdinalIgnoreCase)) { return $c }
    }
  }
  return $null
}

function Collect-License {
  Write-RpmaLog 'MODULE license'
  $probe = "SET NOCOUNT ON; SELECT CASE WHEN OBJECT_ID(N'${sysDb}.dbo.AdmSystemLicense',N'U') IS NOT NULL THEN 1 ELSE 0 END;"
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $probe -Tsv
  if ((Get-RpmaDataRows $r.Text | Select-Object -First 1) -ne '1') {
    Write-RpmaLog 'license table missing - skip'
    return
  }

  # Direct SYSPRO standard columns (RSR confirmed)
  $q = @"
SET NOCOUNT ON;
SELECT TOP 1
  ISNULL(CONVERT(varchar(30), ImportDate, 126), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(40), LicenseType))), N'') + N'~~' +
  ISNULL(CONVERT(varchar(20), TRY_CONVERT(bigint, Users)), N'') + N'~~' +
  ISNULL(CONVERT(varchar(20), TRY_CONVERT(bigint, CompanyCount)), N'') + N'~~' +
  ISNULL(CONVERT(varchar(30), LicenseExpiry, 126), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(100), ProductName))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), ProductVersion))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(200), CustomerName))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(40), UserType))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(80), Customer))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(80), LicenseSite))), N'')
FROM ${sysQ}.dbo.AdmSystemLicense
ORDER BY ImportDate DESC;
"@
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $q -Tsv
  if ($r.ExitCode -ne 0) {
    Write-RpmaLog "license direct query fail: $($r.Text)"
    return
  }
  $line = [string]((@(Get-RpmaDataRows $r.Text) | Select-Object -First 1))
  if (-not $line) { Write-RpmaLog 'license empty row'; return }
  $samp = $line; if ($samp.Length -gt 240) { $samp = $samp.Substring(0,240) }
  Write-RpmaLog ('license sample=' + $samp)

  $parts = @($line -split '~~', 0, 'SimpleMatch')
  $idRaw = if ($parts.Count -gt 0) { ([string]$parts[0]).Trim() } else { '' }
  $ltRaw = if ($parts.Count -gt 1) { ([string]$parts[1]).Trim() } else { '' }
  $usRaw = if ($parts.Count -gt 2) { ([string]$parts[2]).Trim() } else { '' }
  $ccRaw = if ($parts.Count -gt 3) { ([string]$parts[3]).Trim() } else { '' }
  $exRaw = if ($parts.Count -gt 4) { ([string]$parts[4]).Trim() } else { '' }
  $pn = if ($parts.Count -gt 5) { ([string]$parts[5]).Trim() } else { '' }
  $pv = if ($parts.Count -gt 6) { ([string]$parts[6]).Trim() } else { '' }
  $cn = if ($parts.Count -gt 7) { ([string]$parts[7]).Trim() } else { '' }
  $ut = if ($parts.Count -gt 8) { ([string]$parts[8]).Trim() } else { '' }
  $cust = if ($parts.Count -gt 9) { ([string]$parts[9]).Trim() } else { '' }
  $site = if ($parts.Count -gt 10) { ([string]$parts[10]).Trim() } else { '' }

  $id = 'NULL'; if ($idRaw -match '^\d{4}-') { $id = "'" + ($idRaw -replace 'T',' ' -replace "'","''") + "'" }
  $lt = if ($ltRaw) { ConvertTo-RpmaSqlLit $ltRaw } else { 'NULL' }
  $us = if ($usRaw -match '^\d+$') { $usRaw } else { 'NULL' }
  $cc = if ($ccRaw -match '^\d+$') { $ccRaw } else { 'NULL' }
  $ex = 'NULL'; if ($exRaw -match '^\d{4}-') { $ex = "'" + ($exRaw -replace 'T',' ' -replace "'","''") + "'" }

  $xml = ''
  $qx = @"
SET NOCOUNT ON;
SELECT TOP 1 LEFT(CONVERT(nvarchar(max), LicenseXml), 8000)
FROM ${sysQ}.dbo.AdmSystemLicense
ORDER BY ImportDate DESC;
"@
  $rx = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $qx -Tsv
  if ($rx.ExitCode -eq 0) {
    $xml = [string]((@(Get-RpmaDataRows $rx.Text) | Select-Object -First 1))
    if ($xml) {
      $xh = $xml; if ($xh.Length -gt 180) { $xh = $xh.Substring(0,180) }
      Write-RpmaLog ('license xml head=' + $xh)
    }
  }

  if ((-not $pn -or -not $pv -or $ex -eq 'NULL') -and $xml) {
    if (-not $pn) {
      if ($xml -match '(?i)<ProductName[^>]*>([^<]+)') { $pn = $Matches[1].Trim() }
      elseif ($xml -match '(?i)ProductName\s*=\s*"([^"]+)"') { $pn = $Matches[1].Trim() }
    }
    if (-not $pv) {
      if ($xml -match '(?i)<ProductVersion[^>]*>([^<]+)') { $pv = $Matches[1].Trim() }
      elseif ($xml -match '(?i)<Version[^>]*>([^<]+)') { $pv = $Matches[1].Trim() }
      elseif ($xml -match '(?i)ProductVersion\s*=\s*"([^"]+)"') { $pv = $Matches[1].Trim() }
    }
    if ($ex -eq 'NULL' -and $xml -match '(?i)<LicenseExpiry[^>]*>([^<]+)') {
      $xr = $Matches[1].Trim()
      if ($xr -match '^\d{4}-') { $ex = "'" + ($xr -replace 'T',' ' -replace "'","''") + "'" }
    }
  }
  if (-not $pn) { $pn = 'SYSPRO' }
  if (-not $cn -and $cust) { $cn = $cust }

  # Build / DB - license file is often only "8.0". Real port lives on AdmSysVersion.
  $bd = ''
  if ($xml) {
    if ($xml -match '(?i)<(?:DatabaseVersion|SysproFullVersion|BuildNumber|ProductBuild|SystemBuild|PortBuild)[^>]*>([^<]+)') { $bd = $Matches[1].Trim() }
    elseif ($xml -match '(?i)<(?:PortNumber|Port)[^>]*>([^<]+)') { $bd = $Matches[1].Trim() }
    elseif ($xml -match '(?i)<Build[^>]*>([^<]+)') { $bd = $Matches[1].Trim() }
    elseif ($xml -match '(?i)(?:DatabaseVersion|BuildNumber|SysproFullVersion)\s*=\s*"([^"]+)"') { $bd = $Matches[1].Trim() }
  }

  $qAv = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'${sysDb}.dbo.AdmSysVersion',N'U') IS NULL BEGIN SELECT N''; RETURN; END
SELECT TOP 1
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), DatabaseVersion))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), SysproFullVersion))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), SysproSp))), N'')
FROM ${sysQ}.dbo.AdmSysVersion WITH (NOLOCK);
"@
  $rav = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $qAv -Tsv
  if ($rav.ExitCode -eq 0) {
    $avLine = [string]((@(Get-RpmaDataRows $rav.Text) | Select-Object -First 1))
    if ($avLine) {
      $avp = @($avLine -split '~~', 0, 'SimpleMatch')
      $dbv = if ($avp.Count -gt 0) { $avp[0].Trim() } else { '' }
      $full = if ($avp.Count -gt 1) { $avp[1].Trim() } else { '' }
      $sp = if ($avp.Count -gt 2) { $avp[2].Trim() } else { '' }
      Write-RpmaLog "AdmSysVersion db=$dbv full=$full sp=$sp"
      if (-not $bd -and $dbv) { $bd = $dbv }
      if (-not $bd -and $full) { $bd = $full }
      if ($full -and ((-not $pv) -or $pv -eq '8.0' -or $pv -eq '8.00')) { $pv = $full }
    }
  } else {
    Write-RpmaLog ("AdmSysVersion skip " + ([string]$rav.Text).Substring(0, [Math]::Min(160, ([string]$rav.Text).Length)))
  }

  $qCi = @"
SET NOCOUNT ON;
IF DB_ID(N'SYSPRODeployment') IS NULL OR OBJECT_ID(N'SYSPRODeployment.dbo.CustomerInstalls',N'U') IS NULL BEGIN SELECT N''; RETURN; END
SELECT TOP 1 LTRIM(RTRIM(CONVERT(nvarchar(50), ProductVersion)))
FROM SYSPRODeployment.dbo.CustomerInstalls WITH (NOLOCK)
WHERE NULLIF(LTRIM(RTRIM(ProductVersion)), N'') IS NOT NULL
ORDER BY CASE WHEN Status = 1 THEN 0 ELSE 1 END, InstalledDate DESC;
"@
  $rci = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $qCi -Tsv
  if ($rci.ExitCode -eq 0) {
    $civ = [string]((@(Get-RpmaDataRows $rci.Text) | Select-Object -First 1))
    if ($civ -and $civ -match '\d+\.\d+\.\d+') {
      Write-RpmaLog "CustomerInstalls pv=$civ"
      if (-not $bd) { $bd = $civ.Trim() }
      if ((-not $pv) -or $pv -eq '8.0' -or $pv -eq '8.00') { $pv = $civ.Trim() }
    }
  }

  if (-not $bd -and $pv -match '^\d+(\.\d+){2,}') { $bd = $pv }
  if (-not $bd -and $pv -match '^\d+(\.\d+){2,}\.(\d+[a-zA-Z]?)$') { $bd = $Matches[2] }
  if (-not $bd -and $pv -match '^\d+\.\d+\.(\d+)$') { $bd = $Matches[1] }

  Write-RpmaLog "license final pn=$pn pv=$pv bd=$bd ex=$ex us=$us cc=$cc lt=$ltRaw cn=$cn site=$site ut=$ut"

  Clear-CentralDay 'Syspro_SystemLicense'
  $insLic = "INSERT INTO dbo.Syspro_SystemLicense (SnapshotDate,InstanceName,ImportDate,LicenseType,Users,CompanyCount,LicenseExpiry,ProductName,ProductVersion,CustomerCode,CustomerName,RawXml,ImportedAt) VALUES ('$snap',$instLit,$id,$lt,$us,$cc,$ex," + (ConvertTo-RpmaSqlLit $pn) + "," + (ConvertTo-RpmaSqlLit $pv) + ",$custLit," + (ConvertTo-RpmaSqlLit $cn) + "," + (ConvertTo-RpmaSqlLit $xml) + ",SYSUTCDATETIME());"
  $rr = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText ("SET NOCOUNT ON;`r`n" + $insLic)
  if ($rr.ExitCode -ne 0) {
    Write-RpmaLog "license full write fail: $($rr.Text)"
    $insMin = "INSERT INTO dbo.Syspro_SystemLicense (SnapshotDate,InstanceName,ImportDate,LicenseType,Users,CustomerCode,CustomerName,RawXml,ImportedAt) VALUES ('$snap',$instLit,$id,$lt,$us,$custLit," + (ConvertTo-RpmaSqlLit $cn) + "," + (ConvertTo-RpmaSqlLit $xml) + ",SYSUTCDATETIME());"
    $rr2 = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText ("SET NOCOUNT ON;`r`n" + $insMin)
    if ($rr2.ExitCode -ne 0) { Write-RpmaLog "license write fail $($rr2.Text)" } else { Write-RpmaLog 'license OK (minimal)' }
  } else {
    Write-RpmaLog 'license OK'
  }

  $bdLit = if ($bd) { ConvertTo-RpmaSqlLit $bd } else { 'NULL' }
  $keepBuildSql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Syspro_VersionInfo',N'U') IS NULL RETURN;
DECLARE @keep nvarchar(50) = (
  SELECT TOP 1 NULLIF(LTRIM(RTRIM(BuildNumber)), N'')
  FROM dbo.Syspro_VersionInfo WITH (NOLOCK)
  WHERE InstanceName = $instLit
    AND NULLIF(LTRIM(RTRIM(BuildNumber)), N'') IS NOT NULL
    AND LTRIM(RTRIM(BuildNumber)) NOT IN (N'0', N'n/a', N'N/A', N'-')
  ORDER BY SnapshotDate DESC, ImportedAt DESC
);
DECLARE @bd nvarchar(50) = $bdLit;
IF @bd IS NULL OR LTRIM(RTRIM(@bd)) = N'' SET @bd = @keep;
DELETE FROM dbo.Syspro_VersionInfo WHERE SnapshotDate='$snap' AND InstanceName=$instLit;
INSERT INTO dbo.Syspro_VersionInfo (SnapshotDate,InstanceName,ProductName,ProductVersion,BuildNumber,LicenseType,Users,CompanyCount,LicenseExpiry,CustomerName,ImportDate,ServerName,ImportedAt)
VALUES ('$snap',$instLit,$(ConvertTo-RpmaSqlLit $pn),$(ConvertTo-RpmaSqlLit $pv),@bd,$lt,$us,$cc,$ex,$(ConvertTo-RpmaSqlLit $cn),$id,$(ConvertTo-RpmaSqlLit $InstanceName),SYSUTCDATETIME());
"@
  $rv = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText $keepBuildSql
  if ($rv.ExitCode -ne 0) { Write-RpmaLog "versionInfo fail $($rv.Text)" } else { Write-RpmaLog "versionInfo OK pv=$pv bd=$bd" }
}

function Collect-HotfixModules {
  Write-RpmaLog 'MODULE hotfixes'
  $chk = "SET NOCOUNT ON; SELECT CASE WHEN OBJECT_ID(N'dbo.Syspro_Hotfix',N'U') IS NOT NULL THEN 1 ELSE 0 END;"
  $rc = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText $chk -Tsv
  if ((Get-RpmaDataRows $rc.Text | Select-Object -First 1) -ne '1') {
    Write-RpmaLog 'Syspro_Hotfix missing on central - run 310'
    return
  }

  # code -> @{ Name; Source }  (PK is SnapshotDate+Instance+HotfixCode)
  $byCode = @{}

  function Add-Hf([string]$Code, [string]$Name, [string]$Src) {
    if (-not $Code) { return }
    $c = $Code.Trim()
    if ($c.Length -gt 50) { $c = $c.Substring(0, 50) }
    if (-not $c) { return }
    $k = $c.ToUpperInvariant()
    if ($byCode.ContainsKey($k)) { return }
    $nm = $Name
    if (-not $nm) { $nm = $c }
    if ($nm.Length -gt 200) { $nm = $nm.Substring(0, 200) }
    $byCode[$k] = @{ Code = $c; Name = $nm; Source = $Src }
  }

  # --- AdmLicenseMaster: licensed modules (FunctionalArea) ---
  $q1 = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'${sysDb}.dbo.AdmLicenseMaster',N'U') IS NULL RETURN;
SELECT DISTINCT TOP 500
  ISNULL(LTRIM(RTRIM(FunctionalArea)),N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(LicenseType)),N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(OperatorClass)),N'')
FROM ${sysQ}.dbo.AdmLicenseMaster;
"@
  $r1 = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $q1 -Tsv
  $n1 = 0
  if ($r1.ExitCode -eq 0) {
    foreach ($line in @(Get-RpmaDataRows $r1.Text)) {
      $pp = @(([string]$line) -split '~~', 0, 'SimpleMatch')
      $fa = if ($pp.Count -gt 0) { $pp[0].Trim() } else { '' }
      $lt2 = if ($pp.Count -gt 1) { $pp[1].Trim() } else { '' }
      $oc = if ($pp.Count -gt 2) { $pp[2].Trim() } else { '' }
      if (-not $fa -and -not $oc) { continue }
      # One row per FunctionalArea (PK). Operator classes fold into name once.
      $code = $fa
      if (-not $code) { $code = $oc }
      $label = $fa
      if (-not $label) { $label = $oc }
      if ($oc -and $fa -and $oc -ne $fa) { $label = ($fa + ' / ' + $oc) }
      if ($lt2) { $label = ($label + ' (type ' + $lt2 + ')') }
      Add-Hf $code $label 'AdmLicenseMaster'
      $n1++
    }
  } else { Write-RpmaLog "hotfix master fail $($r1.Text)" }
  Write-RpmaLog "hotfix AdmLicenseMaster raw=$n1 unique=$($byCode.Count)"

  # --- AdmLicenseImport ---
  $q2 = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'${sysDb}.dbo.AdmLicenseImport',N'U') IS NULL RETURN;
SELECT DISTINCT TOP 100
  ISNULL(LTRIM(RTRIM(FunctionalArea)),N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(LicenseNumber)),N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(LicenseType)),N'') + N'~~' +
  ISNULL(CONVERT(varchar(20), TRY_CONVERT(bigint, LicensedUsers)),N'')
FROM ${sysQ}.dbo.AdmLicenseImport;
"@
  $r2 = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $q2 -Tsv
  $n2 = 0
  if ($r2.ExitCode -eq 0) {
    foreach ($line in @(Get-RpmaDataRows $r2.Text)) {
      $pp = @(([string]$line) -split '~~', 0, 'SimpleMatch')
      $fa = if ($pp.Count -gt 0) { $pp[0].Trim() } else { '' }
      $ln = if ($pp.Count -gt 1) { $pp[1].Trim() } else { '' }
      $lt2 = if ($pp.Count -gt 2) { $pp[2].Trim() } else { '' }
      $lu = if ($pp.Count -gt 3) { $pp[3].Trim() } else { '' }
      $code = $fa
      if (-not $code -and $ln) { $code = $ln }
      if (-not $code) { continue }
      # Prefer keep master name if code already present
      $label = $fa
      if ($ln) {
        if ($label) { $label = ($label + ' lic ' + $ln) } else { $label = ('lic ' + $ln) }
      }
      if ($lt2) { $label = ($label + ' (' + $lt2 + ')') }
      if ($lu) { $label = ($label + ' users=' + $lu) }
      Add-Hf $code $label 'AdmLicenseImport'
      $n2++
    }
  }
  Write-RpmaLog "hotfix AdmLicenseImport raw=$n2 unique=$($byCode.Count)"

  # --- AdmUserProduct ---
  $q3 = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'${sysDb}.dbo.AdmUserProduct',N'U') IS NULL RETURN;
SELECT DISTINCT TOP 200
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), ProductId))),N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(ProductDescription)),N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(ProductMessage)),N'')
FROM ${sysQ}.dbo.AdmUserProduct
WHERE NULLIF(LTRIM(RTRIM(CONVERT(nvarchar(50), ProductId))),N'') IS NOT NULL;
"@
  $r3 = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $q3 -Tsv
  $n3 = 0
  if ($r3.ExitCode -eq 0) {
    foreach ($line in @(Get-RpmaDataRows $r3.Text)) {
      $pp = @(([string]$line) -split '~~', 0, 'SimpleMatch')
      $prodId = if ($pp.Count -gt 0) { $pp[0].Trim() } else { '' }
      $pd = if ($pp.Count -gt 1) { $pp[1].Trim() } else { '' }
      $pm = if ($pp.Count -gt 2) { $pp[2].Trim() } else { '' }
      if (-not $prodId) { continue }
      $label = $pd
      if (-not $label) { $label = $pm }
      if (-not $label) { $label = $prodId }
      Add-Hf $prodId $label 'AdmUserProduct'
      $n3++
    }
  }
  Write-RpmaLog "hotfix AdmUserProduct raw=$n3 unique=$($byCode.Count)"

  # --- SYSPRODeployment.CustomerHotfixes (real KB-style patches when present) ---
  $qDep = @"
SET NOCOUNT ON;
IF DB_ID(N'SYSPRODeployment') IS NULL RETURN;
IF OBJECT_ID(N'SYSPRODeployment.dbo.CustomerHotfixes',N'U') IS NULL
BEGIN
  SELECT N'NO_CUSTOMER_HOTFIXES';
  RETURN;
END
SELECT TOP 500
  ISNULL(CONVERT(nvarchar(50), ch.HotfixID), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(200), rh.HotfixSynopsis))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(200), rh.HotfixFileName))), N'')
FROM SYSPRODeployment.dbo.CustomerHotfixes AS ch WITH (NOLOCK)
LEFT JOIN SYSPRODeployment.dbo.ReleaseHotfixes AS rh WITH (NOLOCK)
  ON rh.HotfixID = ch.HotfixID;
"@
  $rd = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $qDep -Tsv
  $nDep = 0
  if ($rd.ExitCode -eq 0) {
    foreach ($line in @(Get-RpmaDataRows $rd.Text)) {
      $s = [string]$line
      if ($s -eq 'NO_CUSTOMER_HOTFIXES') {
        Write-RpmaLog 'hotfix deploy: CustomerHotfixes table missing'
        continue
      }
      $pp = @($s -split '~~', 0, 'SimpleMatch')
      $hid = if ($pp.Count -gt 0) { $pp[0].Trim() } else { '' }
      $syn = if ($pp.Count -gt 1) { $pp[1].Trim() } else { '' }
      $fn = if ($pp.Count -gt 2) { $pp[2].Trim() } else { '' }
      $code = $hid
      # Prefer KB from file name
      if ($fn -match '(?i)(KB\d+)') { $code = $Matches[1].ToUpperInvariant() }
      elseif ($fn) {
        $base = [IO.Path]::GetFileNameWithoutExtension($fn)
        if ($base) { $code = $base }
      }
      if (-not $code) { continue }
      $label = $syn
      if (-not $label) { $label = $fn }
      if (-not $label) { $label = $code }
      Add-Hf $code $label 'SYSPRODeployment'
      $nDep++
    }
  } else {
    Write-RpmaLog "hotfix deploy query: $($rd.Text)".Substring(0, [Math]::Min(200, ("hotfix deploy query: $($rd.Text)").Length))
  }
  Write-RpmaLog "hotfix deploy raw=$nDep unique=$($byCode.Count)"

  # Clear day then insert unique codes only
  $del = "DELETE FROM dbo.Syspro_Hotfix WHERE SnapshotDate='$snap' AND InstanceName=$instLit;"
  $rd2 = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText ("SET NOCOUNT ON;`r`n" + $del)
  if ($rd2.ExitCode -ne 0) { Write-RpmaLog "hotfix clear fail $($rd2.Text)"; throw "hotfix clear failed" }

  $stmts = New-Object System.Collections.Generic.List[string]
  foreach ($k in @($byCode.Keys)) {
    $item = $byCode[$k]
    $ins = "IF NOT EXISTS (SELECT 1 FROM dbo.Syspro_Hotfix WHERE SnapshotDate='$snap' AND InstanceName=$instLit AND HotfixCode=" + (ConvertTo-RpmaSqlLit $item.Code) + ") INSERT INTO dbo.Syspro_Hotfix (SnapshotDate,InstanceName,HotfixCode,HotfixName,Description,Installed,SourceTable,ImportedAt) VALUES ('$snap',$instLit," + (ConvertTo-RpmaSqlLit $item.Code) + "," + (ConvertTo-RpmaSqlLit $item.Name) + "," + (ConvertTo-RpmaSqlLit $item.Name) + ",1," + (ConvertTo-RpmaSqlLit $item.Source) + ",SYSUTCDATETIME());"
    [void]$stmts.Add($ins)
  }
  $written = 0
  if ($stmts.Count -gt 0) { $written = Send-Batches -Statements $stmts.ToArray() -BatchSize 20 }
  Write-RpmaLog "hotfix total=$written codes=$($byCode.Count)"
}

function Collect-Tasks {
  Write-RpmaLog 'MODULE tasks'
  $probe = "SET NOCOUNT ON; SELECT CASE WHEN OBJECT_ID(N'${sysDb}.dbo.AdmTaskGroup',N'U') IS NOT NULL THEN 1 ELSE 0 END;"
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $probe -Tsv
  if ((Get-RpmaDataRows $r.Text | Select-Object -First 1) -ne '1') {
    Write-RpmaLog 'tasks missing - skip'
    return
  }

  # discover TaskGroup columns
  $discG = @"
SET NOCOUNT ON;
DECLARE @oid int = OBJECT_ID(N'${sysDb}.dbo.AdmTaskGroup');
DECLARE @op sysname = (SELECT TOP 1 name FROM ${sysQ}.sys.columns WHERE object_id=@oid AND name IN (N'Operator',N'OperatorCode',N'Oper') ORDER BY CASE name WHEN N'Operator' THEN 1 WHEN N'OperatorCode' THEN 2 ELSE 3 END);
DECLARE @tg sysname = (SELECT TOP 1 name FROM ${sysQ}.sys.columns WHERE object_id=@oid AND name IN (N'TaskGroup',N'Group',N'GroupCode',N'TaskGroupCode') ORDER BY CASE name WHEN N'TaskGroup' THEN 1 ELSE 2 END);
DECLARE @cnt int = (SELECT COUNT(*) FROM ${sysQ}.dbo.AdmTaskGroup);
SELECT ISNULL(@op,N''), ISNULL(@tg,N''), @cnt;
"@
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $discG -Tsv
  $meta = (Get-RpmaDataRows $r.Text | Select-Object -First 1)
  Write-RpmaLog "TaskGroup meta=$meta"
  $opG = ''; $tgG = ''; $cntG = 0
  if ($meta) {
    $m = $meta -split '\|'
    $opG = $m[0]; $tgG = if ($m.Count -gt 1) { $m[1] } else { '' }
    if ($m.Count -gt 2 -and $m[2] -match '^\d+$') { $cntG = [int]$m[2] }
  }
  if (-not $tgG) {
    # list columns for log
    $cols = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText "SET NOCOUNT ON; SELECT name FROM ${sysQ}.sys.columns WHERE object_id=OBJECT_ID(N'${sysDb}.dbo.AdmTaskGroup') ORDER BY column_id;" -Tsv
    Write-RpmaLog ("TaskGroup columns: " + ((Get-RpmaDataRows $cols.Text) -join ','))
    Write-RpmaLog 'TaskGroup skip - no TaskGroup column'
  } else {
    $opExpr = if ($opG) { "ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), g.[$opG]))),N'')" } else { "N''" }
    $qg = @"
SET NOCOUNT ON;
SELECT
  $opExpr + N'|' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(100), g.[$tgG]))),N'')
FROM ${sysQ}.dbo.AdmTaskGroup g;
"@
    $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $qg -Tsv
    $stmts = New-Object System.Collections.Generic.List[string]
    if ($r.ExitCode -eq 0) {
      foreach ($line in (Get-RpmaDataRows $r.Text)) {
        $p = $line -split '\|', 2
        $op = $p[0]; $tg = if ($p.Count -gt 1) { $p[1] } else { '' }
        $ins = "INSERT INTO dbo.Syspro_TaskGroup (SnapshotDate,InstanceName,OperatorCode,TaskGroup,AutoRun,AutoCheck,AutoMarkComplete,PromptBetTasks,SuppressErrors,StopIfError,AutoLockout,KillAll,EmailLogFile,ImportedAt) VALUES ('$snap',$instLit," + (ConvertTo-RpmaSqlLit $op) + ',' + (ConvertTo-RpmaSqlLit $tg) + ',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,SYSUTCDATETIME());'
        $stmts.Add($ins) | Out-Null
      }
    } else { Write-RpmaLog "TaskGroup fail $($r.Text)" }
    Clear-CentralDay 'Syspro_TaskGroup'
    $tgN = 0
    if ($stmts.Count -gt 0) { $tgN = Send-Batches -Statements $stmts.ToArray() -BatchSize 20 }
    Write-RpmaLog "TaskGroup=$tgN localRows=$cntG"
  }

  # TaskItem
  $probeI = "SET NOCOUNT ON; SELECT CASE WHEN OBJECT_ID(N'${sysDb}.dbo.AdmTaskItem',N'U') IS NOT NULL THEN 1 ELSE 0 END;"
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $probeI -Tsv
  if ((Get-RpmaDataRows $r.Text | Select-Object -First 1) -ne '1') {
    Write-RpmaLog 'TaskItem missing - skip'
    return
  }
  $discI = @"
SET NOCOUNT ON;
DECLARE @oid int = OBJECT_ID(N'${sysDb}.dbo.AdmTaskItem');
DECLARE @op sysname = (SELECT TOP 1 name FROM ${sysQ}.sys.columns WHERE object_id=@oid AND name IN (N'Operator',N'OperatorCode',N'Oper') ORDER BY CASE name WHEN N'Operator' THEN 1 ELSE 2 END);
DECLARE @tg sysname = (SELECT TOP 1 name FROM ${sysQ}.sys.columns WHERE object_id=@oid AND name IN (N'TaskGroup',N'Group',N'GroupCode') ORDER BY CASE name WHEN N'TaskGroup' THEN 1 ELSE 2 END);
DECLARE @prog sysname = (SELECT TOP 1 name FROM ${sysQ}.sys.columns WHERE object_id=@oid AND name IN (N'Program',N'ProgramName',N'ProgramCode') ORDER BY CASE name WHEN N'Program' THEN 1 WHEN N'ProgramName' THEN 2 ELSE 3 END);
DECLARE @desc sysname = (SELECT TOP 1 name FROM ${sysQ}.sys.columns WHERE object_id=@oid AND name IN (N'Description',N'Desc',N'Comment') ORDER BY CASE name WHEN N'Description' THEN 1 ELSE 2 END);
DECLARE @seq sysname = (SELECT TOP 1 name FROM ${sysQ}.sys.columns WHERE object_id=@oid AND name IN (N'SequenceNumber',N'Sequence',N'Seq') ORDER BY 1);
DECLARE @cnt int = (SELECT COUNT(*) FROM ${sysQ}.dbo.AdmTaskItem);
SELECT ISNULL(@op,N''),ISNULL(@tg,N''),ISNULL(@prog,N''),ISNULL(@desc,N''),ISNULL(@seq,N''),@cnt;
"@
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $discI -Tsv
  $meta = (Get-RpmaDataRows $r.Text | Select-Object -First 1)
  Write-RpmaLog "TaskItem meta=$meta"
  $mi = $meta -split '\|'
  $opI = $mi[0]; $tgI = if ($mi.Count -gt 1){$mi[1]}else{''}; $progI = if ($mi.Count -gt 2){$mi[2]}else{''}
  $descI = if ($mi.Count -gt 3){$mi[3]}else{''}; $seqI = if ($mi.Count -gt 4){$mi[4]}else{''}
  $cntI = if ($mi.Count -gt 5 -and $mi[5] -match '^\d+$') { [int]$mi[5] } else { 0 }
  if (-not $tgI) {
    $cols = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText "SET NOCOUNT ON; SELECT name FROM ${sysQ}.sys.columns WHERE object_id=OBJECT_ID(N'${sysDb}.dbo.AdmTaskItem') ORDER BY column_id;" -Tsv
    Write-RpmaLog ("TaskItem columns: " + ((Get-RpmaDataRows $cols.Text) -join ','))
  } else {
    $opExpr = if ($opI) { "ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), i.[$opI]))),N'')" } else { "N''" }
    $progExpr = if ($progI) { "ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(200), i.[$progI]))),N'')" } else { "N''" }
    $descExpr = if ($descI) { "ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(200), i.[$descI]))),N'')" } else { "N''" }
    $seqExpr = if ($seqI) { "ISNULL(CONVERT(varchar(30), i.[$seqI]),N'')" } else { "N''" }
    $qi = @"
SET NOCOUNT ON;
SELECT
  $opExpr + N'|' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(100), i.[$tgI]))),N'') + N'|' +
  $seqExpr + N'|' +
  $descExpr + N'|' +
  $progExpr
FROM ${sysQ}.dbo.AdmTaskItem i;
"@
    $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $qi -Tsv
    $stmts = New-Object System.Collections.Generic.List[string]
    if ($r.ExitCode -eq 0) {
      foreach ($line in (Get-RpmaDataRows $r.Text)) {
        $p = $line -split '\|', 5
        $seq = if ($p.Count -gt 2 -and $p[2] -match '^-?\d') { $p[2] } else { 'NULL' }
        $ins = "INSERT INTO dbo.Syspro_TaskItem (SnapshotDate,InstanceName,OperatorCode,TaskGroup,StartDate,SequenceNumber,Description,Comment,TaskType,ProgramName,StartFolder,Occurrance,ImportedAt) VALUES ('$snap',$instLit," + (ConvertTo-RpmaSqlLit $p[0]) + ',' + (ConvertTo-RpmaSqlLit $(if($p.Count-gt1){$p[1]}else{''})) + ",NULL,$seq," + (ConvertTo-RpmaSqlLit $(if($p.Count-gt3){$p[3]}else{''})) + ',NULL,NULL,' + (ConvertTo-RpmaSqlLit $(if($p.Count-gt4){$p[4]}else{''})) + ',NULL,NULL,SYSUTCDATETIME());'
        $stmts.Add($ins) | Out-Null
      }
    } else { Write-RpmaLog "TaskItem fail $($r.Text)" }
    Clear-CentralDay 'Syspro_TaskItem'
    $tiN = 0
    if ($stmts.Count -gt 0) { $tiN = Send-Batches -Statements $stmts.ToArray() -BatchSize 20 }
    Write-RpmaLog "TaskItem=$tiN localRows=$cntI"
  }
}

function Collect-Health {
  Write-RpmaLog 'MODULE health'
  $probe = "SET NOCOUNT ON; SELECT CASE WHEN OBJECT_ID(N'${sysDb}.dbo.AdmSysHealthLog',N'U') IS NOT NULL THEN 1 ELSE 0 END;"
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $probe -Tsv
  $probeVal = [string]((@(Get-RpmaDataRows $r.Text) | Select-Object -First 1))
  if ($probeVal -ne '1') {
    Write-RpmaLog 'AdmSysHealthLog missing - skip'
    Clear-CentralDay 'Syspro_HealthLog'
    Write-RpmaLog 'HealthLog=0'
    return
  }

  # Direct SYSPRO standard columns (RSR/AHIC/UVSS confirmed)
  $q = @"
SET NOCOUNT ON;
SELECT TOP 500
  ISNULL(CONVERT(varchar(30), h.RunDateTime, 126), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), h.Operator))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(100), h.HealthFunction))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(400), h.Description))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(40), h.StatusFlag))), N'') + N'~~' +
  ISNULL(LEFT(REPLACE(REPLACE(CONVERT(nvarchar(400), h.Message), CHAR(13), N' '), CHAR(10), N' '), 400), N'')
FROM ${sysQ}.dbo.AdmSysHealthLog h
ORDER BY h.RunDateTime DESC;
"@
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $q -Tsv
  if ($r.ExitCode -ne 0) {
    Write-RpmaLog "Health direct fail: $($r.Text)"
    # Fallback without Message column
    $q2 = @"
SET NOCOUNT ON;
SELECT TOP 500
  ISNULL(CONVERT(varchar(30), h.RunDateTime, 126), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), h.Operator))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(100), h.HealthFunction))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(400), h.Description))), N'') + N'~~' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(40), h.StatusFlag))), N'') + N'~~'
FROM ${sysQ}.dbo.AdmSysHealthLog h
ORDER BY h.RunDateTime DESC;
"@
    $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $q2 -Tsv
    if ($r.ExitCode -ne 0) {
      Write-RpmaLog "Health fallback fail: $($r.Text)"
      Clear-CentralDay 'Syspro_HealthLog'
      Write-RpmaLog 'HealthLog=0'
      return
    }
  }

  $rawLines = @()
  foreach ($ln in @(Get-RpmaDataRows $r.Text)) {
    $s = [string]$ln
    if ($s) { $rawLines += $s }
  }
  Write-RpmaLog ("Health rawLines=" + $rawLines.Count)
  if ($rawLines.Count -gt 0) {
    $samp = $rawLines[0]
    if ($samp.Length -gt 160) { $samp = $samp.Substring(0, 160) }
    Write-RpmaLog ("Health sample=" + $samp)
  }

  $stmts = New-Object System.Collections.Generic.List[string]
  foreach ($line in $rawLines) {
    $parts = @(([string]$line) -split '~~', 0, 'SimpleMatch')
    $rd = 'NULL'
    if ($parts.Count -gt 0 -and $parts[0]) {
      $d = ([string]$parts[0]) -replace 'T', ' '
      if ($d -match '^\d{4}-\d{2}-\d{2}') { $rd = "'" + ($d -replace "'", "''") + "'" }
    }
    $op = if ($parts.Count -gt 1) { [string]$parts[1] } else { '' }
    $fn = if ($parts.Count -gt 2) { [string]$parts[2] } else { '' }
    $ds = if ($parts.Count -gt 3) { [string]$parts[3] } else { '' }
    $st = if ($parts.Count -gt 4) { [string]$parts[4] } else { '' }
    $ms = if ($parts.Count -gt 5) { [string]$parts[5] } else { '' }
    $ins = "INSERT INTO dbo.Syspro_HealthLog (SnapshotDate,InstanceName,CompanyDb,RunDateTime,Operator,HealthFunction,Description,StatusFlag,Message,ImportedAt) VALUES ('$snap',$instLit," + (ConvertTo-RpmaSqlLit $sysDb) + ",$rd," + (ConvertTo-RpmaSqlLit $op) + ',' + (ConvertTo-RpmaSqlLit $fn) + ',' + (ConvertTo-RpmaSqlLit $ds) + ',' + (ConvertTo-RpmaSqlLit $st) + ',' + (ConvertTo-RpmaSqlLit $ms) + ',SYSUTCDATETIME());'
    [void]$stmts.Add($ins)
  }
  Clear-CentralDay 'Syspro_HealthLog'
  $n = 0
  if ($stmts.Count -gt 0) { $n = Send-Batches -Statements $stmts.ToArray() -BatchSize 20 }
  Write-RpmaLog ("HealthLog=" + $n)
}

function Collect-Jobs {
  Write-RpmaLog 'MODULE jobs'
  $dbs = Get-RpmaOnlineDbs -LocalServer $LocalS -LocalUser $LocalSqlUser -LocalPass $LocalSqlPassword
  Clear-CentralDay 'Syspro_JobLogging'
  $total = 0
  $errorsOnly = [bool]($JobsErrorsOnly -or (-not $IncludeJobs))
  # When IncludeJobs: all (capped). When default schedule without flag: errors only if JobsErrorsOnly set.
  # For base 15-min schedule we recommend -JobsErrorsOnly. Full jobs via nightly -IncludeJobs.
  if (-not $IncludeJobs -and -not $JobsErrorsOnly -and -not $JobsOnly) {
    Write-RpmaLog 'jobs skipped (pass -JobsErrorsOnly or -IncludeJobs)'
    return
  }
  foreach ($db in $dbs) {
    if ($db -match '_SRS$' -or $db -eq 'SYSPRODeployment' -or $db -eq 'FileManagement') { continue }
    $dbQ = '[' + $db.Replace(']', ']]') + ']'
    $probe = "SET NOCOUNT ON; IF OBJECT_ID(N'$db.dbo.AdmJobLogging',N'U') IS NOT NULL SELECT 1 ELSE SELECT 0;"
    $pr = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $probe -Tsv
    if ((Get-RpmaDataRows $pr.Text | Select-Object -First 1) -ne '1') { continue }

    $disc = @"
SET NOCOUNT ON;
DECLARE @oid int = OBJECT_ID(N'$db.dbo.AdmJobLogging');
DECLARE @op sysname = (SELECT TOP 1 name FROM $dbQ.sys.columns WHERE object_id=@oid AND name IN (N'Operator',N'OperatorCode',N'Oper') ORDER BY CASE name WHEN N'Operator' THEN 1 ELSE 2 END);
DECLARE @prog sysname = (SELECT TOP 1 name FROM $dbQ.sys.columns WHERE object_id=@oid AND name IN (N'ProgramName',N'Program',N'ProgramCode') ORDER BY CASE name WHEN N'ProgramName' THEN 1 ELSE 2 END);
DECLARE @dt sysname = (SELECT TOP 1 c.name FROM $dbQ.sys.columns c JOIN $dbQ.sys.types t ON t.user_type_id=c.user_type_id WHERE c.object_id=@oid AND t.name IN (N'datetime',N'datetime2',N'smalldatetime') ORDER BY CASE c.name WHEN N'ProgRunDate' THEN 1 WHEN N'RunDate' THEN 2 ELSE 9 END);
DECLARE @err sysname = (SELECT TOP 1 name FROM $dbQ.sys.columns WHERE object_id=@oid AND name IN (N'ProgErrorCode',N'ErrorCode',N'Error') ORDER BY 1);
DECLARE @msg sysname = (SELECT TOP 1 name FROM $dbQ.sys.columns WHERE object_id=@oid AND name IN (N'Message',N'Msg',N'ErrorMessage') ORDER BY 1);
DECLARE @st sysname = (SELECT TOP 1 name FROM $dbQ.sys.columns WHERE object_id=@oid AND name IN (N'TransactionStatus',N'Status') ORDER BY 1);
SELECT ISNULL(@op,N''),ISNULL(@prog,N''),ISNULL(@dt,N''),ISNULL(@err,N''),ISNULL(@msg,N''),ISNULL(@st,N'');
"@
    $dr = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $disc -Tsv
    $meta = (Get-RpmaDataRows $dr.Text | Select-Object -First 1)
    if (-not $meta) { continue }
    $m = $meta -split '\|'
    $opC = $m[0]; $progC = $m[1]; $dtC = $m[2]
    $errC = if ($m.Count -gt 3) { $m[3] } else { '' }
    $msgC = if ($m.Count -gt 4) { $m[4] } else { '' }
    $stC = if ($m.Count -gt 5) { $m[5] } else { '' }
    if (-not $progC -or -not $dtC) { Write-RpmaLog "jobs $db skip missing cols"; continue }

    $opExpr = if ($opC) { "ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), j.[$opC]))),N'')" } else { "N''" }
    $errExpr = if ($errC) { "ISNULL(CONVERT(varchar(30), j.[$errC]),N'')" } else { "N''" }
    $msgExpr = if ($msgC) { "ISNULL(LEFT(CONVERT(nvarchar(400), j.[$msgC]),400),N'')" } else { "N''" }
    $stExpr = if ($stC) { "ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), j.[$stC]))),N'')" } else { "N''" }

    $where = "(j.[$dtC] >= DATEADD(DAY, -14, SYSUTCDATETIME()) OR j.[$dtC] IS NULL)"
    if ($JobsErrorsOnly -or (-not $IncludeJobs)) {
      $parts = @()
      if ($errC) { $parts += "(j.[$errC] IS NOT NULL AND TRY_CONVERT(decimal(18,2), j.[$errC]) <> 0)" }
      if ($stC) { $parts += "(j.[$stC] LIKE N'%Fail%' OR j.[$stC] LIKE N'%Error%')" }
      if ($msgC) { $parts += "(CONVERT(nvarchar(200), j.[$msgC]) LIKE N'%error%')" }
      if ($parts.Count -gt 0) { $where = "$where AND (" + ($parts -join ' OR ') + ')' }
    }
    $top = if ($IncludeJobs -and -not $JobsErrorsOnly) { 5000 } else { 2000 }

    $q = @"
SET NOCOUNT ON;
SELECT TOP ($top)
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(200), j.[$progC]))),N'') + N'|' +
  $opExpr + N'|' +
  $errExpr + N'|' +
  $stExpr + N'|' +
  ISNULL(CONVERT(varchar(30), j.[$dtC], 126),N'') + N'|' +
  $msgExpr
FROM $dbQ.dbo.AdmJobLogging j
WHERE $where
ORDER BY j.[$dtC] DESC;
"@
    $rr = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $q -Tsv
    if ($rr.ExitCode -ne 0) { Write-RpmaLog "jobs $db FAIL $($rr.Text)"; continue }
    $stmts = New-Object System.Collections.Generic.List[string]
    foreach ($line in (Get-RpmaDataRows $rr.Text)) {
      $p = $line -split '\|', 6
      $prog = $p[0]
      $op = if ($p.Count -gt 1) { $p[1] } else { '' }
      $err = if ($p.Count -gt 2 -and $p[2] -match '^-?\d') { $p[2] } else { 'NULL' }
      $st = if ($p.Count -gt 3) { $p[3] } else { '' }
      $dt = 'NULL'
      if ($p.Count -gt 4 -and $p[4]) { $dt = "'" + ($p[4] -replace 'T',' ') + "'" }
      $msg = if ($p.Count -gt 5) { $p[5] } else { '' }
      $ins = "INSERT INTO dbo.Syspro_JobLogging (SnapshotDate,InstanceName,CompanyDb,ProgramName,Operator,Message,ProgErrorCode,ErrorStatusCode,TransactionStatus,ProgRunDate,ImpactDate,ImportedAt) VALUES ('$snap',$instLit," + (ConvertTo-RpmaSqlLit $db) + ',' + (ConvertTo-RpmaSqlLit $prog) + ',' + (ConvertTo-RpmaSqlLit $op) + ',' + (ConvertTo-RpmaSqlLit $msg) + ",$err,NULL," + (ConvertTo-RpmaSqlLit $st) + ",$dt,$dt,SYSUTCDATETIME());"
      $stmts.Add($ins) | Out-Null
    }
    if ($stmts.Count -gt 0) {
      $w = Send-Batches -Statements $stmts.ToArray() -BatchSize 30
      $total += $w
      Write-RpmaLog "jobs $db rows=$w"
    } else {
      Write-RpmaLog "jobs $db rows=0"
    }
  }
  Write-RpmaLog "jobs total=$total"
}

function Collect-Security {
  Write-RpmaLog 'MODULE security'
  Clear-CentralDay 'Syspro_OperGroup'
  $n = 0
  $probe = "SET NOCOUNT ON; SELECT CASE WHEN OBJECT_ID(N'${sysDb}.dbo.AdmOperGroupMult',N'U') IS NOT NULL THEN 1 ELSE 0 END;"
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $probe -Tsv
  if ((Get-RpmaDataRows $r.Text | Select-Object -First 1) -eq '1') {
    $q = @"
SET NOCOUNT ON;
SELECT
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), m.Operator))),N'') + N'|' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), m.GroupCode))),N'') + N'|' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(200), g.Name))),N'')
FROM ${sysQ}.dbo.AdmOperGroupMult m
LEFT JOIN ${sysQ}.dbo.AdmOperGroup g
  ON LTRIM(RTRIM(CONVERT(nvarchar(50), g.GroupCode))) = LTRIM(RTRIM(CONVERT(nvarchar(50), m.GroupCode)));
"@
    $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $q -Tsv
    if ($r.ExitCode -eq 0) {
      $stmts = New-Object System.Collections.Generic.List[string]
      foreach ($line in (Get-RpmaDataRows $r.Text)) {
        $p = $line -split '\|', 3
        if (-not $p[0]) { continue }
        $gn = if ($p.Count -gt 2 -and $p[2]) { $p[2] } else { $p[1] }
        $ins = "INSERT INTO dbo.Syspro_OperGroup (SnapshotDate,InstanceName,OperatorCode,GroupCode,GroupName,ImportedAt) VALUES ('$snap',$instLit," + (ConvertTo-RpmaSqlLit $p[0]) + ',' + (ConvertTo-RpmaSqlLit $p[1]) + ',' + (ConvertTo-RpmaSqlLit $gn) + ',SYSUTCDATETIME());'
        $stmts.Add($ins) | Out-Null
      }
      if ($stmts.Count -gt 0) { $n = Send-Batches -Statements $stmts.ToArray() }
    } else {
      Write-RpmaLog "OperGroupMult col mismatch - skip ($($r.Text.Substring(0, [Math]::Min(120, $r.Text.Length))))"
    }
  }
  Write-RpmaLog "OperGroup=$n"

  # OperAmend - only if table exists on central with flexible insert
  try {
    Clear-CentralDay 'Syspro_OperAmend'
  } catch {
    Write-RpmaLog "OperAmend table missing on central - skip"
    return
  }
  $an = 0
  $probe2 = "SET NOCOUNT ON; SELECT CASE WHEN OBJECT_ID(N'${sysDb}.dbo.AdmOperAmendJnl',N'U') IS NOT NULL THEN 1 ELSE 0 END;"
  $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $probe2 -Tsv
  if ((Get-RpmaDataRows $r.Text | Select-Object -First 1) -eq '1') {
    $q = @"
SET NOCOUNT ON;
SELECT TOP 300
  ISNULL(CONVERT(varchar(30), JnlDate, 126),'') + N'|' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), OperatorCode))),'') + N'|' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(100), ColumnName))),'') + N'|' +
  ISNULL(LEFT(CONVERT(nvarchar(120), [Before]),120),'') + N'|' +
  ISNULL(LEFT(CONVERT(nvarchar(120), [After]),120),'')
FROM ${sysQ}.dbo.AdmOperAmendJnl
ORDER BY JnlDate DESC;
"@
    $r = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $q -Tsv
    if ($r.ExitCode -eq 0) {
      $stmts = New-Object System.Collections.Generic.List[string]
      foreach ($line in (Get-RpmaDataRows $r.Text)) {
        $p = $line -split '\|', 5
        $jd = 'NULL'
        if ($p[0]) { $jd = "'" + ($p[0] -replace 'T',' ') + "'" }
        $detail = ($(if ($p.Count -gt 3){$p[3]}else{''}) + ' -> ' + $(if ($p.Count -gt 4){$p[4]}else{''}))
        # Use columns that match 231_Ensure_Security_Extra if present
        $detail = ($(if ($p.Count -gt 2){$p[2]}else{''}) + ': ' + $(if ($p.Count -gt 3){$p[3]}else{''}) + ' -> ' + $(if ($p.Count -gt 4){$p[4]}else{''}))
        $ins = "INSERT INTO dbo.Syspro_OperAmend (SnapshotDate,InstanceName,OperatorCode,AmendDate,AmendType,Detail,ChangedBy,ImportedAt) VALUES ('$snap',$instLit," + (ConvertTo-RpmaSqlLit $(if($p.Count-gt1){$p[1]}else{''})) + ",$jd," + (ConvertTo-RpmaSqlLit $(if($p.Count-gt2){$p[2]}else{''})) + ',' + (ConvertTo-RpmaSqlLit $detail) + ',NULL,SYSUTCDATETIME());'
        $stmts.Add($ins) | Out-Null
      }
      try {
        if ($stmts.Count -gt 0) { $an = Send-Batches -Statements $stmts.ToArray() -BatchSize 25 }
      } catch {
        Write-RpmaLog "OperAmend write skip: $($_.Exception.Message)"
      }
    }
  }
  Write-RpmaLog "OperAmend=$an"
}

function Collect-Dtr {
  Write-RpmaLog 'MODULE dtr'
  $dbs = Get-RpmaOnlineDbs -LocalServer $LocalS -LocalUser $LocalSqlUser -LocalPass $LocalSqlPassword
  $sources = @(
    'DtrInvBalances','DtrApBalances','DtrArBalances','DtrAssBalances','DtrCbBalances',
    'DtrDnBalances','DtrGitBalances','DtrGrnBalances','DtrWipBalances','DtrWpiBalances'
  )
  $targets = @{
    'DtrInvBalances'='Syspro_DtrInvBalances'; 'DtrApBalances'='Syspro_DtrApBalances'; 'DtrArBalances'='Syspro_DtrArBalances'
    'DtrAssBalances'='Syspro_DtrAssBalances'; 'DtrCbBalances'='Syspro_DtrCbBalances'; 'DtrDnBalances'='Syspro_DtrDnBalances'
    'DtrGitBalances'='Syspro_DtrGitBalances'; 'DtrGrnBalances'='Syspro_DtrGrnBalances'; 'DtrWipBalances'='Syspro_DtrWipBalances'
    'DtrWpiBalances'='Syspro_DtrWpiBalances'
  }
  foreach ($t in $targets.Values) {
    try { Clear-CentralDay $t } catch { Write-RpmaLog "clear $t skip" }
  }
  $grand = 0
  $found = $false
  foreach ($db in $dbs) {
    if ($db -match '_SRS$') { continue }
    $dbQ = '[' + $db.Replace(']', ']]') + ']'
    foreach ($src in $sources) {
      $probe = "SET NOCOUNT ON; IF OBJECT_ID(N'$db.dbo.$src',N'U') IS NOT NULL SELECT 1 ELSE SELECT 0;"
      $pr = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $probe -Tsv
      if ((Get-RpmaDataRows $pr.Text | Select-Object -First 1) -ne '1') { continue }
      $found = $true
      $tgt = $targets[$src]
      # Generic L1: variance + GL balances work for all modules
      $q = @"
SET NOCOUNT ON;
SELECT
  ISNULL(CONVERT(varchar(10), s.GlYear),'') + N'|' +
  ISNULL(CONVERT(varchar(10), s.GlPeriod),'') + N'|' +
  ISNULL(CONVERT(varchar(10), s.InformationLevel),'') + N'|' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(50), s.GlCode))),N'') + N'|' +
  ISNULL(LTRIM(RTRIM(CONVERT(nvarchar(200), s.Description))),N'') + N'|' +
  ISNULL(CONVERT(varchar(40), s.GlOpenBalance),'') + N'|' +
  ISNULL(CONVERT(varchar(40), s.GlCloseBalance),'') + N'|' +
  ISNULL(CONVERT(varchar(40), s.Variance),'') + N'|' +
  ISNULL(CONVERT(varchar(30), s.RefreshDate, 126),'')
FROM $dbQ.dbo.[$src] s
WHERE TRY_CONVERT(int, s.InformationLevel) IN (1, 2, 3);
"@
      $rr = Invoke-RpmaSql -Server $LocalS -User $LocalSqlUser -Pass $LocalSqlPassword -SqlText $q -Tsv
      if ($rr.ExitCode -ne 0) { Write-RpmaLog "DTR $db.$src FAIL $($rr.Text)"; continue }
      $stmts = New-Object System.Collections.Generic.List[string]
      foreach ($line in (Get-RpmaDataRows $rr.Text)) {
        $p = $line -split '\|'
        function N([int]$i) {
          if ($p.Count -gt $i -and $p[$i] -ne '' -and $p[$i] -match '^-?\d') { return $p[$i] }
          return 'NULL'
        }
        $gy = N 0; $gp = N 1; $il = N 2
        $gc = if ($p.Count -gt 3) { $p[3] } else { '' }
        $ds = if ($p.Count -gt 4) { $p[4] } else { '' }
        $go = N 5; $gcl = N 6; $vr = N 7
        $rd = 'NULL'
        if ($p.Count -gt 8 -and $p[8]) { $rd = "'" + ($p[8] -replace 'T',' ') + "'" }
        # Minimal common columns used across DTR fact tables
        $ins = "INSERT INTO dbo.$tgt (SnapshotDate,InstanceName,CompanyDb,CustomerCode,GlYear,GlPeriod,InformationLevel,LevelKey,GlCode,Description,GlOpenBalance,GlCloseBalance,Variance,RefreshDate,ImportedAt) VALUES ('$snap',$instLit," + (ConvertTo-RpmaSqlLit $db) + ",$custLit,$gy,$gp,$il," + (ConvertTo-RpmaSqlLit $gc) + ',' + (ConvertTo-RpmaSqlLit $gc) + ',' + (ConvertTo-RpmaSqlLit $ds) + ",$go,$gcl,$vr,$rd,SYSUTCDATETIME());"
        $stmts.Add($ins) | Out-Null
      }
      if ($stmts.Count -gt 0) {
        try {
          $w = Send-Batches -Statements $stmts.ToArray() -BatchSize 25
          $grand += $w
          Write-RpmaLog ("DTR $db.$src L1-3 rows=" + $w)
        } catch {
          Write-RpmaLog "DTR $db.$src write fail: $($_.Exception.Message)"
        }
      } else {
        Write-RpmaLog "DTR $db.$src L1-3=0"
      }
    }
  }
  if (-not $found) {
    Write-RpmaLog 'DTR none (Datarapt not present) - invoking Collect-Dtr-Native-Fallback.ps1'
    $native = Join-Path $here 'Collect-Dtr-Native-Fallback.ps1'
    if (Test-Path -LiteralPath $native) {
      try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $native -ConfigPath $ConfigPath
        if ($LASTEXITCODE -ne 0) { Write-RpmaLog "native fallback exit $LASTEXITCODE" }
      } catch {
        Write-RpmaLog "FAIL dtr-native: $($_.Exception.Message)"
      }
    } else {
      Write-RpmaLog 'DTR none (Datarapt not present) and native fallback missing - OK'
    }
  }
  Write-RpmaLog "DTR total=$grand"
}

# ---- RUN ----
$failed = New-Object System.Collections.Generic.List[string]
if (-not $JobsOnly) {
  try { Collect-Operators } catch { Write-RpmaLog "FAIL operators: $($_.Exception.Message)"; $failed.Add('operators') | Out-Null }
  try { Collect-License } catch { Write-RpmaLog "FAIL license: $($_.Exception.Message)"; $failed.Add('license') | Out-Null }
  try { Collect-HotfixModules } catch { Write-RpmaLog "FAIL hotfixes: $($_.Exception.Message)"; $failed.Add('hotfixes') | Out-Null }
  try { Collect-Tasks } catch { Write-RpmaLog "FAIL tasks: $($_.Exception.Message)"; $failed.Add('tasks') | Out-Null }
  try { Collect-Health } catch { Write-RpmaLog "FAIL health: $($_.Exception.Message)"; $failed.Add('health') | Out-Null }
  if (-not $SkipSecurity) {
    try { Collect-Security } catch { Write-RpmaLog "FAIL security: $($_.Exception.Message)"; $failed.Add('security') | Out-Null }
  }
  if (-not $SkipDtr) {
    try { Collect-Dtr } catch { Write-RpmaLog "FAIL dtr: $($_.Exception.Message)"; $failed.Add('dtr') | Out-Null }
  }
}
if ($IncludeJobs -or $JobsOnly -or $JobsErrorsOnly) {
  try { Collect-Jobs } catch { Write-RpmaLog "FAIL jobs: $($_.Exception.Message)"; $failed.Add('jobs') | Out-Null }
}

$v = Invoke-RpmaSql -Server $CentralDataSource -User $CentralSqlUser -Pass $CentralSqlPassword -Database $CentralDatabase -SqlText @"
SET NOCOUNT ON;
SELECT N'Operators|' + CONVERT(varchar(20), COUNT(*)) FROM dbo.Syspro_Operators WHERE InstanceName=$instLit AND SnapshotDate='$snap'
UNION ALL SELECT N'Jobs|' + CONVERT(varchar(20), COUNT(*)) FROM dbo.Syspro_JobLogging WHERE InstanceName=$instLit AND SnapshotDate='$snap'
UNION ALL SELECT N'License|' + CONVERT(varchar(20), COUNT(*)) FROM dbo.Syspro_SystemLicense WHERE InstanceName=$instLit AND SnapshotDate='$snap'
UNION ALL SELECT N'Version|' + CONVERT(varchar(20), COUNT(*)) FROM dbo.Syspro_VersionInfo WHERE InstanceName=$instLit AND SnapshotDate='$snap'
UNION ALL SELECT N'Hotfix|' + CONVERT(varchar(20), COUNT(*)) FROM dbo.Syspro_Hotfix WHERE InstanceName=$instLit AND SnapshotDate='$snap'
UNION ALL SELECT N'TaskGroup|' + CONVERT(varchar(20), COUNT(*)) FROM dbo.Syspro_TaskGroup WHERE InstanceName=$instLit AND SnapshotDate='$snap'
UNION ALL SELECT N'Health|' + CONVERT(varchar(20), COUNT(*)) FROM dbo.Syspro_HealthLog WHERE InstanceName=$instLit AND SnapshotDate='$snap'
UNION ALL SELECT N'OperGroup|' + CONVERT(varchar(20), COUNT(*)) FROM dbo.Syspro_OperGroup WHERE InstanceName=$instLit AND SnapshotDate='$snap'
UNION ALL SELECT N'OperAmend|' + CONVERT(varchar(20), COUNT(*)) FROM dbo.Syspro_OperAmend WHERE InstanceName=$instLit AND SnapshotDate='$snap'
UNION ALL SELECT N'DtrL1|' + CONVERT(varchar(20), COUNT(*)) FROM dbo.Syspro_DtrInvBalances WHERE InstanceName=$instLit AND SnapshotDate='$snap' AND InformationLevel=1
UNION ALL SELECT N'DtrL2|' + CONVERT(varchar(20), COUNT(*)) FROM dbo.Syspro_DtrInvBalances WHERE InstanceName=$instLit AND SnapshotDate='$snap' AND InformationLevel=2
UNION ALL SELECT N'DtrL3|' + CONVERT(varchar(20), COUNT(*)) FROM dbo.Syspro_DtrInvBalances WHERE InstanceName=$instLit AND SnapshotDate='$snap' AND InformationLevel=3;
"@ -Tsv
Write-RpmaLog 'VERIFY'
foreach ($line in (Get-RpmaDataRows $v.Text)) { Write-RpmaLog ("  " + $line) }

if ($failed.Count -gt 0) {
  Write-RpmaLog ('DONE_WITH_ERRORS ' + ($failed -join ','))
  exit 1
}
Write-RpmaLog 'DONE OK'
Write-Host ''
Write-Host 'SUCCESS - base SYSPRO collect complete.' -ForegroundColor Green
exit 0
