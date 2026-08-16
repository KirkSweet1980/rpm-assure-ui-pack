# RPM Assure Edge Agent - Windows setup wizard.
# Double-click Start-Agent-Wizard.cmd or:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Assure-Agent-Wizard.ps1
param([switch]$Silent)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Windows.Forms.Application]::EnableVisualStyles()

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
  $me = $MyInvocation.MyCommand.Path
  Start-Process powershell.exe -Verb RunAs -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $me)
  exit
}

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Engine = Join-Path $Here "Install-Assure-Agent.ps1"

$Teal = [Drawing.Color]::FromArgb(31, 157, 138)
$Navy = [Drawing.Color]::FromArgb(13, 27, 36)
$Ink = [Drawing.Color]::FromArgb(18, 32, 42)
$Paper = [Drawing.Color]::FromArgb(244, 247, 248)
$Muted = [Drawing.Color]::FromArgb(90, 110, 120)
$Line = [Drawing.Color]::FromArgb(210, 220, 224)

$script:Page = 0
$Pages = @(
  "Welcome",
  "Customer",
  "Local SQL",
  "Central",
  "Options",
  "Security",
  "Install"
)

function New-Lbl([string]$text, [int]$x, [int]$y, [int]$w = 520, [int]$h = 22, [Drawing.Font]$font = $null, [Drawing.Color]$c = $null) {
  $l = New-Object Windows.Forms.Label
  $l.Text = $text
  $l.Location = New-Object Drawing.Point $x, $y
  $l.Size = New-Object Drawing.Size $w, $h
  $l.BackColor = [Drawing.Color]::Transparent
  if ($font) { $l.Font = $font } else { $l.Font = New-Object Drawing.Font("Segoe UI", 9.5) }
  $l.ForeColor = $(if ($c) { $c } else { $Ink })
  return $l
}
function New-Box([int]$x, [int]$y, [int]$w = 420, [switch]$Password) {
  $t = New-Object Windows.Forms.TextBox
  $t.Location = New-Object Drawing.Point $x, $y
  $t.Size = New-Object Drawing.Size $w, 28
  $t.Font = New-Object Drawing.Font("Segoe UI", 10)
  $t.BorderStyle = "FixedSingle"
  if ($Password) { $t.UseSystemPasswordChar = $true }
  return $t
}

$form = New-Object Windows.Forms.Form
$form.Text = "RPM Assure Edge Agent Setup"
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $true
$form.ClientSize = New-Object Drawing.Size 860, 560
$form.BackColor = $Paper
$form.Font = New-Object Drawing.Font("Segoe UI", 10)

$side = New-Object Windows.Forms.Panel
$side.Location = New-Object Drawing.Point 0, 0
$side.Size = New-Object Drawing.Size 220, 560
$side.BackColor = $Navy
$form.Controls.Add($side)

$brand = New-Lbl "RPM ASSURE" 20 28 180 22 (New-Object Drawing.Font("Segoe UI", 9, [Drawing.FontStyle]::Bold)) ([Drawing.Color]::FromArgb(140, 190, 185))
$side.Controls.Add($brand)
$btitle = New-Lbl "Edge Agent" 20 48 180 28 (New-Object Drawing.Font("Segoe UI Semibold", 16)) ([Drawing.Color]::White)
$side.Controls.Add($btitle)
$bsub = New-Lbl "Windows installer" 20 80 180 20 (New-Object Drawing.Font("Segoe UI", 8.5)) ([Drawing.Color]::FromArgb(150, 170, 176))
$side.Controls.Add($bsub)

$stepLabels = @()
for ($i = 0; $i -lt $Pages.Count; $i++) {
  $sl = New-Lbl ("  " + ($i + 1) + "   " + $Pages[$i]) 16 (130 + $i * 36) 188 28 (New-Object Drawing.Font("Segoe UI Semibold", 10)) ([Drawing.Color]::FromArgb(130, 150, 156))
  $side.Controls.Add($sl)
  $stepLabels += $sl
}

$content = New-Object Windows.Forms.Panel
$content.Location = New-Object Drawing.Point 220, 0
$content.Size = New-Object Drawing.Size 640, 490
$content.BackColor = $Paper
$form.Controls.Add($content)

$footer = New-Object Windows.Forms.Panel
$footer.Location = New-Object Drawing.Point 220, 490
$footer.Size = New-Object Drawing.Size 640, 70
$footer.BackColor = [Drawing.Color]::White
$form.Controls.Add($footer)
$rule = New-Object Windows.Forms.Panel
$rule.Location = New-Object Drawing.Point 0, 0
$rule.Size = New-Object Drawing.Size 640, 1
$rule.BackColor = $Line
$footer.Controls.Add($rule)

