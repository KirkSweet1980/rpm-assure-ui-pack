$ErrorActionPreference = 'Continue'
$dir = 'C:\RPM-Assure\Sql\customers\RSR'
. (Join-Path $dir 'Customer.Config.ps1')
$logDir = Join-Path $dir 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Run-SqlFile([string]$label, [string]$path) {
  Write-Host "==== $label ===="
  Write-Host "file=$path size=$((Get-Item $path).Length)"
  $out = Join-Path $logDir ("dbg_{0}_out.txt" -f $label)
  $err = Join-Path $logDir ("dbg_{0}_err.txt" -f $label)
  Remove-Item $out,$err -Force -ErrorAction SilentlyContinue
  $args = @('-S','.','-U',$LocalSqlUser,'-P',$LocalSqlPassword,'-C','-b','-j','-x','-i',$path,'-o',$out)
  $p = Start-Process -FilePath 'sqlcmd' -ArgumentList $args -Wait -PassThru -NoNewWindow `
    -RedirectStandardError $err
  Write-Host "exit=$($p.ExitCode)"
  Write-Host '-- stdout (-o) --'
  if (Test-Path $out) { Get-Content $out | ForEach-Object { Write-Host $_ } } else { Write-Host '(no out)' }
  Write-Host '-- stderr --'
  if (Test-Path $err) { Get-Content $err | ForEach-Object { Write-Host $_ } } else { Write-Host '(no err)' }
}

Write-Host "User=$LocalSqlUser"
Write-Host 'Q test:'
& sqlcmd -S '.' -U $LocalSqlUser -P $LocalSqlPassword -C -Q "PRINT 'Q_OK';" -x
Write-Host "exitQ=$LASTEXITCODE"

Run-SqlFile 'hello' (Join-Path $dir '000_Hello.sql')
Run-SqlFile 'diagnose' (Join-Path $dir 'Diagnose_Collect.sql')
Run-SqlFile '212' (Join-Path $dir '212_Collect_RSR_Operators_LastLogin.sql')
Write-Host '==== DONE DEBUG ===='
