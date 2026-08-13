param(
  [Parameter(Mandatory=$true)][string]$Server,
  [string]$Database = 'RPMAssure_App',
  [string]$User = '',
  [string]$Password = '',
  [switch]$TrustCert,
  [switch]$WindowsAuth
)
$ErrorActionPreference = 'Stop'
$csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$csb['Data Source'] = $Server
$csb['Initial Catalog'] = $Database
$csb['Connect Timeout'] = 8
if ($WindowsAuth) {
  $csb['Integrated Security'] = $true
} else {
  $csb['User ID'] = $User
  $csb['Password'] = $Password
}
if ($TrustCert) { $csb['TrustServerCertificate'] = $true }

$conn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
try {
  $conn.Open()
  $cmd = $conn.CreateCommand()
  $cmd.CommandText = "SELECT DB_NAME() AS DbName, SUSER_SNAME() AS LoginName, @@VERSION AS Ver"
  $r = $cmd.ExecuteReader()
  if ($r.Read()) {
    [pscustomobject]@{
      Ok = $true
      Database = $r['DbName']
      Login = $r['LoginName']
      Version = ($r['Ver'] -split "`n")[0]
      Message = 'Connection successful'
    }
  }
} catch {
  [pscustomobject]@{
    Ok = $false
    Database = $Database
    Login = $User
    Version = ''
    Message = $_.Exception.Message
  }
} finally {
  if ($conn.State -eq 'Open') { $conn.Close() }
}
