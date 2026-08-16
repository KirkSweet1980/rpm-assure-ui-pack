# Shared ADO.NET connect. Avoids sqlcmd ODBC and @password splat bugs.
# Returns @{ Ok; Who; Error; ServerUsed }
function Test-RpmaSql {
  param(
    [string]$Server,
    [string]$Database = "master",
    [ValidateSet("windows", "sql")][string]$Mode = "sql",
    [string]$User = "",
    [string]$Password = "",
    [int]$TimeoutSec = 8
  )
  $hosts = @()
  if ($Server) { $hosts += $Server.Trim() }
  $hosts += @(".", "localhost", "(local)", $env:COMPUTERNAME)
  $hosts = @($hosts | Where-Object { $_ } | Select-Object -Unique)
  $last = "no attempt"
  foreach ($h in $hosts) {
    foreach ($enc in @($false, $true)) {
      $csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
      $csb["Data Source"] = $h
      $csb["Initial Catalog"] = $(if ($Database) { $Database } else { "master" })
      $csb["Connect Timeout"] = $TimeoutSec
      $csb["Encrypt"] = $enc
      $csb["TrustServerCertificate"] = $true
      if ($Mode -eq "windows") { $csb["Integrated Security"] = $true }
      else { $csb["User ID"] = $User; $csb["Password"] = $Password }
      $cn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
      try {
        $cn.Open()
        $cmd = $cn.CreateCommand()
        $cmd.CommandText = "SELECT SUSER_SNAME()"
        $who = [string]$cmd.ExecuteScalar()
        $cn.Close()
        return @{ Ok = $true; Who = $who; Error = ""; ServerUsed = $h }
      } catch {
        $last = $_.Exception.Message
        try { $cn.Dispose() } catch {}
      }
    }
  }
  return @{ Ok = $false; Who = ""; Error = $last; ServerUsed = $Server }
}

function Invoke-RpmaSql {
  param(
    [string]$Server,
    [string]$Database = "master",
    [ValidateSet("windows", "sql")][string]$Mode = "sql",
    [string]$User = "",
    [string]$Password = "",
    [string]$Query,
    [int]$TimeoutSec = 60
  )
  $t = Test-RpmaSql -Server $Server -Database $Database -Mode $Mode -User $User -Password $Password -TimeoutSec 8
  if (-not $t.Ok) { return @{ Ok = $false; Text = $t.Error } }
  $csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
  $csb["Data Source"] = $t.ServerUsed
  $csb["Initial Catalog"] = $(if ($Database) { $Database } else { "master" })
  $csb["Connect Timeout"] = 15
  $csb["Encrypt"] = $false
  $csb["TrustServerCertificate"] = $true
  if ($Mode -eq "windows") { $csb["Integrated Security"] = $true }
  else { $csb["User ID"] = $User; $csb["Password"] = $Password }
  $cn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
  try {
    $cn.Open()
    # retry encrypt true if needed
  } catch {
    $csb["Encrypt"] = $true
    $cn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
    $cn.Open()
  }
  try {
    $cmd = $cn.CreateCommand()
    $cmd.CommandTimeout = $TimeoutSec
    $cmd.CommandText = $Query
    $sb = New-Object System.Text.StringBuilder
    $rdr = $null
    try {
      $rdr = $cmd.ExecuteReader()
      do {
        $names = @()
        for ($i = 0; $i -lt $rdr.FieldCount; $i++) { $names += $rdr.GetName($i) }
        if ($names.Count) { [void]$sb.AppendLine(($names -join "|")) }
        while ($rdr.Read()) {
          $vals = @()
          for ($i = 0; $i -lt $rdr.FieldCount; $i++) {
            if ($rdr.IsDBNull($i)) { $vals += "" } else { $vals += [string]$rdr.GetValue($i) }
          }
          [void]$sb.AppendLine(($vals -join "|"))
        }
      } while ($rdr.NextResult())
    } catch {
      # non-query batch (PRINT / CREATE)
      if ($rdr) { try { $rdr.Close() } catch {} }
      $cmd.CommandText = $Query
      [void]$cmd.ExecuteNonQuery()
      [void]$sb.AppendLine("OK")
    } finally {
      if ($rdr) { try { $rdr.Close() } catch {} }
    }
    $cn.Close()
    return @{ Ok = $true; Text = $sb.ToString(); ServerUsed = $t.ServerUsed }
  } catch {
    return @{ Ok = $false; Text = $_.Exception.Message }
  }
}
