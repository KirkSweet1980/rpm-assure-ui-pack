# RPM Assure system tray. User session only (not the Windows service).
#   powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Agent\Start-Agent-Tray.ps1
param([string]$AgentRoot = 'C:\RPM-Assure\Agent')

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$statusFile = Join-Path $AgentRoot 'status.json'
$flagFile = Join-Path $AgentRoot 'request-sync.flag'

function New-RpmaIcon([string]$hex) {
  $bmp = New-Object System.Drawing.Bitmap 16, 16
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::Transparent)
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
  $g.FillEllipse($brush, 1, 1, 13, 13)
  $g.DrawEllipse([System.Drawing.Pens]::White, 1, 1, 13, 13)
  $g.Dispose()
  $h = $bmp.GetHicon()
  $ico = [System.Drawing.Icon]::FromHandle($h)
  $clone = $ico.Clone()
  return $clone
}

$iconOn = New-RpmaIcon '#16a34a'
$iconOff = New-RpmaIcon '#dc2626'
$iconWait = New-RpmaIcon '#d97706'

function Read-RpmaStatus {
  $svc = Get-Service -Name 'RPMAssure-Edge' -ErrorAction SilentlyContinue
  $svcUp = $svc -and $svc.Status -eq 'Running'
  $hb = $null
  $sync = $null
  $msg = 'no status yet'
  $online = $false
  if (Test-Path $statusFile) {
    try {
      $j = Get-Content -LiteralPath $statusFile -Raw | ConvertFrom-Json
      $hb = $j.lastHeartbeatUtc
      $sync = $j.lastSyncUtc
      $msg = [string]$j.lastMessage
      $online = [bool]$j.online
    } catch {}
  }
  if (-not $svcUp) { $online = $false }
  return [pscustomobject]@{
    online = $online
    svcUp  = $svcUp
    hb     = $hb
    sync   = $sync
    msg    = $msg
  }
}

function FmtUtc($iso) {
  if (-not $iso) { return 'never' }
  try {
    return ([datetime]$iso).ToLocalTime().ToString('yyyy-MM-dd HH:mm')
  } catch { return [string]$iso }
}

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Visible = $true
$notify.Text = 'RPM Assure'

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$miTitle = $menu.Items.Add('RPM Assure Agent')
$miTitle.Enabled = $false
$miState = $menu.Items.Add('Status: ...')
$miState.Enabled = $false
$miSync = $menu.Items.Add('Last sync: ...')
$miSync.Enabled = $false
[void]$menu.Items.Add('-')
$miDo = $menu.Items.Add('Sync now')
$miSet = $menu.Items.Add('Settings (Administrator)')
[void]$menu.Items.Add('-')
$miExit = $menu.Items.Add('Exit tray')
$notify.ContextMenuStrip = $menu

$miDo.add_Click({
  [IO.File]::WriteAllText($flagFile, (Get-Date).ToUniversalTime().ToString('o'))
  [System.Windows.Forms.MessageBox]::Show('Sync requested. The agent will pick it up within a minute.', 'RPM Assure', 'OK', 'Information') | Out-Null
})
$miSet.add_Click({
  Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File', (Join-Path $AgentRoot 'Set-AgentSettings.ps1')) -Verb RunAs
})
$miExit.add_Click({
  $notify.Visible = $false
  [System.Windows.Forms.Application]::Exit()
})

function Update-Tray {
  $s = Read-RpmaStatus
  $state = if ($s.online) { 'ONLINE' } elseif ($s.svcUp) { 'SERVICE UP / NO HEARTBEAT' } else { 'OFFLINE' }
  $tip = "RPM Assure`n$state`nLast sync: $(FmtUtc $s.sync)`nHeartbeat: $(FmtUtc $s.hb)"
  if ($tip.Length -gt 63) { $tip = $tip.Substring(0, 63) }
  $notify.Text = $tip
  $notify.Icon = if ($s.online) { $iconOn } elseif ($s.svcUp) { $iconWait } else { $iconOff }
  $miState.Text = "Status: $state"
  $miSync.Text = "Last sync: $(FmtUtc $s.sync)"
}

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 15000
$timer.add_Tick({ Update-Tray })
$timer.Start()
Update-Tray
$notify.ShowBalloonTip(2500, 'RPM Assure', 'Agent tray started.', 'Info')

[System.Windows.Forms.Application]::Run()
$notify.Dispose()
