# Pulseway Automation body. PowerShell 5.1 safe. No ConvertTo-Json.
$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$AssureUrl = 'https://assure.rpmresources.co.za/api/patches'
$AssureSecret = 'PUT-SAME-SECRET-AS-IOPS'
Write-Host ('PATCH start host=' + $env:COMPUTERNAME + ' ps=' + $PSVersionTable.PSVersion)

function J-Esc([string]$s) {
  if ($null -eq $s) { return '' }
  $t = [string]$s
  $t = $t.Replace('\', '\\').Replace('"', '\"').Replace("`r", ' ').Replace("`n", ' ').Replace("`t", ' ')
  return $t
}

$rows = New-Object System.Collections.ArrayList
function Add-Patch([string]$title, [string]$kb, [string]$status, [string]$cls, $when) {
  $t = ([string]$title).Trim()
  if (-not $t) { return }
  if ($t.Length -gt 390) { $t = $t.Substring(0, 390) }
  $k = ([string]$kb).Trim()
  if (-not $k -and $t -match '(KB\d{5,7})') { $k = $Matches[1] }
  $iso = ''
  if ($when) {
    try { $iso = ([datetime]$when).ToUniversalTime().ToString('s') + 'Z' } catch { $iso = '' }
  }
  [void]$rows.Add([pscustomobject]@{
    title = $t; kb = $k; status = $status; cls = $cls; iso = $iso
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
      if ($u.KBArticleIDs -and $u.KBArticleIDs.Count -gt 0) { $kb = 'KB' + [string]$u.KBArticleIDs.Item(0) }
    } catch {}
    $cls = ''
    try { $cls = [string]$u.MsrcSeverity } catch {}
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
    $desc = [string]$h.Description
    $title = $desc
    if (-not $title) { $title = $kb }
    if ($kb -and $title -notmatch [regex]::Escape($kb)) { $title = ($title + ' ' + $kb).Trim() }
    Add-Patch $title $kb 'installed' $desc $when
    if ($rows.Count -ge 160) { break }
  }
  Write-Host ('hotfix total rows=' + $rows.Count)
} catch {
  Write-Host ('hotfix skip ' + $_.Exception.Message)
}

Write-Host ('patches=' + $rows.Count)
if ($rows.Count -eq 0) {
  Write-Host 'No named patches on this host.'
  exit 0
}

$parts = New-Object System.Collections.ArrayList
foreach ($p in $rows) {
  $kbJson = 'null'
  if ($p.kb) { $kbJson = '"' + (J-Esc $p.kb) + '"' }
  $clsJson = 'null'
  if ($p.cls) { $clsJson = '"' + (J-Esc $p.cls) + '"' }
  $whenJson = 'null'
  if ($p.iso) { $whenJson = '"' + (J-Esc $p.iso) + '"' }
  [void]$parts.Add(('{"title":"' + (J-Esc $p.title) + '","kb":' + $kbJson + ',"status":"' + (J-Esc $p.status) + '","classification":' + $clsJson + ',"installedAt":' + $whenJson + '}'))
}
$json = '{"hostName":"' + (J-Esc $env:COMPUTERNAME) + '","source":"pulseway","patches":[' + ($parts -join ',') + ']}'
Write-Host ('jsonBytes=' + $json.Length)

try {
  $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 -Uri $AssureUrl -Method POST -Headers @{
    'X-Assure-Secret' = $AssureSecret
    'Content-Type' = 'application/json'
  } -Body ([Text.Encoding]::UTF8.GetBytes($json))
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
