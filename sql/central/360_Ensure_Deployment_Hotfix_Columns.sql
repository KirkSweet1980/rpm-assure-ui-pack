/*
  CENTRAL — optional extra columns (needs ALTER on tables).
  Safe as Rpm_collect: skips ALTER if no permission; collect 227 uses basic columns.
*/
USE RPMAssure_App;
GO
SET NOCOUNT ON;
GO

PRINT CONCAT(N'360 as user=', ORIGINAL_LOGIN(), N' / dbuser=', USER_NAME());

IF OBJECT_ID(N'dbo.Syspro_VersionInfo', N'U') IS NULL
BEGIN
  BEGIN TRY
    CREATE TABLE dbo.Syspro_VersionInfo
    (
      SnapshotDate     date NOT NULL,
      InstanceName     nvarchar(100) NOT NULL,
      ProductName      nvarchar(100) NULL,
      ProductVersion   nvarchar(50) NULL,
      BuildNumber      nvarchar(50) NULL,
      LicenseType      nvarchar(20) NULL,
      Users            int NULL,
      CompanyCount     int NULL,
      LicenseExpiry    datetime2(3) NULL,
      CustomerName     nvarchar(200) NULL,
      ImportDate       datetime2(3) NULL,
      ServerName       nvarchar(100) NULL,
      ImportedAt       datetime2(3) NOT NULL
        CONSTRAINT DF_Syspro_VersionInfo_Imp360 DEFAULT (SYSUTCDATETIME()),
      CONSTRAINT PK_Syspro_VersionInfo360 PRIMARY KEY (SnapshotDate, InstanceName)
    );
    PRINT N'Created Syspro_VersionInfo';
  END TRY
  BEGIN CATCH
    PRINT CONCAT(N'Create VersionInfo: ', ERROR_MESSAGE());
  END CATCH
END
ELSE
  PRINT N'Syspro_VersionInfo exists (ALTER optional)';
GO

/* Optional ALTERs — ignore permission errors */
DECLARE @sql nvarchar(max);
DECLARE @cols TABLE (Col sysname, Def nvarchar(200));
INSERT INTO @cols VALUES
 (N'DatabaseVersion', N'nvarchar(50) NULL'),
 (N'SysproFullVersion', N'nvarchar(50) NULL'),
 (N'SysproSp', N'nvarchar(50) NULL'),
 (N'SysproCustomerCode', N'nvarchar(50) NULL'),
 (N'ProductFamilyRelease', N'nvarchar(50) NULL'),
 (N'InstallProductVersion', N'nvarchar(50) NULL'),
 (N'InstalledHotfixCount', N'int NULL');

DECLARE @c sysname, @d nvarchar(200);
DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT Col, Def FROM @cols;
OPEN cur;
FETCH NEXT FROM cur INTO @c, @d;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF OBJECT_ID(N'dbo.Syspro_VersionInfo', N'U') IS NOT NULL
     AND COL_LENGTH(N'dbo.Syspro_VersionInfo', @c) IS NULL
  BEGIN
    SET @sql = N'ALTER TABLE dbo.Syspro_VersionInfo ADD ' + QUOTENAME(@c) + N' ' + @d;
    BEGIN TRY
      EXEC(@sql);
      PRINT CONCAT(N'Added VersionInfo.', @c);
    END TRY
    BEGIN CATCH
      PRINT CONCAT(N'Skip VersionInfo.', @c, N': ', ERROR_MESSAGE());
    END CATCH
  END
  FETCH NEXT FROM cur INTO @c, @d;
END
CLOSE cur; DEALLOCATE cur;
GO

IF OBJECT_ID(N'dbo.Syspro_Hotfix', N'U') IS NULL
BEGIN
  BEGIN TRY
    CREATE TABLE dbo.Syspro_Hotfix
    (
      SnapshotDate     date NOT NULL,
      InstanceName     nvarchar(100) NOT NULL,
      HotfixCode      nvarchar(50) NOT NULL,
      HotfixName      nvarchar(200) NULL,
      Description      nvarchar(max) NULL,
      Installed        bit NOT NULL
        CONSTRAINT DF_Syspro_Hotfix_Installed360 DEFAULT (1),
      InstalledAt      datetime2(3) NULL,
      SourceTable      nvarchar(100) NULL,
      ImportedAt       datetime2(3) NOT NULL
        CONSTRAINT DF_Syspro_Hotfix_Imp360 DEFAULT (SYSUTCDATETIME()),
      CONSTRAINT PK_Syspro_Hotfix360 PRIMARY KEY (SnapshotDate, InstanceName, HotfixCode)
    );
    PRINT N'Created Syspro_Hotfix';
  END TRY
  BEGIN CATCH
    PRINT CONCAT(N'Create Hotfix: ', ERROR_MESSAGE());
  END CATCH
END
ELSE
  PRINT N'Syspro_Hotfix exists (ALTER optional)';
GO

DECLARE @sql2 nvarchar(max);
DECLARE @cols2 TABLE (Col sysname, Def nvarchar(200));
INSERT INTO @cols2 VALUES
 (N'HotfixGuid', N'uniqueidentifier NULL'),
 (N'ReleaseId', N'uniqueidentifier NULL'),
 (N'Severity', N'nvarchar(40) NULL'),
 (N'SysproCustomerCode', N'nvarchar(50) NULL'),
 (N'StatusCode', N'int NULL');

DECLARE @c2 sysname, @d2 nvarchar(200);
DECLARE cur2 CURSOR LOCAL FAST_FORWARD FOR SELECT Col, Def FROM @cols2;
OPEN cur2;
FETCH NEXT FROM cur2 INTO @c2, @d2;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF OBJECT_ID(N'dbo.Syspro_Hotfix', N'U') IS NOT NULL
     AND COL_LENGTH(N'dbo.Syspro_Hotfix', @c2) IS NULL
  BEGIN
    SET @sql2 = N'ALTER TABLE dbo.Syspro_Hotfix ADD ' + QUOTENAME(@c2) + N' ' + @d2;
    BEGIN TRY
      EXEC(@sql2);
      PRINT CONCAT(N'Added Hotfix.', @c2);
    END TRY
    BEGIN CATCH
      PRINT CONCAT(N'Skip Hotfix.', @c2, N': ', ERROR_MESSAGE());
    END CATCH
  END
  FETCH NEXT FROM cur2 INTO @c2, @d2;
END
CLOSE cur2; DEALLOCATE cur2;
GO

IF OBJECT_ID(N'dbo.Syspro_HotfixInstalled', N'U') IS NULL
BEGIN
  BEGIN TRY
    CREATE TABLE dbo.Syspro_HotfixInstalled
    (
      SnapshotDate     date NOT NULL,
      InstanceName     nvarchar(100) NOT NULL,
      HotfixCode      nvarchar(50) NOT NULL,
      Title            nvarchar(300) NULL,
      InstalledAt      datetime2(3) NULL,
      Source           nvarchar(50) NULL,
      ImportedAt       datetime2(3) NOT NULL
        CONSTRAINT DF_Syspro_HfInst360_Imp DEFAULT (SYSUTCDATETIME()),
      CONSTRAINT PK_Syspro_HotfixInstalled360 PRIMARY KEY (SnapshotDate, InstanceName, HotfixCode)
    );
    PRINT N'Created Syspro_HotfixInstalled';
  END TRY
  BEGIN CATCH
    PRINT CONCAT(N'Create HotfixInstalled: ', ERROR_MESSAGE());
  END CATCH
END
GO

PRINT N'360 done (ALTERs may be skipped without elevated rights — basic collect still works).';
GO
