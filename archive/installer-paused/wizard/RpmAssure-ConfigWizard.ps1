#Requires -Version 5.1
<#
.SYNOPSIS
  RPM Assure configuration wizard (SQL + public URL + write app.env).
.DESCRIPTION
  Phase 2 installer UI. Run elevated recommended. Pure Windows Forms.
#>
param(
  [string]$InstallDir = '',
  [switch]$Reconfigure
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

function Get-InstallDir {
  if ($InstallDir -and (Test-Path $InstallDir)) { return $InstallDir }
  $reg = 'HKLM:\Software\RPM Resources\RPM Assure'
  if (Test-Path $reg) {
    $v = (Get-ItemProperty $reg -EA SilentlyContinue).InstallDir
    if ($v -and (Test-Path $v)) { return $v }
  }
  $default = 'C:\Program Files\RPM Resources\RPM Assure'
  if (Test-Path $default) { return $default }
  return $default
}

function Get-ConfigPath {
  Join-Path $env:ProgramData 'RPM Resources\RPM Assure\config\app.env'
}

function Read-EnvFile([string]$path) {
  $map = @{}
  if (-not (Test-Path $path)) { return $map }
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $i = $_.IndexOf('=')
    $k = $_.Substring(0, $i).Trim()
    $v = $_.Substring($i + 1)
    $map[$k] = $v
  }
  return $map
}

function New-AuthSecret {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return ([BitConverter]::ToString($bytes) -replace '-','').ToLowerInvariant()
}

function Test-Sql {
  param($Server,$Database,$User,$Password,$TrustCert,$WindowsAuth)
  $script = Join-Path $PSScriptRoot 'Test-SqlConnection.ps1'
  if (-not (Test-Path $script)) {
    # inline fallback
    try {
      $csb = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
      $csb['Data Source'] = $Server
      $csb['Initial Catalog'] = $Database
      $csb['Connect Timeout'] = 8
      if ($WindowsAuth) { $csb['Integrated Security'] = $true }
      else { $csb['User ID'] = $User; $csb['Password'] = $Password }
      if ($TrustCert) { $csb['TrustServerCertificate'] = $true }
      $c = New-Object System.Data.SqlClient.SqlConnection $csb.ConnectionString
      $c.Open(); $c.Close()
      return @{ Ok = $true; Message = 'Connection successful' }
    } catch {
      return @{ Ok = $false; Message = $_.Exception.Message }
    }
  }
  $params = @{
    Server = $Server
    Database = $Database
    TrustCert = [bool]$TrustCert
    WindowsAuth = [bool]$WindowsAuth
  }
  if (-not $WindowsAuth) { $params.User = $User; $params.Password = $Password }
  $r = & $script @params
  return $r
}

function Write-Config {
  param($Server,$Database,$User,$Password,$TrustCert,$AppUrl,$Secret)
  $configDir = Split-Path (Get-ConfigPath)
  New-Item -ItemType Directory -Force -Path $configDir | Out-Null
  $path = Get-ConfigPath
  if (-not $Secret) {
    $prev = Read-EnvFile $path
    if ($prev['BETTER_AUTH_SECRET']) { $Secret = $prev['BETTER_AUTH_SECRET'] }
    else { $Secret = New-AuthSecret }
  }
  $trust = if ($TrustCert) { 'true' } else { 'false' }
  $lines = @(
    '# RPM Assure - written by Config Wizard ' + (Get-Date -Format 'u')
    'RPM_ASSURE_DATA_MODE=auto'
    "RPM_ASSURE_SQL_SERVER=$Server"
    "RPM_ASSURE_SQL_DATABASE=$Database"
    "RPM_ASSURE_SQL_USER=$User"
    "RPM_ASSURE_SQL_PASSWORD=$Password"
    "RPM_ASSURE_SQL_TRUST_CERT=$trust"
    'VITE_AUTH_ENABLED=true'
    "BETTER_AUTH_URL=$AppUrl"
    "BETTER_AUTH_TRUSTED_ORIGINS=$AppUrl"
    "BETTER_AUTH_SECRET=$Secret"
    'PORT=8081'
    'NITRO_PORT=8081'
    'HOST=0.0.0.0'
  )
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [IO.File]::WriteAllLines($path, $lines, $utf8)

  $inst = Get-InstallDir
  $appLocal = Join-Path $inst 'app\.env.local'
  $appDir = Split-Path $appLocal
  if (Test-Path $appDir) {
    [IO.File]::WriteAllLines($appLocal, $lines, $utf8)
  }
  return $path
}

