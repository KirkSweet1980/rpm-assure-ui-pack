# =============================================================================
# Csp.Config.METSI.ps1  -  Metsi Water Solutions Microsoft 365
# Copy to:  C:\RPM-Assure\Sql\csp\Csp.Config.METSI.ps1
# Entra app in METSI tenant + Application permissions + admin consent.
# =============================================================================

$CspTenantId     = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
$CspClientId     = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
$CspClientSecret = "your-client-secret-value"

$CustomerCode  = "METSI"
$PrimaryDomain = "metsi.co.za"

$SqlServer   = ".\RPMREPORTS"
$SqlDatabase = "RPMAssure_App"
$WindowsAuth = $true
