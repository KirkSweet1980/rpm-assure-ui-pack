# RPM Assure system tray. User session only (not the Windows service).
#   powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Agent\Start-Agent-Tray.ps1
param([string]$AgentRoot = 'C:\RPM-Assure\Agent')

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$statusFile = Join-Path $AgentRoot 'status.json'
$flagFile = Join-Path $AgentRoot 'request-sync.flag'

function New-RpmaIconFromPng([string]$path, [string]$fallbackHex) {
  if (Test-Path -LiteralPath $path) {
    $bmp = [System.Drawing.Bitmap]::FromFile($path)
    $h = $bmp.GetHicon()
    $ico = [System.Drawing.Icon]::FromHandle($h)
    return $ico.Clone()
  }
  $bmp = New-Object System.Drawing.Bitmap 16, 16
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::Transparent)
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($fallbackHex))
  $g.FillEllipse($brush, 1, 1, 13, 13)
  $g.Dispose()
  return [System.Drawing.Icon]::FromHandle($bmp.GetHicon()).Clone()
}

$trayDir = Join-Path $AgentRoot 'tray'
$iconOn   = New-RpmaIconFromPng (Join-Path $trayDir 'robot-ok-32.png')    '#16a34a'
if (-not (Test-Path (Join-Path $trayDir 'robot-ok-32.png'))) {
  $iconOn = New-RpmaIconFromPng (Join-Path $trayDir 'assure-ok-32.png') '#16a34a'
}
$iconWait = New-RpmaIconFromPng (Join-Path $trayDir 'robot-error-32.png') '#d97706'
if (-not (Test-Path (Join-Path $trayDir 'robot-error-32.png'))) {
  $iconWait = New-RpmaIconFromPng (Join-Path $trayDir 'assure-error-32.png') '#d97706'
}
$iconOff  = New-RpmaIconFromPng (Join-Path $trayDir 'robot-off-32.png')   '#dc2626'
if (-not (Test-Path (Join-Path $trayDir 'robot-off-32.png'))) {
  $iconOff = New-RpmaIconFromPng (Join-Path $trayDir 'assure-off-32.png') '#dc2626'
}

function Read-RpmaStatus {
  $svc = Get-Service -Name 'RPMAssure-Edge' -ErrorAction SilentlyContinue
  $svcUp = $svc -and $svc.Status -eq 'Running'
  $hb = $null
  $sync = $null
  $msg = 'no status yet'
  $online = $false
  $err = $false
  if (Test-Path $statusFile) {
    try {
      $j = Get-Content -LiteralPath $statusFile -Raw | ConvertFrom-Json
      $hb = $j.lastHeartbeatUtc
      $sync = $j.lastSyncUtc
      $msg = [string]$j.lastMessage
      $online = [bool]$j.online
      $err = [bool]$j.error
      if ($msg -match 'JOB_FAIL|syspro.*(fail|error)') { $err = $true }
      if ($msg -match 'job error' -and $msg -notmatch 'iops|eventlog|soft') { $err = $true }
      if ($hb) {
        $ageMin = ((Get-Date).ToUniversalTime() - [datetime]$hb).TotalMinutes
        if ($ageMin -gt 45) { $online = $false }
      } else { $online = $false }
    } catch {}
  }
  if (-not $svcUp) { $online = $false; $err = $false }
  $kind = 'red'
  $state = 'DISCONNECTED'
  if ($online -and $err) { $kind = 'amber'; $state = 'WATCH' }
  elseif ($online) { $kind = 'green'; $state = 'CONNECTED' }
  return [pscustomobject]@{
    kind  = $kind
    state = $state
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
$miTitle = $menu.Items.Add('RPM Assure Robot')
$miTitle.Enabled = $false
$miState = $menu.Items.Add('Robot: ...')
$miState.Enabled = $false
$miSync = $menu.Items.Add('Last sync: ...')
$miSync.Enabled = $false
[void]$menu.Items.Add('-')
$miDo = $menu.Items.Add('Sync now')
$miRestart = $menu.Items.Add('Restart agent')
$miSet = $menu.Items.Add('Settings (Administrator)')
[void]$menu.Items.Add('-')
$miExit = $menu.Items.Add('Exit tray')
$notify.ContextMenuStrip = $menu
$notify.add_MouseUp({
  param($src, $e)
  if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
    $menu.Show([System.Windows.Forms.Cursor]::Position)
  }
})

$miDo.add_Click({
  $script:SyncBefore = $null
  $cur = Read-RpmaStatus
  $script:SyncBefore = $cur.sync
  $script:SyncTicks = 0
  [IO.File]::WriteAllText($flagFile, (Get-Date).ToUniversalTime().ToString('o'))
  $form = New-Object System.Windows.Forms.Form
  $form.Text = 'RPM Assure - Sync this customer'
  $form.Size = New-Object System.Drawing.Size(420, 150)
  $form.StartPosition = 'CenterScreen'
  $form.FormBorderStyle = 'FixedDialog'
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $lbl = New-Object System.Windows.Forms.Label
  $lbl.AutoSize = $false
  $lbl.SetBounds(12, 12, 380, 28)
  $lbl.Text = 'Queued - waiting for this agent...'
  $bar = New-Object System.Windows.Forms.ProgressBar
  $bar.SetBounds(12, 48, 380, 24)
  $bar.Minimum = 0
  $bar.Maximum = 100
  $bar.Value = 8
  $form.Controls.Add($lbl)
  $form.Controls.Add($bar)
  $pt = New-Object System.Windows.Forms.Timer
  $pt.Interval = 2000
  $pt.add_Tick({
    $script:SyncTicks = [int]$script:SyncTicks + 1
    $t = [int]$script:SyncTicks
    $s = Read-RpmaStatus
    $msg = [string]$s.msg
    $done = $false
    if ($s.sync -and $script:SyncBefore -and ($s.sync -ne $script:SyncBefore)) { $done = $true }
    if ($msg -match 'sync complete|cycle done') { $done = $true }
    if ($done -and $t -ge 2) {
      $bar.Value = 100
      $lbl.Text = 'Sync complete for this customer'
      $pt.Stop()
      $form.Close()
      return
    }
    if ($msg -match 'collect running|SYNCING|job error') {
      $n = 30 + ($t * 5)
      if ($n -gt 92) { $n = 92 }
      $bar.Value = $n
      $lbl.Text = 'Collect running on this customer...'
    } elseif ($msg -match 'fail|error') {
      $bar.Value = 100
      $lbl.Text = 'Error: ' + $msg
      $pt.Stop()
    } else {
      $n = 10 + ($t * 6)
      if ($n -gt 88) { $n = 88 }
      $bar.Value = $n
      $lbl.Text = 'Waiting for this customer (' + $t + ')...'
    }
    if ($t -gt 90) {
      $pt.Stop()
      $lbl.Text = 'Timed out waiting for this customer'
    }
  })
  $pt.Start()
  [void]$form.ShowDialog()
  $pt.Stop()
  $form.Dispose()
})
$miRestart.add_Click({
  Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command Restart-Service RPMAssure-Edge -Force'
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
  $tip = "RPM Assure $($s.state) | sync $(FmtUtc $s.sync)"
  if ($tip.Length -gt 63) { $tip = $tip.Substring(0, 63) }
  $notify.Text = $tip
  $notify.Icon = if ($s.kind -eq 'green') { $iconOn } elseif ($s.kind -eq 'amber') { $iconWait } else { $iconOff }
  $miState.Text = "Robot: $($s.state)"
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
