/*
  Central: grant Rpm_collect rights needed by the web app for staff/roles.
  Error fixed:
    SELECT permission was denied on the object 'App_User'

  Run ON CENTRAL (rpmwinrm\RPMREPORTS) as a sysadmin / db_owner:

    sqlcmd -S "102.222.21.220,14333" -d "RPMAssure_App" -E -C -b -i "C:\RPM-Assure\Sql\collect\232_Grant_AppUser_To_Rpm_collect.sql"

  Or with sa / admin SQL login if Windows auth is not available.
*/
SET NOCOUNT ON;
USE [RPMAssure_App];
GO

DECLARE @Login sysname = N'Rpm_collect';

/* Ensure DB user exists for the login */
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @Login)
BEGIN
  IF EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @Login)
  BEGIN
    DECLARE @sql nvarchar(400) = N'CREATE USER ' + QUOTENAME(@Login) + N' FOR LOGIN ' + QUOTENAME(@Login) + N';';
    EXEC sp_executesql @sql;
    PRINT N'Created database user ' + @Login;
  END
  ELSE
  BEGIN
    RAISERROR(N'Login Rpm_collect does not exist on this SQL instance. Create it first (208_Central_Create_Rpm_collect.sql).', 16, 1);
    RETURN;
  END
END
ELSE
  PRINT N'User exists: ' + @Login;

/* Staff / settings tables the app reads+writes */
DECLARE @t TABLE (TableName sysname NOT NULL);
INSERT INTO @t (TableName) VALUES
  (N'App_User'),
  (N'App_UserCustomer'),
  (N'Dim_Customer');

DECLARE @name sysname;
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT TableName FROM @t;
OPEN c;
FETCH NEXT FROM c INTO @name;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF OBJECT_ID(N'dbo.' + @name, N'U') IS NOT NULL
  BEGIN
    /* SELECT for all; write rights for staff tables */
    DECLARE @g nvarchar(max) =
      N'GRANT SELECT ON OBJECT::dbo.' + QUOTENAME(@name) + N' TO ' + QUOTENAME(@Login) + N';';
    IF @name IN (N'App_User', N'App_UserCustomer')
      SET @g = @g + N'
GRANT INSERT, UPDATE, DELETE ON OBJECT::dbo.' + QUOTENAME(@name) + N' TO ' + QUOTENAME(@Login) + N';';
    EXEC sp_executesql @g;
    PRINT N'Granted on dbo.' + @name;
  END
  ELSE
    PRINT N'Skip missing table dbo.' + @name;
  FETCH NEXT FROM c INTO @name;
END
CLOSE c;
DEALLOCATE c;

/* Optional: if StaffRole column missing, add it (app expects it) */
IF OBJECT_ID(N'dbo.App_User', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.App_User', N'StaffRole') IS NULL
BEGIN
  ALTER TABLE dbo.App_User ADD StaffRole nvarchar(30) NULL;
  PRINT N'Added App_User.StaffRole';
END

/* Prove SELECT works as Rpm_collect when possible — run under same session may still be admin.
   After grant, re-test from app. */
SELECT
  u.name AS DbUser,
  o.name AS ObjectName,
  p.permission_name,
  p.state_desc
FROM sys.database_permissions p
JOIN sys.database_principals u ON u.principal_id = p.grantee_principal_id
JOIN sys.objects o ON o.object_id = p.major_id
WHERE u.name = @Login
  AND o.name IN (N'App_User', N'App_UserCustomer', N'Dim_Customer')
ORDER BY o.name, p.permission_name;

PRINT N'';
PRINT N'Done. Restart Vite / refresh app, then sign in again.';
PRINT N'Test: sqlcmd -S "102.222.21.220,14333" -d RPMAssure_App -U Rpm_collect -P "***" -C -Q "SELECT TOP 3 Email, StaffRole, IsActive FROM dbo.App_User"';
GO
