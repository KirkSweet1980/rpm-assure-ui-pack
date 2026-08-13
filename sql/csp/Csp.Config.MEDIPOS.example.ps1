# =============================================================================
# Csp.Config.MEDIPOS.ps1  -  MEDiPOS Medical Scheme Microsoft 365
# Copy to:  C:\RPM-Assure\Sql\csp\Csp.Config.MEDIPOS.ps1
# =============================================================================

$CspTenantId     = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
$CspClientId     = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
$CspClientSecret = "your-client-secret-value"

$CustomerCode  = "MEDIPOS"
$PrimaryDomain = "medipos.co.za"

$SqlServer   = ".\RPMREPORTS"
$SqlDatabase = "RPMAssure_App"
$WindowsAuth = $true
