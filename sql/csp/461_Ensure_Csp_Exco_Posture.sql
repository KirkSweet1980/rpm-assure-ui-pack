/*
  461 - M365 EXCO posture (aggregates only - not full event dumps)
  Secure Score, MFA registration %, Global Admins, guests, disabled+licensed
*/
SET NOCOUNT ON;
USE RPMAssure_App;
GO

IF OBJECT_ID(N'dbo.Csp_Posture', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Csp_Posture (
    CustomerCode              nvarchar(50)  NOT NULL,
    SnapshotDate              date          NOT NULL,
    SecureScore               decimal(9,2)  NULL,
    SecureScoreMax            decimal(9,2)  NULL,
    SecureScorePct            decimal(5,1)  NULL,
    MfaRegisteredCount        int           NULL,
    MfaCapableCount           int           NULL,
    MfaRegisteredPct          decimal(5,1)  NULL,
    GlobalAdminCount          int           NULL,
    GuestUserCount            int           NULL,
    DisabledLicensedCount     int           NULL,
    FailedSignInCount7d       int           NULL,
    Notes                     nvarchar(500) NULL,
    ImportedAt                datetime2(0)  NOT NULL CONSTRAINT DF_Csp_Posture_Imported DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Csp_Posture PRIMARY KEY (CustomerCode, SnapshotDate)
  );
  PRINT 'Csp_Posture created';
END
GO

DECLARE @Code nvarchar(50) = N'RPMINT';
DECLARE @Snap date = CAST(SYSUTCDATETIME() AS date);
DECLARE @Now  datetime2(0) = SYSUTCDATETIME();

IF EXISTS (SELECT 1 FROM dbo.Dim_Csp_TenantMap WHERE CustomerCode = @Code)
AND NOT EXISTS (
  SELECT 1 FROM dbo.Csp_Posture
  WHERE CustomerCode = @Code AND SnapshotDate = @Snap
    AND Notes LIKE N'Graph%'
)
BEGIN
  MERGE dbo.Csp_Posture AS t
  USING (SELECT @Code AS CustomerCode, @Snap AS SnapshotDate) AS s
    ON t.CustomerCode = s.CustomerCode AND t.SnapshotDate = s.SnapshotDate
  WHEN MATCHED THEN UPDATE SET
    SecureScore = 72, SecureScoreMax = 100, SecureScorePct = 72.0,
    MfaRegisteredCount = 9, MfaCapableCount = 11, MfaRegisteredPct = 81.8,
    GlobalAdminCount = 2, GuestUserCount = 1, DisabledLicensedCount = 0,
    FailedSignInCount7d = 3,
    Notes = N'Pilot posture seed (replace with Graph)',
    ImportedAt = @Now
  WHEN NOT MATCHED THEN INSERT (
    CustomerCode, SnapshotDate, SecureScore, SecureScoreMax, SecureScorePct,
    MfaRegisteredCount, MfaCapableCount, MfaRegisteredPct,
    GlobalAdminCount, GuestUserCount, DisabledLicensedCount, FailedSignInCount7d, Notes, ImportedAt
  ) VALUES (
    @Code, @Snap, 72, 100, 72.0, 9, 11, 81.8, 2, 1, 0, 3, N'Pilot posture seed (replace with Graph)', @Now
  );
  PRINT 'RPMINT posture pilot seed applied';
END
GO

IF OBJECT_ID(N'dbo.vw_Kpi_Csp_Posture_Latest', N'V') IS NOT NULL DROP VIEW dbo.vw_Kpi_Csp_Posture_Latest;
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
PRINT 'vw_Kpi_Csp_Posture_Latest ready';
GO

BEGIN TRY
  GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Csp_Posture TO Rpm_collect;
  GRANT SELECT ON dbo.vw_Kpi_Csp_Posture_Latest TO Rpm_collect;
  GRANT SELECT ON dbo.Csp_Posture TO rpmassure;
  GRANT SELECT ON dbo.vw_Kpi_Csp_Posture_Latest TO rpmassure;
  PRINT 'Posture grants applied';
END TRY
BEGIN CATCH
  PRINT 'Posture grant soft-fail: ' + ERROR_MESSAGE();
END CATCH
GO

SELECT CustomerCode, SecureScorePct, MfaRegisteredPct, GlobalAdminCount, GuestUserCount
FROM dbo.vw_Kpi_Csp_Posture_Latest
ORDER BY CustomerCode;
GO
