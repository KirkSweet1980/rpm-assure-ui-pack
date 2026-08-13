# Recover after MSI expand rollback / complete install manually
# Run as Administrator
$ErrorActionPreference = 'Stop'
Write-Host '=== RPM Assure post-MSI recovery ===' -ForegroundColor Cyan

$pf = 'C:\Program Files\RPM Resources\RPM Assure'
$msi = 'C:\RPM-Assure\installer\dist\RPMAssure-1.0.0.msi'
$srcZip = 'C:\RPM-Assure\installer\payload\payload.zip'
$logDir = Join-Path $env:ProgramData 'RPM Resources\RPM Assure\logs'
$cfgDir = Join-Path $env:ProgramData 'RPM Resources\RPM Assure\config'
New-Item -ItemType Directory -Force -Path $logDir, $cfgDir | Out-Null

# 1) If Program Files incomplete, re-copy from build payload or re-run expand
function Ensure-Tree {
  $marker = Join-Path $pf 'app\.output\server\index.mjs'
  if (Test-Path $marker) {
    Write-Host "App present: $marker" -ForegroundColor Green
    return
  }
  Write-Host 'App payload missing - expanding...' -ForegroundColor Yellow
  New-Item -ItemType Directory -Force -Path $pf | Out-Null

  $zip = Join-Path $pf 'payload.zip'
  if (-not (Test-Path $zip)) {
    if (Test-Path $srcZip) {
      Copy-Item $srcZip $zip -Force
    } elseif (Test-Path $msi) {
      Write-Host 'Re-run MSI first, or ensure payload.zip exists' -ForegroundColor Yellow
    }
  }
  if (-not (Test-Path $zip) -and (Test-Path $srcZip)) {
    # expand directly from installer payload into Program Files
    $zip = $srcZip
  }
  if (-not (Test-Path $zip)) { throw "No payload.zip found at $pf or $srcZip" }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $tmp = Join-Path $env:TEMP ('rpma_rec_' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $tmp)
  foreach ($child in Get-ChildItem $tmp) {
    $dest = Join-Path $pf $child.Name
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force -EA SilentlyContinue }
    Copy-Item $child.FullName $dest -Recurse -Force
    Write-Host "  + $($child.Name)"
  }
  Remove-Item $tmp -Recurse -Force -EA SilentlyContinue

  # copy wizard/service scripts from installer project if better
  foreach ($sub in @('wizard','service','winsw')) {
    $s = Join-Path 'C:\RPM-Assure\installer' $sub
    if (Test-Path $s) {
      New-Item -ItemType Directory -Force -Path (Join-Path $pf $sub) | Out-Null
      Copy-Item (Join-Path $s '*') (Join-Path $pf $sub) -Recurse -Force -EA SilentlyContinue
    }
  }

  if (-not (Test-Path $marker)) { throw "Still missing $marker" }
  Write-Host 'Expand OK' -ForegroundColor Green
}

