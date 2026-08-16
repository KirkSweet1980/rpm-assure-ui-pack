# RPM Assure - customer-specific Edge Agent wizard.
# Customer details come from Customer.Package.json in this folder.
# User input: Next, Test connection, agent admin password, Finish.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Windows.Forms.Application]::EnableVisualStyles()

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $MyInvocation.MyCommand.Path)
  exit
}

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$pkgPath = Join-Path $Here "Customer.Package.json"
if (-not (Test-Path $pkgPath)) { throw "Customer.Package.json missing next to this wizard." }
$pkg = Get-Content -LiteralPath $pkgPath -Raw | ConvertFrom-Json

$Teal = [Drawing.Color]::FromArgb(31, 157, 138)
$Navy = [Drawing.Color]::FromArgb(13, 27, 36)
$Ink = [Drawing.Color]::FromArgb(18, 32, 42)
$Paper = [Drawing.Color]::FromArgb(244, 247, 248)
$Muted = [Drawing.Color]::FromArgb(90, 110, 120)
$Line = [Drawing.Color]::FromArgb(210, 220, 224)

$script:Page = 0
$script:TestOk = $false
$Pages = @("Welcome", "Connection", "Password")

function New-Lbl([string]$text, [int]$x, [int]$y, [int]$w = 520, [int]$h = 22, $font = $null, $c = $null) {
  $l = New-Object Windows.Forms.Label
  $l.Text = $text
  $l.Location = New-Object Drawing.Point $x, $y
  $l.Size = New-Object Drawing.Size $w, $h
  $l.BackColor = [Drawing.Color]::Transparent
  if ($font) { $l.Font = $font } else { $l.Font = New-Object Drawing.Font("Segoe UI", 9.5) }
  if ($c) { $l.ForeColor = $c } else { $l.ForeColor = $Ink }
  return $l
}

$form = New-Object Windows.Forms.Form
$form.Text = "RPM Assure Agent - " + [string]$pkg.displayName
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.ClientSize = New-Object Drawing.Size 820, 520
$form.BackColor = $Paper

$side = New-Object Windows.Forms.Panel
$side.Location = New-Object Drawing.Point 0, 0
$side.Size = New-Object Drawing.Size 200, 520
$side.BackColor = $Navy
$form.Controls.Add($side)
$side.Controls.Add((New-Lbl "RPM ASSURE" 16 24 170 18 (New-Object Drawing.Font("Segoe UI", 8.5, [Drawing.FontStyle]::Bold)) ([Drawing.Color]::FromArgb(140, 190, 185))))
$side.Controls.Add((New-Lbl "Edge Agent" 16 44 170 26 (New-Object Drawing.Font("Segoe UI Semibold", 15)) ([Drawing.Color]::White)))
$stepLabels = @()
for ($i = 0; $i -lt $Pages.Count; $i++) {
  $sl = New-Lbl ("  " + ($i + 1) + "   " + $Pages[$i]) 12 (130 + $i * 40) 176 28 (New-Object Drawing.Font("Segoe UI Semibold", 10)) ([Drawing.Color]::FromArgb(130, 150, 156))
  $side.Controls.Add($sl)
  $stepLabels += $sl
}

$content = New-Object Windows.Forms.Panel
$content.Location = New-Object Drawing.Point 200, 0
$content.Size = New-Object Drawing.Size 620, 450
$content.BackColor = $Paper
$form.Controls.Add($content)

$footer = New-Object Windows.Forms.Panel
$footer.Location = New-Object Drawing.Point 200, 450
$footer.Size = New-Object Drawing.Size 620, 70
$footer.BackColor = [Drawing.Color]::White
$form.Controls.Add($footer)
$rule = New-Object Windows.Forms.Panel
$rule.Location = New-Object Drawing.Point 0, 0
$rule.Size = New-Object Drawing.Size 620, 1
$rule.BackColor = $Line
$footer.Controls.Add($rule)

function New-Btn([string]$text, [int]$x, $bg, $fg) {
  $b = New-Object Windows.Forms.Button
  $b.Text = $text
  $b.Location = New-Object Drawing.Point $x, 18
  $b.Size = New-Object Drawing.Size 120, 34
  $b.FlatStyle = "Flat"
  $b.FlatAppearance.BorderSize = 0
  $b.BackColor = $bg
  $b.ForeColor = $fg
  $b.Font = New-Object Drawing.Font("Segoe UI Semibold", 9.5)
  return $b
}
$btnBack = New-Btn "Back" 220 ([Drawing.Color]::FromArgb(232, 238, 240)) $Ink
$btnNext = New-Btn "Next" 350 $Teal ([Drawing.Color]::White)
$btnCancel = New-Btn "Cancel" 480 ([Drawing.Color]::FromArgb(232, 238, 240)) $Ink
$footer.Controls.AddRange(@($btnBack, $btnNext, $btnCancel))

$lblLocal = New-Lbl "Not tested" 24 150 560 40
$lblCentral = New-Lbl "Not tested" 24 200 560 40
$btnTest = New-Btn "Test connection" 24 ([Drawing.Color]::FromArgb(18, 32, 42)) ([Drawing.Color]::White)
$btnTest.Location = New-Object Drawing.Point 24, 100
$btnTest.Size = New-Object Drawing.Size 180, 36

