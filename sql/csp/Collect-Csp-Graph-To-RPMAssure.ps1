<#
  Collect-Csp-Graph-To-RPMAssure.ps1
  Microsoft 365 / CSP -> RPMAssure_App (Csp_* tables)

  Auth: put secrets ONLY in Csp.Config.ps1 (same folder), never hard-code here.
    powershell -File .\Write-Csp-Config.ps1

  Pilot seed only (no Graph):
    -File ... -SeedOnly -WindowsAuth

  Live Graph:
    -File ... -WindowsAuth -SkipSchema
#>
param(
  [string]$ConfigPath = "",
  [string]$CustomerCode = $(if ($env:CSP_CUSTOMER_CODE) { $env:CSP_CUSTOMER_CODE } else { "RPMINT" }),
  [string]$PrimaryDomain = $(if ($env:CSP_PRIMARY_DOMAIN) { $env:CSP_PRIMARY_DOMAIN } else { "rpmresources.co.za" }),
  [string]$SqlServer = $(if ($env:RPM_ASSURE_SQL_SERVER) { $env:RPM_ASSURE_SQL_SERVER } else { ".\RPMREPORTS" }),
  [string]$SqlDatabase = $(if ($env:RPM_ASSURE_SQL_DATABASE) { $env:RPM_ASSURE_SQL_DATABASE } else { "RPMAssure_App" }),
  [string]$SqlUser = $(if ($env:RPM_ASSURE_SQL_USER) { $env:RPM_ASSURE_SQL_USER } else { "Rpm_collect" }),
  [string]$SqlPassword = $(if ($env:RPM_ASSURE_SQL_PASSWORD) { $env:RPM_ASSURE_SQL_PASSWORD } else { "" }),
  [switch]$WindowsAuth,
  [switch]$SeedOnly,
  [switch]$SkipSchema
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir = Join-Path $here "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$log = Join-Path $logDir ("csp_{0}.log" -f $stamp)

function Write-Log([string]$m) {
  $line = "{0}Z {1}" -f (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss"), $m
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}

function Find-Sqlcmd {
  $c = Get-Command sqlcmd -EA SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($p in @(
      "${env:ProgramFiles}\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE",
      "${env:ProgramFiles}\Microsoft SQL Server\Client SDK\ODBC\130\Tools\Binn\SQLCMD.EXE"
    )) { if (Test-Path $p) { return $p } }
  throw "sqlcmd not found"
}

function Invoke-SqlFile([string]$path) {
  $sqlcmd = Find-Sqlcmd
  $attempts = @()
  if (-not $script:UseWinAuth -and $SqlUser -and $SqlPassword) {
    $attempts += @{ Mode = "sql"; Args = @("-S", $SqlServer, "-d", $SqlDatabase, "-U", $SqlUser, "-P", $SqlPassword, "-C", "-b", "-i", $path) }
  }
  $attempts += @{ Mode = "win"; Args = @("-S", $SqlServer, "-d", $SqlDatabase, "-E", "-C", "-b", "-i", $path) }
  $last = ""
  foreach ($a in $attempts) {
    Write-Log "sqlcmd $($a.Mode) $path"
    & $sqlcmd @($a.Args)
    if ($LASTEXITCODE -eq 0) { return }
    $last = "sqlcmd $($a.Mode) failed exit=$LASTEXITCODE on $path"
    Write-Log $last
  }
  throw $last
}

function Invoke-SqlText([string]$sql, [string]$label) {
  $sqlcmd = Find-Sqlcmd
  $f = Join-Path $logDir ("{0}_{1}.sql" -f $label, $stamp)
  [IO.File]::WriteAllText($f, $sql, [Text.UTF8Encoding]::new($false))
  Write-Log "SQL $label -> $f"
  Invoke-SqlFile $f
}

function Sql-Quote([string]$s) {
  if ($null -eq $s) { return "NULL" }
  return "N'" + ($s -replace "'", "''") + "'"
}

# Friendly product names when Graph only returns part numbers
$SkuNameMap = @{
  "O365_BUSINESS_PREMIUM"     = "Microsoft 365 Business Premium"
  "O365_BUSINESS_ESSENTIALS"  = "Microsoft 365 Business Basic"
  "SPB"                       = "Microsoft 365 Business Premium"
  "SPE_E3"                    = "Microsoft 365 E3"
  "SPE_E5"                    = "Microsoft 365 E5"
  "ENTERPRISEPACK"            = "Office 365 E3"
  "ENTERPRISEPREMIUM"         = "Office 365 E5"
  "EXCHANGESTANDARD"          = "Exchange Online (Plan 1)"
  "EXCHANGEENTERPRISE"        = "Exchange Online (Plan 2)"
  "POWER_BI_PRO"              = "Power BI Pro"
  "POWER_BI_STANDARD"         = "Power BI Free"
  "VISIOCLIENT"               = "Visio Plan 2"
  "PROJECTPROFESSIONAL"       = "Project Plan 3"
  "TEAMS_EXPLORATORY"         = "Teams Exploratory"
  "AAD_PREMIUM"               = "Entra ID P1"
  "AAD_PREMIUM_P2"            = "Entra ID P2"
  "ATP_ENTERPRISE"            = "Defender for Office 365 P1"
  "EMS"                       = "Enterprise Mobility + Security E3"
  "EMSPREMIUM"                = "Enterprise Mobility + Security E5"
}

function Get-SkuDisplayName([string]$part) {
  if ([string]::IsNullOrWhiteSpace($part)) { return $part }
  $k = $part.ToUpperInvariant()
  if ($SkuNameMap.ContainsKey($k)) { return $SkuNameMap[$k] }
  return $part
}

Write-Log "=== CSP / M365 collect start ==="

# Config overlay (secrets live here only)
$cfg = $null
if (-not [string]::IsNullOrWhiteSpace($ConfigPath) -and (Test-Path -LiteralPath $ConfigPath)) {
  $cfg = $ConfigPath
} else {
  foreach ($c in @(
      (Join-Path $here "Csp.Config.ps1"),
      "C:\RPM-Assure\Sql\csp\Csp.Config.ps1"
    )) {
    if (Test-Path -LiteralPath $c) { $cfg = $c; break }
  }
}
if ($cfg) {
  . $cfg
  Write-Log ("Loaded " + (Split-Path -Leaf $cfg))
}

# Graph secrets: env first, then config variables
$tenantId = $env:CSP_TENANT_ID
$clientId = $env:CSP_CLIENT_ID
$clientSecret = $env:CSP_CLIENT_SECRET
if (Get-Variable -Name CspTenantId -EA SilentlyContinue) {
  if ($CspTenantId) { $tenantId = [string]$CspTenantId }
}
if (Get-Variable -Name CspClientId -EA SilentlyContinue) {
  if ($CspClientId) { $clientId = [string]$CspClientId }
}
if (Get-Variable -Name CspClientSecret -EA SilentlyContinue) {
  if ($CspClientSecret) { $clientSecret = [string]$CspClientSecret }
}

# SQL + customer map: config may set these when dotted into this scope
# (param defaults already applied; config overrides if present and non-empty)
# Note: after . Csp.Config.ps1, $CustomerCode / $SqlServer etc. are already updated if defined there.

# After config overlay, never keep a local-instance default that fails on the scheduled task.
if ([string]::IsNullOrWhiteSpace($SqlServer) -or $SqlServer -match '14333|102\.222\.21\.220') {
  if (Get-Service -Name 'MSSQL$RPMREPORTS' -ErrorAction SilentlyContinue) { $SqlServer = ".\RPMREPORTS" }
}
if ([string]::IsNullOrWhiteSpace($SqlPassword) -and -not $WindowsAuth) {
  $gp = @(
    (Join-Path $here '..\ops\Get-RpmSqlPassword.ps1'),
    'C:\RPM-Assure\Sql\ops\Get-RpmSqlPassword.ps1'
  ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($gp) { . $gp; $SqlPassword = Get-RpmSqlPassword -Current $SqlPassword }
  if ([string]::IsNullOrWhiteSpace($SqlPassword)) { throw 'SQL password missing — run Harden-Production.ps1' }
  $SqlUser = "Rpm_collect"
}

$script:UseWinAuth = $false
if ($WindowsAuth) { $script:UseWinAuth = $true }
if (-not [string]::IsNullOrWhiteSpace($SqlPassword) -and -not [string]::IsNullOrWhiteSpace($SqlUser)) {
  $script:UseWinAuth = $false
}
if ([string]::IsNullOrWhiteSpace($SqlPassword) -and $WindowsAuth) {
  $script:UseWinAuth = $true
}

Write-Log "CustomerCode=$CustomerCode domain=$PrimaryDomain SeedOnly=$SeedOnly SQL=$SqlServer WinAuth=$($script:UseWinAuth)"

$hasGraph = -not [string]::IsNullOrWhiteSpace($tenantId) -and
  -not [string]::IsNullOrWhiteSpace($clientId) -and
  -not [string]::IsNullOrWhiteSpace($clientSecret)

# Avoid re-seeding pilot over live Graph data
if ($hasGraph -and -not $SeedOnly -and -not $PSBoundParameters.ContainsKey("SkipSchema")) {
  $SkipSchema = $true
}

if (-not $SkipSchema) {
  $schema = Join-Path $here "460_Ensure_Csp_M365.sql"
  if (Test-Path -LiteralPath $schema) {
    Write-Log "Apply 460 schema/seed (safe re-run)..."
    try { Invoke-SqlFile $schema } catch { Write-Log "WARN 460: $($_.Exception.Message)" }
  } else {
    Write-Log "WARN missing 460_Ensure_Csp_M365.sql"
  }
}

if ($SeedOnly -or -not $hasGraph) {
  Write-Log "Seed-only / no Graph credentials - pilot rows from 460 remain source of truth."
  Write-Log "Create config: powershell -File C:\RPM-Assure\Sql\csp\Write-Csp-Config.ps1"
  Write-Log "Or copy Csp.Config.example.ps1 -> Csp.Config.ps1 and fill Tenant/Client/Secret."
  Write-Log "log=$log"
  Write-Log "=== CSP collect done (seed) ==="
  exit 0
}

Write-Log "Graph token for tenant $tenantId ..."
$tokenBody = @{
  client_id     = $clientId
  client_secret = $clientSecret
  scope         = "https://graph.microsoft.com/.default"
  grant_type    = "client_credentials"
}
try {
  $tok = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" -Body $tokenBody
} catch {
  Write-Log "Graph login FAILED: $($_.Exception.Message)"
  Write-Log "Check Tenant ID, Client ID, secret, and admin consent for application permissions."
  throw
}
$headers = @{ Authorization = "Bearer $($tok.access_token)" }

function Graph-Get([string]$url) {
  try {
    return Invoke-RestMethod -Method Get -Uri $url -Headers $headers
  } catch {
    $detail = $_.Exception.Message
    try {
      $resp = $_.Exception.Response
      if ($resp) {
        $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $body = $sr.ReadToEnd()
        if ($body) { $detail = $detail + " | " + $body.Substring(0, [Math]::Min(300, $body.Length)) }
      }
    } catch {}
    throw (New-Object System.Exception($detail, $_.Exception))
  }
}

Write-Log "Org + subscribedSkus + users..."
$org = Graph-Get "https://graph.microsoft.com/v1.0/organization"
$org0 = $org.value | Select-Object -First 1
$displayName = if ($org0.displayName) { [string]$org0.displayName } else { $CustomerCode }
$country = if ($org0.countryLetterCode) { [string]$org0.countryLetterCode } else { $null }
$tid = if ($org0.id) { [string]$org0.id } else { $tenantId }
if ($org0.verifiedDomains) {
  $def = @($org0.verifiedDomains | Where-Object { $_.isDefault -eq $true } | Select-Object -First 1)
  if ($def -and $def.name) { $PrimaryDomain = [string]$def.name }
}

$skus = Graph-Get "https://graph.microsoft.com/v1.0/subscribedSkus"
$users = @()
$next = "https://graph.microsoft.com/v1.0/users?`$select=displayName,userPrincipalName,accountEnabled,department,jobTitle,assignedLicenses,userType&`$top=999"

while ($next) {
  $page = Graph-Get $next
  $users += @($page.value)
  $next = $page.'@odata.nextLink'
}
Write-Log "SKUs=$(@($skus.value).Count) users=$($users.Count)"

$snap = (Get-Date).ToString("yyyy-MM-dd")
$nowSql = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss")

$mapSql = @"
SET NOCOUNT ON;
MERGE dbo.Dim_Csp_TenantMap AS t
USING (SELECT $(Sql-Quote $CustomerCode) AS CustomerCode, $(Sql-Quote $tid) AS TenantId) AS s
  ON t.CustomerCode = s.CustomerCode AND t.TenantId = s.TenantId
WHEN MATCHED THEN UPDATE SET
  PrimaryDomain = $(Sql-Quote $PrimaryDomain),
  DisplayName = $(Sql-Quote $displayName),
  Country = $(Sql-Quote $country),
  Active = 1,
  Notes = N'Graph collect',
  UpdatedAtUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (CustomerCode, TenantId, PrimaryDomain, DisplayName, Country, Active, Notes)
VALUES (s.CustomerCode, s.TenantId, $(Sql-Quote $PrimaryDomain), $(Sql-Quote $displayName), $(Sql-Quote $country), 1, N'Graph collect');

-- Deactivate other tenant rows for this customer
UPDATE dbo.Dim_Csp_TenantMap SET Active = 0
WHERE CustomerCode = $(Sql-Quote $CustomerCode) AND TenantId <> $(Sql-Quote $tid);

IF COL_LENGTH(N'dbo.Dim_Customer_AmsConfig', N'PillarCsp') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM dbo.Dim_Customer_AmsConfig WHERE CustomerCode = $(Sql-Quote $CustomerCode))
    UPDATE dbo.Dim_Customer_AmsConfig SET PillarCsp = 1 WHERE CustomerCode = $(Sql-Quote $CustomerCode);
  ELSE
    INSERT INTO dbo.Dim_Customer_AmsConfig (CustomerCode, PillarCsp) VALUES ($(Sql-Quote $CustomerCode), 1);
END
"@
Invoke-SqlText $mapSql "csp_map"

$licLines = New-Object System.Collections.Generic.List[string]
$licLines.Add("SET NOCOUNT ON;")
$licLines.Add("DELETE FROM dbo.Csp_Licenses WHERE CustomerCode = $(Sql-Quote $CustomerCode) AND SnapshotDate = '$snap';")
foreach ($s in @($skus.value)) {
  $skuId = [string]$s.skuId
  $part = [string]$s.skuPartNumber
  $name = Get-SkuDisplayName $part
  $prepaid = 0; $consumed = 0; $avail = 0
  if ($s.prepaidUnits) {
    try { $prepaid = [int]$s.prepaidUnits.enabled } catch { $prepaid = 0 }
  }
  if ($null -ne $s.consumedUnits) { $consumed = [int]$s.consumedUnits }
  # Graph often reports "unlimited" free SKUs as ~1e6 seats - exclude from EXCO totals
  if ($prepaid -ge 99999) {
    $prepaid = $consumed
    $avail = 0
    $name = $name + " (unlimited pool)"
  } else {
    $avail = [Math]::Max(0, $prepaid - $consumed)
  }
  $licLines.Add(@"
INSERT INTO dbo.Csp_Licenses (CustomerCode, SnapshotDate, SkuId, SkuPartNumber, ProductName, PrepaidUnits, ConsumedUnits, AvailableUnits, ImportedAt)
VALUES ($(Sql-Quote $CustomerCode), '$snap', $(Sql-Quote $skuId), $(Sql-Quote $part), $(Sql-Quote $name), $prepaid, $consumed, $avail, '$nowSql');
"@)
}
Invoke-SqlText ($licLines -join "`n") "csp_licenses"

$usrLines = New-Object System.Collections.Generic.List[string]
$usrLines.Add("SET NOCOUNT ON;")
$usrLines.Add("DELETE FROM dbo.Csp_Users WHERE CustomerCode = $(Sql-Quote $CustomerCode) AND SnapshotDate = '$snap';")
$skuById = @{}
foreach ($s in @($skus.value)) {
  $skuById[[string]$s.skuId] = Get-SkuDisplayName ([string]$s.skuPartNumber)
}
foreach ($u in $users) {
  $upn = [string]$u.userPrincipalName
  if ([string]::IsNullOrWhiteSpace($upn)) { continue }
  $dn = [string]$u.displayName
  $en = if ($u.accountEnabled -eq $false) { 0 } else { 1 }
  $dept = [string]$u.department
  $title = [string]$u.jobTitle
  $skuNames = @()
  foreach ($al in @($u.assignedLicenses)) {
    $sid = [string]$al.skuId
    if ($skuById.ContainsKey($sid)) { $skuNames += $skuById[$sid] } else { $skuNames += $sid }
  }
  $sk = ($skuNames -join "; ")
  $usrLines.Add(@"
INSERT INTO dbo.Csp_Users (CustomerCode, SnapshotDate, UserPrincipalName, DisplayName, AccountEnabled, AssignedSkus, Department, JobTitle, ImportedAt)
VALUES ($(Sql-Quote $CustomerCode), '$snap', $(Sql-Quote $upn), $(Sql-Quote $dn), $en, $(Sql-Quote $sk), $(Sql-Quote $dept), $(Sql-Quote $title), '$nowSql');
"@)
}
Invoke-SqlText ($usrLines -join "`n") "csp_users"

# Service health (optional permission)
$healthScore = 100
$openInc = 0
$note = "Graph collect OK"
try {
  $sh = Graph-Get "https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/healthOverviews"
  $issues = @($sh.value | Where-Object { $_.status -and $_.status -ne "serviceOperational" })
  $openInc = $issues.Count
  if ($openInc -gt 0) {
    $healthScore = [Math]::Max(40, 100 - ($openInc * 8))
    $names = ($issues | Select-Object -First 5 | ForEach-Object { $_.service }) -join ", "
    $note = "Service issues: $names"
  } else {
    $note = "All polled services operational"
  }
  Write-Log "Service health openIssues=$openInc score=$healthScore"
} catch {
  $note = "Graph collect (service health not permitted or unavailable)"
  Write-Log "Service health skip: $($_.Exception.Message)"
}

$healthSql = @"
SET NOCOUNT ON;
MERGE dbo.Csp_TenantHealth AS t
USING (SELECT $(Sql-Quote $CustomerCode) AS CustomerCode, '$snap' AS SnapshotDate) AS s
  ON t.CustomerCode = s.CustomerCode AND t.SnapshotDate = s.SnapshotDate
WHEN MATCHED THEN UPDATE SET
  HealthScore = $healthScore,
  OpenIncidents = $openInc,
  ServiceNote = $(Sql-Quote $note),
  ImportedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (CustomerCode, SnapshotDate, HealthScore, OpenIncidents, ServiceNote)
VALUES (s.CustomerCode, s.SnapshotDate, $healthScore, $openInc, $(Sql-Quote $note));
"@
Invoke-SqlText $healthSql "csp_health"

# ---- EXCO posture (aggregates only) ----
$postureNotes = New-Object System.Collections.Generic.List[string]
$secureScore = $null
$secureMax = $null
$securePct = $null
try {
  $ss = Graph-Get "https://graph.microsoft.com/v1.0/security/secureScores?`$top=1"
  $row = @($ss.value) | Select-Object -First 1
  if ($row) {
    $secureScore = [decimal]$row.currentScore
    $secureMax = [decimal]$row.maxScore
    if ($secureMax -gt 0) {
      $securePct = [Math]::Round(($secureScore / $secureMax) * 100, 1)
    }
    Write-Log "SecureScore=$secureScore / $secureMax ($securePct%)"
  }
} catch {
  $postureNotes.Add("SecureScore skip")
  Write-Log "SecureScore skip: $($_.Exception.Message)"
}

$mfaReg = $null
$mfaCap = $null
$mfaPct = $null
try {
  $reg = 0
  $cap = 0
  $mnext = "https://graph.microsoft.com/v1.0/reports/authenticationMethods/userRegistrationDetails?`$select=id,isMfaRegistered,isAdmin,userType&`$top=999"
  while ($mnext) {
    $mpage = Graph-Get $mnext
    foreach ($mu in @($mpage.value)) {
      $cap++
      if ($mu.isMfaRegistered -eq $true) { $reg++ }
    }
    $mnext = $mpage.'@odata.nextLink'
  }
  $mfaReg = $reg
  $mfaCap = $cap
  if ($cap -gt 0) { $mfaPct = [Math]::Round(($reg / $cap) * 100, 1) }
  Write-Log "MFA registered=$reg / capable=$cap ($mfaPct%)"
} catch {
  $postureNotes.Add("MFA skip")
  Write-Log "MFA registration skip: $($_.Exception.Message)"
}

$gaCount = $null
$gaNameList = New-Object System.Collections.Generic.List[string]
$gaRows = New-Object System.Collections.Generic.List[object]
$gaTemplateId = "62e90394-69f5-4237-9190-012177145e10"

function Add-GaMember {
  param($m)
  if ($null -eq $m) { return }
  $oid = [string]$m.id
  if (-not $oid) { return }
  foreach ($existing in $script:gaRows) {
    if ([string]$existing.ObjectId -eq $oid) { return }
  }
  $upn = $null
  if ($m.PSObject.Properties.Name -contains "userPrincipalName" -and $m.userPrincipalName) {
    $upn = [string]$m.userPrincipalName
  }
  $dn = $null
  if ($m.PSObject.Properties.Name -contains "displayName" -and $m.displayName) {
    $dn = [string]$m.displayName
  }
  $mail = $null
  if ($m.PSObject.Properties.Name -contains "mail" -and $m.mail) {
    $mail = [string]$m.mail
  }
  $ptype = "directoryObject"
  if ($m.PSObject.Properties.Name -contains "@odata.type" -and $m."@odata.type") {
    $ptype = ([string]$m."@odata.type") -replace "#microsoft.graph.", ""
  }
  $label = if ($upn) { $upn } elseif ($dn) { $dn } elseif ($mail) { $mail } else { $oid }
  $script:gaNameList.Add($label) | Out-Null
  $script:gaRows.Add([pscustomobject]@{
    ObjectId          = $oid
    DisplayName       = $dn
    UserPrincipalName = $upn
    Mail              = $mail
    PrincipalType     = $ptype
  }) | Out-Null
}

# Use script-scoped lists so nested function can write
$script:gaNameList = $gaNameList
$script:gaRows = $gaRows

try {
  # Path A: list activated directory roles (no $select - fewer 400s), match GA, list members
  try {
    $roles = Graph-Get "https://graph.microsoft.com/v1.0/directoryRoles"
    $gaRole = @($roles.value) | Where-Object {
      ([string]$_.roleTemplateId -eq $gaTemplateId) -or
      ([string]$_.displayName -eq "Global Administrator") -or
      ([string]$_.displayName -eq "Company Administrator")
    } | Select-Object -First 1
    if ($gaRole -and $gaRole.id) {
      $roleId = [string]$gaRole.id
      $nextGa = "https://graph.microsoft.com/v1.0/directoryRoles/$roleId/members"
      while ($nextGa) {
        $page = Graph-Get $nextGa
        foreach ($m in @($page.value)) { Add-GaMember $m }
        $nextGa = $page."@odata.nextLink"
      }
      Write-Log ("GA via directoryRoles/members n=" + $script:gaRows.Count)
    } else {
      Write-Log "GA: Global Administrator role not in activated directoryRoles list"
    }
  } catch {
    Write-Log ("GA directoryRoles skip: " + $_.Exception.Message)
  }

  # Path B: roleTemplateId key syntax (no query filter)
  if ($script:gaRows.Count -eq 0) {
    try {
      $u1 = "https://graph.microsoft.com/v1.0/directoryRoles(roleTemplateId='" + $gaTemplateId + "')"
      $roleObj = Graph-Get $u1
      $roleId2 = [string]$roleObj.id
      if ($roleId2) {
        $nextGa = "https://graph.microsoft.com/v1.0/directoryRoles/" + $roleId2 + "/members"
        while ($nextGa) {
          $page = Graph-Get $nextGa
          foreach ($m in @($page.value)) { Add-GaMember $m }
          $nextGa = $page."@odata.nextLink"
        }
        Write-Log ("GA via roleTemplateId entity n=" + $script:gaRows.Count)
      }
    } catch {
      Write-Log ("GA roleTemplateId entity skip: " + $_.Exception.Message)
    }
  }

  # Path C: unified RBAC role assignments (needs RoleManagement.Read.Directory)
  # IMPORTANT: never use $pid - it is a read-only automatic variable in PowerShell
  if ($script:gaRows.Count -eq 0) {
    try {
      $filter = [uri]::EscapeDataString("roleDefinitionId eq '" + $gaTemplateId + "'")
      $nextGa = "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments?`$filter=" + $filter + "&`$top=999"
      while ($nextGa) {
        $page = Graph-Get $nextGa
        foreach ($asg in @($page.value)) {
          $principalId = [string]$asg.principalId
          if (-not $principalId) { continue }
          try {
            $u = Graph-Get ("https://graph.microsoft.com/v1.0/users/" + $principalId + "?`$select=id,displayName,userPrincipalName,mail")
            Add-GaMember $u
          } catch {
            try {
              $u2 = Graph-Get ("https://graph.microsoft.com/v1.0/servicePrincipals/" + $principalId + "?`$select=id,displayName,appId")
              Add-GaMember $u2
            } catch {
              Add-GaMember ([pscustomobject]@{ id = $principalId; displayName = $principalId })
            }
          }
        }
        $nextGa = $page."@odata.nextLink"
      }
      Write-Log ("GA via roleAssignments n=" + $script:gaRows.Count)
    } catch {
      Write-Log ("GA roleAssignments skip: " + $_.Exception.Message)
    }
  }

  $gaRows = $script:gaRows
  $gaNameList = $script:gaNameList
  $gaCount = [int]$gaRows.Count
  if ($gaNameList.Count -gt 0) {
    Write-Log ("GlobalAdminCount=$gaCount names=" + ($gaNameList -join "; "))
  } else {
    Write-Log "GlobalAdminCount=$gaCount (no names) - grant Directory.Read.All and/or RoleManagement.Read.Directory (application + admin consent)"
  }
} catch {
  $postureNotes.Add("GA skip")
  Write-Log ("Global admin count skip: " + $_.Exception.Message)
  $gaCount = $null
}

$guestCount = 0
$disabledLicensed = 0
foreach ($u in $users) {
  $ut = [string]$u.userType
  if ($ut -eq "Guest") { $guestCount++ }
  $hasLic = @($u.assignedLicenses).Count -gt 0
  if ($u.accountEnabled -eq $false -and $hasLic) { $disabledLicensed++ }
}
Write-Log "Guests=$guestCount DisabledLicensed=$disabledLicensed"

$failed7d = $null
try {
  $since = (Get-Date).ToUniversalTime().AddDays(-7).ToString("yyyy-MM-ddTHH:mm:ssZ")
  # Lean: only first page + estimate from page size (no full dump)
  $siUrl = "https://graph.microsoft.com/v1.0/auditLogs/signIns?`$filter=createdDateTime ge $since and status/errorCode ne 0&`$top=50&`$select=id"
  $si = Graph-Get $siUrl
  $n = @($si.value).Count
  if ($si.'@odata.nextLink') {
    # more than 50 - store 50+ as 51 to signal "at least"
    $failed7d = 51
  } else {
    $failed7d = $n
  }
  Write-Log "FailedSignIns7d sample=$failed7d (cap 50+)"
} catch {
  $postureNotes.Add("SignIn skip")
  Write-Log "Failed sign-in skip: $($_.Exception.Message)"
}

$ssSql = if ($null -eq $secureScore) { "NULL" } else { "$secureScore" }
$smSql = if ($null -eq $secureMax) { "NULL" } else { "$secureMax" }
$spSql = if ($null -eq $securePct) { "NULL" } else { "$securePct" }
$mrSql = if ($null -eq $mfaReg) { "NULL" } else { "$mfaReg" }
$mcSql = if ($null -eq $mfaCap) { "NULL" } else { "$mfaCap" }
$mpSql = if ($null -eq $mfaPct) { "NULL" } else { "$mfaPct" }
$gaSql = if ($null -eq $gaCount) { "NULL" } else { "$gaCount" }
$gaNamesJoined = $null
if ($gaNameList -and $gaNameList.Count -gt 0) {
  $gaNamesJoined = ($gaNameList | Select-Object -First 40) -join "; "
}
$gaNamesSql = if ([string]::IsNullOrWhiteSpace($gaNamesJoined)) { "NULL" } else { Sql-Quote $gaNamesJoined }
$fsSql = if ($null -eq $failed7d) { "NULL" } else { "$failed7d" }
$pNote = if ($postureNotes.Count -gt 0) {
  "Graph posture; " + ($postureNotes -join "; ")
} else {
  "Graph posture OK"
}

$postureSql = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Csp_Posture', N'U') IS NULL
BEGIN
  RAISERROR(N'Csp_Posture missing - apply 461_Ensure_Csp_Exco_Posture.sql', 16, 1);
  RETURN;
END
MERGE dbo.Csp_Posture AS t
USING (SELECT $(Sql-Quote $CustomerCode) AS CustomerCode, '$snap' AS SnapshotDate) AS s
  ON t.CustomerCode = s.CustomerCode AND t.SnapshotDate = s.SnapshotDate
WHEN MATCHED THEN UPDATE SET
  SecureScore = $ssSql,
  SecureScoreMax = $smSql,
  SecureScorePct = $spSql,
  MfaRegisteredCount = $mrSql,
  MfaCapableCount = $mcSql,
  MfaRegisteredPct = $mpSql,
  GlobalAdminCount = $gaSql,
  GuestUserCount = $guestCount,
  DisabledLicensedCount = $disabledLicensed,
  FailedSignInCount7d = $fsSql,
  Notes = $(Sql-Quote $pNote),
  ImportedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (
  CustomerCode, SnapshotDate, SecureScore, SecureScoreMax, SecureScorePct,
  MfaRegisteredCount, MfaCapableCount, MfaRegisteredPct,
  GlobalAdminCount, GuestUserCount, DisabledLicensedCount, FailedSignInCount7d, Notes
) VALUES (
  s.CustomerCode, s.SnapshotDate, $ssSql, $smSql, $spSql,
  $mrSql, $mcSql, $mpSql, $gaSql, $guestCount, $disabledLicensed, $fsSql, $(Sql-Quote $pNote)
);

IF COL_LENGTH(N'dbo.Csp_Posture', N'GlobalAdminNames') IS NOT NULL
BEGIN
  UPDATE dbo.Csp_Posture
  SET GlobalAdminNames = $gaNamesSql
  WHERE CustomerCode = $(Sql-Quote $CustomerCode) AND SnapshotDate = '$snap';
END
"@
try {
  Invoke-SqlText $postureSql "csp_posture"
  Write-Log "Posture saved"
} catch {
  Write-Log "Posture SQL soft-fail: $($_.Exception.Message) - apply 461_Ensure_Csp_Exco_Posture.sql"
}

# Persist Global Admin names
try {
  if ($gaRows -and $gaRows.Count -gt 0) {
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine("SET NOCOUNT ON;")
    [void]$sb.AppendLine("IF OBJECT_ID(N'dbo.Csp_GlobalAdmins', N'U') IS NULL RETURN;")
    [void]$sb.AppendLine("DELETE FROM dbo.Csp_GlobalAdmins WHERE CustomerCode = $(Sql-Quote $CustomerCode) AND SnapshotDate = '$snap';")
    foreach ($g in $gaRows) {
      $line = "INSERT INTO dbo.Csp_GlobalAdmins (CustomerCode, SnapshotDate, ObjectId, DisplayName, UserPrincipalName, Mail, PrincipalType) VALUES ($(Sql-Quote $CustomerCode), '$snap', $(Sql-Quote $g.ObjectId), $(Sql-Quote $g.DisplayName), $(Sql-Quote $g.UserPrincipalName), $(Sql-Quote $g.Mail), $(Sql-Quote $g.PrincipalType));"
      [void]$sb.AppendLine($line)
    }
    Invoke-SqlText $sb.ToString() "csp_global_admins"
    Write-Log ("GlobalAdmins saved n=" + $gaRows.Count)
  } elseif ($null -ne $gaCount) {
    $clr = @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Csp_GlobalAdmins', N'U') IS NOT NULL
  DELETE FROM dbo.Csp_GlobalAdmins WHERE CustomerCode = $(Sql-Quote $CustomerCode) AND SnapshotDate = '$snap';
"@
    try { Invoke-SqlText $clr "csp_global_admins_clear" } catch {}
  }
} catch {
  Write-Log ("GlobalAdmins SQL soft-fail: " + $_.Exception.Message + " - apply 469_Ensure_Csp_GlobalAdmins.sql")
}

Write-Log "=== CSP Graph collect done CustomerCode=$CustomerCode ==="
Write-Log "log=$log"
try {
  Invoke-SqlText @"
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Dim_Connection', N'U') IS NULL RETURN;
UPDATE dbo.Dim_Connection
SET LastSyncAt = SYSUTCDATETIME(),
    Status = N'Active',
    Notes = N'Graph collect OK',
    UpdatedAt = SYSUTCDATETIME()
WHERE ConnectionCode IN (N'MS_CSP', N'CSP', N'M365', N'GRAPH');
"@ "csp_stamp_conn"
  Write-Log "Dim_Connection MS_CSP stamped Active"
} catch {
  Write-Log ("stamp Dim_Connection skip: " + $_.Exception.Message)
}

$proof = @"
SET NOCOUNT ON;
SELECT CustomerCode, PrimaryDomain, SkuCount, TotalSeats, AssignedSeats, UserCount, HealthScore
FROM dbo.vw_Kpi_Csp_Summary WITH (NOLOCK)
WHERE CustomerCode = $(Sql-Quote $CustomerCode);
IF OBJECT_ID(N'dbo.vw_Kpi_Csp_Posture_Latest', N'V') IS NOT NULL
  SELECT CustomerCode, SecureScorePct, MfaRegisteredPct, GlobalAdminCount, GuestUserCount, FailedSignInCount7d
  FROM dbo.vw_Kpi_Csp_Posture_Latest WITH (NOLOCK)
  WHERE CustomerCode = $(Sql-Quote $CustomerCode);
IF OBJECT_ID(N'dbo.Csp_GlobalAdmins', N'U') IS NOT NULL
  SELECT CustomerCode, DisplayName, UserPrincipalName, Mail, PrincipalType
  FROM dbo.Csp_GlobalAdmins WITH (NOLOCK)
  WHERE CustomerCode = $(Sql-Quote $CustomerCode)
    AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Csp_GlobalAdmins WITH (NOLOCK) WHERE CustomerCode = $(Sql-Quote $CustomerCode))
  ORDER BY UserPrincipalName, DisplayName;
"@
try {
  Write-Log "Proof:"
  Invoke-SqlText $proof "csp_proof"
} catch {
  Write-Log "Proof soft-fail: $($_.Exception.Message)"
}
