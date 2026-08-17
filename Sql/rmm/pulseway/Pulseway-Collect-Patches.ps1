# Pulseway Automation body. No file path. Same secret as Assure IOPS.
$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$AssureUrl = 'https://assure.rpmresources.co.za/api/patches'
$AssureSecret = 'PUT-SAME-SECRET-AS-IOPS'
Write-Host ('PATCH start host=' + $env:COMPUTERNAME + ' ps=' + $PSVersionTable.PSVersion)

$patches = New-Object System.Collections.Generic.List[object]
function Add-Patch([string]$title, [string]$kb, [string]$status, [string]$cls, $when) {
  $t = ($title | ForEach-Object { $_.ToString().Trim() })
  if (-not $t) { return }
  if ($t.Length -gt 390) { $t = $t.Substring(0, 390) }
  if (-not $kb -and $t -match '(KB\d{5,7})') { $kb = $Matches[1] }
  $iso = $null
  if ($when) {
    try { $iso = ([datetime]$when).ToUniversalTime().ToString('o') } catch {}
  }
  $patches.Add([pscustomobject]@{
    title = $t
    kb = $kb
    status = $status
    classification = $cls
    installedAt = $iso
  })
}

try {
  $session = New-Object -ComObject Microsoft.Update.Session
  $searcher = $session.CreateUpdateSearcher()
  $searcher.Online = $true
  $res = $searcher.Search("IsInstalled=0 and IsHidden=0 and Type='Software'")
  $n = 0
  foreach ($u in @($res.Updates)) {
    $n++
    if ($n -gt 80) { break }
    $kb = ''
    try {
      if ($u.KBArticleIDs -and $u.KBArticleIDs.Count -gt 0) { $kb = 'KB' + $u.KBArticleIDs.Item(0) }
    } catch {}
    $cls = ''
    try { $cls = [string]$u.MsrcSeverity } catch {}
    if (-not $cls) {
      try { if ($u.IsDownloaded) { $cls = 'Downloaded' } } catch {}
    }
    $st = 'missing'
    try { if ($u.RebootRequired) { $st = 'pending' } } catch {}
    Add-Patch ([string]$u.Title) $kb $st $cls $null
  }
  Write-Host ('wu outstanding=' + $n)
} catch {
  Write-Host ('wu search skip ' + $_.Exception.Message)
}

try {
  $cut = (Get-Date).AddDays(-90)
  foreach ($h in @(Get-HotFix -ErrorAction Stop | Sort-Object InstalledOn -Descending)) {
    $when = $null
    try { $when = $h.InstalledOn } catch {}
    if ($when -and $when -lt $cut) { continue }
    $kb = [string]$h.HotFixID
    $title = $h.Description
    if (-not $title) { $title = $kb }
    if ($kb -and $title -notmatch [regex]::Escape($kb)) { $title = ($title + ' ' + $kb).Trim() }
    Add-Patch $title $kb 'installed' ([string]$h.Description) $when
    if ($patches.Count -ge 160) { break }
  }
  Write-Host ('hotfix rows added; total=' + $patches.Count)
} catch {
  Write-Host ('hotfix skip ' + $_.Exception.Message)
}

Write-Host ('patches=' + $patches.Count)
if ($patches.Count -eq 0) {
  Write-Host 'No named patches on this host (WU search empty and no recent hotfixes).'
  exit 0
}

$bodyObj = @{
  hostName = $env:COMPUTERNAME
  source = 'pulseway'
  patches = @($patches)
}
$json = $bodyObj | ConvertTo-Json -Compress -Depth 5
try {
  $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 -Uri $AssureUrl -Method POST -Headers @{
    'X-Assure-Secret' = $AssureSecret
    'Content-Type' = 'application/json'
  } -Body $json
  Write-Host ('POST ' + $r.StatusCode + ' ' + $r.Content)
} catch {
  Write-Host ('POST FAIL ' + $_.Exception.Message)
  try {
    $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host $sr.ReadToEnd()
  } catch {}
  exit 1
}
Write-Host 'PATCH done'
