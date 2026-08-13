# Fix WIX0103 missing files + bind path + rebuild MSI
# File: Fix-Wix-BindPaths-And-Build.ps1
$ErrorActionPreference = 'Stop'
Write-Host '=== Fix bind paths + ensure sources + build ===' -ForegroundColor Cyan
$Root = 'C:\RPM-Assure\installer'
$App = 'C:\RPM-Assure\App'
$Dl = Join-Path $env:USERPROFILE 'Downloads'

function Expand-GzB64([string]$b64) {
  $gz = [Convert]::FromBase64String(($b64 -replace '\s',''))
  $msIn = New-Object IO.MemoryStream(,$gz)
  $gzs = New-Object IO.Compression.GZipStream($msIn, [IO.Compression.CompressionMode]::Decompress)
  $msOut = New-Object IO.MemoryStream
  $gzs.CopyTo($msOut); $gzs.Close()
  return $msOut.ToArray()
}

# Prefer refreshing full tree from latest zip if present
$zip = Get-ChildItem $Dl -Filter 'RPMAssure-Windows-Installer*.zip' -EA SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($zip) {
  Write-Host "Refreshing installer tree from $($zip.Name) ..." -ForegroundColor Cyan
  $tmp = Join-Path $env:TEMP ('rpma_full_' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::ExtractToDirectory($zip.FullName, $tmp)
  $src = Join-Path $tmp 'installer'
  if (-not (Test-Path $src)) {
    $hit = Get-ChildItem $tmp -Recurse -Filter 'VERSION.txt' -EA SilentlyContinue | Select-Object -First 1
    if ($hit) { $src = Split-Path $hit.FullName -Parent }
  }
  if (Test-Path $src) {
    if (Test-Path $Root) { Remove-Item $Root -Recurse -Force }
    Copy-Item $src $Root -Recurse -Force
    Write-Host "Tree -> $Root" -ForegroundColor Green
  }
}

if (-not (Test-Path $Root)) { New-Item -ItemType Directory -Force -Path $Root | Out-Null }
$WixDir = Join-Path $Root 'wix'
New-Item -ItemType Directory -Force -Path $WixDir | Out-Null

$WXS_Package_wxs = @'
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
+RRs7t/8BePGMQtvHQAA
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Package.wxs'), (Expand-GzB64 $WXS_Package_wxs))
Write-Host 'WROTE wix\Package.wxs'
$WXS_Service_wxs = @'
H4sIAI0ve2oC/1WRX2+CMBTF3/0UzX3Hiv9dQKMobnEuhi3bw7YsDV6xGVDSFoFvv8oM6uO55/SXe0+dWZnE5IRScZ
G6YLc7QDANxZ6nkQu5PlhjmE1bzgcviUmmyoWj1tkDpQUvtRCxQt0WMqIqPGLCFD31aVEqmLYIcXzJogRTfRZGeiLJ
RGr0Woo8I097F15RnniIjaOALLnEUAtZNa6ZwD/iFlK/95Ls55LaMvmLEsg658aw7W631+v3rcFgOLRGo/HYmkzmc2
ux8LzlcrXy/Y7dQM9YiUyjL+I9SkJvjAAjrrSs3lmcIwmE0C48bp63QDZ4XlEcdMEkfgW7LQlQiVyGqGo1VyqXCOSF
JXh3C3mrMjMxVFMykJrswuc18V3Dd0wfXajQdNIs5NDm/kup9L7Vund6Ld6h5uemrT+jNBYe5wEAAA==
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Service.wxs'), (Expand-GzB64 $WXS_Service_wxs))
Write-Host 'WROTE wix\Service.wxs'
$WXS_Shortcuts_wxs = @'
H4sIAI0ve2oC/5VUTVPbMBC98ys0utAebBMIAToxTMgHZQiQ2tAcCMOo9sbR1NZqJDmJ+fWVbQgxnaHFt12vnt6+p9
3u2TpLyRKU5ih82nL3KAERYcxF4tPczJ1jena6053yNbGVQvt0YYz85nkrvjaIqQbjoko8HS0gY9pbtr3VWtPTHUK6
I8WSDIQpAxv2MZMobHyhMJfkMvZpuEBlotxsfmlKBlxBZFAVPu1JmfKIGcttojBRLNMjTGNQtIbcBq3w+pl8Cg1T5h
pETslFzm2y1zs/7/cHA2c4HI2cvb1Wy9nfPzhw2u3Dw07n6Oj4+ORkA2ghX0ltMuW3zfapj2LOE9oouGEZ+DSYXJOe
1rkCUhflqqLfrB2AjhSXptI8/DEmTMREcwMk2j5EVvyZqbh59o6pBIxPH8JCG8g67VqRxykXMa70BFegwgWk6Wxp3Z
zJMtZl7MIamlA9leSlP9rfdW7QKjznKRBnuAbbZKk5WvULcl5IpjVxRuVf+nB5E971xuPR7XgwDB5rirNAZnXbTt32
tEq7UrcocS6FNixNrbF/Hae7DUZTVL/ty9t6Ao1ySrxP+XQrQYRW1n849QVtXaX/1w98KsGIzH9ZTWqv7oPx/1kTZf
FH4lPPApaPlpSjpe1ssYqXq2SmQGOuItBuhO4z81JM+LvH9CnNAshwCTWvSqs6YQft3YCRW9tyLnht3XuQhGujip8s
zYEEiLbn71f9e0quwF4f4tysmIJZKXHw2sDsTXD6YsHWpN4V0ia4MJCUl1fIdh1ViBNmFj4tQG+x6HqbwX/ZLl5zvV
QLyHvbQF3PrrDTnT/Wdft18AQAAA==
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Shortcuts.wxs'), (Expand-GzB64 $WXS_Shortcuts_wxs))
Write-Host 'WROTE wix\Shortcuts.wxs'
$WXS_Registry_wxs = @'
H4sIAI0ve2oC/42STVPCMBCG7/yKzI4HPZSAIh9Og4OFqiMgUxw9qOPUspTMtE0nSaH998byIRxQj+/mzZPs7mtf53
FEligVFwmDerUGBJNAzHgSMsj03GrDdbdiv/CcGGeiGCy0Tq8oXfFcCxEp1FUhQ6qCBca+ossGXeUKuhVCbFf6YYyJ
/hZGOiJORWL0rRRZSu5nDDwMudKy2B0pIH0uMdBCFgzux9On3nDoPg77Aw/WmH1QyXDi9GPLAXKbcVPrdNrtVqvZtC
4vGw3r4uL83KrXazXLdQeDft9xbm56vR3PELf3H7AgnhCawd3DcATEaAZTMdcrX+KbNxkRD5XIZICqVD2lMol7pD3W
sx9lSMZ+jKaRRGk/ikxrQJ6K1FSMw4wYSOli8HrQ6nv58sTXCwYFmpnQP194Xq/wCP7kdOnL6kSKWRbojfXsP1hHJH
Me/vLvtcEV0Qzl+3+Ik+wz4mqBx4gHQz4A2nRvTbsw0F0aNjGjhzkrk0h/omhTk+Vu5QtXONy8+QIAAA==
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Registry.wxs'), (Expand-GzB64 $WXS_Registry_wxs))
Write-Host 'WROTE wix\Registry.wxs'
$WXS_Payload_wxs = @'
H4sIAI0ve2oC/1WQW2vCMBzF3/spwv+9pvWyudEo2ovIxMkcDMZghJrZQNOUJNV2n369UedTcs4JP06OtyxFii5MaS
4zAu7IAcSyWJ54diZQmB97DsuF5X3wEtUvM00gMSZ/xvjKSyNlqpkZSXXGOk6YoBpfpvhaalhYCHmRomfBMtOIWvpS
5DKr9UbJIkfbE4EDrVJJT0OiAQVcsdhIVRHY7o/vq90uet0F4Rt0lP+cFuGL/LvHfPIc0Kbgteus3PXYnwT2NJxF9s
Pj/Mlerf3ADiPHHU+ms8YZiE1VnrIW11zueEdZqJgRyDvvqz9Hv024p+IWddYLqw7UJAQqVv8GD63xULufA9/v0S6G
b5N5uN58Yf0BOPKUH6EBAAA=
'@
[IO.File]::WriteAllBytes((Join-Path $WixDir 'Payload.wxs'), (Expand-GzB64 $WXS_Payload_wxs))
Write-Host 'WROTE wix\Payload.wxs'
$F_payload_README_txt = @'
H4sIAI0ve2oC/32QT2vDMAzF7/4UOm6MBHbdn0PZLoN1hLbQiy9KrLXeXMtITtt8+zkJhTLGdHogfu89adUsYaHaC4
GPmjEEEkg4BEZnnv8ZYzZ7r/DJwRViVL6wDtoBtBOfstpGKKFQ1cx2ddJ7aOmTS9Zy/QZt74N7MAYuebZIAEzJwu95
qiAJu77LnuNMwk3NfU59hrti0H3jjsYOpLeTjfQx+wPZyI7stQ1LxjYQfJRF/aXwvllPgJIcfUdzCYBVs5z/Ui1Squ
lME731cb0FoYiHcutJSlmSicjMQW2Hzg32ujansTIGeBlX0PqIMhjzyhA5wx6jq8j5UcmRNBfXy7tOZ30sUTuKJJgJ
jh7hj5fW5gcrbwEjxAEAAA==
'@
$dest = Join-Path $Root 'payload\README.txt'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_payload_README_txt))
Write-Host 'WROTE payload/README.txt'
$F_resources_app_env_example = @'
H4sIAI0ve2oC/42RwU4CMRCG732KSbhooosED4akh4VthARYbLt62aQpuwWaLNvadjH49BaIUTmZXmbmn/nmb9sDul
pA6n3nFFhn6q4K2rRQmXajt52Tpwz1YG6qcwg3uvVBNo2qb0cwGZUrZ7ZO7jMZZHlCUeVN5yrlyx9weaGV0tpEtYeI
4zsFb7qtzYcHr9xBVwoaI2sPYac9bHSjYK02JpqK21zQ7TYqCk4EhCJZpIwVlIgs5alY5BnBsgvmt8Je5oIR+kooPk
ZH9/69ud8ZH+4Gj8Ph8LrzxBmnjOBYv5gWqbXXXUUEYmr3ojLxBapwra9i/JbTDF8LnBaMiwmhHAfXKYReZ5yItOBT
QZbpeE6yS31MOCf0IhR0jnchWD/q9+XZUuLs3n2/b1KZ5FP+mThvIZnI6ex5tmT/mO7Bs2pV/GVVw/oIH/pTuhr0Bt
TehuMo6r/5jEwo4RihVR4v8vTwNEDLGae5+MmnOeP4ITkf9AUgh0jTXQIAAA==
'@
$dest = Join-Path $Root 'resources\app.env.example'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_resources_app_env_example))
Write-Host 'WROTE resources/app.env.example'
$F_winsw_RPMAssure_App_xml = @'
H4sIAI0ve2oC/41UYWvbQAz93l+hGQLbB8dJYZCx64G3dnSwNiHO6BdDuPiU5FbbZ+7OadNfP8lJ63QdbASCrfeepE
hPEe/iGO5Mnd2BR7czBYLGtalNMLaGtXUwn91A6n3rEBpndVt0SG01xqxAB3Esz8RRLc8AhNGSVAdRnDaNSCjCQK0q
lCcJCStNoTijSDqQWRp94UzDUfn36g+4AtVr4X1pfMDaAz1PRpPxZ/iqtN7D2tk6eLheLGbZB5GcJuZC+IhFG9SqRD
n4kmZXg3w4zF1bB1Nhzr+w+xoSTSQnXJYqt2krpOQy6qXUUj60bWjakB9mk5ta4+Ow+uUjkfQazvBg3b2pN9o4LIJ1
e/kqj0je4Cwq7QYq6ukicrYs49U+9uYJI8YI5efF1qHf2lLLyfjTuUhexw68e8TmmynRy4lI+hcukFCF50qNCls5mD
m7caq6VEENcl7HHL1tXYE+75eTE9134k7ECWy9VqbkxaluadQy+qBciMhhpdpfROMRea6Ikv+kn5/SCcRwVMgxbKkj
kbwKMqtxxjoT9vLWukqVInkJMOqDbXjVtDE5/sjJaVwnsc4i9Q7YmBfRbDpfRLBTZUsvbLJjJz3j9vtiPl3+m3c9zX
rGaNh93pBotss0y37Or5aX6SJd3kwvr15Eqg32qOD7/WGV5vYdktnJ8xWcLA12RsGDI0/RqXYThcMVgFlDjahRdxfc
DYRQtpdMqUBFt9VN5Dl4uE3aBWrGMwZkcC3yZf0RPiPh8z/Cb0gcwfVkBAAA
'@
$dest = Join-Path $Root 'winsw\RPMAssure-App.xml'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_winsw_RPMAssure_App_xml))
Write-Host 'WROTE winsw/RPMAssure-App.xml'
$F_wizard_RpmAssure_ConfigWizard_ps1 = @'
H4sIAI0ve2oC/607/VfbuLK/56/QoTlr+zV2k0AppY93yke65S2F3Di0Zw9wqZMoxBfHzvoDyHL539/MSLLlJEDc+3
ZPgUgzo5nRfGmkvOnxvzI/5gmzv/M48aOQvXdatf9+U3PcP0/Puu6xW2Os1/3G9pMkizkbRuHYv8liL0XYe/9vLx4x
0/3HCXvLZtkg8IfsvIcf7mM/5cybzRwe3llOzTnquIe9427/+OwUSHYnXsJZm/lhknpBwGN2fuywXhYyHvA7L+UjFv
NhNJ3ycMRHDuvi4j/8cBTdJ+xLFE8Tp/bmf2ozL/amJtC7SNLYD2+u6seC4JEfsz1mGA2au/fT4eSq3uOKfV6zarV6
J46jeH+IonRjPuYxD4cc0dw0mhm1/dHI7s9nnNkgPJ8OgvmpN+XMnScpnzqSGYeYeQX2KPbugbvaxSpcZ382A72RRq
92dzuhNwj4dz/JvMBN5wFPTOB1nIXEJ/udp7Ym4yPI54+ZqctteyHsSZ8nqd310gnT5iyLPYJi0ywO9WH2BGTqMb9B
4b/+cfJt99KNxum9F/NL3PweT6IsHvLksjAFQ66srQMELOIIiN0BKZOYBYG7cTTjcToXa9idfeb6AQ/TYH4YhakfZt
xyCm6IAAl1tyzLXUmEO+KcuB/xsZcFKUpwuHsJK96AabAvsE5SRQZJRl9EUcZlFsZqTwtbc0gGRqRQEf8b+aEkDG6w
K7k68lKPGc8xdSmM9FL6jlFao8e9kd0J71AuMzf6GawgNF+fejNQwefHJymaHUZpSUCC1cVDDISW7KewLwKK/Rs9re
MNJ/bZ4F98mMq9pa25ZvbUA69ixj8vk/96YzA7ihmOwnpyYs/QlnkSZuEDc/Vr2OwRfzgbmwgjJm7FhJsNhFBmswHQ
ltOP/alpFTZVggFyb1lLzoIcF/XbK4S5k0ahiVjS4im/t/ezdOLyIYAIxQ3mKYTBPZqT4uLQxRXbbGMQka4LKBmEtr
lzGM9nKW7nbDJ3emCm0fQ0mw54/DsPOcTHKAZnPow5xDLTckC5B7iAKdaxCubMiwM/Bb3fgYNwxOlHrpROgDI75rPA
g8hk2EbDMEAn0Ul0z+Pj8M6LfS9MQT+6dLTZ7l8BySUiZN3lMSzQqKPpDSD0NurnCX7ueklyH8WjRr0fZ0l6CEw06j
I8oYaQ0XoyjP0ZepZmzl3XpdFeBPZlqCVBjpATF84saRnP2aAgaKlg8QbSQOCHnI0hAAy84S2NpvFczgMLw2RQ3hsV
WUEeBxcOfLBbp8SCUONB5gcjHmuELgxyQJc8zyCDEeopwRyHfup7ATsE2CC6EXBKfSVIuSLr+1MeZSlB7kgI8hVdn+
ARin7KwXow0ymbEmukccaluzDIhpAmFQpuGTs+EmD44ZOcULsoZtSnnAgxke9vwQINCdFxwh9jFuIruKgPKyuflnAW
NyOn55zNeGhaKIBzGEQJlz6eu8XnR3Z2qxj5xL7xJPFuKDlrayTZEGJnMs4CQ/L6xIYUfB6foQYWlpTIQTzpPAz5jG
xWDUtaKrWQDyUUVmlCqGzBbpRpLJlJrniYuRhEUXBV7AUBaOZRgGiDko3ck5bsSfDnkHkUliFHc2tYtIw6Av+We/dn
Aa9FzbgUVX5gQSfz2y9HFih1zuOgUReBl4KLyHaiXnOhEJIxwixnUwRFA8RqgtFPqrYADUwhgkhhQ6qCECkDTEH03+
wsS+3TLAjETpKOy7RLupWcqTJmFnPMOnraFVSKTIggF8ZBp9/v9K73z/tfr93OYa/TN65oc2SO2WMvAEqDU86eoyzk
qdwgU9QozC87toHuAs6gaBlk8MI76hhjyYxNWs54o1f2NpXskP0h7TG5zT9EfW9AlqX9gD3mpGnI8MzIZO7GSuZ633
XPe53ro/3+/vW3s6POnpelkUHzG9o8nBRA6t73Tm9PWs7GShikc7DvdvZyu1oNd+4iJbS41fNd+PvHWe9oL7fH1XD9
3rnbvz7s9Pp7QrsCzPh+3O+Iveqc7h+cdI72SMGChr6VcOrZk+a9sTxL5DtH12e949+PT90XIIVJ7EkbkFx0z4Cvne
ZOSyxsnB73e2fXi6Nfz9z+XtOh/3GI3CtLxzsrg3efP6TOef/LTiccRiOIzTI4Yq1zfOagpUMxQl6/HwQnaDomWX5D
GlJDEIfDCdZ1IRlk+XSCE1DFnkRDyKOl6oHADZi7xBLXCRDCkOBLoSCnsVytC3Dlrc/zrSgs8V6uE8mxy+U2yBKnNm
wXWqsPEebxRXETODmuEjUR2Jd4srQlKVUi1WmNl7GQiQW0BVXgyhgBfpNMoFwSL+B8xlqrUDwRNX5TPCCSiBxFCZYr
QWkAXEfEDFRLHnjxUEfrLmRgQcN9icKK82BBRs/FsDVvmG3b7PwYf/36fzVSsLC0hU2s8wc/SdEfFsL+Ukaq1ccQCV
c6V/mAjz8FMHkdFjGlwOuC+c1ksDUkoOv/zVcXXaKXQADm9hYck963m5bCQjV3o8Qn68ViCbTKYyjVOQ8VaWTnACIh
jGN/AcG++A98dORToSuhvnkP/hTWOIge8sJJTfnhc1MHUL0fRkGEir1Y4JjGwTe/xNF0P74ZmO2tnQZrv2/ij7aVcx
emLwqOAKbh8puIgx0YDfbReY+bMYHNogLote3oeiEPFLxzFA2xMjT62PJRg1+5fzNBNra38rFKom2DTCDc1o4SCw07
joLE2R+NTEkSuU79NOBrMH3iDZBpAl9hRYaaAmj+Gpc/JhAcC4Sq+m6BcBcrgMiagPxBFIwsRR7DrjTG55foQuBLzT
YYwk6OCHVPJJ2AzgD5PpQ1ScCoyCQbVNSlwsjVebiquQnu+Y8T7HuqQ8dvLMHWJiR8Q6Oxjt4L62iDeTQ/gCo/tiyN
SBVlAYnNHR15TYUpeNJZymekjApKUyiVmN2CncUgVWCvF9/e72Bw2Cph/oLBttYyWH2JCpvZeg9+DmxuN1f7ek7Wwu
zVhfNlUoNK44b/4MEwmvL1IxYiYV+nEgKUmRVXyKZTD5L2ukggMvcgU0N1yHw4apu6cA2muJZ/4fGP6evILlB9VjVU
tFpNSyCuaUsfAWmzqZC++4k/oHCR172rdm9miapDylOr38tosaa/ELiKMJ83av2Jn6jQkt9GJPpBDJhgKUIldD5yaj
VZncAMdrJ2VQGK1UpNntTGUKHQxHKV8meUwYKAnvAUQURAkz0MLa6ZKdR5bMBxP1ni3XGLgLviVkfFPGZ+7fe7rpij
lkUiDqcmHvjsG9H85COsNad+koD6gYdDIHELKgMtpBEuSkWeU9v4rDRUYfN3RJoQeGvu/QeMIxSCNONc2GoiSE6KCk
K44iCA9zu0o3yEUGjjMZRWeJ7AUfg9b+S3AhBtYj6+qg+ihx4fk7mLs+eeMDVp8cFg/bgrwJUdiUXVYDXV1eeWQlxP
dy2KwW1LdsKw01fWG5CiyXSwhjgoAdSNAr6aywMbZn0OZte25HprSrC5jRJsKySlRHWHo/o4cpOoawNg5wkXxFTn4H
DixaXW6Gp1pANaSGy+890LMpGSBxhI4FfRPQyzIPiEM0eD0kfVyMsHkAM1UFswxTzAMkPza3MSJWljFsH5zmCtJsQF
f2zmR5sLY2VLxriyHl+HecID4qPRaraddhv+teBXs9Ha2tzcNJ4sZgrbV3JaL/CrWjsGe/8qh6oh9DKPBZTkMj9pXs
NJs8Te0cB6RZW4DQb7+Cpr2IN6mS0BoViaTa+HURCAtZYYwuVeYylv9LPW5qt8qd7Xy7wVUJK/ElO4oCXryVp9OLnt
y9bja35+OOHDW3T0HCkvswWJRCYg7eJBgyV0Pipq2XymashofcCon6MvV8lSwQterBAsITYIV1VomMpFhr3NXy9Anp
xA1JA3/kYOW1mwjztWjlxBLABHoQZpiK2gNaQ6yNI0CnOMYh8RvSggjAKiqijtTTz+K+w10xLW3CW8ar0HPH3tbOFp
dluj8SXw0qIrAh80qSqdCraQOXl2Wb0VkizuBWRQmHdTL82S9UtLHatiEdD+gIorEahSSG0tIldSDdYTWIu3ms1nla
NTp5MqXVLtJn8F2j1esTWAc001pqkqq4I33VyRH8cxlmB+nX91aoBcD3X8hK4x6WYtv4W3ZUrOU6JovYuHDczO7w0p
J5XmflLr06ZyQCaIMm5+nycjtZBVohX3jsth1dbvHFUMkZOqHoqds9v8HmxR/xRjaGalrs/+gDINr42AirxUXQFd7Z
i9DRqnFhFp/UnvUz9jHs/z92X/+KRz9P/PI5rGFv0TVwtPdJzAYxMdJ3AT6Tj+QiWHAIY8dNFRizpNrL2c7heunxbS
/NKsTO+TNJ0lu+/eeVQWOfFsGqtHSM4wcv72ykVJDLV9PYuDrzyYrR+aJILS9waY7ogOtgc8TcGaye6GUXTrw9kXn3
jFfERXuYnzMzz0RqM5MwHaCyPIlTHMgtvAbs/i6GFusWQSZcGIAaGpH+KVpNAT0iEIPGO22h/oJqy1izdkzkbBU7VI
SdWDQq0QI/OzJmhwIbZJarKycOXlT6XagpByaxYk3oGaxC2O1kyQN0jsHkoONvZDP5nwkaHRWFVoiZlqemptyzJLIK
+uR5Z1oRDEsVt0hERuWbsLpWVDgfMLvQQN+ZcaCgp5OYnJJheKd+rdsQHVUgllLqxXqpVfiJHvOn4wiuEKQm9izbW1
2bQK7PWkpg7alqweT9frg2nsn2qtMAM/GMVwBfa3Suyfrt8FUuznaP9hxUg0VlSMNHnohcO1GuuaggROcR9BHw19qo
Ka3pfUJPGr7vNSR7TnhTfc/Gwqy2kwpQnxl1jH0mq2mXho1RSeIt6fVGwRyzuh/O0KRDy80WbRmG1BEpeE6LG3mGqr
qaIlos1u5rPqIqeY21Jz1EONp3jd493B2VR/hO1OonsbO/nmBWj6qu6LOgkTnFnHvWl+ghTP7EDmdIjeURamOPj2rX
yyBaMX9fBK60Mjqs3/wmevor1UXEiolpVQw0Xdv6IWk3Re8WR8RCR8Zt+kjMoPquJ8ImnqbIBwrfzt5ZJfuiAtCP2F
coVRVEQywhWd7B6/8/k9dpWx4Eh28R2I1oHahXplZcmLrOVFL1Nw5dLXkrSo9BUwWPuUC1Xr0TD1Q7VliBJnRan8hA
RF3wEbDmLRxaoYYbrFdxgkY5izFjiTPXcmOVt+qaYa9hqA9gZftcNLmsaaRXxnovQVi1zuUrYGyWXVJBI+FEkq0xtF
F4fa64uV8uowLB9XaIFCO1GpexHxTJM9aWmjfO4ig9O9Xpgi2rs2atufCgcqzYiCOWfxNeJg1y1Le5MuHvCtNLn8Nc
rqb2DI8h+qKwj4yJtpdPDdhG7P2FB1DKv8oLB4Ypq/UtF50Y8lBQ91L7nVEs5rrEgsxjYWLqLvvYThMnhvA95fPIYN
5lhFq5c0Xji/9+b2RiMnpL8b0Eb/5MlppA/88OIQXNuw9HfEyLwdcgJffuD/pD1WXdqttr5bmmvpXxr4J51PbDigGL
+8ax678wJ/xJCUmVjozevs3Gq+IYa/ED010LdvxePglaZdK62HK72Rjl/TX7qrB6qlx7b/aQPhl1sIrzURxCNGthwk
6VcnHJnGO2k8pNelMJZv8PI7O82fKjrKRvkZB2bv0e7PkFT7M/wZ4svzZ2L7uyC68cPcU1b5iXH2R/H3cTimt7DY/V
yyr1LUrC0+TV9XqA3KEmPPD4QU5qoH69ZGo8ysYJMZ9A23RdZEW6Kw02bt4i7yR1fyCRmMi5dgwPX/Ac7rTTYgOAAA
'@
$dest = Join-Path $Root 'wizard\RpmAssure-ConfigWizard.ps1'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_wizard_RpmAssure_ConfigWizard_ps1))
Write-Host 'WROTE wizard/RpmAssure-ConfigWizard.ps1'
$F_wizard_Apply_SilentConfig_ps1 = @'
H4sIAI0ve2oC/3VVXW/iRhR9968YZS3ZtLF3t32JkCzVgJOwIkDtYfMAqTWYS3BlPN6ZcbK0zX/vHY8TCBAhwPa533
PuccUE27oWIXOpRF4+PtjDUipWFINckIA4/e5iKvgjGpHrvAC5iKd3JAbJa5G1d6GUtQDn8jBI8qNIQDxBE+MEGjDF
lkyCBjGCCZCGVXViOZMfhJgyKZ+5WJ0Fqail6oNQGlWiPioOE81EobGNUpXsfv7Mmgp8UW3Fa2t+xv1/mGN1LDsSgo
swUzkvpwLWIKDMmtoTxSvHsjNervNHM7BvPC+9KVMbYkP51G1npxtuWj07uoUJ4FhjePaGCrak+aW7CghGhUxxsSPe
NUc/0gbf5/yPTGrljeuisHTKBn5Xx97UYVXlo41jWZ8ItiL1ERH4mUuFgyESMgGK5GtSaaxUGLDFEgPpYVuIuxSk2r
epLzrkX5zxDSivz0uFzm8IVoilRyzbeJPl39hNY0l0HtdOibdlKtsQ56+F/KUXURrFaTijt2kS9eOI4sMAv67/a8d2
MAc5Lcm+0wFAzr8++FTkW7dDXjDBi/XSlOqVXB17mWLt5U6BxAh67m1p+tH8gfz+myZMspN4Dj761CJXO78vdpXSB1
ptdn7MyhXfjuvtEsQNlCAYHtNDt9sXwBS4HR9n0dMJXJOnozOeFO/Oe7nCieGqKNDulCcNTV+9iCegKhievOM5l47T
8Skf8WcQw/KJiZyVyu1gpwetvu2eHpfaCP6MTP1zlETx9yjGo+UV5tqRXBIBP2rk14qsuSAS1xtPreUijs+yi7xs5v
OHFgjnE2nbRIfljuz5S3IjGSCaPbtAJA2TZBZH6SCkYXo3GUQBqxW/OIaxrNTUFezLPmulA/XCJAoO9eOs5Sxpo2nt
OGsxxev7STwIDoXkrCWNZwlN+1FMg3e6Yoy/D2lkuBqNw94oGgRaawx2yORZPApa0TkFmxTRIJ3Ew5vhOPnY0OxDcE
QhYzedYIVXX66+mtvxkMaT9Ojh7SShwRe/+VxoWavV+uo9+Vu+U/ip/Bm9vorKjK+0MthrVkiw5sOJr98CSNN7XAgI
i2KkKeK+rvolMZzBfx29o3XmLtfyiRxRnKD+INeKFYq6plzJV6AJiXIoLRvBqHx6r10HLyMtXgutXn7BM1Y4jYMR3a
Qq8lc5MlGORcqYmrX/uAvje9LEi9XYebdcKnJxL7iCN3G7sP4HbRpsPUIHAAA=
'@
$dest = Join-Path $Root 'wizard\Apply-SilentConfig.ps1'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_wizard_Apply_SilentConfig_ps1))
Write-Host 'WROTE wizard/Apply-SilentConfig.ps1'
$F_wizard_Test_SqlConnection_ps1 = @'
H4sIAI0ve2oC/5VTTY/aMBC951dYKFKItBv12MtKy0IOKy0fwmx7QIiaMLBuEzs7dsqiiv/esR0CrNRDD5HieS+eN2
9eaoGi6keMLWfuDSxgfyzUVliNx4fYYgPpamksSrVfxRzwN+Cdo59LI2HFRhhgDyyZz8YDYxqE9aCukxvaqwF0lNvq
TBhz0Li9Qg7SFm+reIGNsUNAe1P9LtVWH8ygsW9RGsU5osZBYaVWM4QdIKjCC+FW10kUF2ZDpwkc7qebn1BYxo/GQp
U5zRl/L4elBGX9m1YK/EXcS3tqZLkF9FcsE8dnXDdYQLKiG1sfWvRZSStFyYbEKvU+MM62tJz2fraQFejGes7XSO5Y
/3qmlP2hac+3WtijsLBlHIoGpT2Gm91KohODkjy/0L2/z6NAcYcOOXscoPMpOoXunc/Uu/3Al8KEDpA7WZCMS3N2im
gqGui/vfUNss9eRxaP7SSEZNMaVD/1x8oFI1SHCCRiqKuKwtnBWVtYwIclao/nL/lwwUZP68lgnPdTNuBstJlQru8Y
f+X5fM0vwIveSxWwx8dv+Zw/Tyeu/g2w5+5H35ya5B+0AAtzEBQJ39tbh5mr9NOwNUppbQpyTlfaG7J6DGXGpr+6vY
XC1T8TI8XLK0xWLep1tVCnsUNJnXFWPjgFy4SOtJl7U5fSst4P1UuXX87UMRgj9v6HuNqBaYqCgF1TJp53itxzYrTk
4s2P8o9Bwhg7QcGLPk/Rxf1mgDaH16KT0PQiLV6TvwXUTlvWlltFO6lEWYZseMd9ErilILB7eGeJi0oSguszUmoDtF
v6NvoLEs2ypdgEAAA=
'@
$dest = Join-Path $Root 'wizard\Test-SqlConnection.ps1'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_wizard_Test_SqlConnection_ps1))
Write-Host 'WROTE wizard/Test-SqlConnection.ps1'
$F_service_Start_Service_ps1 = @'
H4sIAI0ve2oC/51UTU8bMRC9768YhVWdHLyiN0TFIYJSqJoPJZG4rFTczWxw2bVXtjdkW/LfO7aDWKASVRXJciYz77
2ZeXH62RhtxoWTWs0NlmhQFQhnwM61clK1yJL0jqIUWjaVdHwu3B3QSYkO0kl3rba6EL4+m3Tnuq6FWmc+KUlx58u+
aqliVQRii/lkbG1rkI+bJqMklhzBuW46QLWFUlYIUjkNjdEFWgu2ESSp1AYU7hxYJ4w7hVo4NFJU8heCaJo8o+KsIi
kVlEbXMDd6Y0R9IZxI0qLcvFRCyae9jCAKFmh1a4gz99+ixrzQqpSbXHipakvToNsLrGFvLqHDETDKYYksYThcoX36
jUSMgNN4oB+l1NEIficQRsCvHdYhFYY9uZ6TPXfICOdSk9JkH1h6cDTOiPYh3OO0kj1gZTHElz7Al2i2kqbKp6J+vR
IGvOcKWNJClKu6J0MQ5xFciqr6IYr7U1hLg4UDpdcHMiBF9gBfS2ul2iSp3RY0tC/4PvP4LaFvkStNdvMwnIzgLxl1
4loLXHmYVikiYrH3NKh5b0mmJfwac58cjuhF8O5wpvuXJeeZbl3Tutw3jCaXao27rP5pA0ylN/Z/bedrPcgUH6Inwr
nqGoSLMHFNCqMJ4AAe6B5h1jo+bauKil870Df5FwuGdg8mhIPI2WJ1xk6OTz6yTzEyvV4tZt/fxq9mS4ocZ+HDAkK0
2Pzw9+WXtM9nfuBjs2lr4vwmrYPB7SDy3w4GwG+0uac1Pnf4Yu5xLU9vz2PvQaKmbmj2+mHpOno+ruR6jYq07Mmsfw
AMp21Y4wQAAA==
'@
$dest = Join-Path $Root 'service\Start-Service.ps1'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_service_Start_Service_ps1))
Write-Host 'WROTE service/Start-Service.ps1'
$F_service_Stop_Service_ps1 = @'
H4sIAI0ve2oC/22PwU7DMBBE7/6KPUQEDo4Kp15AiqKAipo2Ir2jkG4bo8SO7E0hKvl31i2tEOVi2eOZ2X1Baq2xcU
XK6NziBi3qCuEewsRoUrrHUAQ1qywVXaNI5iXVwCcbCYJsmOmdqUqfj7IhMW1b6nXkTSLATx97NkofU8ei8CXPYud6
izLuuohNoVAbuF6h+2n3wRvYw9XhBo5MB3cPge6bBkZR8FMWaHeKF5WLsv1bGYJ8NNZ//oKDQjW8cTOcuMQTklwgrZ
KcJY1Hl5wzTJMbSzCdTG9BFlQSwlw5Qv5N44se+AKelpZVLZdv71wDewHggYLXaPmhld7m1lToHMgtwcSDHRDO6mwN
l9YTwT8DRzGKb4sHhOm4AQAA
'@
$dest = Join-Path $Root 'service\Stop-Service.ps1'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_service_Stop_Service_ps1))
Write-Host 'WROTE service/Stop-Service.ps1'
$F_service_Install_Service_ps1 = @'
H4sIAI0ve2oC/12PwWrDMBBE7/qKJTFVcrA/oNCDKYUmYDB1wWdhb+oFR2tWG6ch5N8rR22hvQjNat7OaA07H9SNI7
zVVRnCSTAvpwlmctCSb1qTvYiwlJ0S+1rwgIK+Q3gC2yhP1mRDnETZTCNpXjsdIJ7RpJBVl52fuXMLW1SXZz4ene+L
xWQy/FywPZNPVFpk//QooskaOsAm96ywecfwnbHg2y1cQQfhM6wqCoH8RyoN8fHxblnBzTzcb0Dpoz8yClHTCinmrx
z0XzIElJm6Xwx7iNUThb01X2NJEoU5AQAA
'@
$dest = Join-Path $Root 'service\Install-Service.ps1'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_service_Install_Service_ps1))
Write-Host 'WROTE service/Install-Service.ps1'
$F_service_Uninstall_Service_ps1 = @'
H4sIAI0ve2oC/1WNywrCMBBF9/mKWQSri3bhXqGIC4VqUX+g1CkNpJOSTMSi/ruJ9YGbYbhzzh25ttbYvGZlqLTYoE
WqERaQrAyxIo+JkG1IQ3TsteK0rLiFMAPIIIthQxdTV9HPimFluq6icxYhIfEata1RNFpjUXIoi9w5bzHN+z4LUCJU
A9MTund7FGdwEwCT1w6OTQ/zpSSv9S/1pMhxpfX39BCujoVwRo2M8PfpQ8Ed9p7TXRSeBXj2Y/8AAAA=
'@
$dest = Join-Path $Root 'service\Uninstall-Service.ps1'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_service_Uninstall_Service_ps1))
Write-Host 'WROTE service/Uninstall-Service.ps1'
$F_service_Expand_Payload_ps1 = @'
H4sIAI0ve2oC/41UYW/aMBD9nl9xotEStCbbviJtEqKwsRWKGiSklarykqN4SmLLNpS047/v7IQ27UDaB5CTu3vv5d
2dJVOsCG+0Uby8v/XHpTYszy+4gs8QBF3PHyolVD81XJQzhStUWKZog4kRMvD4CsKoFAZapV14gtdIicy5iWbMrCFs
nf1ZkqSKS3MtCIHeEbjpHg6w985gscYS1KaElRIFjKfJvH95Obq6vBheLzWqLU/xHGSdzzXwmhUUATptbygKZtI1BE
2lH5BUD06LPSrQ23v+I5eU+V3wsklsIQSSVblgWUxJLYPCOeoDLEW6NfUZsFwhyyrAnWRlhhnkrBIbE1HQ1r5UhSfo
mJTLmCrkxjhLUC05Ae3i4rcOGhqAheIGo29CGwhmtcB/qAOXiTtu4CMd9/QzayUeoDPhWtOAOOUdMqCF1hm66kMUoi
9teR2vn2XRvJIIUV9rLH7l1ZQVCEmlDRbx+CoeiEIqJHxRxiOeYx3xfFO88RjLbW8+nMwgDJQs2F3j810A7+HmfsOz
215vig9f6RR247lI3FCHwZRc8CgQjQkX3L8TRPIwNUJVEI2EoqlueCzxH7iiHkw3ee4ZSrAe3hyX/JNLq5q4hzujWG
rm4hk4tI6cO8QuIawE+U3zF/rpmucZTSt8RRMN7IPT5hKbhvkZdf7kkNUIsbXSZb8eFVdr1/AaC7HF+sNrwOga043S
+PzNwz4kpL80eTUQpeHlBl3nAQZCVk1pzTYiO1zzjkK5idnDipeksbbsFb219X/YPbv3E27vHXjgj0xlH5p9rS8BO2
SEqg7LjkpDKiRH7R0b8ue9uvoREHDjISx4mSzgAEz22Yba7fYb2GSbnl7xpm7ZvIuS+jmW+lO98q1evODVrXXzBO/a
AdhD6m6mp/aedpKDujqxB37o38XDXYrS3sfxhEaQ3WO3Y433/gIjCNIDywUAAA==
'@
$dest = Join-Path $Root 'service\Expand-Payload.ps1'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_service_Expand_Payload_ps1))
Write-Host 'WROTE service/Expand-Payload.ps1'
$F_scripts_Prepare_Payload_ps1 = @'
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
'@
$dest = Join-Path $Root 'scripts\Prepare-Payload.ps1'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_scripts_Prepare_Payload_ps1))
Write-Host 'WROTE scripts/Prepare-Payload.ps1'
$F_scripts_Build_Msi_ps1 = @'
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
'@
$dest = Join-Path $Root 'scripts\Build-Msi.ps1'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_scripts_Build_Msi_ps1))
Write-Host 'WROTE scripts/Build-Msi.ps1'
$F_VERSION_txt = @'
H4sIAI0ve2oC/zPUM9Az4AIAaKh+/QYAAAA=
'@
$dest = Join-Path $Root 'VERSION.txt'
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
[IO.File]::WriteAllBytes($dest, (Expand-GzB64 $F_VERSION_txt))
Write-Host 'WROTE VERSION.txt'

