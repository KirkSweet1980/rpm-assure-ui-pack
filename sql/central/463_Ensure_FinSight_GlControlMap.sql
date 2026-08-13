/*
  Dim_FinSight_GlControlMap - map CustomerCode + CompanyDb + Module - GL control account(s)
  Used by native DTR fallback when Datarapt is missing.

  sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -i 463_Ensure_FinSight_GlControlMap.sql
*/
USE [RPMAssure_App];
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Dim_FinSight_GlControlMap', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Dim_FinSight_GlControlMap
  (
    MapId           int            NOT NULL IDENTITY(1,1),
    CustomerCode    nvarchar(50)   NOT NULL,
    CompanyDb       nvarchar(100)  NOT NULL CONSTRAINT DF_GlCtl_Co DEFAULT (N'*'),
    ModuleCode      nvarchar(10)   NOT NULL,  -- INV AP AR WIP CB
    GlCode          nvarchar(50)   NOT NULL,
    GlCodeTo        nvarchar(50)   NULL,      -- optional range end
    Notes           nvarchar(200)  NULL,
    Active          bit            NOT NULL CONSTRAINT DF_GlCtl_Active DEFAULT (1),
    UpdatedAtUtc    datetime2(3)   NOT NULL CONSTRAINT DF_GlCtl_Upd DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Dim_FinSight_GlControlMap PRIMARY KEY CLUSTERED (MapId),
    CONSTRAINT UQ_Dim_FinSight_GlControlMap UNIQUE (CustomerCode, CompanyDb, ModuleCode, GlCode)
  );
  CREATE INDEX IX_GlCtl_CustMod ON dbo.Dim_FinSight_GlControlMap (CustomerCode, ModuleCode, Active);
  PRINT 'Created Dim_FinSight_GlControlMap';
END
ELSE PRINT 'Dim_FinSight_GlControlMap exists';

/* Example seeds - edit GlCode to match each company chart. CompanyDb='*' = all companies */
;MERGE dbo.Dim_FinSight_GlControlMap AS t
USING (VALUES
  -- UVSS placeholders (replace GlCode after discovery)
  (N'UVSS', N'*', N'INV', N'', N'Inventory control - set GlCode'),
  (N'UVSS', N'*', N'AP',  N'', N'AP/creditors control - set GlCode'),
  (N'UVSS', N'*', N'AR',  N'', N'AR/debtors control - set GlCode'),
  (N'UVSS', N'*', N'WIP', N'', N'WIP control - set GlCode')
) AS s(CustomerCode, CompanyDb, ModuleCode, GlCode, Notes)
ON t.CustomerCode=s.CustomerCode AND t.CompanyDb=s.CompanyDb AND t.ModuleCode=s.ModuleCode AND t.GlCode=s.GlCode
WHEN NOT MATCHED AND s.GlCode <> N'' THEN
  INSERT (CustomerCode, CompanyDb, ModuleCode, GlCode, Notes, Active)
  VALUES (s.CustomerCode, s.CompanyDb, s.ModuleCode, s.GlCode, s.Notes, 1);
-- empty GlCode rows not inserted

PRINT 'Map ready. Populate:';
PRINT '  INSERT dbo.Dim_FinSight_GlControlMap (CustomerCode,CompanyDb,ModuleCode,GlCode,Notes)';
PRINT '  VALUES (''UVSS'',''SysproCompanyU'',''INV'',''1200'',''Inventory control'');';

/* Grant collect/app if principals exist */
BEGIN TRY
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Dim_FinSight_GlControlMap TO [Rpm_collect];
END TRY BEGIN CATCH END CATCH
BEGIN TRY
  GRANT SELECT ON dbo.Dim_FinSight_GlControlMap TO [rpmassure];
END TRY BEGIN CATCH END CATCH

SELECT CustomerCode, CompanyDb, ModuleCode, GlCode, Notes, Active
FROM dbo.Dim_FinSight_GlControlMap WITH (NOLOCK)
ORDER BY 1,2,3;