function Restart-AppService {
  $inst = Get-InstallDir
  $stop = Join-Path $inst 'service\Stop-Service.ps1'
  $start = Join-Path $inst 'service\Start-Service.ps1'
  if (Test-Path $stop) { & $stop }
  Start-Sleep 1
  if (Test-Path $start) { & $start }
  else {
    try { Restart-Service RPMAssure-App -Force -EA Stop } catch {
      try { Start-Service RPMAssure-App -EA SilentlyContinue } catch {}
    }
  }
}

# --- UI -------------------------------------------------------------
$instDir = Get-InstallDir
$existing = Read-EnvFile (Get-ConfigPath)

$form = New-Object System.Windows.Forms.Form
$form.Text = 'RPM Assure - Setup Wizard'
$form.Size = New-Object System.Drawing.Size(640, 520)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(248, 250, 252)
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9.5)

$header = New-Object System.Windows.Forms.Panel
$header.Dock = 'Top'
$header.Height = 64
$header.BackColor = [System.Drawing.Color]::FromArgb(6, 28, 48)
$form.Controls.Add($header)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'RPM Assure'
$title.ForeColor = [System.Drawing.Color]::White
$title.Font = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold)
$title.Location = New-Object System.Drawing.Point(20, 8)
$title.AutoSize = $true
$header.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = 'Configuration wizard - SQL connection & site URL'
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(62, 207, 191)
$subtitle.Location = New-Object System.Drawing.Point(22, 38)
$subtitle.AutoSize = $true
$header.Controls.Add($subtitle)

$stepLabel = New-Object System.Windows.Forms.Label
$stepLabel.Location = New-Object System.Drawing.Point(24, 80)
$stepLabel.Size = New-Object System.Drawing.Size(580, 24)
$stepLabel.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$stepLabel.ForeColor = [System.Drawing.Color]::FromArgb(15, 40, 60)
$form.Controls.Add($stepLabel)

# Pages
$pageWelcome = New-Object System.Windows.Forms.Panel
$pageSql = New-Object System.Windows.Forms.Panel
$pageUrl = New-Object System.Windows.Forms.Panel
$pageSummary = New-Object System.Windows.Forms.Panel
foreach ($p in @($pageWelcome, $pageSql, $pageUrl, $pageSummary)) {
  $p.Location = New-Object System.Drawing.Point(20, 110)
  $p.Size = New-Object System.Drawing.Size(590, 300)
  $p.Visible = $false
  $form.Controls.Add($p)
}

# Welcome
$wText = New-Object System.Windows.Forms.Label
$wText.Text = @"
This wizard configures RPM Assure for this server.

Install folder:
  $instDir

Config file:
  $(Get-ConfigPath)

You will set:
  - SQL Server connection (test before save)
  - Public site URL (HTTPS)
  - Auth secret (auto-generated if missing)

Click Next to continue.
"@
$wText.Location = New-Object System.Drawing.Point(8, 8)
$wText.Size = New-Object System.Drawing.Size(570, 280)
$pageWelcome.Controls.Add($wText)

# SQL page
function Add-LabeledText($parent, $label, $y, $default, [ref]$boxRef, $password=$false) {
  $lbl = New-Object System.Windows.Forms.Label
  $lbl.Text = $label
  $lbl.Location = New-Object System.Drawing.Point(8, $y)
  $lbl.Size = New-Object System.Drawing.Size(180, 22)
  $parent.Controls.Add($lbl)
  $tb = New-Object System.Windows.Forms.TextBox
  $tb.Location = New-Object System.Drawing.Point(200, ($y - 2))
  $tb.Size = New-Object System.Drawing.Size(360, 26)
  $tb.Text = $default
  if ($password) { $tb.UseSystemPasswordChar = $true }
  $parent.Controls.Add($tb)
  $boxRef.Value = $tb
}