# Prove required sources exist
$need = @(
  'payload\README.txt',
  'wizard\RpmAssure-ConfigWizard.ps1',
  'wizard\Apply-SilentConfig.ps1',
  'wizard\Test-SqlConnection.ps1',
  'winsw\RPMAssure-App.xml',
  'service\Start-Service.ps1',
  'service\Stop-Service.ps1',
  'service\Install-Service.ps1',
  'service\Uninstall-Service.ps1',
  'service\Expand-Payload.ps1',
  'resources\app.env.example',
  'wix\Package.wxs',
  'wix\Payload.wxs'
)
foreach ($n in $need) {
  $p = Join-Path $Root $n
  if (-not (Test-Path $p)) { throw "Still missing $p" }
  Write-Host "OK $n"
}

# Build payload.zip (app + node + winsw)
Write-Host 'Prepare-Payload...' -ForegroundColor Cyan
$prep = Join-Path $Root 'scripts\Prepare-Payload.ps1'
if (-not (Test-Path $prep)) { throw "Missing $prep" }
& powershell -NoProfile -ExecutionPolicy Bypass -File $prep -AppSource $App
$payloadZip = Join-Path $Root 'payload\payload.zip'
if (-not (Test-Path $payloadZip)) { throw "Missing $payloadZip after Prepare-Payload" }
Write-Host ("payload.zip = {0:N1} MB" -f ((Get-Item $payloadZip).Length / 1MB)) -ForegroundColor Green

