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
$connectPs1 = Join-Path $Here "Sql-Connect.ps1"
if (-not (Test-Path $connectPs1)) { $connectPs1 = "C:\RPM-Assure\deploy\ui-pack\Sql\agent\installer\Sql-Connect.ps1" }
if (Test-Path $connectPs1) { . $connectPs1 }

$Teal = [Drawing.Color]::FromArgb(31, 157, 138)
$Navy = [Drawing.Color]::FromArgb(13, 27, 36)
$Ink = [Drawing.Color]::FromArgb(18, 32, 42)
$Paper = [Drawing.Color]::FromArgb(244, 247, 248)
$Muted = [Drawing.Color]::FromArgb(90, 110, 120)
$Line = [Drawing.Color]::FromArgb(210, 220, 224)
$Fail = [Drawing.Color]::FromArgb(180, 50, 40)

$script:Page = 0
$script:AccessOk = $false
$script:LocalOk = $false
$script:CentralOk = $false
$script:AssureOk = $false
$script:CollectPwd = "@ssuR3me!"
$script:CentralUser = "rpmassure"
$script:CentralPwd = "@ssuR3me!"
$script:CentralHost = "102.222.21.220,14333"
$script:ExtraPwds = New-Object System.Collections.Generic.List[string]
[void]$script:ExtraPwds.Add("@ssuR3me!")
$cfgGuess = Get-ChildItem "C:\RPM-Assure\Sql\customers" -Filter "Customer.Config.ps1" -Recurse -EA SilentlyContinue | Select-Object -First 1
if ($cfgGuess) {
  try {
    . $cfgGuess.FullName
    if ($LocalSqlPassword) { [void]$script:ExtraPwds.Add([string]$LocalSqlPassword) }
    if ($CentralSqlPassword) {
      [void]$script:ExtraPwds.Add([string]$CentralSqlPassword)
      $script:CentralPwd = [string]$CentralSqlPassword
    }
    if ($CentralSqlUser) { $script:CentralUser = [string]$CentralSqlUser }
    if ($CentralDataSource) { $script:CentralHost = [string]$CentralDataSource }
  } catch {}
}
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
$form.Text = "RPM Assure Agent 2.4"
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.ClientSize = New-Object Drawing.Size 820, 600
$form.BackColor = $Paper

$side = New-Object Windows.Forms.Panel
$side.Location = New-Object Drawing.Point 0, 0
$side.Size = New-Object Drawing.Size 200, 600
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
$content.Size = New-Object Drawing.Size 620, 530
$content.BackColor = $Paper
$form.Controls.Add($content)

$footer = New-Object Windows.Forms.Panel
$footer.Location = New-Object Drawing.Point 200, 530
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

$lblExist = New-Lbl "Not tested" 24 132 560 22
$lblAssure = New-Lbl "Local rpmassure not tested" 24 154 560 36
$lblCentral = New-Lbl "Central Assure not tested" 24 190 560 36
$txtCollectPwd = New-Box 24 248 240 -Password
$txtCollectPwd.Text = $script:CollectPwd
$txtCentralUser = New-Box 24 308 240
$txtCentralUser.Text = $script:CentralUser
$txtCentralPwd = New-Box 280 308 240 -Password
$txtCentralPwd.Text = $script:CentralPwd
$txtCentralHost = New-Box 24 368 360
$txtCentralHost.Text = $script:CentralHost
$btnTestExist = New-Btn "Test sa / admin" 24 ([Drawing.Color]::FromArgb(18, 32, 42)) ([Drawing.Color]::White)
$btnTestExist.Location = New-Object Drawing.Point 24, 88
$btnTestExist.Size = New-Object Drawing.Size 130, 34
$btnTestAssure = New-Btn "Test rpmassure" 162 ([Drawing.Color]::FromArgb(18, 32, 42)) ([Drawing.Color]::White)
$btnTestAssure.Location = New-Object Drawing.Point 162, 88
$btnTestAssure.Size = New-Object Drawing.Size 130, 34
$btnTestCentral = New-Btn "Test central" 300 ([Drawing.Color]::FromArgb(18, 32, 42)) ([Drawing.Color]::White)
$btnTestCentral.Location = New-Object Drawing.Point 300, 88
$btnTestCentral.Size = New-Object Drawing.Size 120, 34
$btnMake = New-Btn "Reset local" 428 ([Drawing.Color]::FromArgb(18, 32, 42)) ([Drawing.Color]::White)
$btnMake.Location = New-Object Drawing.Point 428, 88
$btnMake.Size = New-Object Drawing.Size 110, 34
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