$tbServer = $null; $tbDb = $null; $tbUser = $null; $tbPass = $null
Add-LabeledText $pageSql 'SQL Server (host,port)' 10 $(if($existing['RPM_ASSURE_SQL_SERVER']){$existing['RPM_ASSURE_SQL_SERVER']}else{'102.222.21.220,14333'}) ([ref]$tbServer)
Add-LabeledText $pageSql 'Database' 50 $(if($existing['RPM_ASSURE_SQL_DATABASE']){$existing['RPM_ASSURE_SQL_DATABASE']}else{'RPMAssure_App'}) ([ref]$tbDb)
Add-LabeledText $pageSql 'SQL User' 90 $(if($existing['RPM_ASSURE_SQL_USER']){$existing['RPM_ASSURE_SQL_USER']}else{'Rpm_collect'}) ([ref]$tbUser)
Add-LabeledText $pageSql 'SQL Password' 130 $(if($existing['RPM_ASSURE_SQL_PASSWORD']){$existing['RPM_ASSURE_SQL_PASSWORD']}else{''}) ([ref]$tbPass) $true

$chkTrust = New-Object System.Windows.Forms.CheckBox
$chkTrust.Text = 'Trust server certificate'
$chkTrust.Checked = $true
$chkTrust.Location = New-Object System.Drawing.Point(200, 170)
$chkTrust.AutoSize = $true
$pageSql.Controls.Add($chkTrust)

$chkWin = New-Object System.Windows.Forms.CheckBox
$chkWin.Text = 'Use Windows authentication'
$chkWin.Location = New-Object System.Drawing.Point(200, 198)
$chkWin.AutoSize = $true
$pageSql.Controls.Add($chkWin)

$btnTest = New-Object System.Windows.Forms.Button
$btnTest.Text = 'Test connection'
$btnTest.Location = New-Object System.Drawing.Point(200, 232)
$btnTest.Size = New-Object System.Drawing.Size(140, 32)
$btnTest.BackColor = [System.Drawing.Color]::FromArgb(27, 184, 166)
$btnTest.FlatStyle = 'Flat'
$btnTest.ForeColor = [System.Drawing.Color]::FromArgb(4, 32, 24)
$pageSql.Controls.Add($btnTest)

$lblSqlStatus = New-Object System.Windows.Forms.Label
$lblSqlStatus.Location = New-Object System.Drawing.Point(8, 272)
$lblSqlStatus.Size = New-Object System.Drawing.Size(570, 24)
$lblSqlStatus.ForeColor = [System.Drawing.Color]::FromArgb(80, 90, 100)
$pageSql.Controls.Add($lblSqlStatus)

$script:sqlOk = $false
$btnTest.Add_Click({
  $lblSqlStatus.Text = 'Testing...'
  $lblSqlStatus.ForeColor = [System.Drawing.Color]::FromArgb(80, 90, 100)
  $form.Refresh()
  $r = Test-Sql -Server $tbServer.Text.Trim() -Database $tbDb.Text.Trim() `
    -User $tbUser.Text.Trim() -Password $tbPass.Text `
    -TrustCert $chkTrust.Checked -WindowsAuth $chkWin.Checked
  if ($r.Ok) {
    $script:sqlOk = $true
    $lblSqlStatus.Text = 'OK - ' + $r.Message
    $lblSqlStatus.ForeColor = [System.Drawing.Color]::FromArgb(16, 120, 80)
  } else {
    $script:sqlOk = $false
    $lblSqlStatus.Text = 'FAILED - ' + $r.Message
    $lblSqlStatus.ForeColor = [System.Drawing.Color]::FromArgb(180, 40, 40)
  }
})

# URL page
$tbUrl = $null
Add-LabeledText $pageUrl 'Public HTTPS URL' 20 $(if($existing['BETTER_AUTH_URL']){$existing['BETTER_AUTH_URL']}else{'https://assure.rpmresources.co.za'}) ([ref]$tbUrl)
$urlHelp = New-Object System.Windows.Forms.Label
$urlHelp.Text = "Used for Better Auth cookies and redirects.`nCaddy (or another reverse proxy) should terminate HTTPS and proxy to 127.0.0.1:8081."
$urlHelp.Location = New-Object System.Drawing.Point(8, 70)
$urlHelp.Size = New-Object System.Drawing.Size(570, 80)
$pageUrl.Controls.Add($urlHelp)

$chkStart = New-Object System.Windows.Forms.CheckBox
$chkStart.Text = 'Start / restart RPM Assure service when finished'
$chkStart.Checked = $true
$chkStart.Location = New-Object System.Drawing.Point(8, 160)
$chkStart.AutoSize = $true
$pageUrl.Controls.Add($chkStart)