$txtAdmin1 = New-Object Windows.Forms.TextBox
$txtAdmin1.Location = New-Object Drawing.Point 24, 100
$txtAdmin1.Size = New-Object Drawing.Size 280, 28
$txtAdmin1.UseSystemPasswordChar = $true
$txtAdmin2 = New-Object Windows.Forms.TextBox
$txtAdmin2.Location = New-Object Drawing.Point 24, 168
$txtAdmin2.Size = New-Object Drawing.Size 280, 28
$txtAdmin2.UseSystemPasswordChar = $true

$txtLog = New-Object Windows.Forms.TextBox
$txtLog.Multiline = $true
$txtLog.ReadOnly = $true
$txtLog.ScrollBars = "Vertical"
$txtLog.Font = New-Object Drawing.Font("Consolas", 8.5)
$txtLog.Location = New-Object Drawing.Point 24, 70
$txtLog.Size = New-Object Drawing.Size 560, 350
$txtLog.BackColor = $Navy
$txtLog.ForeColor = [Drawing.Color]::FromArgb(200, 230, 220)
$txtLog.BorderStyle = "None"

function Test-Sql([string]$server, [string]$db, [string]$auth, [string]$user, [string]$pass) {
  $csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
  $csb["Data Source"] = $server
  $csb["Initial Catalog"] = $(if ($db) { $db } else { "master" })
  $csb["Encrypt"] = $true
  $csb["TrustServerCertificate"] = $true
  $csb["Connect Timeout"] = 12
  if ($auth -eq "Windows") { $csb["Integrated Security"] = $true }
  else { $csb["User ID"] = $user; $csb["Password"] = $pass }
  $cn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
  try { $cn.Open(); $cn.Close(); return $true } catch { return $_.Exception.Message }
}