function New-Btn([string]$text, [int]$x, [Drawing.Color]$bg, [Drawing.Color]$fg) {
  $b = New-Object Windows.Forms.Button
  $b.Text = $text
  $b.Location = New-Object Drawing.Point $x, 18
  $b.Size = New-Object Drawing.Size 110, 34
  $b.FlatStyle = "Flat"
  $b.FlatAppearance.BorderSize = 0
  $b.BackColor = $bg
  $b.ForeColor = $fg
  $b.Font = New-Object Drawing.Font("Segoe UI Semibold", 9.5)
  $b.Cursor = [Windows.Forms.Cursors]::Hand
  return $b
}
$btnBack = New-Btn "Back" 250 ([Drawing.Color]::FromArgb(232, 238, 240)) $Ink
$btnNext = New-Btn "Next" 370 $Teal ([Drawing.Color]::White)
$btnCancel = New-Btn "Cancel" 500 ([Drawing.Color]::FromArgb(232, 238, 240)) $Ink
$footer.Controls.AddRange(@($btnBack, $btnNext, $btnCancel))

# --- fields ---
$txtCode = New-Box 24 86 240
$txtCode.Text = ""
$txtCode.CharacterCasing = "Upper"
$txtName = New-Box 24 154 420
$txtHost = New-Box 24 222 240
$txtHost.Text = $env:COMPUTERNAME
$txtInst = New-Box 24 290 240
$txtInst.Text = $env:COMPUTERNAME

$rbWin = New-Object Windows.Forms.RadioButton
$rbWin.Text = "Windows authentication (current user)"
$rbWin.Location = New-Object Drawing.Point 24, 86
$rbWin.Size = New-Object Drawing.Size 400, 24
$rbWin.Checked = $true
$rbSql = New-Object Windows.Forms.RadioButton
$rbSql.Text = "SQL login (sa or other sysadmin)"
$rbSql.Location = New-Object Drawing.Point 24, 114
$rbSql.Size = New-Object Drawing.Size 400, 24
$txtLocalUser = New-Box 24 182 240
$txtLocalUser.Enabled = $false
$txtLocalPass = New-Box 24 250 240 -Password
$txtLocalPass.Enabled = $false
$lblLocalTest = New-Lbl "" 24 290 500 22 $null $Muted

$txtCentral = New-Box 24 86 320
$txtCentral.Text = "102.222.21.220,14333"
$txtCdb = New-Box 24 154 240
$txtCdb.Text = "RPMAssure_App"
$txtCuser = New-Box 24 222 240
$txtCuser.Text = "rpmassure"
$txtCpass = New-Box 24 290 240 -Password
$lblCentralTest = New-Lbl "" 24 330 500 22 $null $Muted

$numCollect = New-Object Windows.Forms.NumericUpDown
$numCollect.Location = New-Object Drawing.Point 24, 86
$numCollect.Size = New-Object Drawing.Size 100, 28
$numCollect.Minimum = 5
$numCollect.Maximum = 1440
$numCollect.Value = 30
$numJobs = New-Object Windows.Forms.NumericUpDown
$numJobs.Location = New-Object Drawing.Point 24, 154
$numJobs.Size = New-Object Drawing.Size 100, 28
$numJobs.Minimum = 30
$numJobs.Maximum = 10080
$numJobs.Value = 1440
$chkTray = New-Object Windows.Forms.CheckBox
$chkTray.Text = "Install system tray (status + Sync now)"
$chkTray.Location = New-Object Drawing.Point 24, 210
$chkTray.Size = New-Object Drawing.Size 420, 24
$chkTray.Checked = $true
$chkSvc = New-Object Windows.Forms.CheckBox
$chkSvc.Text = "Install and start Windows service RPMAssure-Edge"
$chkSvc.Location = New-Object Drawing.Point 24, 240
$chkSvc.Size = New-Object Drawing.Size 460, 24
$chkSvc.Checked = $true
$chkOnce = New-Object Windows.Forms.CheckBox
$chkOnce.Text = "Run first collect when setup finishes"
$chkOnce.Location = New-Object Drawing.Point 24, 270
$chkOnce.Size = New-Object Drawing.Size 420, 24
$chkOnce.Checked = $true

