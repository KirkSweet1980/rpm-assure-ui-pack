# Entry point - delegates to scripts\Build-Release.ps1
param(
  [string]$Version = '',
  [string]$AppSource = 'C:\RPM-Assure\App',
  [switch]$BumpPatch
)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $here 'scripts\Build-Release.ps1') -Version $Version -AppSource $AppSource -BumpPatch:$BumpPatch