function Show-Page {
  $content.Controls.Clear()
  for ($i = 0; $i -lt $stepLabels.Count; $i++) {
    if ($i -eq $script:Page) { $stepLabels[$i].ForeColor = [Drawing.Color]::White; $stepLabels[$i].BackColor = $Teal }
    else { $stepLabels[$i].ForeColor = [Drawing.Color]::FromArgb(130, 150, 156); $stepLabels[$i].BackColor = [Drawing.Color]::Transparent }
  }
  $btnBack.Enabled = ($script:Page -gt 0 -and $script:Page -lt 3)
  if ($script:Page -eq 0) { $btnNext.Text = "Next" }
  elseif ($script:Page -eq 1) { $btnNext.Text = "Next"; $btnNext.Enabled = $script:TestOk }
  elseif ($script:Page -eq 2) { $btnNext.Text = "Finish"; $btnNext.Enabled = $true }
  else { $btnNext.Text = "Close"; $btnNext.Enabled = $true }

  switch ($script:Page) {
    0 {
      $content.Controls.Add((New-Lbl "Ready to install" 24 24 560 30 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add((New-Lbl ("Customer  " + [string]$pkg.displayName + "  (" + [string]$pkg.customerCode + ")") 24 80 560 24 (New-Object Drawing.Font("Segoe UI Semibold", 11))))
      $content.Controls.Add((New-Lbl ("SQL host  " + [string]$pkg.sqlHost) 24 110 560 22 $null $Muted))
      $content.Controls.Add((New-Lbl ("Instance  " + [string]$pkg.instanceName) 24 132 560 22 $null $Muted))
      $content.Controls.Add((New-Lbl ("Central   " + [string]$pkg.centralDataSource) 24 154 560 22 $null $Muted))
      $content.Controls.Add((New-Lbl "This pack is pre-filled for this customer. Click Next, test the connection, set an agent password, then Finish." 24 210 560 60 $null $Muted))
    }
    1 {
      $content.Controls.Add((New-Lbl "Test connection" 24 24 560 30 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add((New-Lbl "Uses Windows auth on this SQL host and the baked-in central Assure login." 24 60 560 30 $null $Muted))
      $content.Controls.Add($btnTest)
      $content.Controls.Add($lblLocal)
      $content.Controls.Add($lblCentral)
    }
    2 {
      $content.Controls.Add((New-Lbl "Agent password" 24 24 560 30 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add((New-Lbl "Required to open agent settings later. Minimum 8 characters." 24 60 560 24 $null $Muted))
      $content.Controls.Add((New-Lbl "Password" 24 80 200 18 $null $Muted))
      $content.Controls.Add($txtAdmin1)
      $content.Controls.Add((New-Lbl "Confirm" 24 148 200 18 $null $Muted))
      $content.Controls.Add($txtAdmin2)
    }
    3 {
      $content.Controls.Add((New-Lbl "Install" 24 24 400 30 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add($txtLog)
    }
  }
}

$btnTest.add_Click({
  $hostName = [string]$pkg.sqlHost
  if ([string]::IsNullOrWhiteSpace($hostName)) { $hostName = $env:COMPUTERNAME }
  $r1 = Test-Sql $hostName "master" "Windows" "" ""
  if ($r1 -eq $true) { $lblLocal.Text = "Local SQL  OK  (Windows auth)"; $lblLocal.ForeColor = $Teal }
  else { $lblLocal.Text = "Local SQL  FAIL  $r1"; $lblLocal.ForeColor = [Drawing.Color]::FromArgb(180, 50, 40) }
  $r2 = Test-Sql ([string]$pkg.centralDataSource) ([string]$pkg.centralDatabase) "Sql" ([string]$pkg.centralSqlUser) ([string]$pkg.centralSqlPassword)
  if ($r2 -eq $true) { $lblCentral.Text = "Central Assure  OK"; $lblCentral.ForeColor = $Teal }
  else { $lblCentral.Text = "Central Assure  FAIL  $r2"; $lblCentral.ForeColor = [Drawing.Color]::FromArgb(180, 50, 40) }
  $script:TestOk = ($r1 -eq $true -and $r2 -eq $true)
  $btnNext.Enabled = $script:TestOk
})

function Run-Install {
  $script:Page = 3
  Show-Page
  $txtLog.Text = ""
  function Log([string]$m) { $txtLog.AppendText($m + [Environment]::NewLine); [Windows.Forms.Application]::DoEvents() }
  Log ("Installing " + $pkg.customerCode + "...")
  $cfg = Join-Path $env:TEMP ("rpma-pack-" + [guid]::NewGuid().ToString("N") + ".json")
  $obj = [ordered]@{
    CustomerCode       = [string]$pkg.customerCode
    DisplayName        = [string]$pkg.displayName
    SqlHost            = $(if ([string]$pkg.sqlHost) { [string]$pkg.sqlHost } else { $env:COMPUTERNAME })
    InstanceName       = $(if ([string]$pkg.instanceName) { [string]$pkg.instanceName } else { $env:COMPUTERNAME })
    LocalAuth          = "Windows"
    CentralDataSource  = [string]$pkg.centralDataSource
    CentralDatabase    = [string]$pkg.centralDatabase
    CentralSqlUser     = [string]$pkg.centralSqlUser
    CentralSqlPassword = [string]$pkg.centralSqlPassword
    AdminPassword      = $txtAdmin1.Text
    CollectIntervalMin = 30
    JobsIntervalMin    = 1440
    InstallTray        = $true
    StartService       = $true
    RunOnce            = $true
    LockFiles          = $true
  }
  ($obj | ConvertTo-Json) | Set-Content -LiteralPath $cfg -Encoding UTF8
  $engine = "C:\RPM-Assure\deploy\ui-pack\Sql\agent\installer\Install-Assure-Agent.ps1"
  if (-not (Test-Path $engine)) {
    Log "Pulling latest pack from Git..."
    $git = "C:\Program Files\Git\cmd\git.exe"
    $pack = "C:\RPM-Assure\deploy\ui-pack"
    New-Item -ItemType Directory -Force -Path C:\RPM-Assure\deploy | Out-Null
    if (-not (Test-Path $git)) {
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      $tmp = Join-Path $env:TEMP "Git-64-bit.exe"
      Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe" -OutFile $tmp
      Start-Process $tmp -ArgumentList "/VERYSILENT","/NORESTART","/NOCANCEL","/SP-" -Wait
    }
    if (Test-Path "$pack\.git") {
      & $git -C $pack fetch --all --prune
      & $git -C $pack reset --hard origin/main
    } else {
      & $git clone --depth 1 --branch main https://github.com/KirkSweet1980/rpm-assure-ui-pack.git $pack
    }
  }
  if (-not (Test-Path $engine)) { Log "ERROR engine missing after git"; return }
  $p = New-Object Diagnostics.Process
  $p.StartInfo.FileName = "powershell.exe"
  $p.StartInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$engine`" -ConfigFile `"$cfg`""
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
  $rest = $p.StandardOutput.ReadToEnd(); if ($rest) { Log $rest }
  $err = $p.StandardError.ReadToEnd(); if ($err) { Log $err }
  Remove-Item -LiteralPath $cfg -Force -EA SilentlyContinue
  if ($p.ExitCode -eq 0) { Log ""; Log "INSTALL COMPLETE" } else { Log ("FAILED exit " + $p.ExitCode) }
}

$btnCancel.add_Click({ $form.Close() })
$btnBack.add_Click({ if ($script:Page -gt 0 -and $script:Page -lt 3) { $script:Page--; Show-Page } })
$btnNext.add_Click({
  if ($script:Page -eq 3) { $form.Close(); return }
  if ($script:Page -eq 2) {
    if ($txtAdmin1.Text.Length -lt 8) { [Windows.Forms.MessageBox]::Show("Password must be at least 8 characters.", "RPM Assure") | Out-Null; return }
    if ($txtAdmin1.Text -ne $txtAdmin2.Text) { [Windows.Forms.MessageBox]::Show("Passwords do not match.", "RPM Assure") | Out-Null; return }
    Run-Install
    return
  }
  if ($script:Page -eq 1 -and -not $script:TestOk) { return }
  $script:Page++
  Show-Page
})

Show-Page
[void]$form.ShowDialog()
