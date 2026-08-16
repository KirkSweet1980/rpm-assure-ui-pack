# Customer Edge Agent wizard.
# Same questions as onboard: existing SQL access first, then create rpmassure,
# test Assure + central, set agent password, Finish.
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
$pkg = $null
if (Test-Path $pkgPath) { $pkg = Get-Content -LiteralPath $pkgPath -Raw | ConvertFrom-Json }

$Teal = [Drawing.Color]::FromArgb(31, 157, 138)
$Navy = [Drawing.Color]::FromArgb(13, 27, 36)
$Ink = [Drawing.Color]::FromArgb(18, 32, 42)
$Paper = [Drawing.Color]::FromArgb(244, 247, 248)
$Muted = [Drawing.Color]::FromArgb(90, 110, 120)
$Line = [Drawing.Color]::FromArgb(210, 220, 224)
$Fail = [Drawing.Color]::FromArgb(180, 50, 40)

$script:Page = 0
$script:AccessOk = $false
$script:AssureOk = $false
$Pages = @("Customer", "SQL access", "Assure login", "Password")

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
function New-Box([int]$x, [int]$y, [int]$w = 360, [switch]$Password) {
  $t = New-Object Windows.Forms.TextBox
  $t.Location = New-Object Drawing.Point $x, $y
  $t.Size = New-Object Drawing.Size $w, 28
  $t.Font = New-Object Drawing.Font("Segoe UI", 10)
  $t.BorderStyle = "FixedSingle"
  if ($Password) { $t.UseSystemPasswordChar = $true }
  return $t
}

$form = New-Object Windows.Forms.Form
$form.Text = "RPM Assure Agent"
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.ClientSize = New-Object Drawing.Size 820, 540
$form.BackColor = $Paper

$side = New-Object Windows.Forms.Panel
$side.Location = New-Object Drawing.Point 0, 0
$side.Size = New-Object Drawing.Size 200, 540
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
$content.Size = New-Object Drawing.Size 620, 470
$content.BackColor = $Paper
$form.Controls.Add($content)

$footer = New-Object Windows.Forms.Panel
$footer.Location = New-Object Drawing.Point 200, 470
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

$txtCode = New-Box 24 90; if ($pkg) { $txtCode.Text = [string]$pkg.customerCode }
$txtName = New-Box 24 150; if ($pkg) { $txtName.Text = [string]$pkg.displayName }
$txtHost = New-Box 24 210
if ($pkg -and $pkg.sqlHost) { $txtHost.Text = [string]$pkg.sqlHost } else { $txtHost.Text = $env:COMPUTERNAME }

$rbWin = New-Object Windows.Forms.RadioButton
$rbWin.Text = "Windows authentication (this Windows user)"
$rbWin.Location = New-Object Drawing.Point 24, 90
$rbWin.Size = New-Object Drawing.Size 540, 24
$rbWin.Checked = $true
$rbSql = New-Object Windows.Forms.RadioButton
$rbSql.Text = "Existing SQL login (sa / RPMAdmin / other sysadmin)"
$rbSql.Location = New-Object Drawing.Point 24, 120
$rbSql.Size = New-Object Drawing.Size 540, 24
$txtExistUser = New-Box 24 180; $txtExistUser.Enabled = $false
$txtExistPwd = New-Box 24 240 -Password; $txtExistPwd.Enabled = $false
$rbSql.add_CheckedChanged({ $txtExistUser.Enabled = $rbSql.Checked; $txtExistPwd.Enabled = $rbSql.Checked })

$lblExist = New-Lbl "Not tested" 24 150 560 40
$lblAssure = New-Lbl "Assure login rpmassure not created yet" 24 190 560 50
$lblCentral = New-Lbl "Central not tested" 24 240 560 40
$btnTestExist = New-Btn "Test existing login" 24 ([Drawing.Color]::FromArgb(18, 32, 42)) ([Drawing.Color]::White)
$btnTestExist.Location = New-Object Drawing.Point 24, 90
$btnTestExist.Size = New-Object Drawing.Size 180, 36
$btnMake = New-Btn "Create rpmassure" 220 ([Drawing.Color]::FromArgb(18, 32, 42)) ([Drawing.Color]::White)
$btnMake.Location = New-Object Drawing.Point 220, 90
$btnMake.Size = New-Object Drawing.Size 180, 36
$btnMake.Enabled = $false

