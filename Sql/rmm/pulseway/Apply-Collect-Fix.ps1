# Copy the NEW collect script (Flatten-PwItems) then run it.
#   powershell -NoProfile -ExecutionPolicy Bypass -File C:\RPM-Assure\Sql\rmm\pulseway\Apply-Collect-Fix.ps1
$ErrorActionPreference = 'Stop'
$git = 'C:\Program Files\Git\cmd\git.exe'
$dest = 'C:\RPM-Assure\Sql\rmm\pulseway'
$tmp = 'C:\RPM-Assure\deploy\pw-fix-' + (Get-Date -Format 'HHmmss')
New-Item -ItemType Directory -Force -Path $dest, 'C:\RPM-Assure\deploy' | Out-Null
& $git -c core.longpaths=true clone --depth 1 --branch main https://github.com/KirkSweet1980/rpm-assure-ui-pack.git $tmp
if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }
$hits = @(Get-ChildItem -LiteralPath $tmp -Recurse -Filter 'Collect-Pulseway-To-RPMAssure.ps1' -File)
$src = $null
foreach ($f in $hits) {
  $t = Get-Content -LiteralPath $f.FullName -Raw
  if ($t -match 'Flatten-PwItems') { $src = $f.FullName; break }
}
if (-not $src) { throw 'Clone has no Collect script with Flatten-PwItems. Git still has the old file.' }
Copy-Item -LiteralPath $src -Destination (Join-Path $dest 'Collect-Pulseway-To-RPMAssure.ps1') -Force
$diagHits = @(Get-ChildItem -LiteralPath $tmp -Recurse -Filter 'Diagnose-Sirf-Rmm.ps1' -File)
if ($diagHits.Count) { Copy-Item -LiteralPath $diagHits[0].FullName -Destination (Join-Path $dest 'Diagnose-Sirf-Rmm.ps1') -Force }
$live = Join-Path $dest 'Collect-Pulseway-To-RPMAssure.ps1'
$check = Get-Content -LiteralPath $live -Raw
if ($check -notmatch 'Flatten-PwItems') { throw 'Copy landed the OLD collect script. Stop.' }
Write-Host ('Using ' + $src)
Write-Host 'PROOF Flatten-PwItems=YES'
powershell -NoProfile -ExecutionPolicy Bypass -File $live
