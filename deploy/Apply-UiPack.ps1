# Central-only apply: git pack → App + Sql + publish agent zip → restart.
# Customers never run this. Agents pull https://assure.rpmresources.co.za/downloads only.
param(
  [string]$Root = 'C:\RPM-Assure',
  [string]$Pack = 'C:\RPM-Assure\deploy\ui-pack'
)

$ErrorActionPreference = 'Stop'
$git = 'C:\Program Files\Git\cmd\git.exe'
if (-not (Test-Path $git)) { $git = 'git' }

Write-Host '=== RPM Assure UI pack apply + agent publish ==='
if (-not (Test-Path (Join-Path $Pack '.git'))) { throw "Missing git pack $Pack" }

& $git -C $Pack fetch origin main
if ($LASTEXITCODE -ne 0) { throw 'git fetch failed' }
& $git -C $Pack reset --hard origin/main
if ($LASTEXITCODE -ne 0) { throw 'git reset failed' }
$head = (& $git -C $Pack log -1 --oneline | Out-String).Trim()
Write-Host ("HEAD $head")

$appSrc = Join-Path $Pack 'App\src'
if (-not (Test-Path $appSrc)) { $appSrc = Join-Path $Pack 'src' }
robocopy $appSrc (Join-Path $Root 'App\src') /MIR /R:2 /W:2 /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

$sqlFrom = Join-Path $Pack 'sql'
if (-not (Test-Path $sqlFrom)) { $sqlFrom = Join-Path $Pack 'Sql' }
if (Test-Path $sqlFrom) {
  robocopy $sqlFrom (Join-Path $Root 'Sql') /E /XO /R:2 /W:2 /NFL /NDL /NJH /NJS /nc /ns /np `
    /XF *.Config.ps1 Agent.Secrets.bin Agent.Settings.json Freshdesk.Config.ps1 Bitdefender.Config.ps1 Cove.Config.ps1 `
    /XD logs installer | Out-Null
}

$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
if (-not (Test-Path $sqlcmd)) { $sqlcmd = 'sqlcmd' }
foreach ($rel in @(
    'Sql\central\530_Dim_ExternalIdentity.sql',
    'Sql\cove\466_Cove_Gold_Views.sql',
    'Sql\cove\467_Cove_Raw.sql',
    'Sql\rmm\pulseway\468_Rmm_Gold_Views.sql',
    'Sql\bitdefender\469_Epp_Gold_Views.sql',
    'Sql\freshdesk\470_Tickets_Gold.sql'
  )) {
  $sf = Join-Path $Root $rel
  if (-not (Test-Path $sf)) { continue }
  Write-Host ("--- SQL " + $rel + " ---")
  & $sqlcmd -S '.\RPMREPORTS' -d RPMAssure_App -E -C -b -i $sf
  if ($LASTEXITCODE -ne 0) { Write-Host ("WARN " + $rel + " exit=" + $LASTEXITCODE) }
}

$pubFrom = Join-Path $Pack 'deploy\Publish-Agent-Pack.ps1'
$pub = Join-Path $Root 'deploy\Publish-Agent-Pack.ps1'
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy') | Out-Null
if (Test-Path $pubFrom) { Copy-Item -Force $pubFrom $pub }
Copy-Item -Force (Join-Path $Pack 'deploy\Ensure-Caddy-Downloads.ps1') (Join-Path $Root 'deploy\Ensure-Caddy-Downloads.ps1') -EA SilentlyContinue
Copy-Item -Force (Join-Path $Pack 'deploy\Apply-UiPack.ps1') (Join-Path $Root 'deploy\Apply-UiPack.ps1') -EA SilentlyContinue

Write-Host '--- Publish agent pack (HTTPS downloads) ---'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $pub -Root $Root -Pack $Pack
if ($LASTEXITCODE -ne 0) { throw "Publish-Agent-Pack failed: $LASTEXITCODE" }

$dl = Join-Path $Root 'downloads'
$zip = Join-Path $dl 'rpm-assure-agent.zip'
$verF = Join-Path $dl 'VERSION'
$patch = Join-Path $dl 'Collect-Host-Patches.ps1'
$upd = Join-Path $dl 'Update-From-Https.ps1'
if (-not (Test-Path $zip) -or (Get-Item $zip).Length -lt 1000) { throw "downloads zip missing after publish" }
if (-not (Test-Path $patch)) { throw "downloads\Collect-Host-Patches.ps1 missing after publish" }
if (-not (Test-Path $upd)) { throw "downloads\Update-From-Https.ps1 missing after publish" }
$ver = if (Test-Path $verF) { ((Get-Content $verF -Raw) -replace '\s', '') } else { '?' }
Write-Host ("published VERSION=$ver zip=$zip bytes=$((Get-Item $zip).Length)")

try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $live = (New-Object Net.WebClient).DownloadString('https://assure.rpmresources.co.za/downloads/VERSION')
  $live = ($live -replace '\s', '')
  Write-Host ("HTTPS /downloads/VERSION=$live")
  if ($ver -ne '?' -and $live -and $live -ne $ver) {
    Write-Host 'WARN Caddy is serving a stale VERSION — restart RPMAssure-Caddy'
  }
} catch {
  Write-Host ("WARN HTTPS VERSION check " + $_.Exception.Message)
}

Restart-Service RPMAssure-App -Force
$task = Join-Path $Pack 'deploy\Install-Publish-Agent-Pack-Task.ps1'
if (Test-Path $task) {
  try { & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $task } catch { Write-Host ("WARN publish task " + $_.Exception.Message) }
}

$fdInstall = Join-Path $Root 'Sql\freshdesk\Install-Freshdesk-15min.ps1'
if (-not (Test-Path $fdInstall)) { $fdInstall = Join-Path $Pack 'sql\freshdesk\Install-Freshdesk-15min.ps1' }
if (-not (Test-Path $fdInstall)) { $fdInstall = Join-Path $Pack 'Sql\freshdesk\Install-Freshdesk-15min.ps1' }
if (Test-Path $fdInstall) {
  Write-Host '--- Freshdesk collect every 1 minute ---'
  try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $fdInstall -Root $Root -Minutes 1
  } catch {
    Write-Host ("WARN Freshdesk 1-min task " + $_.Exception.Message)
  }
}

Write-Host '=== apply done — agents pull /downloads on next cycle (VERSION mismatch) ==='
Write-Host $head
