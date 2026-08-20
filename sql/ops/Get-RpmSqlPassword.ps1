# Dot-source from collectors. Never prints the password.
# Order: env → C:\RPM-Assure\secrets\sql-collect.json → caller $Current → throw.
function Get-RpmSqlPassword {
  param([string]$Current = '')
  $fromEnv = [string]$env:RPM_ASSURE_SQL_PASSWORD
  if (-not [string]::IsNullOrWhiteSpace($fromEnv)) { return $fromEnv.Trim() }
  $sf = 'C:\RPM-Assure\secrets\sql-collect.json'
  if (Test-Path -LiteralPath $sf) {
    try {
      $j = Get-Content -LiteralPath $sf -Raw | ConvertFrom-Json
      $p = [string]$j.password
      if (-not [string]::IsNullOrWhiteSpace($p)) { return $p.Trim() }
    } catch {}
  }
  if (-not [string]::IsNullOrWhiteSpace($Current) -and $Current -notmatch 'PASTE') {
    return $Current.Trim()
  }
  throw 'SQL password missing. Run deploy\Harden-Production.ps1 (seeds C:\RPM-Assure\secrets\sql-collect.json) or set RPM_ASSURE_SQL_PASSWORD.'
}