# Write fixed expand/start scripts into Program Files
function Write-FixedScripts {
  $svc = Join-Path $pf 'service'
  New-Item -ItemType Directory -Force -Path $svc | Out-Null

  $b64 = @'
H4sIAO0ze2oC/6VW72/iRhD97r9iRKyzUc/WpZ8qqqSihFzpJYCANlVDFLn2QLa39rredYCm/O+d/QGYXHJV1EiJYu
/sm9k37826TKokDz2AW6kqVizv/EEhVcL5BavgDILAa3t+v6pE1U0VE8W4wgVWWKSoV3uiUKyoMfB8LpZ2y8+CFdE4
UQ/gY/HYGVdiSSkuEpVAMBlfwwSlqKsU5Vw/daWsK5zTbhl4Q1xFA4U5mL+zTYlAmJgqUW0guhS0Cxy0S/cPjGoVDW
vOTQXH6V1MgOsyKbKoTDZcJFlMrwPPW9SFORBciWW4P3zehiciw+es0Ads3T596NTbO3g63bYgWkD4EVVEZ8H2e/Bz
iuxmWaRZwEI1SoPo14TX6HCifpGKjPDhl9nld7TppmIKo5+EVDbC23qeoiPq1IySRIWglUMjbFF2zR9Pp2nFSjURFB
TliUofIJBYPbIU/WAXCnDcyGnJmXIFHiOME2qnMpu2gFziKwhBrzN3zYRLxl3/XupmYME8+0v8QuuAdNZAbXma679Z
edy3Rtpg1zQK0rB+nlSfsXo9PinLeSxqVdZqrknBas6KDNdx/icJrMlvOEO5Y4TQ202SG0s24YFWfZxgbKuChFeYZB
uwCsMMQldfWaEkVtuB24VrpuDDnhfHSn8yGU0gZ1JqcegqWt4++tTwtyOwbzLswiA6hyMerRCNYyJqAuZ/8M0wyRGm
G0lWigejuCdyXZUkzce6f3ZFc6ry8kvfzvrXYwiDqsyTe9eE+wC+gdtlzbK7Toe8+pH+C9vxTEyNe8JgGLTbBPgGG+
vUDQ8D7GxAA+nl0n9npa6eKuivVZWkaib24KHm5r1BbRuMhaD+kD9CP31gPANWgDZwTz+YCk3oQfAZ9f1VbVmMWNPa
0EKrJ8oN+GFjtW3ao7FaLvCZpvTSISvACWQCtCYz5KgQGqKHFcEirBCkYpxDgaQypr4H+ZkWTbwWhY5kSiJf7EHNsD
gUBRH+dWwnqgBSN8CdKvXPBHPxiLaBlpBogmld0WDY9a5xH8CUyisU3+yuAoezw9PsOCxbyyX12dTzIvZhcsCCFUT8
Tg1HVWnVvLWo7avmdw7fNaThzGShyMvW3Aeb2vgvnPpsNOxHwuiTmTsnMLUzmkRoJAVMwmg8G4yG3SuI9vA3rJjeQF
4TN8PRDBYJ43A9HWifrmjn6vXR5+4APYjtHI66ZRnj2sxj32WdPqb/jeDeRa7iuJSngWOvSZyph8Su2Wm+P6Q6IjVw
sIdTunxxHNs5eTA/wDsoxQor+YCc60NANBR0/Sy0G6L+mppvPkcEZ+kGftyUiZQkBb3aPOr5ub2Pvz1/d9o07bMTmj
6e+Vfd6az/22DWG130W+5GTM0F+/S1zVIsVKQb1dFz4D7ur1MsdXXxNQ2tZIntVkPXjSvWsGKp0KJ0lwaJQZu71DzJ
Z5oJR5/MnbK1kjKzh6Y1kC1KTp8lwAUVTKl1y9PF//kko9GwYMvgbfPcpTwa6eaUF6JAdwtqSHcfNuk11F52Z92rr9
J44gahRfgBhoL4chbVPaDSQT6ImtvHGEYFDZE9j9J0K/b21t16/wLKHth5AwsAAA==
'@
  $gz = [Convert]::FromBase64String(($b64 -replace '\s',''))
  $msIn = New-Object IO.MemoryStream(,$gz)
  $gzs = New-Object IO.Compression.GZipStream($msIn, [IO.Compression.CompressionMode]::Decompress)
  $msOut = New-Object IO.MemoryStream
  $gzs.CopyTo($msOut); $gzs.Close()
  [IO.File]::WriteAllBytes((Join-Path $svc 'Expand-Payload.ps1'), $msOut.ToArray())
  Write-Host 'WROTE service\Expand-Payload.ps1'

  $b64 = @'
H4sIAO0ze2oC/1WQTUvEMBCG7/kVw1pMe2jxLHgoIrhCoVih59DO7g52MyEZyy7ifzcxq7iXwJs8z3zkBrY2iFkWeO
27NoQPj3XrHKxkYCQ7jFCyE2JrlkoVT96zb6eUe4879GgnhAfQg7DTqjjEmxgHt5DUvZEDxDNCAkV33tqVJ5Pcpjs/
8vFo7NwkSBV4StoLk81WLqSvRmoipBXtoKwtC5RvGC49kl5V8KkARk+C9TMHgU1HIZDdX9aIzP0PCWV4J1dtIo0nEr
hTX+o2v1D+it8Ygxf1r+T1QBDQrzT9aThD3ChbOGv1DbPS9YRbAQAA
'@
  $gz = [Convert]::FromBase64String(($b64 -replace '\s',''))
  $msIn = New-Object IO.MemoryStream(,$gz)
  $gzs = New-Object IO.Compression.GZipStream($msIn, [IO.Compression.CompressionMode]::Decompress)
  $msOut = New-Object IO.MemoryStream
  $gzs.CopyTo($msOut); $gzs.Close()
  [IO.File]::WriteAllBytes((Join-Path $svc 'Install-Service.ps1'), $msOut.ToArray())
  Write-Host 'WROTE service\Install-Service.ps1'

  $b64 = @'
H4sIAO0ze2oC/51UUU/jMAx+76+wxkQ36VI4nhASSNOAY6djm+ikvUyC0npboE16aTqoOP772Wk3Npju4VSpShz78x
f7c9pXxmjTi63UamxwjgZVjHAOfl8rK1WJvtdekpVMYZ5KK8aRXQL9ydFC+7YaqJWOI44Pbqu+zrJIJQE7eW2jtd2N
q6GaaK+Nr4z7U0u1fezfjW97RVEaFL08D8iJOMTzxa4rqtXZ2OiFibLLyEYuCu6w0KWJsZjxrgaZxVrN5WIWMZZaER
atdrEcUZ/MdJjqRfG/mTjW94b4IgYWM3D/SZUjXEqDsdWmAnGtKQoaaJfsD4xKK4ZlmnqenEOnM8FiXS+6dhcElRS2
rcS024U3D6Cv86pO5irU2aLNt/T5xkFKDUr9bpPbe6/TbOFRiWu4Q7eGwkbGwslFWzEpgJD3IkwRczjh+HaxiqlIP5
CsaFaSbzSMss+980Fc9SCUKXU7rdaKctkdgrsYrwLKYMsCBP4miFIpqRZ+TWlqpEVxowvq0DqXaTzoGF+lhWPmdADX
UZo+RvHzWXMBpRMUBcWggcR1IK2gozRMpQqnXa/NDvuUQPhWZjjjc/drREjXoBbul84s0KXNSzurE86kSvA1yJ5IEH
xfochvu+YMy02ENYsOV7MZIEd9b/G6Qeh0B+9ftOIQv4rFkW7kckCV0TlEqrJLKiBoBafHp9/phC/GHuCaOkQ76Y8p
p0L3NID4xRoaa6oqB4DghiH8koVFtZcoyZrkdhXFSzF6fCKYBh7Atf8+GL1wD2mwaIio8wtqI5cjJIJiYx2QPr64Ni
O0L+m7y8H/d6BXKV7CG2/qGR7dTfhl4wv4a+NwMLkb3e89uhmFzngcuM/ZC5tQm3cl4IaYJSDqU5q3xdoZjfmHM51u
nOMsIc9WnMBRAg8tHt+HFhweQoEWmN85k2v2H6y3rUz4vGFLJgJhSRAKrZwKaHlxwbuaKG1PNnvi8tBqbYZ9XWyixe
IH0TOLMiMUbjn4R7H/reYspto8U3c+njj38giasUS/hLZKEW5kkqD6PMycB5OdKZ03E7wW5s6Ebwf3dZlyqG1GnVNu
JhvqCaqHKI+qVEdJ1/caoL8v7vks8wYAAA==
'@
  $gz = [Convert]::FromBase64String(($b64 -replace '\s',''))
  $msIn = New-Object IO.MemoryStream(,$gz)
  $gzs = New-Object IO.Compression.GZipStream($msIn, [IO.Compression.CompressionMode]::Decompress)
  $msOut = New-Object IO.MemoryStream
  $gzs.CopyTo($msOut); $gzs.Close()
  [IO.File]::WriteAllBytes((Join-Path $svc 'Start-Service.ps1'), $msOut.ToArray())
  Write-Host 'WROTE service\Start-Service.ps1'

}

