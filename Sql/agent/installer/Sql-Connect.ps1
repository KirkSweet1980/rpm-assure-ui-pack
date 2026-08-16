# Shared ADO.NET connect. Never use SqlConnectionStringBuilder indexer with
# PowerShell bools (they wrap as PSObject and crash ConvertToString).
function New-RpmaCs {
  param(
    [string]$Server,
    [string]$Database = "master",
    [string]$Mode = "sql",
    [string]$User = "",
    [string]$Password = "",
    [string]$Encrypt = "False",
    [int]$TimeoutSec = 8
  )
  $h = [string]$Server
  $db = [string]$(if ($Database) { $Database } else { "master" })
  $enc = [string]$Encrypt
  $u = [string]$User
  $p = ([string]$Password) -replace '"', '""'
  $cs = "Data Source=$h;Initial Catalog=$db;Connect Timeout=$TimeoutSec;Encrypt=$enc;TrustServerCertificate=True;"
  if ($Mode -eq "windows") { $cs += "Integrated Security=True;" }
  else { $cs += "User ID=$u;Password=`"$p`";" }
  return $cs
}

function Test-RpmaSql {
  param(
    [string]$Server,
    [string]$Database = "master",
    [string]$Mode = "sql",
    [string]$User = "",
    [string]$Password = "",
    [int]$TimeoutSec = 8
  )
  $hosts = New-Object System.Collections.Generic.List[string]
  if ($Server) { [void]$hosts.Add(([string]$Server).Trim()) }
  foreach ($x in @(".", "localhost", "(local)", [string]$env:COMPUTERNAME)) {
    if ($x -and -not $hosts.Contains($x)) { [void]$hosts.Add($x) }
  }
  $last = "no attempt"
  foreach ($h in $hosts) {
    foreach ($enc in @("False", "True")) {
      $cs = New-RpmaCs -Server $h -Database $Database -Mode $Mode -User $User -Password $Password -Encrypt $enc -TimeoutSec $TimeoutSec
      $cn = New-Object System.Data.SqlClient.SqlConnection $cs
      try {
        $cn.Open()
        $cmd = $cn.CreateCommand()
        $cmd.CommandText = "SELECT SUSER_SNAME()"
        $who = [string]$cmd.ExecuteScalar()
        $cn.Close()
        $cn.Dispose()
        return @{ Ok = $true; Who = $who; Error = ""; ServerUsed = [string]$h }
      } catch {
        $last = [string]$_.Exception.Message
        try { $cn.Dispose() } catch {}
      }
    }
  }
  return @{ Ok = $false; Who = ""; Error = $last; ServerUsed = [string]$Server }
}

function Invoke-RpmaSql {
  param(
    [string]$Server,
    [string]$Database = "master",
    [string]$Mode = "sql",
    [string]$User = "",
    [string]$Password = "",
    [string]$Query,
    [int]$TimeoutSec = 60
  )
  $t = Test-RpmaSql -Server $Server -Database $Database -Mode $Mode -User $User -Password $Password -TimeoutSec 8
  if (-not $t.Ok) { return @{ Ok = $false; Text = [string]$t.Error } }
  $cs = New-RpmaCs -Server ([string]$t.ServerUsed) -Database $Database -Mode $Mode -User $User -Password $Password -Encrypt "False" -TimeoutSec 15
  $cn = New-Object System.Data.SqlClient.SqlConnection $cs
  try { $cn.Open() } catch {
    try { $cn.Dispose() } catch {}
    $cs = New-RpmaCs -Server ([string]$t.ServerUsed) -Database $Database -Mode $Mode -User $User -Password $Password -Encrypt "True" -TimeoutSec 15
    $cn = New-Object System.Data.SqlClient.SqlConnection $cs
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
        $names = New-Object System.Collections.Generic.List[string]
        for ($i = 0; $i -lt $rdr.FieldCount; $i++) { [void]$names.Add([string]$rdr.GetName($i)) }
        if ($names.Count) { [void]$sb.AppendLine(($names -join "|")) }
        while ($rdr.Read()) {
          $vals = New-Object System.Collections.Generic.List[string]
          for ($i = 0; $i -lt $rdr.FieldCount; $i++) {
            if ($rdr.IsDBNull($i)) { [void]$vals.Add("") } else { [void]$vals.Add([string]$rdr.GetValue($i)) }
          }
          [void]$sb.AppendLine(($vals -join "|"))
        }
      } while ($rdr.NextResult())
    } catch {
      if ($rdr) { try { $rdr.Close() } catch {} }
      $cmd2 = $cn.CreateCommand()
      $cmd2.CommandTimeout = $TimeoutSec
      $cmd2.CommandText = $Query
      [void]$cmd2.ExecuteNonQuery()
      [void]$sb.AppendLine("OK")
    } finally {
      if ($rdr) { try { $rdr.Close() } catch {} }
    }
    $cn.Close()
    return @{ Ok = $true; Text = $sb.ToString(); ServerUsed = [string]$t.ServerUsed }
  } catch {
    return @{ Ok = $false; Text = [string]$_.Exception.Message }
  } finally {
    try { $cn.Dispose() } catch {}
  }
}
