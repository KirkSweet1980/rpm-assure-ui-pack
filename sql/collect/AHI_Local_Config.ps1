# Single account for AHIC collect (non-prod)
# Same username/password on:
#   - AHIC local SQL  (read Sysprodb)
#   - Central 102.222.21.220,14333 / RPMAssure_App (write)
#   - Linked server remote mapping

$script:AhiSqlServer       = '.'
$script:CentralSql         = '102.222.21.220,14333'
$script:CentralDb          = 'RPMAssure_App'
$script:LinkedServer       = 'RPM_CENTRAL'
$script:CollectDir         = 'C:\RPM-Assure\Sql\collect'

# *** ONE account for fetch + write-back ***
$script:RpmCollectUser     = 'Rpm_collect'
$script:RpmCollectPassword = ''   # change if you want; use SAME on central + AHIC + 209

# Back-compat aliases used by runners
$script:AhiSqlUser         = $RpmCollectUser
$script:AhiSqlPassword     = $RpmCollectPassword
