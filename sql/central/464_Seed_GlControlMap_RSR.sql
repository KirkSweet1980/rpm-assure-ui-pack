/*
  Seed RSR GL control map
  sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -i 464_Seed_GlControlMap_RSR.sql
*/
USE [RPMAssure_App];
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Dim_FinSight_GlControlMap', N'U') IS NULL
BEGIN
  RAISERROR(N'Run 463_Ensure_FinSight_GlControlMap.sql first', 16, 1);
  RETURN;
END

;MERGE dbo.Dim_FinSight_GlControlMap AS t
USING (VALUES
  (N'RSR', N'SysproCompanyRSL', N'AP',  N'00-72010', N'RSL AP control'),
  (N'RSR', N'SysproCompanyRSL', N'AR',  N'00-82000', N'RSL AR'),
  (N'RSR', N'SysproCompanyRSL', N'AR',  N'00-82005', N'RSL AR alt'),
  (N'RSR', N'SysproCompanyRSL', N'INV', N'00-80190', N'RSL INV'),
  (N'RSR', N'SysproCompanyRSL', N'INV', N'00-80160', N'RSL INV'),
  (N'RSR', N'SysproCompanyRSL', N'INV', N'00-80185', N'RSL INV'),
  (N'RSR', N'SysproCompanyRSL', N'INV', N'00-80165', N'RSL INV'),
  (N'RSR', N'SysproCompanyRSL', N'WIP', N'00-80115', N'RSL WIP'),
  (N'RSR', N'SysproCompanyRST', N'INV', N'00-81000', N'RST INV'),
  (N'RSR', N'SysproCompanyRST', N'INV', N'00-81100', N'RST INV'),
  (N'RSR', N'SysproCompanyRST', N'INV', N'00-81600', N'RST INV'),
  (N'RSR', N'SysproCompanyRST', N'INV', N'00-81650', N'RST INV'),
  (N'RSR', N'SysproCompanyRST', N'WIP', N'00-81750', N'RST WIP'),
  (N'RSR', N'SysproCompanyRST', N'WIP', N'00-81800', N'RST WIP'),
  (N'RSR', N'SysproCompanyRST', N'AP',  N'00-91000', N'RST AP'),
  (N'RSR', N'SysproCompanyRST', N'AP',  N'00-91100', N'RST AP'),
  (N'RSR', N'SysproCompanyRST', N'AP',  N'00-91200', N'RST AP'),
  (N'RSR', N'SysproCompanyRST', N'AR',  N'01-82000', N'RST AR'),
  (N'RSR', N'SysproCompanyRST', N'AR',  N'01-82100', N'RST AR')
) AS s(CustomerCode, CompanyDb, ModuleCode, GlCode, Notes)
ON t.CustomerCode=s.CustomerCode AND t.CompanyDb=s.CompanyDb AND t.ModuleCode=s.ModuleCode AND t.GlCode=s.GlCode
WHEN NOT MATCHED THEN
  INSERT (CustomerCode, CompanyDb, ModuleCode, GlCode, Notes, Active)
  VALUES (s.CustomerCode, s.CompanyDb, s.ModuleCode, s.GlCode, s.Notes, 1)
WHEN MATCHED THEN UPDATE SET Notes=s.Notes, Active=1, UpdatedAtUtc=SYSUTCDATETIME();

SELECT CustomerCode, CompanyDb, ModuleCode, GlCode, Notes
FROM dbo.Dim_FinSight_GlControlMap WITH (NOLOCK)
WHERE CustomerCode=N'RSR'
ORDER BY 2,3,4;