$txtAdmin1 = New-Box 24 100 280 -Password
$txtAdmin2 = New-Box 24 168 280 -Password
$chkLock = New-Object Windows.Forms.CheckBox
$chkLock.Text = "Lock agent folder to SYSTEM + Administrators only"
$chkLock.Location = New-Object Drawing.Point 24, 220
$chkLock.Size = New-Object Drawing.Size 460, 24
$chkLock.Checked = $true
$lblSec = New-Lbl "This password opens Set-AgentSettings later. SQL passwords are stored with Windows DPAPI on this machine only." 24 260 560 48 $null $Muted

$txtLog = New-Object Windows.Forms.TextBox
$txtLog.Multiline = $true
$txtLog.ReadOnly = $true
$txtLog.ScrollBars = "Vertical"
$txtLog.Font = New-Object Drawing.Font("Consolas", 8.5)
$txtLog.Location = New-Object Drawing.Point 24, 80
$txtLog.Size = New-Object Drawing.Size 580, 360
$txtLog.BackColor = [Drawing.Color]::FromArgb(18, 32, 42)
$txtLog.ForeColor = [Drawing.Color]::FromArgb(200, 230, 220)
$txtLog.BorderStyle = "None"

$rbSql.add_CheckedChanged({
  $on = $rbSql.Checked
  $txtLocalUser.Enabled = $on
  $txtLocalPass.Enabled = $on
})

