# Verify-Freshdesk-Coverage.ps1
# Shows Assure customers vs Freshdesk companies vs tickets pulled.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\freshdesk\Verify-Freshdesk-Coverage.ps1

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
. (Join-Path $here 'Freshdesk.Config.ps1')
if (-not $FreshdeskSqlServer) { $FreshdeskSqlServer = '.\RPMREPORTS' }
if (-not $FreshdeskSqlDatabase) { $FreshdeskSqlDatabase = 'RPMAssure_App' }
$FreshdeskDomain = $FreshdeskDomain.Trim() -replace '^https?://', '' -replace '/$', ''

$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
if (-not (Test-Path $sqlcmd)) { $sqlcmd = 'sqlcmd' }

Write-Host '=== 1. Assure customers (Dim_Customer) ==='
& $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -E -C -W -s ',' -Q "SET NOCOUNT ON; SELECT CustomerCode, DisplayName FROM dbo.Dim_Customer WHERE Active=1 ORDER BY CustomerCode;"

Write-Host '=== 2. Freshdesk company map ==='
& $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -E -C -W -s ',' -Q "SET NOCOUNT ON; SELECT CompanyName, CustomerCode, CompanyId, Active FROM dbo.Dim_Freshdesk_CompanyMap ORDER BY CustomerCode, CompanyName;"

Write-Host '=== 3. Tickets pulled (by company) ==='
& $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -E -C -W -s ',' -Q @"
SET NOCOUNT ON;
SELECT ISNULL(CompanyName,'(none)') AS CompanyName,
       ISNULL(CustomerCode,'(unmapped)') AS CustomerCode,
       COUNT(*) AS Tickets,
       MIN(CreatedAtUtc) AS OldestUtc,
       MAX(UpdatedAtUtc) AS NewestUtc
FROM dbo.Freshdesk_Tickets WITH (NOLOCK)
GROUP BY CompanyName, CustomerCode
ORDER BY Tickets DESC;
"@

Write-Host '=== 4. Intersection: tickets for Assure customers ==='
& $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -E -C -W -s ',' -Q @"
SET NOCOUNT ON;
SELECT c.CustomerCode, c.DisplayName,
       COUNT(t.TicketId) AS Tickets
FROM dbo.Dim_Customer c
LEFT JOIN dbo.Freshdesk_Tickets t
  ON t.CustomerCode = c.CustomerCode
WHERE c.Active = 1
GROUP BY c.CustomerCode, c.DisplayName
ORDER BY Tickets DESC, c.CustomerCode;
"@

$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${FreshdeskApiKey}:X"))
$hdr = @{ Authorization = "Basic $b64"; Accept = 'application/json' }
$fdCos = @()
try {
  $fdCos = @(Invoke-RestMethod -Uri "https://$FreshdeskDomain/api/v2/companies?per_page=100" -Headers $hdr -TimeoutSec 60)
} catch {
  Write-Host ('Freshdesk companies API: ' + $_.Exception.Message)
}
Write-Host '=== 5. Freshdesk companies API (this key can see) ==='
$fdCos | Select-Object id, name | Format-Table -AutoSize
Write-Host ('Freshdesk companies visible=' + @($fdCos).Count)

Write-Host ''
Write-Host '=== VERDICT ==='
$hit = & $sqlcmd -S $FreshdeskSqlServer -d $FreshdeskSqlDatabase -E -C -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.Freshdesk_Tickets t INNER JOIN dbo.Dim_Customer c ON c.CustomerCode = t.CustomerCode;"
$hit = ([string]$hit).Trim()
Write-Host ('Tickets linked to an Assure customer: ' + $hit)
if ($hit -eq '0') {
  Write-Host 'No Assure customer has Freshdesk ticket data yet.'
  Write-Host 'Cause: this API key only sees non-Assure companies (4AT / Merlog), or tickets for AHIC/RSR/... are older than 30 days / another Freshdesk view.'
}
