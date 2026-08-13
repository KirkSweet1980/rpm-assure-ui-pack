# =============================================================================
# Csp.Config.ps1  -  Microsoft Graph credentials for RPM Assure collect
# Copy this file to:  C:\RPM-Assure\Sql\csp\Csp.Config.ps1
# Do NOT put secrets in Collect-Csp-Graph-To-RPMAssure.ps1 or commit this file.
# =============================================================================

# --- Entra ID app registration (Application permissions + admin consent) ---
# Required: Organization.Read.All, User.Read.All, Directory.Read.All
# Optional: ServiceHealth.Read.All
$CspTenantId     = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Directory (tenant) ID
$CspClientId     = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Application (client) ID
$CspClientSecret = "your-client-secret-value"

# --- Map this Graph tenant to RPM Assure customer ---
$CustomerCode  = "RPMINT"
$PrimaryDomain = "rpmresources.co.za"

# --- SQL central (app server named instance preferred) ---
$SqlServer   = ".\RPMREPORTS"          # or "102.222.21.220,14333"
$SqlDatabase = "RPMAssure_App"
# Use Windows auth when running as a domain admin / local SQL admin:
$WindowsAuth = $true
# If SQL login instead:
# $WindowsAuth = $false
# $SqlUser = "Rpm_collect"
# $SqlPassword = "..."