$txtAdmin1 = New-Box 24 110 -Password
$txtAdmin2 = New-Box 24 178 -Password

$txtLog = New-Object Windows.Forms.TextBox
$txtLog.Multiline = $true; $txtLog.ReadOnly = $true; $txtLog.ScrollBars = "Vertical"
$txtLog.Font = New-Object Drawing.Font("Consolas", 8.5)
$txtLog.Location = New-Object Drawing.Point 24, 70
$txtLog.Size = New-Object Drawing.Size 560, 360
$txtLog.BackColor = $Navy
$txtLog.ForeColor = [Drawing.Color]::FromArgb(200, 230, 220)
$txtLog.BorderStyle = "None"

function Test-Ado([string]$server, [string]$db, [string]$mode, [string]$user, [string]$pass) {
  $csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
  $csb["Data Source"] = $server
  $csb["Initial Catalog"] = $(if ($db) { $db } else { "master" })
  $csb["Encrypt"] = $true
  $csb["TrustServerCertificate"] = $true
  $csb["Connect Timeout"] = 12
  if ($mode -eq "windows") { $csb["Integrated Security"] = $true }
  else { $csb["User ID"] = $user; $csb["Password"] = $pass }
  $cn = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
  try { $cn.Open(); $who = $null
    $cmd = $cn.CreateCommand(); $cmd.CommandText = "SELECT SUSER_SNAME()"; $who = [string]$cmd.ExecuteScalar()
    $cn.Close(); return $who
  } catch { return ("FAIL:" + $_.Exception.Message) }
}

