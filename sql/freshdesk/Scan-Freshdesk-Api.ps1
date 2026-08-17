# Scan-Freshdesk-Api.ps1
# Discovery only: what this API key can see. No writes.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\freshdesk\Scan-Freshdesk-Api.ps1

$ErrorActionPreference = 'Continue'
$here = $PSScriptRoot
. (Join-Path $here 'Freshdesk.Config.ps1')
$FreshdeskDomain = $FreshdeskDomain.Trim() -replace '^https?://', '' -replace '/$', ''
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${FreshdeskApiKey}:X"))
$hdr = @{ Authorization = "Basic $b64"; Accept = 'application/json'; 'Content-Type' = 'application/json' }
$base = "https://$FreshdeskDomain/api/v2"

function Get-Fd([string]$path) {
  $url = $base.TrimEnd('/') + '/' + $path.TrimStart('/')
  try {
    $r = Invoke-WebRequest -Uri $url -Headers $hdr -Method GET -TimeoutSec 60 -UseBasicParsing
    $obj = $null
    if ($r.Content) {
      try { $obj = $r.Content | ConvertFrom-Json } catch { $obj = $r.Content }
    }
    return [pscustomobject]@{
      Ok = $true; Code = [int]$r.StatusCode; Path = $path
      Count = $(if ($obj -is [System.Array]) { @($obj).Count } elseif ($obj.results) { @($obj.results).Count } elseif ($obj.total) { $obj.total } else { 1 })
      Data = $obj
      Err = $null
    }
  } catch {
    $code = $null
    $body = $null
    try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    try {
      $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
      $body = $sr.ReadToEnd()
    } catch {}
    return [pscustomobject]@{ Ok = $false; Code = $code; Path = $path; Count = 0; Data = $null; Err = ($_.Exception.Message + ' ' + $body) }
  }
}

function Show-Hit($h, [string]$title) {
  Write-Host ''
  if ($h.Ok) {
    Write-Host ('=== ' + $title + '  HTTP ' + $h.Code + '  n=' + $h.Count + ' ===')
  } else {
    Write-Host ('=== ' + $title + '  FAIL ' + $h.Code + ' ===')
    Write-Host $h.Err
  }
}

Write-Host ('SCAN domain=' + $FreshdeskDomain + ' utc=' + (Get-Date).ToUniversalTime().ToString('s') + 'Z')

$me = Get-Fd 'agents/me'
Show-Hit $me 'agents/me (who is this key)'
if ($me.Ok -and $me.Data) {
  $a = $me.Data
  [pscustomobject]@{
    id = $a.id; name = $a.contact.name; email = $a.contact.email
    ticket_scope = $a.ticket_scope
    occasional = $a.occasional
    type = $a.type
  } | Format-List
}

$cos = Get-Fd 'companies?per_page=100'
Show-Hit $cos 'companies'
if ($cos.Ok) {
  @($cos.Data) | Select-Object id, name, created_at | Format-Table -AutoSize
}

$tix = Get-Fd 'tickets?per_page=10&order_by=updated_at&order_type=desc'
Show-Hit $tix 'tickets (latest 10, default view)'
if ($tix.Ok) {
  @($tix.Data) | Select-Object id, subject, status, priority, company_id, requester_id, created_at, updated_at |
    Format-Table -AutoSize
}

$since = (Get-Date).ToUniversalTime().AddDays(-365).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'")
$tixY = Get-Fd ("tickets?per_page=100&updated_since=$since&order_by=updated_at&order_type=desc")
Show-Hit $tixY 'tickets updated last 365 days (page 1, max 100)'

$search = Get-Fd ("search/tickets?query=" + [uri]::EscapeDataString('"status:2 OR status:3 OR status:4 OR status:5"'))
Show-Hit $search 'search/tickets all statuses (first page)'
if ($search.Ok -and $search.Data) {
  Write-Host ('search.total=' + $search.Data.total)
  $rows = @($search.Data.results)
  if (-not $rows) { $rows = @($search.Data) }
  $rows | Select-Object -First 15 id, subject, status, company_id, created_at | Format-Table -AutoSize
}

$contacts = Get-Fd 'contacts?per_page=20'
Show-Hit $contacts 'contacts (first 20)'
if ($contacts.Ok) {
  @($contacts.Data) | Select-Object id, name, email, company_id | Format-Table -AutoSize
}

$agents = Get-Fd 'agents?per_page=30'
Show-Hit $agents 'agents'
if ($agents.Ok) {
  @($agents.Data) | ForEach-Object {
    [pscustomobject]@{
      id = $_.id
      name = $_.contact.name
      email = $_.contact.email
      ticket_scope = $_.ticket_scope
    }
  } | Format-Table -AutoSize
}

$groups = Get-Fd 'groups'
Show-Hit $groups 'groups'
if ($groups.Ok) {
  @($groups.Data) | Select-Object id, name | Format-Table -AutoSize
}

$fields = Get-Fd 'ticket_fields'
Show-Hit $fields 'ticket_fields (custom fields we can map on)'
if ($fields.Ok) {
  @($fields.Data) | Select-Object id, name, label, type, default |
    Format-Table -AutoSize
}

Write-Host ''
Write-Host '=== SCAN SUMMARY ==='
Write-Host ('key agent     : ' + $(if ($me.Ok) { $me.Data.contact.name + ' scope=' + $me.Data.ticket_scope } else { 'FAIL ' + $me.Code }))
Write-Host ('companies     : ' + $(if ($cos.Ok) { $cos.Count } else { 'FAIL ' + $cos.Code }))
Write-Host ('tickets page  : ' + $(if ($tix.Ok) { $tix.Count } else { 'FAIL ' + $tix.Code }))
Write-Host ('tickets 365d  : ' + $(if ($tixY.Ok) { $tixY.Count } else { 'FAIL ' + $tixY.Code }))
Write-Host ('search total  : ' + $(if ($search.Ok) { $search.Data.total } else { 'FAIL ' + $search.Code }))
Write-Host ('contacts page : ' + $(if ($contacts.Ok) { $contacts.Count } else { 'FAIL ' + $contacts.Code }))
Write-Host ('agents        : ' + $(if ($agents.Ok) { $agents.Count } else { 'FAIL ' + $agents.Code }))
Write-Host ('groups        : ' + $(if ($groups.Ok) { $groups.Count } else { 'FAIL ' + $groups.Code }))
Write-Host 'Paste the SCAN SUMMARY + company names + ticket subjects (no API key).'