function Test-Ado([string]$server, [string]$db, [string]$mode, [string]$user, [string]$pass, [switch]$Strict) {
  if (Get-Command Test-RpmaSql -EA SilentlyContinue) {
    if ($Strict) {
      $r = Test-RpmaSql -Server $server -Database $db -Mode $mode -User $user -Password $pass -TimeoutSec 6 -StrictHost
    } else {
      $r = Test-RpmaSql -Server $server -Database $db -Mode $mode -User $user -Password $pass -TimeoutSec 6
    }
    if ($r.Ok) { return $r.Who }
    return ("FAIL:" + $r.Error)
  }
  $cs = "Data Source=$server;Initial Catalog=$(if ($db) {$db} else {'master'});Connect Timeout=6;Encrypt=False;TrustServerCertificate=True;"
  if ($mode -eq "windows") { $cs += "Integrated Security=True;" }
  else { $cs += "User ID=$user;Password=`"$($pass -replace '"','""')`";" }
  $cn = New-Object System.Data.SqlClient.SqlConnection $cs
  try {
    $cn.Open()
    $cmd = $cn.CreateCommand(); $cmd.CommandText = "SELECT SUSER_SNAME()"; $who = [string]$cmd.ExecuteScalar()
    $cn.Close(); return $who
  } catch { return ("FAIL:" + $_.Exception.Message) }
}

function Set-NextGate {
  $script:AssureOk = ($script:LocalOk -and $script:CentralOk)
  if ($script:Page -eq 2) { $btnNext.Enabled = $script:AssureOk }
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
      $content.Controls.Add((New-Lbl "Assure collect + central" 24 20 560 28 (New-Object Drawing.Font("Segoe UI Semibold", 16))))
      $content.Controls.Add((New-Lbl "Test sa, then local rpmassure, then central. Edit user/password if login fails. Next unlocks only after both local and central are green." 24 48 560 36 $null $Muted))
      $content.Controls.Add($btnTestExist)
      $content.Controls.Add($btnTestAssure)
      $content.Controls.Add($btnTestCentral)
      $content.Controls.Add($btnMake)
      $content.Controls.Add($lblExist)
      $content.Controls.Add($lblAssure)
      $content.Controls.Add($lblCentral)
      $content.Controls.Add((New-Lbl "Local rpmassure password" 24 230 240 16 $null $Muted))
      $content.Controls.Add($txtCollectPwd)
      $content.Controls.Add((New-Lbl "Central Assure user" 24 290 240 16 $null $Muted))
      $content.Controls.Add((New-Lbl "Central Assure password" 280 290 240 16 $null $Muted))
      $content.Controls.Add($txtCentralUser)
      $content.Controls.Add($txtCentralPwd)
      $content.Controls.Add((New-Lbl "Central host,port  (do not use this SQL server)" 24 350 400 16 $null $Muted))
      $content.Controls.Add($txtCentralHost)
      Set-NextGate
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
  try {
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
  } catch {
    $lblExist.Text = "Test error: " + $_.Exception.Message
    $lblExist.ForeColor = $Fail
  }
})

$btnTestAssure.add_Click({
  try {
    $lblAssure.Text = "Testing local rpmassure..."
    $lblAssure.ForeColor = $Muted
    [Windows.Forms.Application]::DoEvents()
    $tried = New-Object System.Collections.Generic.List[string]
    $typed = [string]$txtCollectPwd.Text
    if ($typed) { [void]$tried.Add($typed) }
    foreach ($p in $script:ExtraPwds) { if ($p -and -not $tried.Contains($p)) { [void]$tried.Add($p) } }
    $who = $null
    $used = $null
    foreach ($p in $tried) {
      $r = Test-Ado $txtHost.Text "master" "sql" "rpmassure" $p -Strict
      if ($r -notlike "FAIL:*") { $who = $r; $used = $p; break }
      $who = $r
    }
    if ($who -like "FAIL:*") {
      $lblAssure.Text = "Local rpmassure login failed. Type the correct password below, or Reset local (needs sa / Windows)."
      $lblAssure.ForeColor = $Fail
      $script:LocalOk = $false
    } else {
      $script:CollectPwd = $used
      $txtCollectPwd.Text = $used
      $lblAssure.Text = "Local rpmassure works as " + $who
      $lblAssure.ForeColor = $Teal
      $script:LocalOk = $true
    }
    Set-NextGate
  } catch {
    $lblAssure.Text = "Test error: " + $_.Exception.Message
    $lblAssure.ForeColor = $Fail
    $script:LocalOk = $false
    Set-NextGate
  }
})

$btnTestCentral.add_Click({
  try {
    $u = [string]$txtCentralUser.Text.Trim()
    $p = [string]$txtCentralPwd.Text
    $h = [string]$txtCentralHost.Text.Trim()
    if (-not $u) { $u = "rpmassure" }
    if (-not $h) { $h = "102.222.21.220,14333" }
    $lblCentral.Text = "Testing central " + $h + " as " + $u + "..."
    $lblCentral.ForeColor = $Muted
    [Windows.Forms.Application]::DoEvents()
    if (Get-Command Test-RpmaCentral -EA SilentlyContinue) {
      $r = Test-RpmaCentral -Server $h -User $u -Password $p
      if ($r.Ok) { $who = $r.Who } else { $who = "FAIL:" + $r.Error }
    } else {
      $who = Test-Ado $h "RPMAssure_App" "sql" $u $p -Strict
    }
    if ($who -like "FAIL:*") {
      $lblCentral.Text = "Central failed. Edit user/password/host and test again. " + $who.Substring(5)
      $lblCentral.ForeColor = $Fail
      $script:CentralOk = $false
    } else {
      $script:CentralUser = $u
      $script:CentralPwd = $p
      $script:CentralHost = $h
      $lblCentral.Text = "Central Assure OK as " + $who + " on " + $h
      $lblCentral.ForeColor = $Teal
      $script:CentralOk = $true
    }
    Set-NextGate
  } catch {
    $lblCentral.Text = "Central test error: " + $_.Exception.Message
    $lblCentral.ForeColor = $Fail
    $script:CentralOk = $false
    Set-NextGate
  }
})

$btnMake.add_Click({
  try {
  if (-not $script:AccessOk) {
    $lblAssure.Text = "Test existing login first (Windows or RPMAdmin), then Create."
    $lblAssure.ForeColor = $Fail
    return
  }
  $lblAssure.Text = "Creating / verifying rpmassure..."
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
  $cfg = Join-Path $env:TEMP ("rpma-ensure-" + [guid]::NewGuid().ToString("N") + ".json")
  $obj = [ordered]@{
    LocalServer      = $txtHost.Text.Trim()
    AdminMode        = $mode
    AdminUser        = $txtExistUser.Text
    AdminPassword    = $txtExistPwd.Text
    CollectUser      = "rpmassure"
    CollectPassword  = $(if ($txtCollectPwd.Text) { $txtCollectPwd.Text } else { "@ssuR3me!" })
    CustomerCode     = $txtCode.Text.Trim().ToUpperInvariant()
    DisplayName      = $txtName.Text.Trim()
    InstanceName     = $txtHost.Text.Trim()
    CentralHost      = $(if ($txtCentralHost.Text) { $txtCentralHost.Text.Trim() } else { "102.222.21.220,14333" })
    CentralDatabase  = "RPMAssure_App"
    CentralUser      = $(if ($txtCentralUser.Text) { $txtCentralUser.Text.Trim() } else { "rpmassure" })
    CentralPassword  = $(if ($txtCentralPwd.Text) { $txtCentralPwd.Text } else { "@ssuR3me!" })
  }
  ($obj | ConvertTo-Json) | Set-Content -LiteralPath $cfg -Encoding UTF8
  $tmpOut = Join-Path $env:TEMP "rpma-ensure-out.txt"
  $arg = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $ensure, "-ConfigFile", $cfg)
  $p = Start-Process -FilePath "powershell.exe" -ArgumentList $arg -Wait -PassThru -NoNewWindow -RedirectStandardOutput $tmpOut -RedirectStandardError ($tmpOut + ".err")
  $text = ""
  if (Test-Path $tmpOut) { $text = Get-Content $tmpOut -Raw -EA SilentlyContinue }
  Remove-Item -LiteralPath $cfg -Force -EA SilentlyContinue
  if ($text -match "COLLECT_LOGIN_WORKS|COLLECT_ALREADY_OK") {
    $lblAssure.Text = "Local rpmassure ready."
    $lblAssure.ForeColor = $Teal
    $script:CollectPwd = $(if ($txtCollectPwd.Text) { $txtCollectPwd.Text } else { "@ssuR3me!" })
    $script:LocalOk = $true
  } else {
    $tail = if ($text) { $text.Substring([Math]::Max(0, $text.Length - 280)) } else { "no output" }
    $lblAssure.Text = "Could not create rpmassure. " + $tail
    $lblAssure.ForeColor = $Fail
    $script:LocalOk = $false
    Set-NextGate
    return
  }
  if ($text -match "CENTRAL_OK") {
    $lblCentral.Text = "Central Assure OK"
    $lblCentral.ForeColor = $Teal
    $script:CentralOk = $true
  } else {
    $lblCentral.Text = "Local OK. Central not confirmed - edit user/password/host and click Test central."
    $lblCentral.ForeColor = $Fail
    $script:CentralOk = $false
  }
  Set-NextGate
  } catch {
    $lblAssure.Text = "Create error: " + $_.Exception.Message
    $lblAssure.ForeColor = $Fail
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
    LocalSqlPassword   = $(if ($script:CollectPwd) { $script:CollectPwd } else { "@ssuR3me!" })
    CentralDataSource  = $(if ($script:CentralHost) { $script:CentralHost } else { "102.222.21.220,14333" })
    CentralDatabase    = "RPMAssure_App"
    CentralSqlUser     = $(if ($script:CentralUser) { $script:CentralUser } else { "rpmassure" })
    CentralSqlPassword = $(if ($script:CentralPwd) { $script:CentralPwd } else { "@ssuR3me!" })
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
