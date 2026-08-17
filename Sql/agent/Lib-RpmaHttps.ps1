# HTTPS to Assure (Let's Encrypt). TLS 1.2+. Validates the public cert.
# ASCII only.

function Get-RpmaAssureUrl {
  $u = ''
  if (Get-Command Get-RpmaAgentSettings -ErrorAction SilentlyContinue) {
    try {
      $st = Get-RpmaAgentSettings
      if ($st.appHttpsUrl) { $u = [string]$st.appHttpsUrl }
    } catch {}
  }
  if (-not $u) { $u = [string]$env:RPM_ASSURE_HTTPS_URL }
  if (-not $u) { $u = 'https://assure.rpmresources.co.za' }
  return $u.TrimEnd('/')
}

function Get-RpmaAgentIngestSecret {
  $s = ''
  if (Get-Variable -Name AgentSecret -ErrorAction SilentlyContinue) {
    $s = [string](Get-Variable -Name AgentSecret -ValueOnly)
  }
  if (-not $s -and (Get-Command Get-RpmaAgentSettings -ErrorAction SilentlyContinue)) {
    try {
      $st = Get-RpmaAgentSettings
      if ($st.agentSecret) { $s = [string]$st.agentSecret }
    } catch {}
  }
  if (-not $s) { $s = [string]$env:RPM_ASSURE_AGENT_SECRET }
  if (-not $s) { $s = [string]$env:RPM_ASSURE_IOPS_SECRET }
  return $s
}

function Invoke-RpmaAssureHttps {
  param(
    [Parameter(Mandatory)][string]$Path,
    [ValidateSet('GET','POST')][string]$Method = 'GET',
    $Body = $null,
    [int]$TimeoutSec = 30
  )
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $base = Get-RpmaAssureUrl
  $secret = Get-RpmaAgentIngestSecret
  if (-not $secret) { throw 'Agent HTTPS secret missing (set AgentSecret or RPM_ASSURE_IOPS_SECRET)' }
  $uri = $base + $Path
  $headers = @{ 'X-Assure-Secret' = $secret; 'Content-Type' = 'application/json' }
  if ($Method -eq 'GET') {
    $resp = Invoke-WebRequest -Uri $uri -Method GET -Headers $headers -UseBasicParsing -TimeoutSec $TimeoutSec
  } else {
    $json = if ($Body -is [string]) { $Body } else { ($Body | ConvertTo-Json -Depth 6 -Compress) }
    $resp = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $json -UseBasicParsing -TimeoutSec $TimeoutSec
  }
  $text = [string]$resp.Content
  $obj = $null
  try { $obj = $text | ConvertFrom-Json } catch {}
  return @{ StatusCode = [int]$resp.StatusCode; Text = $text; Json = $obj }
}

function Send-RpmaHttpsHeartbeat {
  param(
    [string]$CustomerCode,
    [string]$HostName,
    [string]$AgentVersion,
    [string]$RoleTags,
    [string]$InstanceName,
    [string]$InstallPath,
    [string]$OsCaption,
    $MemFreeMb,
    $DiskFreeGb,
    [string]$DetailJson
  )
  $body = @{
    customerCode = $CustomerCode
    hostName     = $HostName
    agentVersion = $AgentVersion
    roleTags     = $RoleTags
    instanceName = $InstanceName
    installPath  = $InstallPath
    osCaption    = $OsCaption
    memFreeMb    = $MemFreeMb
    diskFreeGb   = $DiskFreeGb
    detailJson   = $DetailJson
    source       = 'edge-https'
  }
  return Invoke-RpmaAssureHttps -Path '/api/agent/heartbeat' -Method POST -Body $body
}