function Show-Page {
  $content.Controls.Clear()
  for ($i = 0; $i -lt $stepLabels.Count; $i++) {
    if ($i -eq $script:Page) { $stepLabels[$i].ForeColor = [Drawing.Color]::White; $stepLabels[$i].BackColor = $Teal }
    else { $stepLabels[$i].ForeColor = [Drawing.Color]::FromArgb(130, 150, 156); $stepLabels[$i].BackColor = [Drawing.Color]::Transparent }
  }
  $btnBack.Enabled = ($script:Page -gt 0 -and $script:Page -lt 4)
  $btnNext.Enabled = $true
  if ($script:Page -eq 0) { $btnNext.Text = "Next" }
  elseif ($script:Page -eq 1) { $btnNext.Text = "Next" }
  elseif ($script:Page -eq 2) { $btnNext.Text = "Next"; $btnNext.Enabled = $script:AssureOk }
  elseif ($script:Page -eq 3) { $btnNext.Text = "Finish" }
  else { $btnNext.Text = "Close" }

  switch ($script:Page) {
    0 {
      $content.Controls.Add((New-Lbl "Customer" 24 24 560 30 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add((New-Lbl "Pre-filled from Assure. Change only if wrong." 24 56 560 22 $null $Muted))
      $content.Controls.Add((New-Lbl "Customer code" 24 72 200 18 $null $Muted))
      $content.Controls.Add($txtCode)
      $content.Controls.Add((New-Lbl "Display name" 24 132 200 18 $null $Muted))
      $content.Controls.Add($txtName)
      $content.Controls.Add((New-Lbl "This SQL server" 24 192 200 18 $null $Muted))
      $content.Controls.Add($txtHost)
    }
    1 {
      $who = [Security.Principal.WindowsIdentity]::GetCurrent().Name
      $content.Controls.Add((New-Lbl "How do you connect to THIS SQL today?" 24 24 560 30 (New-Object Drawing.Font("Segoe UI Semibold", 16))))
      $content.Controls.Add((New-Lbl ("This is your existing admin. Assure will create rpmassure after this works. Current Windows user: " + $who) 24 58 560 28 $null $Muted))
      $content.Controls.Add($rbWin)
      $content.Controls.Add($rbSql)
      $content.Controls.Add((New-Lbl "Existing SQL user (only if SQL login)" 24 160 400 18 $null $Muted))
      $content.Controls.Add($txtExistUser)
      $content.Controls.Add((New-Lbl "Existing SQL password" 24 220 400 18 $null $Muted))
      $content.Controls.Add($txtExistPwd)
    }
    2 {
      $content.Controls.Add((New-Lbl "Create Assure collect login" 24 24 560 30 (New-Object Drawing.Font("Segoe UI Semibold", 16))))
      $content.Controls.Add((New-Lbl "1) Test YOUR login.  2) Create rpmassure (read SYSPRO, write central).  3) Next." 24 56 560 28 $null $Muted))
      $content.Controls.Add($btnTestExist)
      $content.Controls.Add($btnMake)
      $content.Controls.Add($lblExist)
      $content.Controls.Add($lblAssure)
      $content.Controls.Add($lblCentral)
    }
    3 {
      $content.Controls.Add((New-Lbl "Agent password" 24 24 560 30 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add((New-Lbl "Locks agent settings. Minimum 8 characters. Not the SQL password." 24 60 560 24 $null $Muted))
      $content.Controls.Add((New-Lbl "Password" 24 88 200 18 $null $Muted))
      $content.Controls.Add($txtAdmin1)
      $content.Controls.Add((New-Lbl "Confirm" 24 156 200 18 $null $Muted))
      $content.Controls.Add($txtAdmin2)
    }
    4 {
      $content.Controls.Add((New-Lbl "Install" 24 24 400 30 (New-Object Drawing.Font("Segoe UI Semibold", 18))))
      $content.Controls.Add($txtLog)
    }
  }
}

$btnTestExist.add_Click({
  $mode = $(if ($rbSql.Checked) { "sql" } else { "windows" })
  $who = Test-Ado $txtHost.Text "master" $mode $txtExistUser.Text $txtExistPwd.Text
  if ($who -like "FAIL:*") {
    $lblExist.Text = "Existing login failed. " + $who.Substring(5)
    $lblExist.ForeColor = $Fail
    $script:AccessOk = $false
    $btnMake.Enabled = $false
  } else {
    $lblExist.Text = "Existing login OK as " + $who
    $lblExist.ForeColor = $Teal
    $script:AccessOk = $true
    $btnMake.Enabled = $true
  }
})

$btnMake.add_Click({
  if (-not $script:AccessOk) { return }
  $lblAssure.Text = "Creating rpmassure..."
  $lblAssure.ForeColor = $Muted
  [Windows.Forms.Application]::DoEvents()
  $ensure = $null
  foreach ($p in @(
      (Join-Path $Here "Ensure-Collect-And-Central.ps1"),
      "C:\RPM-Assure\deploy\ui-pack\Sql\agent\installer\Ensure-Collect-And-Central.ps1"
    )) { if (Test-Path $p) { $ensure = $p; break } }
  if (-not $ensure) {
    $lblAssure.Text = "Ensure-Collect-And-Central.ps1 missing. Pull git on this host first."
    $lblAssure.ForeColor = $Fail
    return
  }
  $mode = $(if ($rbSql.Checked) { "sql" } else { "windows" })
  $arg = @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $ensure,
    "-LocalServer", $txtHost.Text,
    "-AdminMode", $mode,
    "-CollectUser", "rpmassure",
    "-CollectPassword", "@ssuR3me!",
    "-CustomerCode", $txtCode.Text.Trim().ToUpperInvariant(),
    "-DisplayName", $txtName.Text.Trim(),
    "-InstanceName", $txtHost.Text.Trim(),
    "-CentralHost", "102.222.21.220,14333",
    "-CentralDatabase", "RPMAssure_App",
    "-CentralUser", "rpmassure",
    "-CentralPassword", "@ssuR3me!"
  )
  if ($rbSql.Checked) {
    $arg += @("-AdminUser", $txtExistUser.Text, "-AdminPassword", $txtExistPwd.Text)
  }
  $tmpOut = Join-Path $env:TEMP "rpma-ensure-out.txt"
  $p = Start-Process -FilePath "powershell.exe" -ArgumentList $arg -Wait -PassThru -NoNewWindow -RedirectStandardOutput $tmpOut -RedirectStandardError ($tmpOut + ".err")
  $text = ""
  if (Test-Path $tmpOut) { $text = Get-Content $tmpOut -Raw -EA SilentlyContinue }
  if ($text -match "COLLECT_LOGIN_WORKS") {
    $lblAssure.Text = "Assure login rpmassure ready (read SYSPRO, write central)."
    $lblAssure.ForeColor = $Teal
  } else {
    $tail = if ($text) { $text.Substring([Math]::Max(0, $text.Length - 280)) } else { "no output" }
    $lblAssure.Text = "Could not create rpmassure. " + $tail
    $lblAssure.ForeColor = $Fail
    $script:AssureOk = $false
    $btnNext.Enabled = $false
    return
  }
  if ($text -match "CENTRAL_OK") {
    $lblCentral.Text = "Central Assure OK as rpmassure"
    $lblCentral.ForeColor = $Teal
    $script:AssureOk = $true
    $btnNext.Enabled = $true
  } else {
    $lblCentral.Text = "rpmassure local OK, central write-back failed. Check firewall to 102.222.21.220,14333"
    $lblCentral.ForeColor = $Fail
    $script:AssureOk = $false
    $btnNext.Enabled = $false
  }
})

function Run-Install {
  $script:Page = 4
  Show-Page
  $txtLog.Text = ""
  function Log([string]$m) { $txtLog.AppendText($m + [Environment]::NewLine); [Windows.Forms.Application]::DoEvents() }
  Log ("Installing agent for " + $txtCode.Text + " using rpmassure...")
  $cfg = Join-Path $env:TEMP ("rpma-pack-" + [guid]::NewGuid().ToString("N") + ".json")
  $obj = [ordered]@{
    CustomerCode       = $txtCode.Text.Trim().ToUpperInvariant()
    DisplayName        = $txtName.Text.Trim()
    SqlHost            = $txtHost.Text.Trim()
    InstanceName       = $txtHost.Text.Trim()
    LocalAuth          = "Sql"
    LocalSqlUser       = "rpmassure"
    LocalSqlPassword   = "@ssuR3me!"
    CentralDataSource  = "102.222.21.220,14333"
    CentralDatabase    = "RPMAssure_App"
    CentralSqlUser     = "rpmassure"
    CentralSqlPassword = "@ssuR3me!"
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
    Log "Pulling pack from Git..."
    $git = "C:\Program Files\Git\cmd\git.exe"
    $pack = "C:\RPM-Assure\deploy\ui-pack"
    New-Item -ItemType Directory -Force -Path C:\RPM-Assure\deploy | Out-Null
    if (Test-Path "$pack\.git") {
      & $git -C $pack fetch --all --prune
      & $git -C $pack reset --hard origin/main
    } else {
      & $git clone --depth 1 --branch main https://github.com/KirkSweet1980/rpm-assure-ui-pack.git $pack
    }
  }
  if (-not (Test-Path $engine)) { Log "ERROR engine missing"; return }
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
  if ($p.ExitCode -eq 0) { Log ""; Log "INSTALL COMPLETE  collect login = rpmassure" } else { Log ("FAILED exit " + $p.ExitCode) }
}

$btnCancel.add_Click({ $form.Close() })
$btnBack.add_Click({ if ($script:Page -gt 0 -and $script:Page -lt 4) { $script:Page--; Show-Page } })
$btnNext.add_Click({
  if ($script:Page -eq 4) { $form.Close(); return }
  if ($script:Page -eq 3) {
    if ($txtAdmin1.Text.Length -lt 8) { [Windows.Forms.MessageBox]::Show("Agent password must be at least 8 characters.", "RPM Assure") | Out-Null; return }
    if ($txtAdmin1.Text -ne $txtAdmin2.Text) { [Windows.Forms.MessageBox]::Show("Passwords do not match.", "RPM Assure") | Out-Null; return }
    Run-Install
    return
  }
  if ($script:Page -eq 2 -and -not $script:AssureOk) { return }
  $script:Page++
  Show-Page
})

Show-Page
[void]$form.ShowDialog()