Ensure-Tree
Write-FixedScripts

# 2) Config wizard if no app.env
$envFile = Join-Path $cfgDir 'app.env'
if (-not (Test-Path $envFile)) {
  Write-Host 'Launching configuration wizard...' -ForegroundColor Cyan
  $wiz = Join-Path $pf 'wizard\RpmAssure-ConfigWizard.ps1'
  if (-not (Test-Path $wiz)) {
    $wiz = 'C:\RPM-Assure\installer\wizard\RpmAssure-ConfigWizard.ps1'
  }
  if (Test-Path $wiz) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $wiz -InstallDir $pf
  } else {
    Write-Host 'Wizard missing - writing default app.env from C:\\RPM-Assure\\App\\.env.local if any' -ForegroundColor Yellow
    $src = 'C:\RPM-Assure\App\.env.local'
    if (Test-Path $src) {
      Copy-Item $src $envFile -Force
      Copy-Item $src (Join-Path $pf 'app\.env.local') -Force -EA SilentlyContinue
    }
  }
} else {
  Write-Host "Config exists: $envFile" -ForegroundColor Green
  Copy-Item $envFile (Join-Path $pf 'app\.env.local') -Force -EA SilentlyContinue
}

# 3) Start app
Write-Host 'Starting app...' -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $pf 'service\Start-Service.ps1')

Start-Sleep 4
$ok = $false
try {
  $r = Invoke-WebRequest 'http://127.0.0.1:8081/login' -UseBasicParsing -TimeoutSec 10
  if ($r.StatusCode -eq 200) { $ok = $true; Write-Host "HEALTHY status=200" -ForegroundColor Green }
} catch {
  Write-Host "Health check: $($_.Exception.Message)" -ForegroundColor Yellow
  Write-Host "Check logs: $logDir" -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Program Files:' $pf
Write-Host 'Config:       ' $envFile
Write-Host 'Logs:         ' $logDir
if ($ok) {
  Write-Host 'Open http://127.0.0.1:8081/login' -ForegroundColor Green
} else {
  Write-Host 'If still down, paste last 40 lines of:' -ForegroundColor Yellow
  Write-Host "  $logDir\app-stderr.log"
  Write-Host "  $logDir\expand-payload.log"
}
Write-Host '=== Done ==='
