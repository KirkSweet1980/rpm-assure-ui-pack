/*
  461 - Ensure app + collect can read EPP incidents/quarantine (UI feeds)
*/
USE [RPMAssure_App];
GO
SET NOCOUNT ON;

DECLARE @principals TABLE (name sysname);
INSERT INTO @principals(name)
VALUES (N'Rpm_collect'), (N'Rpm_app'), (N'rpm_app'), (N'rpmassure'), (N'RPMAssure');

DECLARE @p sysname, @sql nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT name FROM @principals;
OPEN c; FETCH NEXT FROM c INTO @p;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @p)
  BEGIN
    BEGIN TRY
      IF OBJECT_ID(N'dbo.Bitdefender_Incidents', N'U') IS NOT NULL
      BEGIN
        SET @sql = N'GRANT SELECT ON OBJECT::dbo.Bitdefender_Incidents TO ' + QUOTENAME(@p);
        EXEC sp_executesql @sql;
      END
      IF OBJECT_ID(N'dbo.Bitdefender_Quarantine', N'U') IS NOT NULL
      BEGIN
        SET @sql = N'GRANT SELECT ON OBJECT::dbo.Bitdefender_Quarantine TO ' + QUOTENAME(@p);
        EXEC sp_executesql @sql;
      END
      IF OBJECT_ID(N'dbo.Bitdefender_CollectStatus', N'U') IS NOT NULL
      BEGIN
        SET @sql = N'GRANT SELECT ON OBJECT::dbo.Bitdefender_CollectStatus TO ' + QUOTENAME(@p);
        EXEC sp_executesql @sql;
      END
      IF OBJECT_ID(N'dbo.Bitdefender_Endpoints', N'U') IS NOT NULL
      BEGIN
        SET @sql = N'GRANT SELECT ON OBJECT::dbo.Bitdefender_Endpoints TO ' + QUOTENAME(@p);
        EXEC sp_executesql @sql;
      END
      PRINT N'Granted SELECT to ' + @p;
    END TRY
    BEGIN CATCH
      PRINT N'Grant soft-fail for ' + @p + N': ' + ERROR_MESSAGE();
    END CATCH
  END
  FETCH NEXT FROM c INTO @p;
END
CLOSE c; DEALLOCATE c;

PRINT N'=== Quarantine by customer (latest) ===';
SELECT CustomerCode, COUNT(*) AS Cnt
FROM dbo.Bitdefender_Quarantine WITH (NOLOCK)
WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Quarantine WITH (NOLOCK))
GROUP BY CustomerCode
ORDER BY Cnt DESC;

PRINT N'=== Incidents by customer (latest) ===';
IF OBJECT_ID(N'dbo.Bitdefender_Incidents', N'U') IS NOT NULL
  SELECT CustomerCode, COUNT(*) AS Cnt
  FROM dbo.Bitdefender_Incidents WITH (NOLOCK)
  WHERE SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Bitdefender_Incidents WITH (NOLOCK))
  GROUP BY CustomerCode
  ORDER BY Cnt DESC;
ELSE
  SELECT 'no incidents table' AS x;
GO
