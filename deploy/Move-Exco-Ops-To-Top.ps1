param()
$ErrorActionPreference = 'Stop'
$f = 'C:\RPM-Assure\App\src\routes\index.tsx'
if (-not (Test-Path $f)) { throw "Missing $f" }
$t = Get-Content -LiteralPath $f -Raw -Encoding UTF8
Write-Host ('file chars=' + $t.Length)

$rm = $t.IndexOf('Remote management')
if ($rm -lt 0) { $rm = $t.IndexOf('Remote Management') }
$df = $t.IndexOf('Data freshness')
if ($df -lt 0) { $df = $t.IndexOf('Data Freshness') }
$age = $t.IndexOf('collect age within 24h')
Write-Host ('idx Remote=' + $rm + ' DataFresh=' + $df + ' collectAge=' + $age)
if ($rm -lt 0 -or $age -lt 0) { throw 'Required labels not found in index.tsx' }

$grid = $t.LastIndexOf('<div className="grid', $rm)
if ($grid -lt 0) { $grid = $t.LastIndexOf('<div className=''grid', $rm) }
if ($grid -lt 0) { throw 'Could not find opening grid div before Remote management' }

$cardEnd = $t.IndexOf('</Card>', $age)
if ($cardEnd -lt 0) { throw 'Could not find </Card> after Data freshness' }
$divEnd = $t.IndexOf('</div>', $cardEnd)
if ($divEnd -lt 0) { throw 'Could not find closing </div> of the tile grid' }
$end = $divEnd + 6

$block = $t.Substring($grid, $end - $grid)
Write-Host ('block chars=' + $block.Length)
Write-Host ('block head: ' + $block.Substring(0, [Math]::Min(80, $block.Length)))

# already first content after status?
$pulse = $t.IndexOf('{/* 1. Estate pulse')
if ($pulse -lt 0) { $pulse = $t.IndexOf('{/* Estate pulse') }
Write-Host ('idx Estate pulse comment=' + $pulse)
if ($pulse -gt 0 -and $grid -lt $pulse) {
  Write-Host 'Tiles are already above Estate pulse. Restarting only.'
} else {
  $before = $t.Substring(0, $grid)
  $after = $t.Substring($end)
  $t2 = $before + $after
  $pulse2 = $t2.IndexOf('{/* 1. Estate pulse')
  if ($pulse2 -lt 0) { $pulse2 = $t2.IndexOf('{/* Estate pulse') }
  if ($pulse2 -lt 0) { throw 'Estate pulse comment missing after extract' }
  $nl = "`r`n"
  $t2 = $t2.Insert($pulse2, ('{/* Operations snapshot - top of Exco */}' + $nl + $block.Trim() + $nl + $nl + '          '))
  [IO.File]::WriteAllText($f, $t2, (New-Object System.Text.UTF8Encoding $false))
  Write-Host 'Moved 5 tiles above Estate pulse.'
}

Restart-Service RPMAssure-App -Force
Start-Sleep -Seconds 6
Get-Service RPMAssure-App | Format-Table Name, Status -AutoSize
Write-Host 'DONE. Hard-refresh Exco.'
