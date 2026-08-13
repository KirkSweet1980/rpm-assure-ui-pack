/*
  469 - Csp_GlobalAdmins (list names) + GlobalAdminNames on posture
  sqlcmd -S ".\RPMREPORTS" -d RPMAssure_App -E -C -i 469_Ensure_Csp_GlobalAdmins.sql
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Csp_GlobalAdmins', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Csp_GlobalAdmins (
    CustomerCode       nvarchar(50)  NOT NULL,
    SnapshotDate       date          NOT NULL,
    ObjectId           nvarchar(64)  NOT NULL,
    DisplayName        nvarchar(256) NULL,
    UserPrincipalName  nvarchar(320) NULL,
    Mail               nvarchar(320) NULL,
    PrincipalType      nvarchar(64)  NULL,
    ImportedAt         datetime2(0)  NOT NULL CONSTRAINT DF_Csp_GA_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Csp_GlobalAdmins PRIMARY KEY (CustomerCode, SnapshotDate, ObjectId)
  );
  PRINT 'Csp_GlobalAdmins created';
END
ELSE
  PRINT 'Csp_GlobalAdmins exists';
GO

IF COL_LENGTH(N'dbo.Csp_Posture', N'GlobalAdminNames') IS NULL
BEGIN
  ALTER TABLE dbo.Csp_Posture ADD GlobalAdminNames nvarchar(2000) NULL;
  PRINT 'Csp_Posture.GlobalAdminNames added';
END
GO

/* Recreate posture latest view so GlobalAdminNames is selected when present */
IF OBJECT_ID(N'dbo.vw_Kpi_Csp_Posture_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Kpi_Csp_Posture_Latest;
GO
CREATE VIEW dbo.vw_Kpi_Csp_Posture_Latest
AS
SELECT p.*
FROM dbo.Csp_Posture AS p WITH (NOLOCK)
INNER JOIN (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Csp_Posture WITH (NOLOCK)
  GROUP BY CustomerCode
) m ON m.CustomerCode = p.CustomerCode AND m.mx = p.SnapshotDate;
GO
PRINT 'vw_Kpi_Csp_Posture_Latest ready (includes GlobalAdminNames if column exists)';
GO

IF OBJECT_ID(N'dbo.vw_Kpi_Csp_GlobalAdmins_Latest', N'V') IS NOT NULL
  DROP VIEW dbo.vw_Kpi_Csp_GlobalAdmins_Latest;
GO
CREATE VIEW dbo.vw_Kpi_Csp_GlobalAdmins_Latest
AS
SELECT g.*
FROM dbo.Csp_GlobalAdmins AS g WITH (NOLOCK)
INNER JOIN (
  SELECT CustomerCode, MAX(SnapshotDate) AS mx
  FROM dbo.Csp_GlobalAdmins WITH (NOLOCK)
  GROUP BY CustomerCode
) m ON m.CustomerCode = g.CustomerCode AND m.mx = g.SnapshotDate;
GO
PRINT 'vw_Kpi_Csp_GlobalAdmins_Latest ready';
GO

BEGIN TRY
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Csp_GlobalAdmins TO Rpm_collect;
  GRANT SELECT ON dbo.Csp_GlobalAdmins TO rpmassure;
  GRANT SELECT ON dbo.vw_Kpi_Csp_GlobalAdmins_Latest TO Rpm_collect;
  GRANT SELECT ON dbo.vw_Kpi_Csp_GlobalAdmins_Latest TO rpmassure;
  GRANT SELECT ON dbo.vw_Kpi_Csp_Posture_Latest TO rpmassure;
  GRANT SELECT, UPDATE ON dbo.Csp_Posture TO Rpm_collect;
  PRINT 'GA grants applied';
END TRY
BEGIN CATCH
  PRINT 'GA grant soft-fail: ' + ERROR_MESSAGE();
END CATCH
GO

PRINT '=== Global Admin counts (latest) ===';
SELECT CustomerCode, GlobalAdminCount, LEFT(GlobalAdminNames, 200) AS GlobalAdminNames
FROM dbo.vw_Kpi_Csp_Posture_Latest WITH (NOLOCK)
ORDER BY CustomerCode;
GO
