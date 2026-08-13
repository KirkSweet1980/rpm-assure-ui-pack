RPM Assure — True SYSPRO Hotfixes (UVSS)
========================================

What we found on UVSS-SYSPRO
----------------------------
Database: SYSPRODeployment
  CustomerHotfixes   386 rows  = INSTALLED hotfixes (GUIDs)
  ReleaseHotfixes  10345 rows  = catalog (join for KB/title)
  CustomerInstalls    25 rows  = product version (8.11.0000)
  Syspro customer code RSA-B2252
Sysprodb.AdmSysVersion
  DatabaseVersion 8.0.0.0045a, SysproFullVersion 8.0.0

Steps
-----
ON CENTRAL (rpmwinrm / 102.222.21.220,14333):
  1) sqlcmd -S "102.222.21.220,14333" -d RPMAssure_App -E -C -b -i 310_Ensure_Backups_Version_Tables.sql
  2) sqlcmd -S "102.222.21.220,14333" -d RPMAssure_App -E -C -b -i 320_Ensure_Hotfix_Baseline.sql
  3) sqlcmd -S "102.222.21.220,14333" -d RPMAssure_App -E -C -b -i 360_Ensure_Deployment_Hotfix_Columns.sql

ON UVSS-SYSPRO:
  4) Optional probe (admin):
       sqlcmd -S "." -U "SYSPROAdmin" -P "..." -C -i 402_Probe_ReleaseHotfixes.sql
  5) Grant:
       sqlcmd -S "." -U "SYSPROAdmin" -P "..." -C -b -i 302c_Grant_SYSPRODeployment_Rpm_collect.sql
  6) Collect as Rpm_collect:
       sqlcmd -S "." -U "Rpm_collect" -P "RpmCollect#AHIC2026" -C -b -i 227_Collect_UVSS_DeploymentHotfixes.sql

Or:
  powershell -NoProfile -ExecutionPolicy Bypass -File Install-UVSS-DeploymentHotfixes.ps1

Verify on central
-----------------
  SELECT SnapshotDate, ProductVersion, BuildNumber, InstalledHotfixCount, SysproCustomerCode
  FROM Syspro_VersionInfo WHERE InstanceName='UVSS-SYSPRO' ORDER BY SnapshotDate DESC;

  SELECT COUNT(*) AS Hf, MIN(InstalledAt), MAX(InstalledAt)
  FROM Syspro_Hotfix WHERE InstanceName='UVSS-SYSPRO'
    AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM Syspro_Hotfix WHERE InstanceName='UVSS-SYSPRO');

  SELECT TOP 10 HotfixCode, HotfixName, InstalledAt
  FROM Syspro_Hotfix WHERE InstanceName='UVSS-SYSPRO'
  ORDER BY InstalledAt DESC;

Required vs installed
---------------------
Installed = CustomerHotfixes (done by 227).
Required  = baseline/catalog gap (Dim_Syspro_HotfixBaseline + views in 320)
            OR later import of "not installed" list from Syspro Installer.