# WiX build with bind path = installer root
$env:PATH = "$(Join-Path $env:USERPROFILE '.dotnet\tools');$env:PATH"
$wixPath = (Get-Command wix -EA SilentlyContinue).Source
if (-not $wixPath) { $wixPath = Join-Path $env:USERPROFILE '.dotnet\tools\wix.exe' }
if (-not (Test-Path $wixPath)) { throw 'wix not found' }

$Version = '1.0.0'
$vf = Join-Path $Root 'VERSION.txt'
if (Test-Path $vf) { $Version = (Get-Content $vf -Raw).Trim() }

$outDir = Join-Path $Root 'dist'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$msi = Join-Path $outDir "RPMAssure-$Version.msi"
$log = Join-Path $outDir "wix-build-$Version.log"
if (Test-Path $msi) { Remove-Item $msi -Force }

$sources = @(
  (Join-Path $WixDir 'Package.wxs'),
  (Join-Path $WixDir 'Service.wxs'),
  (Join-Path $WixDir 'Shortcuts.wxs'),
  (Join-Path $WixDir 'Registry.wxs'),
  (Join-Path $WixDir 'Payload.wxs')
)

# -b sets bind path so Source="payload\..." resolves under installer root
$argList = @('build') + $sources + @(
  '-d', "ProductVersion=$Version",
  '-b', $Root,
  '-o', $msi,
  '-arch', 'x64',
  '-culture', 'en-US',
  '-nologo',
  '-v'
)
Write-Host "wix build -b $Root ..." -ForegroundColor Cyan
Push-Location $Root
try {
  $ErrorActionPreference = 'Continue'
  $output = & $wixPath @argList 2>&1 | ForEach-Object { "$_" }
  $code = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
} finally {
  Pop-Location
}
$output | Set-Content $log -Encoding UTF8
$output | ForEach-Object { Write-Host $_ }

if ($code -ne 0 -or -not (Test-Path $msi)) {
  $output | Where-Object { $_ -match 'error' } | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
  throw "wix build failed exit $code log=$log"
}
Write-Host "MSI READY: $msi" -ForegroundColor Green
Write-Host ("Size: {0:N1} MB" -f ((Get-Item $msi).Length / 1MB))
Write-Host "Install: msiexec /i `"$msi`""