function Show-Page {
  $content.Controls.Clear()
  for ($i = 0; $i -lt $stepLabels.Count; $i++) {
    if ($i -eq $script:Page) {
      $stepLabels[$i].ForeColor = [Drawing.Color]::White
      $stepLabels[$i].BackColor = $Teal
    } elseif ($i -lt $script:Page) {
      $stepLabels[$i].ForeColor = [Drawing.Color]::FromArgb(160, 220, 210)
      $stepLabels[$i].BackColor = [Drawing.Color]::Transparent
    } else {
      $stepLabels[$i].ForeColor = [Drawing.Color]::FromArgb(130, 150, 156)
      $stepLabels[$i].BackColor = [Drawing.Color]::Transparent
    }
  }
  $btnBack.Enabled = $script:Page -gt 0
  $btnNext.Text = $(if ($script:Page -eq 6) { "Install" } elseif ($script:Page -eq 7) { "Close" } else { "Next" })

  switch ($script:Page) {
    0 {
      $content.Controls.Add((New-Lbl "Welcome" 24 28 560 32 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add((New-Lbl "This wizard installs the RPM Assure Edge Agent on this SQL server for one customer. The same package is used for every tenant." 24 80 560 56 $null $Muted))
      $content.Controls.Add((New-Lbl "What it does" 24 150 400 22 (New-Object Drawing.Font("Segoe UI Semibold", 11))))
      $content.Controls.Add((New-Lbl "1. Pulls the latest agent from Git`r`n2. Registers the customer and encrypts SQL passwords`r`n3. Installs Windows service RPMAssure-Edge`r`n4. Locks agent files so only Administrators can change them`r`n5. Optional tray icon for status and Sync now" 24 178 560 140 $null $Ink))
    }
    1 {
      $content.Controls.Add((New-Lbl "Customer" 24 28 400 32 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add((New-Lbl "Customer code (2-20 A-Z 0-9)" 24 66 400 18 $null $Muted))
      $content.Controls.Add($txtCode)
      $content.Controls.Add((New-Lbl "Display name" 24 134 400 18 $null $Muted))
      $content.Controls.Add($txtName)
      $content.Controls.Add((New-Lbl "This SQL server (host or host,port)" 24 202 400 18 $null $Muted))
      $content.Controls.Add($txtHost)
      $content.Controls.Add((New-Lbl "SYSPRO instance name stored in Assure" 24 270 400 18 $null $Muted))
      $content.Controls.Add($txtInst)
    }
    2 {
      $content.Controls.Add((New-Lbl "Local SQL access" 24 28 400 32 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add((New-Lbl "How you connect to SYSPRO databases on this box today." 24 62 520 22 $null $Muted))
      $content.Controls.Add($rbWin)
      $content.Controls.Add($rbSql)
      $content.Controls.Add((New-Lbl "SQL login" 24 160 200 18 $null $Muted))
      $content.Controls.Add($txtLocalUser)
      $content.Controls.Add((New-Lbl "SQL password" 24 228 200 18 $null $Muted))
      $content.Controls.Add($txtLocalPass)
      $content.Controls.Add($lblLocalTest)
    }
    3 {
      $content.Controls.Add((New-Lbl "Central Assure" 24 28 400 32 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add((New-Lbl "Central host,port" 24 66 300 18 $null $Muted))
      $content.Controls.Add($txtCentral)
      $content.Controls.Add((New-Lbl "Database" 24 134 200 18 $null $Muted))
      $content.Controls.Add($txtCdb)
      $content.Controls.Add((New-Lbl "SQL user" 24 202 200 18 $null $Muted))
      $content.Controls.Add($txtCuser)
      $content.Controls.Add((New-Lbl "SQL password" 24 270 200 18 $null $Muted))
      $content.Controls.Add($txtCpass)
      $content.Controls.Add($lblCentralTest)
    }
    4 {
      $content.Controls.Add((New-Lbl "Options" 24 28 400 32 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add((New-Lbl "SYSPRO collect interval (minutes)" 24 66 400 18 $null $Muted))
      $content.Controls.Add($numCollect)
      $content.Controls.Add((New-Lbl "Full jobs interval (minutes, 1440 = daily)" 24 134 400 18 $null $Muted))
      $content.Controls.Add($numJobs)
      $content.Controls.Add($chkTray)
      $content.Controls.Add($chkSvc)
      $content.Controls.Add($chkOnce)
    }
    5 {
      $content.Controls.Add((New-Lbl "Security" 24 28 400 32 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add((New-Lbl "Agent admin password (min 8 characters)" 24 78 400 18 $null $Muted))
      $content.Controls.Add($txtAdmin1)
      $content.Controls.Add((New-Lbl "Confirm password" 24 146 400 18 $null $Muted))
      $content.Controls.Add($txtAdmin2)
      $content.Controls.Add($chkLock)
      $content.Controls.Add($lblSec)
    }
    6 {
      $content.Controls.Add((New-Lbl "Install" 24 28 400 32 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add($txtLog)
    }
  }
}

function Test-Sql([string]$server, [string]$db, [string]$auth, [string]$user, [string]$pass) {
  $csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
  $csb["Data Source"] = $server
  $csb["Initial Catalog"] = $(if ($db) { $db } else { "master" })
  $csb["Encrypt"] = $true
  $csb["TrustServerCertificate"] = $true
  $csb["Connect Timeout"] = 12
  if ($auth -eq "Windows") {
    $csb["Integrated Security"] = $true
  } else {
    $csb["User ID"] = $user
    $csb["Password"] = $pass
  }
  $cn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
  try {
    $cn.Open()
    $cn.Close()
    return $true
  } catch {
    return $_.Exception.Message
  }
}

function Validate-Page {
  switch ($script:Page) {
    1 {
      if ($txtCode.Text.Trim() -notmatch '^[A-Z0-9]{2,20}$') {
        [Windows.Forms.MessageBox]::Show("Customer code must be 2-20 letters or numbers.", "RPM Assure") | Out-Null
        return $false
      }
      if ([string]::IsNullOrWhiteSpace($txtHost.Text)) { $txtHost.Text = $env:COMPUTERNAME }
      if ([string]::IsNullOrWhiteSpace($txtInst.Text)) { $txtInst.Text = $txtHost.Text }
    }
    2 {
      $mode = $(if ($rbSql.Checked) { "Sql" } else { "Windows" })
      if ($mode -eq "Sql" -and ([string]::IsNullOrWhiteSpace($txtLocalUser.Text) -or [string]::IsNullOrWhiteSpace($txtLocalPass.Text))) {
        [Windows.Forms.MessageBox]::Show("Enter the local SQL login and password.", "RPM Assure") | Out-Null
        return $false
      }
      $r = Test-Sql $txtHost.Text.Trim() "master" $mode $txtLocalUser.Text $txtLocalPass.Text
      if ($r -ne $true) {
        $lblLocalTest.Text = "Could not connect: $r"
        $lblLocalTest.ForeColor = [Drawing.Color]::FromArgb(180, 50, 40)
        [Windows.Forms.MessageBox]::Show("Local SQL test failed.`r`n$r", "RPM Assure") | Out-Null
        return $false
      }
      $lblLocalTest.Text = "Local SQL connection OK"
      $lblLocalTest.ForeColor = $Teal
    }
    3 {
      if ([string]::IsNullOrWhiteSpace($txtCpass.Text)) {
        [Windows.Forms.MessageBox]::Show("Enter the central Assure SQL password.", "RPM Assure") | Out-Null
        return $false
      }
      $r = Test-Sql $txtCentral.Text.Trim() $txtCdb.Text.Trim() "Sql" $txtCuser.Text.Trim() $txtCpass.Text
      if ($r -ne $true) {
        $lblCentralTest.Text = "Could not connect: $r"
        $lblCentralTest.ForeColor = [Drawing.Color]::FromArgb(180, 50, 40)
        [Windows.Forms.MessageBox]::Show("Central Assure SQL test failed.`r`n$r", "RPM Assure") | Out-Null
        return $false
      }
      $lblCentralTest.Text = "Central connection OK"
      $lblCentralTest.ForeColor = $Teal
    }
    5 {
      if ($txtAdmin1.Text.Length -lt 8) {
        [Windows.Forms.MessageBox]::Show("Agent admin password must be at least 8 characters.", "RPM Assure") | Out-Null
        return $false
      }
      if ($txtAdmin1.Text -ne $txtAdmin2.Text) {
        [Windows.Forms.MessageBox]::Show("Agent admin passwords do not match.", "RPM Assure") | Out-Null
        return $false
      }
    }
  }
  return $true
}

function Run-Install {
  $txtLog.Text = ""
  function Log([string]$m) {
    $txtLog.AppendText($m + [Environment]::NewLine)
    $txtLog.SelectionStart = $txtLog.Text.Length
    $txtLog.ScrollToCaret()
    [Windows.Forms.Application]::DoEvents()
  }
  Log "Starting install for $($txtCode.Text.Trim().ToUpperInvariant())..."
  if (-not (Test-Path $Engine)) {
    Log "ERROR missing $Engine"
    return
  }
  $cfg = Join-Path $env:TEMP ("rpma-agent-setup-" + [guid]::NewGuid().ToString("N") + ".json")
  $obj = [ordered]@{
    CustomerCode        = $txtCode.Text.Trim().ToUpperInvariant()
    DisplayName         = $txtName.Text.Trim()
    SqlHost             = $txtHost.Text.Trim()
    InstanceName        = $txtInst.Text.Trim()
    LocalAuth           = $(if ($rbSql.Checked) { "Sql" } else { "Windows" })
    LocalSqlUser        = $txtLocalUser.Text.Trim()
    LocalSqlPassword    = $txtLocalPass.Text
    CentralDataSource   = $txtCentral.Text.Trim()
    CentralDatabase     = $txtCdb.Text.Trim()
    CentralSqlUser      = $txtCuser.Text.Trim()
    CentralSqlPassword  = $txtCpass.Text
    AdminPassword       = $txtAdmin1.Text
    CollectIntervalMin  = [int]$numCollect.Value
    JobsIntervalMin     = [int]$numJobs.Value
    InstallTray         = [bool]$chkTray.Checked
    StartService        = [bool]$chkSvc.Checked
    RunOnce             = [bool]$chkOnce.Checked
    LockFiles           = [bool]$chkLock.Checked
  }
  ($obj | ConvertTo-Json) | Set-Content -LiteralPath $cfg -Encoding UTF8
  $p = New-Object Diagnostics.Process
  $p.StartInfo.FileName = "powershell.exe"
  $p.StartInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$Engine`" -ConfigFile `"$cfg`""
  $p.StartInfo.UseShellExecute = $false
  $p.StartInfo.RedirectStandardOutput = $true
  $p.StartInfo.RedirectStandardError = $true
  $p.StartInfo.CreateNoWindow = $true
  [void]$p.Start()
  while (-not $p.HasExited) {
    $line = $p.StandardOutput.ReadLine()
    if ($null -ne $line) { Log $line }
    [Windows.Forms.Application]::DoEvents()
  }
  $rest = $p.StandardOutput.ReadToEnd()
  if ($rest) { Log $rest }
  $err = $p.StandardError.ReadToEnd()
  if ($err) { Log $err }
  Remove-Item -LiteralPath $cfg -Force -EA SilentlyContinue
  if ($p.ExitCode -eq 0) {
    Log ""
    Log "INSTALL COMPLETE"
    $btnNext.Text = "Close"
    $script:Page = 7
  } else {
    Log ("FAILED exit " + $p.ExitCode)
  }
}

$btnCancel.add_Click({ $form.Close() })
$btnBack.add_Click({
  if ($script:Page -gt 0 -and $script:Page -lt 7) { $script:Page--; Show-Page }
})
$btnNext.add_Click({
  if ($script:Page -eq 7) { $form.Close(); return }
  if ($script:Page -eq 6) { Run-Install; return }
  if (-not (Validate-Page)) { return }
  $script:Page++
  Show-Page
})

Show-Page
[void]$form.ShowDialog()
