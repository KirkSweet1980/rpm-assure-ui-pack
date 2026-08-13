# =============================================================================
# Csp.Config.BHF.ps1  -  Board of Healthcare Funders Microsoft 365
# Copy to:  C:\RPM-Assure\Sql\csp\Csp.Config.BHF.ps1
# Register an Entra app IN THE BHF TENANT (or multi-tenant app + admin consent there).
# Same Application permissions as RPMINT + admin consent.
# =============================================================================

$CspTenantId     = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # BHF Directory (tenant) ID
$CspClientId     = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # App (client) ID
$CspClientSecret = "your-client-secret-value"

$CustomerCode  = "BHF"
$PrimaryDomain = "bhfglobal.co.za"   # change if BHF primary domain differs

$SqlServer   = ".\RPMREPORTS"
$SqlDatabase = "RPMAssure_App"
$WindowsAuth = $true
