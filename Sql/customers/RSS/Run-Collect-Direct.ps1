$ErrorActionPreference = 'Stop'
$Root = 'C:\RPM-Assure'
$Config = Join-Path $Root 'Sql\customers\RSS\Customer.Config.ps1'
$Runner = Join-Path $Root 'Sql\base\syspro-direct\Run-Syspro-Collect-Direct.ps1'
if (-not (Test-Path $Config)) { throw "Missing $Config" }
if (-not (Test-Path $Runner)) { throw "Missing $Runner - deploy base pack first" }
$jobsOnly = $false
$includeJobs = $false
foreach ($a in $args) {
  if ($a -eq '-JobsOnly') { $jobsOnly = $true }
  if ($a -eq '-IncludeJobs') { $includeJobs = $true }
}
$psArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Runner,'-ConfigPath',$Config)
if ($jobsOnly) { $psArgs += '-JobsOnly' }
elseif ($includeJobs) { $psArgs += '-IncludeJobs' }
else { $psArgs += '-JobsErrorsOnly' }
& powershell @psArgs
exit $LASTEXITCODE