# Summary
$lblSummary = New-Object System.Windows.Forms.Label
$lblSummary.Location = New-Object System.Drawing.Point(8, 8)
$lblSummary.Size = New-Object System.Drawing.Size(570, 280)
$pageSummary.Controls.Add($lblSummary)

# Nav buttons
$btnBack = New-Object System.Windows.Forms.Button
$btnBack.Text = 'Back'
$btnBack.Location = New-Object System.Drawing.Point(300, 430)
$btnBack.Size = New-Object System.Drawing.Size(90, 34)

$btnNext = New-Object System.Windows.Forms.Button
$btnNext.Text = 'Next'
$btnNext.Location = New-Object System.Drawing.Point(400, 430)
$btnNext.Size = New-Object System.Drawing.Size(90, 34)
$btnNext.BackColor = [System.Drawing.Color]::FromArgb(27, 184, 166)
$btnNext.FlatStyle = 'Flat'

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text = 'Cancel'
$btnCancel.Location = New-Object System.Drawing.Point(500, 430)
$btnCancel.Size = New-Object System.Drawing.Size(90, 34)

$form.Controls.AddRange(@($btnBack, $btnNext, $btnCancel))

$script:page = 0
$pages = @($pageWelcome, $pageSql, $pageUrl, $pageSummary)
$titles = @(
  'Step 1 of 4 - Welcome',
  'Step 2 of 4 - SQL Server',
  'Step 3 of 4 - Site URL',
  'Step 4 of 4 - Confirm & save'
)

function Show-Page([int]$i) {
  for ($n = 0; $n -lt $pages.Count; $n++) { $pages[$n].Visible = ($n -eq $i) }
  $stepLabel.Text = $titles[$i]
  $btnBack.Enabled = ($i -gt 0)
  if ($i -eq ($pages.Count - 1)) {
    $btnNext.Text = 'Save & Finish'
    $lblSummary.Text = @"
Review settings:

  SQL Server : $($tbServer.Text.Trim())
  Database   : $($tbDb.Text.Trim())
  SQL User   : $(if($chkWin.Checked){'(Windows auth)'}else{$tbUser.Text.Trim()})
  Trust cert : $($chkTrust.Checked)
  Public URL : $($tbUrl.Text.Trim())
  Config     : $(Get-ConfigPath)
  Install    : $(Get-InstallDir)

Click Save & Finish to write configuration$(if($chkStart.Checked){' and restart the service'}else{''}).
"@
  } else {
    $btnNext.Text = 'Next'
  }
}

$btnCancel.Add_Click({ $form.Close() })
$btnBack.Add_Click({
  if ($script:page -gt 0) { $script:page--; Show-Page $script:page }
})
$btnNext.Add_Click({
  if ($script:page -eq 1) {
    if (-not $tbServer.Text.Trim()) {
      [System.Windows.Forms.MessageBox]::Show('Enter SQL Server host.') | Out-Null
      return
    }
    if (-not $script:sqlOk) {
      $ask = [System.Windows.Forms.MessageBox]::Show(
        "SQL connection was not tested successfully.`nContinue anyway-",
        'RPM Assure',
        'YesNo',
        'Warning')
      if ($ask -ne 'Yes') { return }
    }
  }
  if ($script:page -eq 2) {
    if ($tbUrl.Text -notmatch '^https-://') {
      [System.Windows.Forms.MessageBox]::Show('Enter a valid http(s) URL.') | Out-Null
      return
    }
  }
  if ($script:page -lt ($pages.Count - 1)) {
    $script:page++
    Show-Page $script:page
    return
  }
  # Finish
  try {
    $path = Write-Config -Server $tbServer.Text.Trim() -Database $tbDb.Text.Trim() `
      -User $tbUser.Text.Trim() -Password $tbPass.Text `
      -TrustCert $chkTrust.Checked -AppUrl $tbUrl.Text.Trim().TrimEnd('/')
    if ($chkStart.Checked) {
      Restart-AppService
    }
    [System.Windows.Forms.MessageBox]::Show(
      "Configuration saved:`n$path`n`nOpen: $($tbUrl.Text.Trim())/login",
      'RPM Assure',
      'OK',
      'Information') | Out-Null
    $form.Close()
  } catch {
    [System.Windows.Forms.MessageBox]::Show("Save failed:`n$($_.Exception.Message)", 'RPM Assure', 'OK', 'Error') | Out-Null
  }
})

Show-Page 0
[void]$form.ShowDialog()
