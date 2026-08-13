#!/usr/bin/env bash
# Run Portfolio with live SQL (Linux/macOS host that can reach central)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export RPM_ASSURE_DATA_MODE=auto
export RPM_ASSURE_SQL_SERVER="${RPM_ASSURE_SQL_SERVER:-102.222.21.220,14333}"
export RPM_ASSURE_SQL_DATABASE="${RPM_ASSURE_SQL_DATABASE:-RPMAssure_App}"
export RPM_ASSURE_SQL_USER="${RPM_ASSURE_SQL_USER:-Rpm_collect}"
export RPM_ASSURE_SQL_PASSWORD="${RPM_ASSURE_SQL_PASSWORD:-RpmCollect#AHIC2026}"
export RPM_ASSURE_SQL_TRUST_CERT="${RPM_ASSURE_SQL_TRUST_CERT:-true}"

echo "SQL: $RPM_ASSURE_SQL_SERVER / $RPM_ASSURE_SQL_DATABASE"
if command -v sqlcmd >/dev/null 2>&1; then
  sqlcmd -S "$RPM_ASSURE_SQL_SERVER" -d "$RPM_ASSURE_SQL_DATABASE" \
    -U "$RPM_ASSURE_SQL_USER" -P "$RPM_ASSURE_SQL_PASSWORD" -C \
    -Q "SELECT COUNT(*) AS Ops FROM dbo.Syspro_Operators WHERE InstanceName=N'AHIC-SSQL-SRV';" -W || true
fi

[ -d node_modules ] || npm install
exec npm run dev
