# Probe Pulseway OS / Windows Update endpoints for patch counters (read-only)
# Usage (on central, with Pulseway.Config.ps1 present):
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Probe-Pulseway-Patch.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Probe-Pulseway-Patch.ps1 -DeviceId '<guid>' -MaxDevices 5
param(
  [string]$ConfigPath = '',
  [string]$DeviceId = '',
  [int]$MaxDevices = 3
)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
if (-not $ConfigPath) { $ConfigPath = Join-Path $here 'Pulseway.Config.ps1' }
if (-not (Test-Path -LiteralPath $ConfigPath)) { throw "Missing $ConfigPath" }
. $ConfigPath
if ([string]::IsNullOrWhiteSpace($BaseUrl)) { $BaseUrl = 'https://rpmresourcesza.pulseway.com/api/v3' }
$BaseUrl = $BaseUrl.TrimEnd('/')
$outDir = Join-Path $here 'logs'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$log = Join-Path $outDir ("probe_patch_{0}.log" -f $stamp)
function Write-Log([string]$m) {
  $line = ('{0:u} {1}' -f (Get-Date).ToUniversalTime(), $m)
  Add-Content -LiteralPath $log -Value $line
  Write-Host $line
}
function Get-BasicAuthHeader {
  $pair = '{0}:{1}' -f $TokenId, $TokenSecret
  $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
  return @{ Authorization = "Basic $b64"; Accept = 'application/json' }
}
function Invoke-PwGet([string]$Path) {
  $url = if ($Path.StartsWith('http')) { $Path } else { "$BaseUrl/$($Path.TrimStart('/'))" }
  try {
    $resp = Invoke-WebRequest -Uri $url -Headers (Get-BasicAuthHeader) -Method GET -UseBasicParsing -TimeoutSec 120
    return [pscustomobject]@{ Ok = $true; Status = [int]$resp.StatusCode; Url = $url; Raw = $resp.Content }
  } catch {
    $status = $null; $raw = $null
    if ($_.Exception.Response) {
      try { $status = [int]$_.Exception.Response.StatusCode } catch {}
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) { $raw = (New-Object System.IO.StreamReader($stream)).ReadToEnd() }
      } catch {}
    }
    return [pscustomobject]@{ Ok = $false; Status = $status; Url = $url; Raw = $raw; Error = $_.Exception.Message }
  }
}
Write-Log "Probe patch BaseUrl=$BaseUrl"
$ids = New-Object System.Collections.Generic.List[string]
if ($DeviceId) { [void]$ids.Add($DeviceId) }
else {
  $list = Invoke-PwGet 'devices'
  Write-Log ("GET devices ok=$($list.Ok) status=$($list.Status) len=$($list.Raw.Length)")
  if ($list.Ok -and $list.Raw) {
    $j = $list.Raw | ConvertFrom-Json
    $arr = @()
    if ($j.Data) { $arr = @($j.Data) } elseif ($j.data) { $arr = @($j.data) }
    foreach ($d in $arr) {
      if ($ids.Count -ge $MaxDevices) { break }
      $id = $null
      foreach ($n in @('Id','DeviceId','id','Identifier')) {
        if ($d.PSObject.Properties.Name -contains $n -and $d.$n) { $id = [string]$d.$n; break }
      }
      if ($id) { [void]$ids.Add($id) }
    }
  }
}
if ($ids.Count -eq 0) { throw 'No device ids to probe' }
Write-Log ("Probing $($ids.Count) device(s)")
$suffixes = @(
  'updates','windowsupdates','windows-updates','osupdates','os-updates','osUpdates',
  'patches','patch','patchmanagement','patch-management','softwareupdates','software-updates',
  'availableupdates','installedupdates','pendingupdates','wu','windowsUpdate'
)
foreach ($id in $ids) {
  Write-Log "=== device $id ==="
  $paths = @("devices/$id")
  foreach ($s in $suffixes) { $paths += "devices/$id/$s"; $paths += "systems/$id/$s" }
  $paths += @("systems/$id", "devices/$id/assets", "devices/$id/software")
  foreach ($path in $paths) {
    $r = Invoke-PwGet $path
    $len = 0; if ($r.Raw) { $len = $r.Raw.Length }
    $flag = ''
    if ($r.Ok -and $r.Raw -and $r.Raw -match '(?i)update|patch|missing|available|installed') { $flag = ' **PATCH-LIKE**' }
    Write-Log ("GET $path -> ok=$($r.Ok) status=$($r.Status) len=$len$flag")
    if ($r.Ok -and $r.Raw -and $len -gt 2) {
      $safe = ($path -replace '[\\/:*?\"<>|]', '_')
      $file = Join-Path $outDir ("probe_patch_{0}_{1}.json" -f $stamp, $safe)
      Set-Content -LiteralPath $file -Value $r.Raw -Encoding UTF8
      $snip = $r.Raw; if ($snip.Length -gt 400) { $snip = $snip.Substring(0,400) }
      Write-Log ("  body: $snip")
    }
  }
}
Write-Log "Done. log=$log"
Write-Host 'Paste probe_patch_*.log (no secrets). Look for **PATCH-LIKE** lines.' -ForegroundColor Yellow
