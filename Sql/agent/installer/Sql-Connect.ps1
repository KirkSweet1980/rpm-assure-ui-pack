# Shared ADO.NET connect. Never use SqlConnectionStringBuilder indexer with
# PowerShell bools (they wrap as PSObject and crash ConvertToString).
# Host input accepts IP:Port or IP,Port. SQL client always gets IP,Port.
function Normalize-RpmaHost {
  param([string]$Server)
  $raw = ([string]$Server).Trim()
  if ($raw -match '^tcp:') { $raw = $raw.Substring(4) }
  $hostOnly = $raw
  $port = $null
  if ($raw -match '^\[([^\]]+)\]:(\d+)$') { $hostOnly = $Matches[1]; $port = [int]$Matches[2] }
  elseif ($raw -match '^([^,]+),(\d+)$') { $hostOnly = $Matches[1]; $port = [int]$Matches[2] }
  elseif ($raw -match '^([^:]+):(\d+)$') { $hostOnly = $Matches[1]; $port = [int]$Matches[2] }
  $hostOnly = $hostOnly.Trim()
  $sql = $hostOnly
  if ($port) { $sql = $hostOnly + "," + $port }
  return @{
    Host = $hostOnly
    Port = $(if ($port) { $port } else { 1433 })
    Sql  = $sql
    Tcp  = $hostOnly + ":" + $(if ($port) { $port } else { 1433 })
  }
}

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
  $n = Normalize-RpmaHost $Server
  $b = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
  $b["Data Source"] = [string]$n.Sql
  $b["Initial Catalog"] = [string]$(if ($Database) { $Database } else { "master" })
  $b["Connect Timeout"] = [string]$TimeoutSec
  $b["Encrypt"] = [string]$Encrypt
  $b["TrustServerCertificate"] = "True"
  if ($Mode -eq "windows") {
    $b["Integrated Security"] = "True"
  } else {
    $b["User ID"] = [string]$User
    $b["Password"] = [string]$Password
  }
  return [string]$b.ConnectionString
}

function Get-RpmaLocalSqlHosts {
  $list = New-Object System.Collections.Generic.List[string]
  foreach ($x in @(".", "localhost", "(local)", "127.0.0.1", [string]$env:COMPUTERNAME)) {
    if ($x -and -not $list.Contains($x)) { [void]$list.Add($x) }
  }
  try {
    $key = Get-Item "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL" -EA SilentlyContinue
    if ($key) {
      foreach ($n in $key.GetValueNames()) {
        if ($n -eq "MSSQLSERVER") {
          foreach ($h in @(".", [string]$env:COMPUTERNAME)) { if (-not $list.Contains($h)) { [void]$list.Add($h) } }
        } else {
          foreach ($h in @(".\$n", "$($env:COMPUTERNAME)\$n", "localhost\$n")) {
            if (-not $list.Contains($h)) { [void]$list.Add($h) }
          }
        }
      }
    }
  } catch {}
  return $list
}

function Test-RpmaSql {
  param(
    [string]$Server,
    [string]$Database = "master",
    [string]$Mode = "sql",
    [string]$User = "",
    [string]$Password = "",
    [int]$TimeoutSec = 8,
    [switch]$StrictHost
  )
  $hosts = New-Object System.Collections.Generic.List[string]
  if ($Server) {
    $n0 = Normalize-RpmaHost $Server
    [void]$hosts.Add([string]$n0.Sql)
  }
  if (-not $StrictHost) {
    foreach ($x in @(Get-RpmaLocalSqlHosts)) {
      if ($x -and -not $hosts.Contains($x)) { [void]$hosts.Add($x) }
    }
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

function Test-RpmaTcpPort {
  param([string]$Server, [int]$WaitMs = 8000)
  $n = Normalize-RpmaHost $Server
  $hostOnly = [string]$n.Host
  $port = [int]$n.Port
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $iar = $client.BeginConnect($hostOnly, $port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne($WaitMs, $false)
    if (-not $ok) { return @{ Ok = $false; Error = ("TCP timeout to " + $hostOnly + ":" + $port + " (blocked or filtered)") } }
    $client.EndConnect($iar)
    return @{ Ok = $true; Error = ""; Host = $hostOnly; Port = $port; Tcp = ($hostOnly + ":" + $port) }
  } catch {
    return @{ Ok = $false; Error = ("TCP closed to " + $hostOnly + ":" + $port + ". " + $_.Exception.Message) }
  } finally {
    try { $client.Close() } catch {}
  }
}

function Test-RpmaCentral {
  param(
    [string]$Server = "102.222.21.220,14333",
    [string]$User = "rpmassure",
    [string]$Password = "",
    [string]$Database = "RPMAssure_App"
  )
  $n = Normalize-RpmaHost $Server
  $h = [string]$n.Sql
  $u = [string]$User
  $p = [string]$Password
  $db = [string]$Database
  $tcp = Test-RpmaTcpPort -Server $h -WaitMs 8000
  if (-not $tcp.Ok) {
    return @{ Ok = $false; Who = ""; Error = ("PORT BLOCKED: cannot open " + $n.Tcp + ". Open outbound TCP from this SQL host to " + $n.Tcp + "."); ServerUsed = $h }
  }
  $tryHosts = New-Object System.Collections.Generic.List[string]
  [void]$tryHosts.Add($h)
  [void]$tryHosts.Add("tcp:" + $h)
  $last = ""
  foreach ($cand in $tryHosts) {
    $master = Test-RpmaSql -Server $cand -Database "master" -Mode sql -User $u -Password $p -TimeoutSec 8 -StrictHost
    if ($master.Ok) {
      $app = Test-RpmaSql -Server $cand -Database $db -Mode sql -User $u -Password $p -TimeoutSec 8 -StrictHost
      if ($app.Ok) { return @{ Ok = $true; Who = $app.Who; Error = ""; ServerUsed = $cand } }
      return @{ Ok = $false; Who = $master.Who; Error = ("Login works on central master but cannot open " + $db + ". " + $app.Error); ServerUsed = $cand }
    }
    $last = $master.Error
  }
  return @{ Ok = $false; Who = ""; Error = ("TCP port is open but SQL login failed as " + $u + ". " + $last); ServerUsed = $h }
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
