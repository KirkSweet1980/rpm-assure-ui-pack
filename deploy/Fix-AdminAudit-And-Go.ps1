# Fix missing admin-audit.ts + continue production build
$ErrorActionPreference = 'Stop'
Write-Host '=== Fix admin-audit + Go Production ===' -ForegroundColor Cyan
$App = 'C:\RPM-Assure\App'
$dest = Join-Path $App 'src\lib\settings\admin-audit.ts'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null

$gzB64 = @'
H4sIAA8be2oC/5VU227aQBB95yumfqjslJioTxU0QalKpFQ0qYSiVkqiamuPYYO9a+0uISjhtR/QT+yXdHbXNoaSXvyA2bntmTNn
3Ds46MABjPl0ZpZof4GlBRfAFik3kMsphB8mlxdjkGQrS5hJbaLY5nyeSUh5CssZM0AZEzSGi6mGn99/wJVGpaEHZc5MJlUBLDFc
Cm0zex1elFIZyDRkShYQCJliP9PBoPaUzMzaPnsmbwcfnNusSoRTi/PUwhwJo1ZwDI8dAGauTNIHbRRhGVhDYqQaFYznO1aC07YY
pqZohm1TiobStkxy3odvUubIxKCzJkQJNWXg7Hw8IgCB4+7QcRffaSlyAu0jPp5++To+vxhNKOz10dERpWYL4VB4rj9Ri2FU3+V6
UWgWSjgy4jvJRVgqmaDWcbJMw6gLQcoMC7ru9ojgNPxsKpclinTDVIiWqj5cFty83SGQ6jnyghN4CY+eyKZ3WBO0e0njtsAs3fYN
4JtLuaK2/oIzGriMTMfFnBImK5GE9O7SXQqThdL8HvtUeoF02aBVXcll/5lp26eauOssdgcYDkHgEt4zg2EUG3k+uZy4NghNndWS
RZXaWODpCYKFmAu5FEErwSmmCaZT7fPaqX3+VPu8iGqfP9U+qyZvl3NvWzck+dGd8RwdUy2NdMFuZOwHw7NVSARF8AqCG0JLwE32
xpO9hoSZZAYhRq1xkXjjJVMiDK5bcr2ttAIZ4cOUCqGvsU9WCllbVDknOXldR79N6vp2r2RKim/15NvmGYQvqHd84Npo13cZRfUe
XN+2VWHwwd5J0RZNw1O5xUAdnHOBmqJtUqzLnED3btTwRvSiOOO5QRW+81tdpfV6MEcsgZzoP0RTYtkuAn3N8B5Vg9eVjnMUU/pk
nWz2PGoEWuFVvCgwJRA+Q+c8wfBwEz+owqmjpeIG2y1VyX677Jz3zts+FVdVQmUEqK9zo4o25oKVYZhHcHzSwHWCbqZVP1Vdp7yS
KY02i+ndaQ9aSbX89hYSizzfCm7+r1vwdmazcbgZEIh9GGqd+JLVfY70zh/I2E/FLhH/TcM+EvZSUBPQtP9M8//Q+vadW9tj1/kX
XcVzB/QHAAA=
'@
$gz = [Convert]::FromBase64String(($gzB64 -replace '\s',''))
$msIn = New-Object IO.MemoryStream(,$gz)
$gzs = New-Object IO.Compression.GZipStream($msIn, [IO.Compression.CompressionMode]::Decompress)
$msOut = New-Object IO.MemoryStream
$gzs.CopyTo($msOut); $gzs.Close()
$bytes = $msOut.ToArray()
$txt = [Text.Encoding]::UTF8.GetString($bytes)
if ($txt -notlike '*appendAdminAudit*') { throw 'bad payload' }
[IO.File]::WriteAllBytes($dest, $bytes)
Write-Host "WROTE $dest ($($bytes.Length) bytes)" -ForegroundColor Green

# Also strip BOM on package.json if any
$pkg = Join-Path $App 'package.json'
if (Test-Path $pkg) {
  $b = [IO.File]::ReadAllBytes($pkg)
  if ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) {
    [IO.File]::WriteAllBytes($pkg, $b[3..($b.Length-1)])
    Write-Host 'Stripped package.json BOM' -ForegroundColor Yellow
  }
}

# Prove module resolves
Push-Location $App
try {
  node -e "const fs=require('fs'); const p='src/lib/settings/admin-audit.ts'; if(!fs.existsSync(p)) process.exit(1); console.log('admin-audit present', fs.statSync(p).size)"
} finally { Pop-Location }

$go = 'C:\RPM-Assure\deploy\Go-Production.ps1'
if (Test-Path $go) {
  Write-Host 'Running Go-Production.ps1 ...' -ForegroundColor Cyan
  powershell -NoProfile -ExecutionPolicy Bypass -File $go
} else {
  Write-Host 'Go-Production missing - building manually' -ForegroundColor Yellow
  Push-Location $App
  try {
    npm.cmd run build:node
    if ($LASTEXITCODE -ne 0) { throw 'build:node failed' }
  } finally { Pop-Location }
}
