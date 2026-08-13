/*
  AHIC GL control map (from GenMaster discovery 2026-08-12)
  sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -i 465_Seed_GlControlMap_AHIC.sql
*/
USE [RPMAssure_App];
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.Dim_FinSight_GlControlMap', N'U') IS NULL
BEGIN
  RAISERROR(N'Run 463 first', 16, 1);
  RETURN;
END

;MERGE dbo.Dim_FinSight_GlControlMap AS t
USING (VALUES
  (N'AHIC', N'AHICAR_I', N'INV', N'01-2400', N'STOCK ALL WAREHOUSES'),
  (N'AHIC', N'AHICAR_I', N'AR',  N'01-2600', N'TRADE DEBTORS - ALL BRANCHES'),
  (N'AHIC', N'AHICAR_I', N'AP',  N'01-1110', N'GRN CONTROL ACCOUNT'),
  (N'AHIC', N'AHICAR_I', N'WIP', N'01-2410', N'WIP CONTROL ACCOUNT'),
  (N'AHIC', N'AHICAR_Y', N'INV', N'01-2400', N'STOCK ALL WAREHOUSES'),
  (N'AHIC', N'AHICAR_Y', N'AR',  N'01-2600', N'TRADE DEBTORS'),
  (N'AHIC', N'AHICAR_Y', N'AP',  N'01-1110', N'GRN CONTROL'),
  (N'AHIC', N'AHICAR_Y', N'AP',  N'01-1100', N'TRADE CREDITORS - CONTROL'),
  (N'AHIC', N'AHICAR_Y', N'WIP', N'01-2410', N'WIP CONTROL'),
  (N'AHIC', N'AHICAR_Z', N'INV', N'01-2400', N'STOCK ALL WAREHOUSES'),
  (N'AHIC', N'AHICAR_Z', N'AR',  N'01-2600', N'TRADE DEBTORS'),
  (N'AHIC', N'AHICAR_Z', N'AP',  N'01-1110', N'GRN CONTROL'),
  (N'AHIC', N'AHICAR_Z', N'AP',  N'01-1100', N'TRADE CREDITORS - CONTROL'),
  (N'AHIC', N'AHICAR_Z', N'WIP', N'01-2410', N'WIP CONTROL')
) AS s(CustomerCode, CompanyDb, ModuleCode, GlCode, Notes)
ON t.CustomerCode=s.CustomerCode AND t.CompanyDb=s.CompanyDb AND t.ModuleCode=s.ModuleCode AND t.GlCode=s.GlCode
WHEN NOT MATCHED THEN
  INSERT (CustomerCode, CompanyDb, ModuleCode, GlCode, Notes, Active)
  VALUES (s.CustomerCode, s.CompanyDb, s.ModuleCode, s.GlCode, s.Notes, 1)
WHEN MATCHED THEN UPDATE SET Notes=s.Notes, Active=1, UpdatedAtUtc=SYSUTCDATETIME();

SELECT CustomerCode, CompanyDb, ModuleCode, GlCode, Notes
FROM dbo.Dim_FinSight_GlControlMap WITH (NOLOCK)
WHERE CustomerCode=N'AHIC'
ORDER BY 2,3,4;
