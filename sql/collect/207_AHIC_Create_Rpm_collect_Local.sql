/*
================================================================================
  AHIC only — create local SQL login Rpm_collect (read SYSPRO)
  Run ON AHIC-SSQL-SRV as sa (one-time setup)

  Password below MUST match:
    - central 208 Rpm_collect password
    - 209 linked server @rmtpassword
    - AHI_Local_Config.ps1
================================================================================
*/
USE [master];
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'Rpm_collect')
BEGIN
    CREATE LOGIN [Rpm_collect]
        WITH PASSWORD = N'RpmCollect#AHIC2026',
             CHECK_POLICY = ON,
             CHECK_EXPIRATION = OFF;
    PRINT N'Login Rpm_collect created on AHIC.';
END
ELSE
BEGIN
    ALTER LOGIN [Rpm_collect] WITH PASSWORD = N'RpmCollect#AHIC2026';
    PRINT N'Login Rpm_collect password reset on AHIC.';
END
GO

/* Read rights on system + company DBs */
DECLARE @dbs TABLE (Db sysname);
INSERT @dbs VALUES (N'Sysprodb'),(N'AHICAR_I'),(N'AHICAR_Y'),(N'AHICAR_Z');

DECLARE @db sysname, @sql nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT Db FROM @dbs;
OPEN c; FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF DB_ID(@db) IS NOT NULL
    BEGIN
        SET @sql = N'
USE ' + QUOTENAME(@db) + N';
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N''Rpm_collect'')
    CREATE USER [Rpm_collect] FOR LOGIN [Rpm_collect];
ALTER ROLE db_datareader ADD MEMBER [Rpm_collect];
';
        BEGIN TRY
            EXEC sys.sp_executesql @sql;
            PRINT CONCAT(N'Granted db_datareader on ', @db);
        END TRY
        BEGIN CATCH
            PRINT CONCAT(N'Skip/fail ', @db, N': ', ERROR_MESSAGE());
        END CATCH
    END
    ELSE
        PRINT CONCAT(N'DB missing: ', @db);
    FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;
GO

PRINT N'AHIC local Rpm_collect ready. Use for sqlcmd -U Rpm_collect on this server.';
GO
